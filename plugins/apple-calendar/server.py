#!/usr/bin/env python3
"""Apple Calendar MCP server — wraps ~/.local/bin/ical for remote Claude sessions."""

import os
import subprocess
from pathlib import Path

from fastmcp import FastMCP

ICAL = str(Path.home() / ".local" / "bin" / "ical")
mcp = FastMCP("apple-calendar")


def _run(*args: str) -> str:
    try:
        result = subprocess.run(
            [ICAL, *args],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=30,
        )
        if result.returncode != 0:
            err = result.stderr.strip() or result.stdout.strip() or "unknown error"
            return f"Error: {err}"
        return result.stdout.strip() or "No output."
    except FileNotFoundError:
        return f"Error: ical script not found at {ICAL}"
    except subprocess.TimeoutExpired:
        return (
            "Error: Calendar query timed out after 30s. If `ical` was just rebuilt or "
            "Calendar permissions were reset, the one-time macOS permission handshake may "
            "need a manual kick: run `ical today` in a terminal on the Mac."
        )


@mcp.tool
def list_calendars() -> str:
    """List all available Apple Calendars by name."""
    return _run("calendars")


@mcp.tool
def get_today(details: bool = False) -> str:
    """Get today's calendar events. Set details=True to include notes and URLs."""
    return _run("today", *(["-x"] if details else []))


@mcp.tool
def get_tomorrow(details: bool = False) -> str:
    """Get tomorrow's calendar events."""
    return _run("tomorrow", *(["-x"] if details else []))


@mcp.tool
def get_week(details: bool = False) -> str:
    """Get this week's calendar events (next 7 days)."""
    return _run("week", *(["-x"] if details else []))


@mcp.tool
def get_month(details: bool = False) -> str:
    """Get this month's calendar events (next 30 days)."""
    return _run("month", *(["-x"] if details else []))


@mcp.tool
def get_next_days(days: int, details: bool = False) -> str:
    """Get calendar events for the next N days."""
    return _run("next", str(days), *(["-x"] if details else []))


@mcp.tool
def get_calendar_events(calendar_name: str, days: int = 7, details: bool = False) -> str:
    """Get events from a specific Apple Calendar by name."""
    return _run("cal", calendar_name, str(days), *(["-x"] if details else []))


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser(description="Apple Calendar MCP server")
    p.add_argument("--stdio", action="store_true", help="Use stdio transport (for local Claude Code)")
    p.add_argument("--host", default=os.environ.get("CALENDAR_MCP_HOST", "0.0.0.0"))
    p.add_argument("--port", type=int, default=int(os.environ.get("CALENDAR_MCP_PORT", "3456")))
    args = p.parse_args()

    if args.stdio:
        mcp.run(transport="stdio")
    else:
        mcp.run(transport="http", host=args.host, port=args.port)
