#!/usr/bin/env bash
# Claude Code status line - agnoster-inspired, three-row layout
#   row 1  where you are:  user@host | path | repo:branch*dirty | worktree | PR | session
#   row 2  what you run:   model | effort | style | version | lines +/- | cost | elapsed
#   row 3  what you burn:  ctx | 5h | 7d, each with a meter and a reset countdown
#
# Renderer notes (Claude Code 2.1.x):
#   stdout is split on newlines and rendered as stacked rows, each truncated to
#   terminal width (there is no wrapping and no way to exceed terminal width).
#   Any line that is empty after trimming is dropped, and trim() eats spaces and
#   NBSP alike, so every line below starts with an escape sequence to survive it.
#   Color state carries across rows, so every line ends with a reset.
#   Horizontal inset comes from statusLine.padding in settings.json.
#
# Perf: this runs on every render and each forked process costs ~25ms here, so
#   everything is bash builtins except one jq call and one or two git calls.
#   The rate-limit countdowns are computed inside that same jq call using its
#   `now` builtin, because Apple's bash 3.2 has no EPOCHSECONDS or printf %()T
#   and reading the clock would otherwise mean forking `date`.
set -f
input=$(cat)

# ---- colors ----
RS=$'\033[0m'; DIM=$'\033[2m'
BLUE=$'\033[1;34m'; GREEN=$'\033[1;32m'; YELLOW=$'\033[33m'
CYAN=$'\033[36m'; MAGENTA=$'\033[35m'; RED=$'\033[91m'; GREY=$'\033[90m'
delim="${DIM}  ||  ${RS}"

# ---- one jq pass, unit-separated so empty fields survive ----
fields=$(printf '%s' "$input" | jq -j '
  def secs_until($t): if $t then (($t - now) | floor) else "" end;
  [ (.workspace.current_dir // .cwd // ""),
    (.model.display_name // ""),
    (.effort.level // ""),
    (.output_style.name // ""),
    (.context_window.used_percentage // ""),
    (.rate_limits.five_hour.used_percentage // ""),
    (.rate_limits.seven_day.used_percentage // ""),
    (if .fast_mode then "fast" else "" end),
    (if .thinking.enabled == false then "off" else "" end),
    (.agent.name // ""),
    (.worktree.name // .workspace.git_worktree // ""),
    (.pr.number // ""),
    (.pr.review_state // ""),
    (.session_name // ""),
    (.workspace.repo.name // ""),
    (.context_window.total_input_tokens // ""),
    (.context_window.context_window_size // ""),
    secs_until(.rate_limits.five_hour.resets_at),
    secs_until(.rate_limits.seven_day.resets_at),
    (.cost.total_lines_added // 0),
    (.cost.total_lines_removed // 0),
    (.cost.total_cost_usd // 0),
    (.cost.total_duration_ms // 0),
    (.version // "")
  ] | map(tostring) | join("")' 2>/dev/null)
IFS=$'\037' read -r dir model effort style ctx five seven fast think agent wt pr pr_state \
  sess repo tok_in tok_max five_left seven_left add del cost dur_ms ver <<<"$fields"
[ -n "$dir" ] || dir=$PWD

# ---- formatting helpers (set globals; command substitution would fork) ----
# CLR = color by usage, BAR = 8-cell meter, PCT = rounded percent
meter() {
  local p=${1%%.*} f i
  p=${p:-0}
  if   (( p >= 85 )); then CLR=$RED
  elif (( p >= 60 )); then CLR=$YELLOW
  else                     CLR=$GREEN
  fi
  f=$(( (p * 8 + 50) / 100 )); (( f > 8 )) && f=8; (( f < 0 )) && f=0
  BAR=""
  for (( i = 0; i < 8; i++ )); do
    if (( i < f )); then BAR+="█"; else BAR+="░"; fi
  done
  printf -v PCT '%.0f' "$1"
}
# DUR = compact duration from seconds: 3d6h / 2h14m / 45m / 30s
dur() {
  local s=${1%%.*} d h m
  s=${s:-0}; (( s < 0 )) && s=0
  d=$(( s / 86400 )); h=$(( (s % 86400) / 3600 )); m=$(( (s % 3600) / 60 ))
  if   (( d > 0 )); then DUR="${d}d${h}h"
  elif (( h > 0 )); then DUR="${h}h${m}m"
  elif (( m > 0 )); then DUR="${m}m"
  else                  DUR="${s}s"
  fi
}
# TOK = compact token count: 86k / 1.2M
toks() {
  local n=${1%%.*} t
  n=${n:-0}
  if (( n >= 1000000 )); then
    t=$(( n / 100000 )); TOK="${t:0:${#t}-1}.${t:${#t}-1}M"
  elif (( n >= 1000 )); then
    TOK="$(( n / 1000 ))k"
  else
    TOK="$n"
  fi
}
# SP = home-collapsed path, last 3 components when deeper than that
short_path() {
  local p=${1/#$HOME/\~} IFS=/
  local -a parts=($p)
  local n=${#parts[@]}
  if (( n <= 4 )); then SP=$p
  else SP="…/${parts[n-3]}/${parts[n-2]}/${parts[n-1]}"; fi
}

# ---- row 1: place ----
# bash sets HOSTNAME itself; the forks below only happen if that ever fails
me=${USER:-$LOGNAME}; [ -n "$me" ] || me=$(id -un 2>/dev/null)
host=${HOSTNAME%%.*}; [ -n "$host" ] || host=$(hostname -s 2>/dev/null)

short_path "$dir"
l1="${BLUE} ${me}${RS}@${GREEN}${host}${RS}${delim}${YELLOW} ${SP}${RS}"

# git: branch, dirty count, ahead/behind - one status call, parsed in bash
if gs=$(GIT_OPTIONAL_LOCKS=0 git -C "$dir" status --porcelain=v2 --branch --untracked-files=no 2>/dev/null); then
  branch=""; ab=""; dirty=0
  while IFS= read -r line; do
    case $line in
      '# branch.head '*) branch=${line#\# branch.head } ;;
      '# branch.ab '*)   ab=${line#\# branch.ab } ;;
      [12u]' '*)         (( dirty++ )) ;;
    esac
  done <<<"$gs"
  # repo name comes free in the payload when there is an origin remote
  if [ -z "$repo" ]; then
    top=$(GIT_OPTIONAL_LOCKS=0 git -C "$dir" rev-parse --show-toplevel 2>/dev/null)
    repo=${top##*/}
  fi
  [ "$branch" = "(detached)" ] && branch="detached"
  g="${YELLOW} ${repo}:${branch}${RS}"
  (( dirty > 0 )) && g+="${RED} *${dirty}${RS}"
  ahead=${ab%% *}; behind=${ab##* }
  [ -n "$ahead" ] && [ "$ahead" != "+0" ] && g+="${CYAN} ↑${ahead#+}${RS}"
  [ -n "$behind" ] && [ "$behind" != "-0" ] && g+="${CYAN} ↓${behind#-}${RS}"
  l1+="${delim}${g}"
fi

[ -n "$wt" ] && l1+="${delim}${MAGENTA} wt:${wt}${RS}"
if [ -n "$pr" ]; then
  l1+="${delim}${CYAN} #${pr}"
  [ -n "$pr_state" ] && l1+="${GREY}(${pr_state})"
  l1+="${RS}"
fi
[ -n "$sess" ] && l1+="${delim}${GREY} ${sess}${RS}"

# ---- row 2: what you are running, and what it has done ----
l2="${GREEN} ${model:-?}${RS}"
[ -n "$fast" ]   && l2+="${RED} »fast${RS}"
[ -n "$effort" ] && l2+="${delim}${RED} ⚡${effort}${RS}"
[ -n "$think" ]  && l2+="${GREY} think:off${RS}"
[ -n "$agent" ]  && l2+="${delim}${MAGENTA} @${agent}${RS}"
case $style in ""|default) ;; *) l2+="${delim}${GREY} ${style}${RS}" ;; esac
[ -n "$ver" ]    && l2+="${delim}${GREY} v${ver}${RS}"

# session edit volume
if [ "${add:-0}" != "0" ] || [ "${del:-0}" != "0" ]; then
  l2+="${delim}${GREEN} +${add}${RS}${GREY}/${RS}${RED}-${del}${RS}"
fi
# session cost, once it rounds to a visible cent
printf -v cost_s '%.2f' "${cost:-0}"
[ "$cost_s" != "0.00" ] && l2+="${delim}${GREY} \$${cost_s}${RS}"
# session wall clock
if [ -n "$dur_ms" ] && [ "$dur_ms" != "0" ]; then
  dur $(( ${dur_ms%%.*} / 1000 )); l2+="${delim}${GREY} ${DUR}${RS}"
fi

# ---- row 3: the meters ----
l3=""
if [ -n "$ctx" ]; then
  meter "$ctx"; l3+="${CLR} ctx ${PCT}%"
  if [ -n "$tok_in" ] && [ -n "$tok_max" ]; then
    toks "$tok_in"; t1=$TOK; toks "$tok_max"
    l3+="${GREY} ${t1}/${TOK}"
  fi
  l3+=" ${DIM}${BAR}${RS}"
fi
if [ -n "$five" ]; then
  meter "$five"; l3+="${l3:+$delim}${CLR} 5h ${PCT}% ${DIM}${BAR}${RS}"
  if [ -n "$five_left" ] && [ "${five_left%%.*}" -gt 0 ] 2>/dev/null; then
    dur "$five_left"; l3+="${GREY} ${DUR}${RS}"
  fi
fi
if [ -n "$seven" ]; then
  meter "$seven"; l3+="${l3:+$delim}${CLR} 7d ${PCT}% ${DIM}${BAR}${RS}"
  if [ -n "$seven_left" ] && [ "${seven_left%%.*}" -gt 0 ] 2>/dev/null; then
    dur "$seven_left"; l3+="${GREY} ${DUR}${RS}"
  fi
fi

# ---- output ----
# Blank rows between the lines. The renderer drops any line that is empty after
# trimming, and trim() eats spaces and NBSP alike, so a spacer has to contain a
# character that is not whitespace: an escape (survives, zero width) plus
# U+2800 BRAILLE PATTERN BLANK (category So, so it measures as a real cell).
# Set CLAUDE_STATUSLINE_GAP=0 for no gap, 2 for a taller one.
gap=${CLAUDE_STATUSLINE_GAP:-1}
spacer=""
for (( i = 0; i < gap; i++ )); do spacer+="${RS}⠀"$'\n'; done

out="${l1}${RS}"$'\n'"$spacer${l2}${RS}"
[ -n "$l3" ] && out+=$'\n'"$spacer${l3}${RS}"
printf '%s\n' "$out"
