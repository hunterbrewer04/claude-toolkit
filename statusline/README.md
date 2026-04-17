# Statusline

An agnoster-inspired status line for Claude Code, rendered on every prompt.

## What it shows

```
 user@host  ||   current-dir  ||   repo:branch  ||   Model Name  ||  ⚡high  ||  ctx:42%  ||  5h:18%
```

- **user@host** — whoami + short hostname
- **current-dir** — basename of the working directory
- **repo:branch** — git repo name + branch (only if in a git repo)
- **model** — model display name
- **⚡effort** — current effort level from `/effort` (reads `~/.claude/settings.json`; `CLAUDE_CODE_EFFORT_LEVEL` env var wins if set). Updates live on next render when you run `/effort <level>`.
- **ctx** — context window used %
- **5h** — rate-limit window used % (5-hour session)

Colors: blue user, green host, yellow dir/repo, green model, cyan ctx, magenta rate. Dim `||` separators.

## Requirements

- `bash`
- `jq` — used to parse Claude Code's JSON input on every refresh
- `git` — optional; the repo:branch segment is skipped when unavailable

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

2. Add the `statusLine` field to `~/.claude/settings.json`. Use `~` (not a hardcoded home path) so the same config works on any machine:
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "bash ~/.claude/statusline-command.sh"
     }
   }
   ```

   If `settings.json` already has other fields, merge rather than overwrite. Safe one-liner with `jq`:
   ```bash
   tmp=$(mktemp) && jq '.statusLine = {type:"command", command:"bash ~/.claude/statusline-command.sh"}' \
     ~/.claude/settings.json > "$tmp" && mv "$tmp" ~/.claude/settings.json
   ```

3. Restart Claude Code (or start a new session) to see it.

## Shortcut

From inside any Claude Code session on a machine that has this repo cloned, just say:

> install the statusline from my toolkit

Claude will handle the copy + `settings.json` patch.
