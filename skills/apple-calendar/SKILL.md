---
name: apple-calendar
description: >
  Use this skill whenever the user asks about their Apple Calendar or schedule. Triggers on
  phrasings like "what's on my calendar", "pull from iCal", "do I have anything today/tomorrow",
  "check my schedule", "what meetings do I have", "what's this week look like", "any events
  coming up", "show me my calendar", or any request to look up, summarize, or reason about
  calendar events. Uses ~/.local/bin/ical — a compiled Swift CLI that reads the calendar
  database directly via Apple's EventKit framework (queries return in ~100ms; Calendar.app
  does not need to be running). Do NOT use for creating, editing, or deleting calendar events
  (the ical CLI is read-only).
---

## Description

Query the user's Apple Calendar using the `~/.local/bin/ical` CLI and surface the results.
The binary queries the macOS calendar database directly through EventKit — no AppleScript,
no Calendar.app dependency, no external APIs. Queries are effectively instant, so never
hesitate to run several (e.g., `today` then `week`) to answer a question well.

## Prerequisites

- `~/.local/bin/ical` must exist and be executable
- macOS Calendar (TCC) permission for the calling context — macOS may show a one-time
  permission dialog on first use; tell the user to click "Allow Full Access"
- Source + build script live in `~/Code/apple-calendar-mcp/` (`ical.swift`, `build.sh`).
  Rebuilds MUST go through `build.sh` — it codesigns with a stable identifier so the
  calendar permission survives recompiles

## Process

### 1. Map intent to command

| User asks about... | Command |
|--------------------|---------|
| Today's events | `~/.local/bin/ical today` |
| Tomorrow | `~/.local/bin/ical tomorrow` |
| This week | `~/.local/bin/ical week` |
| Next N days | `~/.local/bin/ical next N` |
| This month | `~/.local/bin/ical month` |
| A specific calendar | `~/.local/bin/ical cal "Calendar Name" [days]` |
| Which calendars exist | `~/.local/bin/ical calendars` |
| Notes, descriptions, URLs | Add `-x` flag to any command, or use `ical detail [period]` |

When the user's timeframe is ambiguous, default to `today`. If they say "coming up" or
"upcoming" without a specific window, use `week`.

### 2. Run the command

Execute via Bash. Output is pre-formatted, chronologically sorted:

```
  Jun 3   1:30 PM – 2:30 PM  1:1 with Sarah
                             📍 Zoom
                             📅 Work
  Jun 3   all day           RENT / Utilities
                            📅 Bills / Subscriptions
```

Behaviors worth knowing when interpreting output:

- **Recurring events are expanded** — every instance in the window appears
- **Ongoing multi-day events appear too** — an event that *started earlier* but overlaps
  the queried window shows up with its original start date (e.g., `tomorrow` may list a
  `Jun 2` row for a conference still running). That's correct, not a glitch — mention the
  event is ongoing when relaying it
- Day counts ≤ 0 are rejected; counts above ~4 years are clamped (EventKit limit)

### 3. Present results

Relay the output directly. If there are no events, say so plainly. If the user asked a
follow-up question about the events (e.g., "which ones are in-person?", "when's my next
meeting after lunch?"), reason over the output to answer.

For queries that span multiple days, group your response by day if the raw output isn't
already clear.

### 4. Handle errors

The CLI exits non-zero with an actionable message on stderr — relay that message; it
usually contains the fix.

- **"Calendar access denied"**: Tell the user to open System Settings → Privacy & Security →
  Calendars and enable access for the app that ran the command (Terminal, Claude Code, etc.),
  then retry.
- **"permission dialog was never answered"**: A macOS dialog is (or was) waiting on screen —
  the user needs to click "Allow Full Access", then retry.
- **Script not found:** Rebuild and reinstall with `bash ~/Code/apple-calendar-mcp/build.sh`.
- **"No events."**: Report it literally — don't fabricate or guess.
- **"Calendar 'X' not found"**: The error lists available calendar names — pick the right
  one or show the user the list.

## Remote access

For Claude sessions on other machines, the same data is exposed as MCP tools
(`get_today`, `get_week`, etc.) by the `plugins/apple-calendar` FastMCP server, which runs
as a launchd service bound to the Mac's Tailscale IP on port 3456. This skill is for
local (on-Mac) use; remote sessions should use the MCP tools instead.

## Output

Reproduce the `ical` output cleanly. For multi-day results or summaries, you may reformat
into prose if it reads more naturally — but never omit events or change times.
