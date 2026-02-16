---
name: hook-builder
description: Use when the user asks to "create a hook", "build a hook", "set up a hook", "make a PreToolUse hook", "make a PostToolUse hook", "add a Stop hook", or needs help writing Claude Code hooks, hook scripts, or hook configuration for settings.json. Also applies when discussing hook lifecycle events, hook matchers, exit codes, or hook JSON output.
---

# Hook Builder

## Overview

Build production-ready Claude Code hooks from scratch. Every hook consists of two parts: an executable script (Bash or Python) and a JSON configuration block for `.claude/settings.json`. Before generating any hook, query Context7 for the latest official Claude Code hooks documentation to ensure correct field names, supported events, and best practices.

## When to Use

- Creating a new hook from scratch (any lifecycle event)
- Writing hook scripts that parse stdin JSON and return decisions
- Configuring hook entries in `.claude/settings.json`
- Understanding hook exit codes, matchers, and output formats
- Debugging or fixing existing hooks

## Hook Creation Process

### Step 1: Gather Requirements

Ask the user:

1. **What should the hook do?** — The specific behavior or validation
2. **Which event?** — When should it fire? (see Event Reference below)
3. **What matcher?** — Which tools or patterns should trigger it?
4. **Script language?** — Bash or Python (default to Bash for simple hooks, Python for complex JSON logic)
5. **Scope?** — Project-local (`.claude/settings.json`) or global (`~/.claude/settings.json`)

### Step 2: Query Documentation

Before writing any hook code, use Context7 to query the official Claude Code hooks documentation:

```
Context7 library: /websites/code_claude
Query: "hooks [event-name] input format output decision exit codes"
```

This ensures the hook uses the latest API surface and correct field names.

### Step 3: Write the Script

#### Script Template (Bash)

```bash
#!/bin/bash
set -euo pipefail

# Read JSON input from stdin
input=$(cat)

# Parse fields (adapt to event type)
tool_name=$(echo "$input" | jq -r '.tool_name // empty')
tool_input=$(echo "$input" | jq -r '.tool_input // empty')

# --- Hook logic here ---

# Exit codes:
#   0 = allow / success (proceed normally)
#   2 = block / deny (prevent the action)
# Any other non-zero = hook error (logged, action proceeds)

exit 0
```

#### Script Template (Python)

```python
#!/usr/bin/env python3
import json
import sys

def main():
    input_data = json.load(sys.stdin)
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # --- Hook logic here ---

    # Exit 0 = allow, Exit 2 = block
    sys.exit(0)

if __name__ == "__main__":
    main()
```

#### Script Rules

1. **Always read stdin completely** — even if not needed. Failing to read stdin can break the pipe.
2. **Use `jq` for Bash JSON parsing** — never regex-parse JSON.
3. **Exit code 0** = allow/success. The action proceeds.
4. **Exit code 2** = block/deny. The action is prevented. Write reason to stderr.
5. **Any other non-zero exit** = hook error. Logged but action proceeds (fail-open).
6. **stderr** = feedback to Claude. Use for denial reasons and warnings.
7. **stdout** = structured JSON output (optional). For fine-grained control.
8. **Never mix exit 2 with JSON stdout** — Claude Code ignores JSON when exit code is 2.
9. **Handle malformed input gracefully** — always use `// empty` or `.get()` with defaults.
10. **Keep scripts fast** — hooks have timeouts (default varies by config).

### Step 4: Write the JSON Configuration

Add the hook to `.claude/settings.json` (or `~/.claude/settings.json` for global):

```json
{
  "hooks": {
    "EVENT_NAME": [
      {
        "matcher": "PATTERN",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/SCRIPT_NAME.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

#### Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `matcher` | Yes | Regex pattern for when to fire. `"*"` or `".*"` for all. Tool names for PreToolUse/PostToolUse. |
| `hooks[]` | Yes | Array of hook handlers to execute |
| `hooks[].type` | Yes | `"command"` (script) or `"prompt"` (LLM evaluation) |
| `hooks[].command` | For command type | Shell command to execute |
| `hooks[].prompt` | For prompt type | Prompt text for LLM evaluation |
| `hooks[].timeout` | No | Timeout in seconds (recommended: 15-45) |
| `description` | No | Human-readable description of what the hook does |

### Step 5: Set Permissions and Test

1. Make the script executable: `chmod +x .claude/hooks/script.sh`
2. Test with sample input:
   ```bash
   echo '{"tool_name":"Bash","tool_input":{"command":"ls"},"session_id":"test","cwd":"/tmp"}' | bash .claude/hooks/script.sh
   echo "Exit code: $?"
   ```
3. Verify the settings.json is valid JSON: `jq . .claude/settings.json`

## Event Reference

| Event | Fires When | Stdin Contains | Decision Options |
|-------|-----------|----------------|-----------------|
| `PreToolUse` | Before any tool executes | `tool_name`, `tool_input` | allow / deny / ask (via `hookSpecificOutput`) |
| `PostToolUse` | After a tool completes | `tool_name`, `tool_input`, `tool_output` | block (via `decision: "block"`) |
| `UserPromptSubmit` | User sends a message | `prompt` | `additionalContext` injection |
| `Stop` | Agent considers stopping | stop context | approve / block (via `decision`) |
| `SubagentStop` | Sub-agent considers stopping | stop context | approve / block |
| `PermissionRequest` | Permission prompt shown | permission context | allow / deny (via `decision.behavior`) |
| `SessionStart` | Session begins | `source` (startup/resume/compact) | `additionalContext` |
| `SessionEnd` | Session ends | session context | — |

**Common stdin fields (all events):** `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`

## Decision Output Patterns

Output patterns differ by event type. Use exit codes for simple allow/block, or JSON stdout for fine-grained control.

#### PreToolUse (JSON stdout, exit 0)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Use rg instead of grep"
  }
}
```

Options: `"allow"` (proceed, skip permission prompt), `"deny"` (cancel + feedback), `"ask"` (show normal permission prompt)

#### Stop / PostToolUse (JSON stdout, exit 0)

```json
{
  "decision": "block",
  "reason": "Tests have not been run yet",
  "systemMessage": "Run the test suite before stopping"
}
```

Options: `"approve"` (proceed) or `"block"` (prevent stopping / report issue)

#### PermissionRequest (JSON stdout, exit 0)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow",
      "updatedInput": { "command": "npm run lint" }
    }
  }
}
```

Options: `"allow"` (with optional `updatedInput`, `updatedPermissions`) or `"deny"` (with optional `message`, `interrupt`)

#### UserPromptSubmit / SessionStart (JSON stdout, exit 0)

```json
{
  "additionalContext": "Remember: always run tests before committing."
}
```

## Hook Types

| Type | Best For | How It Works |
|------|----------|-------------|
| `command` | Deterministic validation, file checks, formatting | Runs a shell command. Reads stdin, uses exit codes + stdout/stderr. |
| `prompt` | Subjective evaluation, code review, security analysis | Sends a prompt to the LLM for evaluation. LLM returns a decision. |

## Matcher Patterns

| Pattern | Matches |
|---------|---------|
| `"*"` or `".*"` | All events |
| `"Bash"` | Only Bash tool calls |
| `"Write\|Edit"` | Write or Edit tool calls |
| `"Bash\|Write\|Edit"` | Multiple specific tools |
| Tool-specific regex | Custom matching logic |

## Quick Reference

| Element | Rule |
|---------|------|
| Script location | `.claude/hooks/` (project) or `~/.claude/hooks/` (global) |
| Config location | `.claude/settings.json` or `~/.claude/settings.json` |
| Exit 0 | Allow / success |
| Exit 2 | Block / deny (stderr = reason) |
| Other non-zero | Hook error (fail-open, action proceeds) |
| stdin | JSON with event-specific fields |
| stdout | Optional structured JSON for decisions |
| stderr | Feedback messages to Claude |
| Permissions | Scripts must be `chmod +x` |

## Important Rules

1. **Query Context7 first** — Always fetch latest docs before generating hook code.
2. **Fail open** — Hooks should never break Claude Code. If something unexpected happens, exit 0.
3. **Read all stdin** — Even if not needed. Broken pipes cause errors.
4. **Never mix exit 2 + JSON stdout** — Use one or the other, not both.
5. **Validate inputs** — Use `// empty` in jq and `.get()` in Python for missing fields.
6. **Set timeouts** — Always include a timeout in the configuration to prevent hangs.
7. **Test with piped JSON** — Always provide a test command for manual verification.

## Additional Resources

- **`references/hook-event-details.md`** — Complete stdin schemas and output formats for every event type
- **`examples/pretooluse-bash-hook.md`** — Full working PreToolUse command hook in Bash
- **`examples/stop-python-hook.md`** — Full working Stop hook in Python with JSON output
