# PreToolUse Bash Hook Example

A complete, production-ready PreToolUse hook that blocks dangerous Bash commands.

## Script: `.claude/hooks/block-dangerous-commands.sh`

```bash
#!/bin/bash
set -euo pipefail

# Read all stdin (required — broken pipes cause errors)
input=$(cat)

# Parse tool name — exit early if not a Bash command
tool_name=$(echo "$input" | jq -r '.tool_name // empty')
if [[ "$tool_name" != "Bash" ]]; then
  exit 0
fi

# Parse the command
command=$(echo "$input" | jq -r '.tool_input.command // empty')
if [[ -z "$command" ]]; then
  exit 0
fi

# --- Validation rules ---

# Block rm -rf on root or home
if echo "$command" | grep -qE 'rm\s+-rf\s+(/|~/|\$HOME)'; then
  echo "BLOCKED: Destructive rm -rf on root or home directory" >&2
  exit 2
fi

# Block force push to main/master
if echo "$command" | grep -qE 'git\s+push\s+.*--force.*\s+(main|master)'; then
  echo "BLOCKED: Force push to main/master is not allowed" >&2
  exit 2
fi

# Block dropping database tables
if echo "$command" | grep -qi 'drop\s+table'; then
  echo "BLOCKED: DROP TABLE commands are not allowed" >&2
  exit 2
fi

# Warn about curl piped to bash (but allow)
if echo "$command" | grep -qE 'curl.*\|\s*(bash|sh)'; then
  echo "WARNING: curl piped to shell detected — review carefully" >&2
  # Exit 0 = allow but the warning appears as feedback
  exit 0
fi

# All clear
exit 0
```

## Configuration: `.claude/settings.json`

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/block-dangerous-commands.sh",
            "timeout": 15
          }
        ],
        "description": "Block dangerous Bash commands (rm -rf /, force push main, drop table)"
      }
    ]
  }
}
```

## Testing

```bash
# Test: should block rm -rf /
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"session_id":"test","cwd":"/tmp","hook_event_name":"PreToolUse"}' | bash .claude/hooks/block-dangerous-commands.sh
echo "Exit: $?"  # Should be 2

# Test: should allow normal command
echo '{"tool_name":"Bash","tool_input":{"command":"ls -la"},"session_id":"test","cwd":"/tmp","hook_event_name":"PreToolUse"}' | bash .claude/hooks/block-dangerous-commands.sh
echo "Exit: $?"  # Should be 0

# Test: should skip non-Bash tools
echo '{"tool_name":"Read","tool_input":{"file_path":"test.txt"},"session_id":"test","cwd":"/tmp","hook_event_name":"PreToolUse"}' | bash .claude/hooks/block-dangerous-commands.sh
echo "Exit: $?"  # Should be 0
```

## Key Patterns Demonstrated

1. **Read all stdin** with `$(cat)` before any processing
2. **Early exit** for non-matching tool names
3. **Defensive parsing** with `// empty` in jq
4. **Exit code 2** with stderr message for blocking
5. **Exit code 0** with stderr for warnings (non-blocking)
6. **Graceful handling** of empty/missing fields
