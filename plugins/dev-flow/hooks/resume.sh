#!/usr/bin/env bash
# Prints the dev-flow handoff pointer when a build is mid-flight.
# Silent otherwise -- a session with no active build should pay nothing for this hook.
#
# Gated on the `dev-flow:` marker line that dev-flow:plan writes. handoff.md is a
# general convention for multi-session work, so matching the filename alone would
# fire this in every unrelated repo that keeps one.
set -uo pipefail

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
hand="$root/handoff.md"
[ -f "$hand" ] || exit 0
grep -q '^dev-flow:' "$hand" || exit 0

echo "dev-flow: build in progress. handoff.md says:"
head -20 "$hand" | sed -e 's/^/  /'
echo "  Invoke dev-flow:implement to resume, or dev-flow:review / dev-flow:test if that phase is done."
