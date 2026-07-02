---
name: apple-calendar-remote
description: "Use when the user asks about their Apple Calendar or schedule on a machine connected
  to the remote apple-calendar MCP server (a non-Mac server, or any agent using the calendar MCP
  tools). Triggers on 'what's on my calendar', 'today/tomorrow', 'this week', 'this month', 'what
  meetings do I have', 'anything coming up', 'put X on my calendar', 'schedule …', 'move my 3pm',
  'cancel …', 'delete that event', and similar look-up or add/change/remove requests. Uses the MCP
  tools (get_today, get_tomorrow, get_week, get_month, get_next_days, get_calendar_events,
  list_calendars, create_event, update_event, delete_event). Do NOT use on the Mac host where the
  local ical CLI exists — use the apple-calendar skill there. Do NOT use to register/connect the
  server — that is apple-calendar-connect."
---

## Description

Read and write the user's Apple Calendar through the **apple-calendar MCP server** (hosted on the
user's Mac, reached over the private network). The server exposes the same fast EventKit-backed
calendar as the local `ical` CLI, but as MCP tools — so this skill is the remote counterpart of the
local `apple-calendar` skill. The tools return the same pre-formatted, chronologically sorted text.

## Prerequisites

- The apple-calendar MCP tools must be registered on this machine (they appear as
  `…get_today`, `…create_event`, etc.). If they're absent, the server isn't connected — point the
  user at the **`apple-calendar-connect`** skill; do not try to run the CLI.
- **If the local `ical` binary is on PATH, you are on the Mac host — use the `apple-calendar` skill
  instead** (direct CLI is faster and needs no network). This skill is for machines that reach the
  calendar only over MCP.

## Important

- **Never guess an `event_id`.** Get it from a `details: true` listing (the `🆔` line) before
  `update_event` or `delete_event`, and confirm the event (title, time, calendar) before any
  destructive or rescheduling write — you're editing the user's real calendar.
- **Permission failures belong to the server, not this machine.** A "calendar access denied" error
  means the Mac host lost its Calendar (TCC) grant; the fix is on the Mac, not on the machine running
  this skill.

## Process

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

When the timeframe is ambiguous, default to `get_today`. For vague "coming up"/"upcoming", use
`get_week`.

### 2. Reading events

- All read tools accept `details` (boolean). Pass `details: true` when the user wants notes, URLs,
  or locations **or** when you will need an event's **id** for a follow-up edit/delete — the id only
  appears in a detailed listing.
- `get_calendar_events` needs `calendar_name`; if the name is uncertain, call `list_calendars`
  first and match, rather than guessing.

### 3. Writing events (create / update / delete)

Writes change the user's real calendar, so be deliberate:

- **Dates are ISO-8601:** `2026-07-01T14:30` for timed events; for all-day, pass a plain date
  `2026-07-01` with `all_day: true`. For `create_event`, `end` is required unless `all_day` is true.
- **Get the `event_id` before `update_event`/`delete_event`.** Fetch it from a `details: true`
  listing (its `🆔` line) — never invent an id.
- `update_event` changes only the fields you pass. To reschedule, pass new `start`/`end`.
- **Confirm before deleting or rescheduling:** verify you have the right event (title, time,
  calendar), and echo back what you changed after the write.

### 4. Present results

The tool output is already formatted and sorted, e.g.:

```
  Jun 3   1:30 PM – 2:30 PM  1:1 with Sarah
                             📍 Zoom
                             📅 Work
  Jun 3   all day            RENT / Utilities
                             📅 Bills / Subscriptions
```

Relay it directly. Interpretation notes:

- **Recurring events are expanded** — every instance in the window appears.
- **Ongoing multi-day events show their original start date** (e.g., `get_tomorrow` may list a
  `Jun 2` row for a conference still running) — that's correct; say the event is ongoing.
- If there are no events, say so plainly; don't fabricate.

### 5. Handle errors

Relay the tool's error text — it usually names the fix. Remote-specific meanings:

- **"Calendar access denied" / permission errors:** the TCC grant is on the **server (the Mac)**,
  not this machine — the fix is on the Mac host (System Settings → Privacy & Security → Calendars),
  not here. Tell the user to check the server.
- **Tool call fails to connect / times out:** the server or network is down (not on the VPN, Mac
  asleep, server stopped). This is a connection problem, not a bad request.
- **"Calendar 'X' not found":** the error lists valid names — pick the right one or show the list.

## Output

Reproduce the tool output cleanly. For multi-day results you may group by day or summarize in prose
if it reads more naturally — but never omit events or change times.
