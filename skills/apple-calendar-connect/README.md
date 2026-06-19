# apple-calendar-connect

Connect the current machine to a remote **Apple Calendar MCP server** — prompts for the server
URL + bearer token, registers the MCP client entry with `claude mcp add`, and verifies the
connection.

This is the companion to [apple-calendar-mcp](https://github.com/hunterbrewer04/apple-calendar-mcp).
The calendar **server** runs on a Mac (`brew install hunterbrewer04/tap/apple-calendar`); every
*other* machine uses this skill once to wire up the connection.

## Triggers

Setup phrasing only — for example:

- "connect this machine to my apple calendar"
- "set up the apple-calendar mcp server here"
- "add my calendar server"
- "configure / link apple calendar mcp on this machine"

It does **not** trigger on calendar *queries* ("what's on my calendar", "today's events") — those
are handled by the calendar tools themselves once you're connected.

## What it does

1. Prompts for the **server URL** (`http://<mac-tailnet-ip>:3456/mcp`) and the **bearer token**
   (from `launchctl getenv CALENDAR_MCP_TOKEN` on the Mac host).
2. Registers the server, idempotently:
   ```bash
   claude mcp remove apple-calendar --scope user 2>/dev/null || true
   claude mcp add --transport http --scope user apple-calendar "<URL>" \
     --header "Authorization: Bearer <TOKEN>"
   ```
3. Verifies: an unauthenticated request should return `401`, and an authenticated `initialize`
   should return `serverInfo`.

## Prerequisites

- The machine must reach the Mac over the same private network (Tailscale tailnet or other VPN).
- The server URL and bearer token from the Mac host.

## Notes

- Uses `--scope user` so the connection is available across all projects on the machine.
- The token grants read access to the whole calendar — treat it like a password. Re-run the skill
  to rotate it.
