# Hook Event Details

Complete stdin schemas and output formats for every Claude Code hook event.

## Table of Contents

1. [Common Input Fields](#common-input-fields)
2. [PreToolUse](#pretooluse)
3. [PostToolUse](#posttooluse)
4. [UserPromptSubmit](#userpromptsubmit)
5. [Stop](#stop)
6. [SubagentStop](#subagentstop)
7. [PermissionRequest](#permissionrequest)
8. [SessionStart](#sessionstart)
9. [SessionEnd](#sessionend)
10. [Exit Code Summary](#exit-code-summary)
11. [Output Format Summary](#output-format-summary)

## Common Input Fields

All hook events receive these fields in the stdin JSON:

```json
{
  "session_id": "unique-session-identifier",
  "transcript_path": "/path/to/conversation.json",
  "cwd": "/current/working/directory",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `session_id` | string | Unique identifier for the current session |
| `transcript_path` | string | Path to the conversation JSON file |
| `cwd` | string | Working directory when the hook fires |
| `permission_mode` | string | Current permission mode (e.g., "default", "plan", "acceptEdits") |
| `hook_event_name` | string | Name of the event that triggered this hook |

## PreToolUse

**Fires:** Before any tool executes.

**Stdin (event-specific fields):**

```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm run test"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `tool_name` | string | Name of the tool about to execute (Bash, Write, Edit, Read, Glob, Grep, etc.) |
| `tool_input` | object | Arguments passed to the tool (varies by tool type) |

**Common tool_input shapes:**
- `Bash`: `{ "command": "..." }`
- `Write`: `{ "file_path": "...", "content": "..." }`
- `Edit`: `{ "file_path": "...", "old_string": "...", "new_string": "..." }`
- `Read`: `{ "file_path": "..." }`

**Output options:**

Exit code 2 (simple block):
```bash
echo "Reason for blocking" >&2
exit 2
```

JSON stdout (fine-grained, exit 0):
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Use rg instead of grep"
  }
}
```

| Decision | Effect |
|----------|--------|
| `"allow"` | Proceed without showing permission prompt |
| `"deny"` | Cancel the tool call, send reason to Claude as feedback |
| `"ask"` | Show the normal permission prompt to the user |

## PostToolUse

**Fires:** After a tool completes execution.

**Stdin (event-specific fields):**

```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm run test"
  },
  "tool_output": "All tests passed"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `tool_name` | string | Name of the tool that executed |
| `tool_input` | object | Arguments that were passed to the tool |
| `tool_output` | string | Output/result from the tool execution |

**Output (JSON stdout, exit 0):**

```json
{
  "decision": "block",
  "reason": "TypeScript compilation errors detected"
}
```

| Decision | Effect |
|----------|--------|
| `"approve"` or exit 0 | Normal — no special action |
| `"block"` | Report the issue back to Claude for correction |

## UserPromptSubmit

**Fires:** When the user sends a message/prompt.

**Stdin (event-specific fields):**

```json
{
  "prompt": "Help me refactor the authentication module"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `prompt` | string | The user's submitted prompt text |

**Output (JSON stdout, exit 0):**

```json
{
  "additionalContext": "Reminder: this project uses JWT tokens, not sessions. Auth module is in src/auth/."
}
```

Exit code 2 blocks the prompt from being submitted.

## Stop

**Fires:** When the main agent considers stopping.

**Stdin:** Common fields plus stop context.

**Output (JSON stdout, exit 0):**

```json
{
  "decision": "block",
  "reason": "Tests have not been run yet",
  "systemMessage": "Run the test suite before marking complete"
}
```

| Decision | Effect |
|----------|--------|
| `"approve"` | Allow the agent to stop |
| `"block"` | Prevent stopping, send reason/systemMessage to Claude |

## SubagentStop

**Fires:** When a sub-agent considers stopping.

Same input/output pattern as Stop.

## PermissionRequest

**Fires:** When a permission prompt is about to be shown to the user.

**Stdin (event-specific fields):** Permission context including the tool and requested action.

**Output (JSON stdout, exit 0):**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow",
      "updatedInput": {
        "command": "npm run lint"
      },
      "updatedPermissions": {}
    }
  }
}
```

**Allow options:**
| Field | Description |
|-------|-------------|
| `behavior` | `"allow"` or `"deny"` |
| `updatedInput` | (optional) Modify the tool's input before execution |
| `updatedPermissions` | (optional) Apply permission rule updates |

**Deny options:**
| Field | Description |
|-------|-------------|
| `behavior` | `"deny"` |
| `message` | (optional) Reason for denial |
| `interrupt` | (optional, boolean) If true, stops Claude entirely |

## SessionStart

**Fires:** When a session begins (startup, resume, or compact).

**Stdin (event-specific fields):**

```json
{
  "source": "startup"
}
```

| Field | Type | Values |
|-------|------|--------|
| `source` | string | `"startup"`, `"resume"`, `"compact"` |

**Output:** Can inject `additionalContext` or perform setup tasks.

## SessionEnd

**Fires:** When a session ends.

**Stdin:** Common fields plus session context.

**Output:** Typically used for cleanup, logging, or learning extraction. No decision control.

## Exit Code Summary

| Code | Meaning | Behavior |
|------|---------|----------|
| 0 | Success / Allow | Action proceeds. Optional JSON stdout for fine-grained control. |
| 2 | Block / Deny | Action prevented. stderr becomes Claude's feedback. |
| 1 or other | Hook error | Logged as warning. Action proceeds (fail-open). |

**Critical rule:** Exit code 2 + JSON stdout = JSON is ignored. Use one approach or the other.

## Output Format Summary

| Event | Simple Control | Structured Control |
|-------|---------------|-------------------|
| PreToolUse | Exit 0 (allow) / Exit 2 (block+stderr) | `hookSpecificOutput.permissionDecision` |
| PostToolUse | Exit 0 (ok) / Exit 2 (report) | `decision: "block"` |
| UserPromptSubmit | Exit 0 (ok) / Exit 2 (block prompt) | `additionalContext` |
| Stop | Exit 0 (approve) / Exit 2 (block) | `decision: "approve\|block"` |
| SubagentStop | Same as Stop | Same as Stop |
| PermissionRequest | Exit 0 (normal prompt) | `hookSpecificOutput.decision.behavior` |
| SessionStart | Exit 0 | `additionalContext` |
| SessionEnd | Exit 0 | — |
