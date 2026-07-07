#!/usr/bin/env bash
# Stop every server started by serve.sh, then flag any orphaned HTTP servers.
# Usage: stop.sh
set -uo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$SKILL_DIR/state"
STATE_FILE="$STATE_DIR/served.json"

if [ -f "$STATE_FILE" ]; then
  # Emit "pid port path" lines for every tracked entry, tab-separated.
  ENTRIES="$(python3 - "$STATE_FILE" <<'PYEOF'
import json
import sys

state_file = sys.argv[1]
try:
    with open(state_file) as f:
        data = json.load(f)
    if not isinstance(data, list):
        data = []
except (FileNotFoundError, json.JSONDecodeError):
    data = []

for entry in data:
    print(f"{entry.get('pid', '')}\t{entry.get('port', '')}\t{entry.get('path', '')}")
PYEOF
)"
else
  ENTRIES=""
fi

if [ -z "$ENTRIES" ]; then
  echo "No tracked servers in state file."
else
  while IFS=$'\t' read -r pid port path; do
    [ -z "$pid" ] && continue
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      echo "Stopped pid=$pid port=$port path=$path"
    else
      echo "Already dead: pid=$pid port=$port path=$path (skipped)"
    fi
  done <<< "$ENTRIES"
fi

# Clear the state file regardless of what was tracked.
mkdir -p "$STATE_DIR"
printf '[]\n' > "$STATE_FILE"

# Scan for orphaned servers this skill didn't track (e.g. started by hand).
# macOS pgrep has no -E/alternation support, so run one pattern at a time.
ORPHANS="$( { pgrep -fl 'http\.server' 2>/dev/null; pgrep -fl 'npx serve' 2>/dev/null; pgrep -fl '/serve ' 2>/dev/null; } | sort -u -k1,1 || true)"

if [ -n "$ORPHANS" ]; then
  echo ""
  echo "Orphaned server processes found (not started by this skill, not stopped):"
  echo "$ORPHANS" | while IFS= read -r line; do
    opid="$(echo "$line" | awk '{print $1}')"
    echo "  $line   -> kill hint: kill $opid"
  done
fi
