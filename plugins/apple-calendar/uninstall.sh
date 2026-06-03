#!/usr/bin/env bash
# Removes the Apple Calendar MCP server and its launchd service.
set -euo pipefail

PLIST_ID="com.hunterbrewer.apple-calendar-mcp"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_ID}.plist"
VENV_DIR="$HOME/.local/share/apple-calendar-mcp"

launchctl bootout "gui/$UID/${PLIST_ID}" 2>/dev/null || launchctl unload "$PLIST_PATH" 2>/dev/null || true
rm -f "$PLIST_PATH"
rm -rf "$VENV_DIR"
rm -rf "$HOME/Library/Logs/apple-calendar-mcp"
rm -f /tmp/apple-calendar-mcp.log /tmp/apple-calendar-mcp.error.log  # legacy log paths
echo "✓ Apple Calendar MCP server uninstalled."
