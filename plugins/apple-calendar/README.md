# Apple Calendar MCP Server

> FastMCP server exposing Apple Calendar as 7 MCP tools over Streamable HTTP — lets remote Claude Code sessions query the Mac's calendar across Tailscale in ~60ms.

## Overview

This plugin wraps the `~/.local/bin/ical` EventKit CLI in a FastMCP server and runs it as a launchd service bound to the Mac's Tailscale IP on port 3456. Any Claude Code session on the tailnet can then call `get_today`, `get_week`, etc. as native MCP tools. The server is read-only and returns the CLI's pre-formatted output.

## MCP Tools

| Tool | Maps to | Notes |
|------|---------|-------|
| `list_calendars` | `ical calendars` | One calendar name per line |
| `get_today` | `ical today [-x]` | |
| `get_tomorrow` | `ical tomorrow [-x]` | |
| `get_week` | `ical week [-x]` | Next 7 days |
| `get_month` | `ical month [-x]` | Next 30 days |
| `get_next_days(days)` | `ical next N [-x]` | Rejects `days ≤ 0`; clamps at ~4 years |
| `get_calendar_events(calendar_name, days)` | `ical cal NAME DAYS [-x]` | Unknown names error with the available list |

All tools accept `details: bool` which appends `-x` (notes, descriptions, URLs). CLI failures surface as `Error: <actionable message>` strings.

## Architecture

```
Remote Claude Code (Tailscale)
  → http://<tailscale-ip>:3456/mcp   (Streamable HTTP, JSON-RPC 2.0)
  → FastMCP server (server.py, launchd service)
  → ~/.local/bin/ical                (Swift EventKit CLI)
  → Calendar database (~50ms)
```

## Setup & Installation

```bash
bash plugins/apple-calendar/install.sh
```

The installer:
1. Creates a venv at `~/.local/share/apple-calendar-mcp/` and installs FastMCP
2. Detects the Mac's Tailscale IP and binds the server to it (falls back to `0.0.0.0` with a warning if Tailscale is absent)
3. Registers LaunchAgent `com.hunterbrewer.apple-calendar-mcp` (starts on login, restarts on crash with a 30s throttle)
4. Logs to `~/Library/Logs/apple-calendar-mcp/{out,err}.log`

**Prerequisites:**
- `~/.local/bin/ical` built and installed (`bash ~/Code/apple-calendar-mcp/build.sh`)
- Python 3 + Tailscale on the Mac
- macOS Calendar permission for the service context — the first call may take ~14s (one-time TCC handshake); all subsequent calls are ~60ms

### Remote client config

Add to `~/.claude.json` or `.mcp.json` on any tailnet machine (`tailscale ip -4` on the Mac for the address):

```json
"mcpServers": {
  "apple-calendar": {
    "type": "http",
    "url": "http://<mac-tailscale-ip>:3456/mcp"
  }
}
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `CALENDAR_MCP_PORT` | `3456` | Server port (set before running install.sh) |
| `CALENDAR_MCP_HOST` | Tailscale IP, else `0.0.0.0` | Bind address (set before running install.sh) |
| `--stdio` | off | Run with stdio transport instead of HTTP (local debugging) |

## Uninstall

```bash
bash plugins/apple-calendar/uninstall.sh
```

Removes the LaunchAgent, venv, and log files.

## Dependencies

- `fastmcp>=3.0` (installed into the venv)
- `~/.local/bin/ical` EventKit CLI (source: `~/Code/apple-calendar-mcp/`)

## Limitations

- Read-only — no event creation/editing/deleting
- The Mac must be awake and on the tailnet for remote queries
- No authentication on the MCP endpoint — network access control is the Tailscale binding itself

## Related Components

- [skills/apple-calendar](../../skills/apple-calendar/) — the local (on-Mac) skill that runs the same CLI directly
