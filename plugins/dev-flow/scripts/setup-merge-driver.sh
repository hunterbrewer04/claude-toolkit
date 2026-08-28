#!/usr/bin/env bash
# Register graphify's union merge driver for graphify-out/graph.json.
#
# Every slot runs `graphify update .` in its own worktree, so graph.json diverges
# across slots and every wave merge would otherwise hit a multi-megabyte JSON
# conflict that cannot usefully be resolved by hand. The union driver merges them.
#
# Idempotent. Safe to run at the start of every build.
set -euo pipefail

root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "not inside a git repo" >&2; exit 1
}
cd "$root"

if ! command -v graphify >/dev/null; then
  echo "graphify not on PATH — skipping merge driver setup" >&2
  exit 0
fi

if [ ! -f graphify-out/graph.json ]; then
  echo "no graphify-out/graph.json — nothing to protect, skipping" >&2
  exit 0
fi

git config merge.graphify.name "graphify graph union merge"
git config merge.graphify.driver "graphify merge-driver %O %A %B"

attr=".gitattributes"
line="graphify-out/graph.json merge=graphify"
if ! { [ -f "$attr" ] && grep -qxF "$line" "$attr"; }; then
  [ -f "$attr" ] && [ -n "$(tail -c1 "$attr")" ] && echo >> "$attr"
  echo "$line" >> "$attr"
  echo "added to $attr: $line"
else
  echo "$attr already has the graphify rule"
fi

echo "merge driver registered:"
echo "  $(git config merge.graphify.driver)"
