# Apple Calendar

> Query Apple Calendar from any local Claude Code session via the `ical` EventKit CLI — ~100ms reads straight from the calendar database, no Calendar.app required.

## Overview

The apple-calendar skill maps natural-language schedule questions ("what's on my calendar", "do I have anything tomorrow") to subcommands of `~/.local/bin/ical`, a compiled Swift CLI that reads the macOS calendar database through Apple's EventKit framework. Queries return in roughly 100 milliseconds, recurring events are fully expanded, and output is pre-formatted for direct relay. The skill is read-only by design.

## Trigger Phrases

This skill activates when you say:

- "What's on my calendar"
- "Do I have anything today/tomorrow"
- "Check my schedule"
- "Pull from iCal"
- "What meetings do I have"
- "What's this week look like"
- "Any events coming up"
- "Show me my calendar"

## Description Field

```
Use this skill whenever the user asks about their Apple Calendar or schedule. Triggers on
phrasings like "what's on my calendar", "pull from iCal", "do I have anything today/tomorrow",
"check my schedule", "what meetings do I have", "what's this week look like", "any events
coming up", "show me my calendar", or any request to look up, summarize, or reason about
calendar events. Uses ~/.local/bin/ical — a compiled Swift CLI that reads the calendar
database directly via Apple's EventKit framework (queries return in ~100ms; Calendar.app
does not need to be running). Do NOT use for creating, editing, or deleting calendar events
(the ical CLI is read-only).
```

## How It Works

1. **Map intent to command** — Translates the user's timeframe to an `ical` subcommand (`today`, `tomorrow`, `week`, `month`, `next N`, `cal "Name" [days]`, `calendars`); `-x` adds notes/URLs
2. **Run the command** — Executes via Bash; output is chronologically sorted and pre-formatted
3. **Present results** — Relays events directly, reasons over output for follow-up questions
4. **Handle errors** — Relays the CLI's actionable stderr messages (permission fixes, calendar-name suggestions)

## When to Use

- Looking up today's/this week's events in a local (on-Mac) session
- Summarizing or reasoning over upcoming schedule ("when's my next free morning?")
- Querying a specific calendar ("what's on my Work calendar this week?")

## When NOT to Use

- Creating, editing, or deleting events — the CLI is read-only
- Remote (non-Mac) sessions — use the [apple-calendar MCP plugin](../../plugins/apple-calendar/) tools instead

## Directory Structure

```
apple-calendar/
└── SKILL.md
```

## Setup & Installation

**Location:** `~/.claude/skills/apple-calendar/` (symlink to this repo directory)

**Prerequisites:**
- `~/.local/bin/ical` binary — build from source with `bash ~/Code/apple-calendar-mcp/build.sh` (compiles `ical.swift` and codesigns with a stable identifier so the calendar permission survives rebuilds)
- macOS Calendar (TCC) permission — one-time "Allow Full Access" dialog on first use

## Configuration

This skill requires no additional configuration.

## Dependencies

- `~/.local/bin/ical` (Swift/EventKit CLI; source lives in `~/Code/apple-calendar-mcp/`)
- macOS 14+ (EventKit `requestFullAccessToEvents` API)

## Examples

### Example 1: Daily check

**Input:** "What's on my calendar today?"

**Result:** Runs `~/.local/bin/ical today` and relays the formatted list — e.g. assignments due, recurring bills, meetings with 📍 location and 📅 calendar metadata.

### Example 2: Detailed week view

**Input:** "What's this week look like? Include the descriptions."

**Result:** Runs `~/.local/bin/ical week -x` and presents events grouped by day with 📝 notes and 🔗 URLs.

## Limitations

- Read-only — no event creation, editing, or deletion
- Ongoing multi-day events appear with their original start date (correct behavior worth explaining when relaying)
- Output locale is frozen to en_US formatting by design (deterministic for LLM consumption)

## Related Components

- [plugins/apple-calendar](../../plugins/apple-calendar/) — MCP server exposing the same data to remote Claude sessions over Tailscale
