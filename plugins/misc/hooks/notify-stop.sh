#!/usr/bin/env bash
# Desktop notification when Claude finishes a turn.
# Cross-platform: macOS via osascript, Linux via notify-send, silent elsewhere.
# Never fails the Stop event -- a missing notifier is not an error.
set -uo pipefail

title="Claude Code"
body="Claude finished"

if command -v osascript >/dev/null 2>&1; then
  osascript -e "display notification \"$body\" with title \"$title\" sound name \"Glass\"" >/dev/null 2>&1
elif command -v notify-send >/dev/null 2>&1; then
  notify-send "$title" "$body" >/dev/null 2>&1
fi

exit 0
