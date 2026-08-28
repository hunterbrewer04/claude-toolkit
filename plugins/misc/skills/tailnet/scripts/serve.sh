#!/usr/bin/env bash
# Serve a file or directory over HTTP on this Mac's tailscale IP.
# Usage: serve.sh <file-or-dir>
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: serve.sh <file-or-dir>" >&2
  exit 1
fi

TARGET_INPUT="$1"

if [ ! -e "$TARGET_INPUT" ]; then
  echo "Error: no such file or directory: $TARGET_INPUT" >&2
  exit 1
fi

# Resolve to an absolute path so state entries are unambiguous.
TARGET="$(cd "$(dirname "$TARGET_INPUT")" && pwd)/$(basename "$TARGET_INPUT")"

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$SKILL_DIR/state"
STATE_FILE="$STATE_DIR/served.json"
mkdir -p "$STATE_DIR"

# Prefer the tailscale IP; fall back to loopback if tailscale is down or absent.
TS_IP=""
if command -v tailscale >/dev/null 2>&1; then
  TS_IP="$(tailscale ip -4 2>/dev/null | grep -Eo '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || true)"
fi
FALLBACK=""
if [ -z "$TS_IP" ]; then
  TS_IP="127.0.0.1"
  FALLBACK="1"
  echo "Note: tailscale IP unavailable (tailscaled down or not installed). Binding to 127.0.0.1 instead — only reachable from this Mac." >&2
fi

# Serving a single file means serving its parent dir and pointing the URL at the file.
if [ -d "$TARGET" ]; then
  SERVE_DIR="$TARGET"
  URL_SUFFIX=""
else
  SERVE_DIR="$(dirname "$TARGET")"
  URL_SUFFIX="$(basename "$TARGET")"
fi

# Find the first free port at or above 8080 on the chosen IP.
PORT="$(python3 - "$TS_IP" <<'PYEOF'
import socket
import sys

ip = sys.argv[1]
port = 8080
while port < 8180:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.bind((ip, port))
        s.close()
        print(port)
        sys.exit(0)
    except OSError:
        s.close()
        port += 1
sys.exit("no free port found in range 8080-8179")
PYEOF
)"

LOG_FILE="$STATE_DIR/serve-$PORT.log"

nohup python3 -m http.server "$PORT" --bind "$TS_IP" --directory "$SERVE_DIR" \
  > "$LOG_FILE" 2>&1 &
PID=$!
disown 2>/dev/null || true

# Give the server a moment to bind before trusting it's alive.
sleep 0.3
if ! kill -0 "$PID" 2>/dev/null; then
  echo "Error: server failed to start. Log output:" >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

ENCODED_SUFFIX="$(python3 -c 'import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))' "$URL_SUFFIX")"
URL="http://$TS_IP:$PORT/$ENCODED_SUFFIX"
STARTED="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

python3 - "$STATE_FILE" "$PID" "$PORT" "$TARGET" "$STARTED" "$URL" <<'PYEOF'
import json
import sys

state_file, pid, port, path, started, url = sys.argv[1:7]

try:
    with open(state_file) as f:
        data = json.load(f)
    if not isinstance(data, list):
        data = []
except (FileNotFoundError, json.JSONDecodeError):
    data = []

data.append({
    "pid": int(pid),
    "port": int(port),
    "path": path,
    "started": started,
    "url": url,
})

with open(state_file, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PYEOF

echo "Serving $TARGET"
if [ -n "$FALLBACK" ]; then
  echo "(fallback: bound to 127.0.0.1, not tailscale)"
fi
echo "PID: $PID"
echo "URL: $URL"
