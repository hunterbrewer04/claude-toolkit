#!/usr/bin/env bash
# Layer 1: deterministic structural grading of every dev-flow skill.
set -uo pipefail
P="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Prefer the in-repo plugin copy so this keeps working after the personal
# ~/.claude/skills/skill-creator symlink is removed at meta-builders install.
SC="$P/../meta-builders/skills/skill-creator"
[ -d "$SC" ] || SC="$HOME/.claude/skills/skill-creator"
if [ ! -d "$SC" ]; then
  echo "skill-creator not found at $SC" >&2; exit 1
fi

fail=0
for d in "$P"/skills/*/; do
  name=$(basename "$d")
  echo "=== $name ==="
  ( cd "$SC" && python3 -m scripts.grade_structure "$d" ) || fail=1
done
exit $fail
