#!/usr/bin/env bash
# Claude Code status line — agnoster-inspired
input=$(cat)

user=$(whoami)
host=$(hostname -s)
dir=$(echo "$input" | jq -r '.workspace.current_dir // .cwd')
model=$(echo "$input" | jq -r '.model.display_name // empty')

# Dim delimiter
DIM="\033[2m"
RESET="\033[0m"
delim="${DIM}  ||  ${RESET}"

# Basename of current directory only
short_dir=$(basename "$dir")

# Git: repo name (from toplevel dir) + branch
git_info=""
if git_branch=$(GIT_OPTIONAL_LOCKS=0 git -C "$dir" symbolic-ref --short HEAD 2>/dev/null); then
  git_toplevel=$(GIT_OPTIONAL_LOCKS=0 git -C "$dir" rev-parse --show-toplevel 2>/dev/null)
  repo_name=$(basename "$git_toplevel")
  git_info="${delim}\033[33m ${repo_name}:${git_branch} ${RESET}"
fi

# Context usage
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
ctx_info=""
if [ -n "$used" ]; then
  ctx_info="${delim}\033[36m ctx:$(printf '%.0f' "$used")%% ${RESET}"
fi

# Rate limits (5h session)
five_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
rate_info=""
if [ -n "$five_pct" ]; then
  rate_info="${delim}\033[35m 5h:$(printf '%.0f' "$five_pct")%% ${RESET}"
fi

# Model info
model_info=""
if [ -n "$model" ]; then
  model_info="${delim}\033[32m ${model} ${RESET}"
fi

# Effort level (not in stdin JSON — read from settings.json; env var wins if set)
effort=""
if [ -n "$CLAUDE_CODE_EFFORT_LEVEL" ]; then
  effort="$CLAUDE_CODE_EFFORT_LEVEL"
elif [ -f "$HOME/.claude/settings.json" ]; then
  effort=$(jq -r '.effortLevel // empty' "$HOME/.claude/settings.json" 2>/dev/null)
fi
effort_info=""
if [ -n "$effort" ]; then
  effort_info="${delim}\033[91m ⚡${effort} ${RESET}"
fi

printf "\033[1;34m %s\033[0m@\033[1;32m%s \033[0m${delim}\033[1;33m %s ${RESET}%b%b%b%b%b" \
  "$user" "$host" "$short_dir" "$git_info" "$model_info" "$effort_info" "$ctx_info" "$rate_info"
