---
name: apple-calendar
description: "Use when the user asks about their Apple Calendar (or wants to set it up) on a machine
  that reaches it over the network via the apple-calendar MCP server. Covers first-time setup
  ('connect/set up/link my apple calendar here',
  'add my calendar server', 'rotate the token') AND everyday use ('what's on my calendar',
  'today/tomorrow', 'this week', 'this month', 'what meetings do I have', 'anything coming up', 'put X
  on my calendar', 'schedule …', 'move my 3pm', 'cancel …', 'delete that event'). Registers the MCP
  client via `claude mcp add` when the tools aren't present yet, then uses them (get_today,
  get_tomorrow, get_week, get_month, get_next_days, get_calendar_events, list_calendars,
  create_event, update_event, delete_event). This is the networked/remote version; on the Mac host
  the calendar comes from the local ical CLI instead."
---

> Networked version (from claude-toolkit). Talks to the apple-calendar MCP server hosted on the
> user's Mac. On the Mac host, a same-named skill from the app repo uses the local `ical` CLI instead
> — the two never share a machine (the toolkit installer skips this skill where the app repo provides
> it).

## Description

Read and write the user's Apple Calendar through the **apple-calendar MCP server** (hosted on the
user's Mac, reached over the private network). The server exposes the same fast EventKit-backed
calendar as tools; it returns pre-formatted, chronologically sorted text.

## First-time setup (connect this machine)

Only needed when the calendar MCP tools aren't registered yet (they'd appear as `…get_today`,
`…create_event`, etc.). Skip straight to **Using the calendar** if they're already present.

1. **Prerequisite:** this machine must reach the Mac over the same private network (Tailscale/VPN).
   Sanity check: `tailscale status`. Get two values from the Mac host: the **URL** (`ical serve
   status` prints it, usually `http://<mac-tailnet-ip>:3456/mcp`) and the **token** (`ical serve
   token`). Treat the token like a password — don't echo it in summaries.
2. **Register (idempotent)** — single-quote the args so a token with `$`/backticks isn't mangled:
   ```bash
   claude mcp remove apple-calendar --scope user 2>/dev/null || true
   claude mcp add --transport http --scope user apple-calendar '<URL>' \
     --header 'Authorization: Bearer <TOKEN>'
   ```
   Fallback if the CLI flags differ — hand-edit the user MCP config:
   ```json
   { "mcpServers": { "apple-calendar": {
       "type": "http", "url": "<URL>",
       "headers": { "Authorization": "Bearer <TOKEN>" } } } }
   ```
3. **Verify:** unauthenticated → `401` (reachable + auth on); authenticated `initialize` → a result
   with `serverInfo`. A refused/timed-out curl means wrong network/URL or the server is down; a
   `401` on the authenticated call means a bad token.
   ```bash
   curl -s -o /dev/null -w "unauth => %{http_code}\n" -X POST '<URL>' \
     -H 'Accept: application/json, text/event-stream' -d '{}'
   ```
4. A client restart may be needed for the tools to load. To **rotate the token**, run `ical serve
   setup --force` on the Mac, then re-run this setup with the new token.

## Important

- **Never guess an `event_id`.** Get it from a `details: true` listing (the `🆔` line) before
  `update_event` or `delete_event`, and confirm the event (title, time, calendar) before any
  destructive or rescheduling write — you're editing the user's real calendar.
- **Permission failures belong to the server, not this machine.** A "calendar access denied" error
  means the Mac host lost its Calendar (TCC) grant; the fix is on the Mac, not here.
- The token grants full **read + write** — treat it like a password.

## Using the calendar

### 1. Map intent to a tool

| User asks about… | Tool (arguments) |
|---|---|
| Today's events | `get_today` |
| Tomorrow | `get_tomorrow` |
| This week (next 7 days) | `get_week` |
| This month (next 30 days) | `get_month` |
| Next N days | `get_next_days` (`days`) |
| A specific calendar | `get_calendar_events` (`calendar_name`, optional `days`) |
| Which calendars exist | `list_calendars` |
| Add an event | `create_event` |
| Change an event | `update_event` |
| Delete an event | `delete_event` |

When the timeframe is ambiguous, default to `get_today`; for vague "coming up", use `get_week`.

### 2. Reading events

All read tools accept `details` (boolean). Pass `details: true` when the user wants notes/URLs/
locations **or** when you'll need an event's **id** for a follow-up edit/delete. For
`get_calendar_events`, if the calendar name is uncertain, call `list_calendars` first and match
rather than guessing.

### 3. Writing events (create / update / delete)

- **Dates are ISO-8601:** `2026-07-01T14:30` for timed events; for all-day, pass a plain date
  `2026-07-01` with `all_day: true`. For `create_event`, `end` is required unless `all_day` is true.
- **Get the `event_id` first** (from a `details: true` listing) for `update_event`/`delete_event`.
- `update_event` changes only the fields you pass. To reschedule, pass new `start`/`end`.
- Confirm before deleting/rescheduling, and echo back what changed.

### 4. Present results

The output is already formatted and sorted, e.g.:

```
  Jun 3   1:30 PM – 2:30 PM  1:1 with Sarah
                             📍 Zoom
                             📅 Work
  Jun 3   all day            RENT / Utilities
                             📅 Bills / Subscriptions
```

Relay it directly. **Recurring events are expanded** (every instance in the window appears);
**ongoing multi-day events show their original start date** (say the event is ongoing). If there are
no events, say so plainly.

### 5. Handle errors

Relay the tool's error text — it usually names the fix. `"Calendar 'X' not found"` lists valid names.
For permission and connection errors, see **Important** above (server-side / network).

## Output

Reproduce the tool output cleanly. For multi-day results you may group by day or summarize in prose
if it reads more naturally — but never omit events or change times.
