---
name: apple-calendar-connect
description: >
  Use when setting up THIS machine to reach a remote Apple Calendar MCP server. Triggers on
  "connect this machine to my apple calendar", "set up the apple-calendar mcp server here",
  "add my calendar server", "configure apple calendar mcp", "link this machine to my calendar",
  or rotating/fixing the calendar server connection. It prompts for the server URL and bearer
  token, registers the MCP client entry via `claude mcp add`, and verifies the connection. Do
  NOT use this to QUERY the calendar ("what's on my calendar", "today's events", "this week") —
  that is the `apple-calendar` skill (local) or the calendar MCP tools (remote) once connected.
---

## What this does

Registers an MCP **client** entry on the current machine so an MCP-compatible app here can read
the calendar served by your Mac (the `apple-calendar-mcp` HTTP server). This is one-time setup —
once it's done, the calendar tools (`get_today`, `get_week`, …) appear automatically and you
query them by just asking.

This skill does **not** install or run a server. The server runs on the Mac (installed via
`brew install hunterbrewer04/tap/apple-calendar`, started with `ical serve setup --tailscale`,
which writes a user LaunchAgent that reads its token from `~/.config/apple-calendar/token`); every
other machine only needs the URL and a token, which is what this skill wires up.

## When to use it

- Connecting a brand-new machine to the calendar server.
- Rotating the token, or fixing a connection that broke (wrong/expired token, moved server).

Do **not** use it to look up calendar events — that's a different skill / the tools themselves.

## Prerequisites

- This machine must be able to reach the Mac over the **same private network** (Tailscale tailnet
  or other VPN). Quick sanity check: `tailscale status` (or `ping <mac-ip>`).
- You need two values from the Mac host:
  - **Server URL** — usually `http://<mac-tailnet-ip>:3456/mcp` (the Mac prints it via `ical serve status`)
  - **Bearer token** — on the Mac, run `ical serve token` (copy with `ical serve token | pbcopy`)

## Process

### 1. Gather inputs

Ask the user for the **server URL** and the **bearer token**. If they don't have them, point them
at `ical serve status` (URL) and `ical serve token` (token) on the Mac host. Treat the token like a
password — don't echo it back in plaintext in your summaries.

### 2. Register the server (idempotent)

If unsure about flags for the installed CLI version, run `claude mcp add --help` first. Remove any
stale entry, then add the new one (`--scope user` makes it available across all projects on this
machine):

```bash
claude mcp remove apple-calendar --scope user 2>/dev/null || true
claude mcp add --transport http --scope user apple-calendar '<URL>' \
  --header 'Authorization: Bearer <TOKEN>'
```

**Fallback** — if the CLI flags differ, hand-edit the user MCP config to add:

```json
{
  "mcpServers": {
    "apple-calendar": {
      "type": "http",
      "url": "<URL>",
      "headers": { "Authorization": "Bearer <TOKEN>" }
    }
  }
}
```

### 3. Verify the connection

Run both checks (substitute the real URL/token):

```bash
# a) unauthenticated → expect 401 (server reachable AND auth is on)
curl -s -o /dev/null -w "unauth => %{http_code}\n" -X POST "<URL>" \
  -H 'Accept: application/json, text/event-stream' -d '{}'

# b) authenticated initialize → expect a JSON-RPC result with serverInfo
curl -s -X POST "<URL>" -H "Authorization: Bearer <TOKEN>" \
  -H 'Accept: application/json, text/event-stream' -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"setup","version":"0"}}}'
```

Interpret the results:

| Symptom | Meaning / fix |
|---|---|
| `curl` connection refused or times out | Not on the VPN, wrong URL/port, or the server isn't running on the Mac |
| (a) returns `200` instead of `401` | The server is running with `--no-auth` — warn the user that anyone on the network can read the calendar |
| (b) returns `401`/Unauthorized | Wrong or mistyped token |
| (a) `401` **and** (b) returns `serverInfo` | ✅ Connected correctly |

### 4. Confirm

Tell the user it's connected and that the calendar tools are now available (a client restart may be
needed for them to load). Suggest a test like "what's on my calendar".

## Notes

- **Scope:** `--scope user` = available in every project on this machine. Use `--scope project` to
  limit it to the current project only.
- **Security:** the token grants full **read + write** access to the whole calendar (the server also
  exposes create/update/delete tools) — treat it like a password. To rotate it, run `ical serve setup
  --force` on the Mac to mint a new token, then re-run this skill with it (remove-then-add is idempotent).
- **Not Claude-specific:** the server is a standard MCP-over-HTTP endpoint with bearer auth. Any
  MCP-capable client — Claude Desktop, Cursor, Cline, or a custom agent built on an MCP SDK — can use it
  with the same URL + `Authorization: Bearer <token>` header (the `mcpServers` JSON block above is the
  portable form). This skill only automates the Claude Code registration; the server itself isn't tied
  to Claude Code.
