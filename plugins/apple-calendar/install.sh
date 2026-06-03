#!/usr/bin/env bash
# Installs the Apple Calendar MCP server as a persistent launchd service.
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$HOME/.local/share/apple-calendar-mcp"
PLIST_ID="com.hunterbrewer.apple-calendar-mcp"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_ID}.plist"
PORT="${CALENDAR_MCP_PORT:-3456}"

# Bind to the Tailscale IP when available so the unauthenticated MCP server is
# NOT exposed to the whole LAN. Override with CALENDAR_MCP_HOST=0.0.0.0 if needed.
TS_IP="$( (tailscale ip -4 2>/dev/null || /Applications/Tailscale.app/Contents/MacOS/Tailscale ip -4 2>/dev/null || true) | head -1 )"
HOST="${CALENDAR_MCP_HOST:-${TS_IP:-0.0.0.0}}"
LOG_DIR="$HOME/Library/Logs/apple-calendar-mcp"
mkdir -p "$LOG_DIR"

echo "==> Creating virtual environment at $VENV_DIR..."
python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install -q -r "$PLUGIN_DIR/requirements.txt"
echo "    deps installed."

echo "==> Writing launchd plist..."
cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_ID}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${VENV_DIR}/bin/python3</string>
        <string>${PLUGIN_DIR}/server.py</string>
        <string>--host</string>
        <string>${HOST}</string>
        <string>--port</string>
        <string>${PORT}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/out.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/err.log</string>
</dict>
</plist>
EOF

# Load (unload first if already registered to pick up any changes).
# bootout tears down asynchronously — bootstrapping too soon fails with EIO,
# so wait until the old job is actually gone.
launchctl bootout "gui/$UID/${PLIST_ID}" 2>/dev/null || true
for _ in $(seq 1 10); do
    launchctl print "gui/$UID/${PLIST_ID}" >/dev/null 2>&1 || break
    sleep 1
done
launchctl bootstrap "gui/$UID" "$PLIST_PATH"

echo ""
echo "✓ Apple Calendar MCP server running on ${HOST}:${PORT}."
if [ -z "$TS_IP" ]; then
    echo "  ⚠ Tailscale not detected — bound to 0.0.0.0 (reachable from the whole LAN)."
fi
echo ""

LOCAL_IP="${TS_IP:-$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "<your-mac-ip>")}"
echo "Add this to ~/.claude.json (or .mcp.json) on any remote machine:"
echo ""
echo '  "mcpServers": {'
echo '    "apple-calendar": {'
echo '      "type": "http",'
echo "      \"url\": \"http://${LOCAL_IP}:${PORT}/mcp\""
echo '    }'
echo '  }'
echo ""
echo "Logs: tail -f ${LOG_DIR}/out.log"
echo "      tail -f ${LOG_DIR}/err.log"
