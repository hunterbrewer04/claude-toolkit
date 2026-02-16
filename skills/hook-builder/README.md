# Hook Builder

> Build production-ready Claude Code hooks from scratch.

## Overview

Hook Builder guides you through creating Claude Code hooks — executable scripts paired with JSON configuration blocks for `.claude/settings.json`. Every hook has two parts: a script (Bash or Python) that reads JSON from stdin and makes decisions via exit codes, and a configuration entry that defines when the hook fires. The skill covers all lifecycle events including PreToolUse, PostToolUse, Stop, UserPromptSubmit, SessionStart, and more.

## Trigger Phrases

- "create a hook"
- "build a hook"
- "set up a hook"
- "make a PreToolUse hook"
- "make a PostToolUse hook"
- "add a Stop hook"
- Discussions about hook lifecycle events, hook matchers, exit codes, or hook JSON output

## Description Field

```yaml
description: Use when the user asks to "create a hook", "build a hook", "set up a hook", "make a PreToolUse hook", "make a PostToolUse hook", "add a Stop hook", or needs help writing Claude Code hooks, hook scripts, or hook configuration for settings.json. Also applies when discussing hook lifecycle events, hook matchers, exit codes, or hook JSON output.
```

## How It Works

1. **Gather Requirements** — Ask about the hook's behavior, target event, matcher pattern, script language (Bash or Python), and scope (project-local or global).
2. **Query Documentation** — Use Context7 to fetch the latest official Claude Code hooks documentation for correct field names, supported events, and best practices.
3. **Write the Script** — Generate a Bash or Python script following template patterns: read stdin JSON, apply hook logic, use exit codes (0 = allow, 2 = block), write reasons to stderr.
4. **Write the JSON Configuration** — Generate the `.claude/settings.json` entry with matcher, hook type, command, and timeout.
5. **Set Permissions and Test** — Make the script executable with `chmod +x`, test with piped sample JSON input, and validate the settings.json is valid JSON.

## When to Use

- Creating a new hook from scratch (any lifecycle event)
- Writing hook scripts that parse stdin JSON and return decisions
- Configuring hook entries in `.claude/settings.json`
- Understanding hook exit codes, matchers, and output formats
- Debugging or fixing existing hooks

## When NOT to Use

- Creating skills (use `skill-builder`)
- Creating sub-agents (use `agent-builder`)
- Documenting an existing hook (use `claude-documentation`)

## Directory Structure

```
hook-builder/
├── SKILL.md
├── README.md
├── references/
│   └── hook-event-details.md
└── examples/
    ├── pretooluse-bash-hook.md
    └── stop-python-hook.md
```

## Setup & Installation

1. Copy or symlink the `hook-builder/` directory to `~/.claude/skills/hook-builder/`
2. Restart Claude Code to load the skill
3. Use any trigger phrase to invoke

For hooks created by this skill:
- Scripts go in `.claude/hooks/` (project) or `~/.claude/hooks/` (global)
- Configuration goes in `.claude/settings.json` or `~/.claude/settings.json`
- Scripts must be made executable with `chmod +x`

## Configuration

No configuration is needed for the skill itself. Hooks created by this skill are configured via `.claude/settings.json`.

## Dependencies

- Claude Code with skills support
- `jq` (for Bash hooks that parse JSON from stdin)
- Python 3 (for Python hooks)
- Context7 MCP tool (used to query latest Claude Code hooks documentation)

## Examples

### PreToolUse Hook: Block Dangerous Bash Commands

Trigger: "Create a hook that blocks rm -rf commands"

The skill will generate:

**Script** (`.claude/hooks/block-dangerous-commands.sh`):
```bash
#!/bin/bash
set -euo pipefail
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

if echo "$command" | grep -qE 'rm\s+-rf\s+/'; then
  echo "Blocked: dangerous rm -rf command" >&2
  exit 2
fi
exit 0
```

**Configuration** (`.claude/settings.json`):
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
        ]
      }
    ]
  }
}
```

### Event Reference

| Event | Fires When | Decision Options |
|-------|-----------|-----------------|
| `PreToolUse` | Before any tool executes | allow / deny / ask |
| `PostToolUse` | After a tool completes | block (via `decision`) |
| `UserPromptSubmit` | User sends a message | `additionalContext` injection |
| `Stop` | Agent considers stopping | approve / block |
| `SubagentStop` | Sub-agent considers stopping | approve / block |
| `PermissionRequest` | Permission prompt shown | allow / deny |
| `SessionStart` | Session begins | `additionalContext` |
| `SessionEnd` | Session ends | N/A |

### Exit Code Quick Reference

| Exit Code | Meaning | Behavior |
|-----------|---------|----------|
| 0 | Allow / success | Action proceeds normally |
| 2 | Block / deny | Action is prevented; stderr sent as reason |
| Other non-zero | Hook error | Logged; action proceeds (fail-open) |

## Related Components

- [skill-builder](../../skills/skill-builder/) — For creating skills instead of hooks
- [agent-builder](../../skills/agent-builder/) — For creating sub-agents instead of hooks
- [claude-documentation](../../skills/claude-documentation/) — For generating README documentation for hooks
- [claude-toolkit](../../skills/claude-toolkit/) — For publishing hooks to a toolkit repository
