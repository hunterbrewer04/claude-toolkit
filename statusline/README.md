# Statusline

An agnoster-inspired status line for Claude Code, rendered on every prompt. Three rows.

## What it shows

```
 user@host  ||   ~/claude-toolkit  ||   claude-toolkit:main *3 ↑1

 Opus 5  ||  ⚡high  ||  learning  ||  v2.1.234  ||  +412/-88  ||  $1.23  ||  41m

 ctx 43% 85k/200k ███░░░░░  ||  5h 18% █░░░░░░░ 2h12m  ||  7d 91% ███████░ 3d5h
```

Row 1 is where you are, row 2 is what you are running and what it has done, row 3
is what you are burning. Every segment is conditional, so anything the session has
no data for is simply absent. Row 3 disappears entirely when there is no context or
rate limit data yet.

### Row 1, place

| Segment | Notes |
| --- | --- |
| `user@host` | From `$USER` and `$HOSTNAME`, no subprocess |
| `~/path/to/dir` | Home collapsed to `~`, trimmed to the last 3 components with a leading `…` when deeper |
| `repo:branch` | Repo name from the payload's origin remote, or the git toplevel as a fallback |
| `*3` | Count of modified tracked files. Untracked are excluded, for speed |
| `↑1 ↓2` | Commits ahead of and behind upstream |
| `wt:name` | Worktree name, only in a `--worktree` session or a linked worktree |
| `#42(approved)` | Open PR or MR for the branch, with review state when known |
| `session name` | Set via `/rename` |

Detached HEAD renders as `repo:detached` rather than dropping the git segment.

### Row 2, session

| Segment | Notes |
| --- | --- |
| `Opus 5` | Model display name |
| `»fast` | Fast mode is on |
| `⚡high` | Effort level, read live from the payload |
| `think:off` | Extended thinking is disabled |
| `@code-reviewer` | Only when started with `--agent` |
| `learning` | Output style, hidden when it is `default` |
| `v2.1.234` | Claude Code version, useful when several machines drift apart |
| `+412/-88` | Lines added and removed this session, hidden while both are zero |
| `$1.23` | Session cost, hidden until it rounds to a visible cent |
| `41m` | Session wall clock |

### Row 3, consumption

| Segment | Notes |
| --- | --- |
| `ctx 43% 85k/200k` | Context used, with real token counts against the window size |
| `5h 18% ... 2h12m` | 5-hour limit used, and time until the window resets |
| `7d 91% ... 3d5h` | 7-day limit used, and time until that window resets |

Meters are 8 cells. Colors step green under 60 percent, yellow under 85, red at or
above. Countdowns floor, so `2h12m` means between 2h12m and 2h13m remain.

## Requirements

- `bash`. Apple's stock bash 3.2 is enough, no newer builtins are relied on
- `jq`, used once per render to parse the payload
- `git`, optional. The `repo:branch` segment is skipped when unavailable

Install `jq`:
- macOS: `brew install jq`
- Debian/Ubuntu: `sudo apt install jq`
- Alpine: `apk add jq`

## Install

1. Copy the script into `~/.claude/`:
   ```bash
   cp statusline-command.sh ~/.claude/statusline-command.sh
   chmod +x ~/.claude/statusline-command.sh
   ```

2. Add the `statusLine` field to `~/.claude/settings.json`. Use `~` rather than a
   hardcoded home path so the same config works on any machine:
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "bash ~/.claude/statusline-command.sh",
       "padding": 1
     }
   }
   ```

   If `settings.json` already has other fields, merge rather than overwrite:
   ```bash
   tmp=$(mktemp) && jq '.statusLine = {type:"command", command:"bash ~/.claude/statusline-command.sh", padding:1}' \
     ~/.claude/settings.json > "$tmp" && mv "$tmp" ~/.claude/settings.json
   ```

3. Restart Claude Code, or start a new session, to pick up the settings change.
   The script itself is re-read from disk on every render, so later edits to it are
   live without a restart.

## Tuning

- `CLAUDE_STATUSLINE_GAP` controls the blank rows between lines. Default `1`. Set
  `0` for no gap or `2` for a taller one.
- `statusLine.padding` in `settings.json` is horizontal inset, applied to all rows.
- `statusLine.refreshInterval` re-runs the command every N seconds on top of the
  normal event-driven updates. Not set by default, since nothing here is time
  sensitive except the reset countdowns.

## Notes on how Claude Code renders this

Useful if you ever edit the script. Verified against the 2.1.x renderer.

- Multi-row works by printing newlines. Each line becomes its own row and is
  truncated at terminal width. There is no wrapping and no way to be wider than
  the terminal, which is the whole reason this uses rows instead of one long line.
- Any line that is empty after trimming is dropped, and the trim removes every
  Unicode space character including NBSP. A blank spacer therefore has to contain
  something that is not whitespace. This uses an escape sequence plus U+2800
  BRAILLE PATTERN BLANK, which is category So and so survives the filter while
  painting nothing.
- Lines are also trimmed individually, so leading indentation is lost unless the
  line starts with an escape sequence. Every line here does.
- Color state carries across rows. The renderer re-applies escape codes from
  earlier lines onto later ones, so every line ends with a reset to stop bleed.

## Performance

This runs on every render, and process spawns dominate the cost, so the script is
bash builtins throughout except for one `jq` call and one `git status`. A second
git call happens only in a repo with no origin remote. Notably the rate limit
countdowns are computed inside the existing `jq` call using its `now` builtin,
because bash 3.2 has no `EPOCHSECONDS` or `printf %()T` and reading the clock would
otherwise mean forking `date`.

Best-of-5 over 20 runs on an M-series MacBook Air: about 22ms per render, against
about 40ms for the earlier single-line version that called `jq` five times.

## Shortcut

From inside any Claude Code session on a machine that has this repo cloned:

> install the statusline from my toolkit

Claude will handle the copy and the `settings.json` patch.
