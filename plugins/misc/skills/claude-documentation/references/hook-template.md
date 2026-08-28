# Hook Documentation Template

Use this template when generating a README for a Claude Code hook.

## Template Structure

```markdown
# {Hook Name}

> {One-line description of what the hook does}

## Overview

{2-3 sentences explaining the hook's purpose, what behavior it enforces or automates, and when it fires.}

## Lifecycle Event

| Property | Value |
|----------|-------|
| **Event** | `{PreToolUse / PostToolUse / Stop / SessionStart / ...}` |
| **Matcher** | `{tool name, glob pattern, or empty for all}` |
| **Timeout** | `{timeout in ms, or default}` |

## What It Does

{Clear explanation of the hook's behavior. What does it check, enforce, modify, or log?}

## Matching Rules

{Explain what triggers this hook. Include the matcher pattern and what tools/events it applies to.}

- **Matches:** {What it catches}
- **Skips:** {What it ignores}

{If the hook uses glob patterns or multiple matchers, list them in a table:}

| Matcher | Targets |
|---------|---------|
| `{pattern}` | {What it matches} |

## Configuration

```json
{
  "hooks": {
    "{EventType}": [
      {
        "matcher": "{matcher pattern}",
        "hooks": [
          {
            "type": "command",
            "command": "{the command that runs}"
          }
        ]
      }
    ]
  }
}
```

**Location:** Add this to `.claude/settings.json` (project-level) or `~/.claude/settings.json` (global).

## Hook Script

{If the hook runs an external script, document it here.}

**Script location:** `{path to script}`

**What it does:**
1. {Step 1}
2. {Step 2}
3. ...

**Exit codes:**

| Code | Meaning | Effect |
|------|---------|--------|
| `0` | Success / allow | Tool call proceeds normally |
| `2` | Block | Tool call is blocked with optional message |
| Other | Error | Treated as hook failure |

**JSON output (optional):**

```json
{
  "decision": "allow | block | skip",
  "reason": "{message shown to user when blocked}"
}
```

## Setup & Installation

1. {Step-by-step installation instructions}
2. {Include exact file paths and commands}
3. {Make it copy-paste ready}

**Prerequisites:**
- {Any dependencies: jq, bash, specific CLI tools}
- {Environment variables needed}

## When This Hook Fires

- {Scenario 1: specific situation that triggers the hook}
- {Scenario 2}
- ...

## When This Hook Does NOT Fire

- {Scenario where it's skipped or not applicable}
- {Tools/events it doesn't match}

## Examples

### Example 1: {Scenario — hook allows}

**Trigger:** {What the user or Claude does}
**Hook behavior:** {What the hook checks/does}
**Result:** {Outcome — allowed, proceeds normally}

### Example 2: {Scenario — hook blocks}

**Trigger:** {What the user or Claude does}
**Hook behavior:** {What the hook checks/does}
**Result:** {Outcome — blocked, with reason message}

## Dependencies

- {External tools required by the hook script}
- {Other hooks it interacts with}
- {If none: "No external dependencies."}

## Limitations

- {Known limitation 1}
- {Known limitation 2}
- {If none known: omit this section}

## Related Components

- [{Related hook/skill/agent}]({path}) — {relationship}
```

## Section Guidelines

| Section | Required | Notes |
|---------|----------|-------|
| Overview | Yes | Include the lifecycle event in the description |
| Lifecycle Event | Yes | Table format — event, matcher, timeout |
| What It Does | Yes | Plain language explanation |
| Matching Rules | Yes | Be specific about what triggers and what doesn't |
| Configuration | Yes | Show the exact JSON for settings.json |
| Hook Script | Conditional | Required if hook runs an external script |
| Setup & Installation | Yes | Copy-paste ready steps |
| When This Hook Fires | Yes | Concrete scenarios |
| When This Hook Does NOT Fire | Yes | Prevents confusion |
| Examples | Yes | At least one allow and one block scenario |
| Dependencies | Yes | List all or state "none" |
| Limitations | Optional | Include if known |
| Related Components | Optional | Include if part of a toolkit |

---

## Completed Example

Below is a finished README for a real hook. Match this tone, detail level, and formatting.

```markdown
# Protected Files Hook

> Prevents Claude from editing sensitive configuration files without explicit user approval.

## Overview

The protected-files hook intercepts file edit operations and blocks modifications to designated sensitive files — environment configs, CI/CD pipelines, and security-critical configs. It fires on every `Edit` and `Write` tool call, checks the target path against a blocklist, and either allows the operation or blocks it with an explanation.

## Lifecycle Event

| Property | Value |
|----------|-------|
| **Event** | `PreToolUse` |
| **Matcher** | `Edit, Write` |
| **Timeout** | `10000` (10 seconds) |

## What It Does

Reads the file path from the incoming tool call, compares it against a list of protected path patterns, and returns a block decision if the path matches. The block message tells the user which file was protected and why.

## Matching Rules

- **Matches:** `Edit` and `Write` tool calls targeting any file path
- **Skips:** `Read`, `Glob`, `Grep`, `Bash`, and all other tool calls

## Configuration

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/protected-files.sh"
          }
        ]
      }
    ]
  }
}
```

**Location:** `~/.claude/settings.json` (global) or `.claude/settings.json` (project-level).

## Hook Script

**Script location:** `~/.claude/hooks/protected-files.sh`

**What it does:**
1. Reads the tool input JSON from stdin
2. Extracts the `file_path` parameter
3. Checks the path against the `PROTECTED_PATTERNS` array
4. Outputs a JSON decision: allow or block with reason

**Exit codes:**

| Code | Meaning | Effect |
|------|---------|--------|
| `0` | Path is not protected | Edit/write proceeds |
| `2` | Path is protected | Edit/write is blocked |

**JSON output on block:**

```json
{
  "decision": "block",
  "reason": "Protected file: .env files contain secrets and should be edited manually"
}
```

## Setup & Installation

1. Add the configuration JSON above to your `.claude/settings.json`
2. Copy `protected-files.sh` to `~/.claude/hooks/`
3. Make it executable: `chmod +x ~/.claude/hooks/protected-files.sh`
4. Edit the `PROTECTED_PATTERNS` array in the script to match your needs

**Prerequisites:**
- Bash 4.0+
- `jq` installed (for JSON parsing)

## When This Hook Fires

- Claude attempts to edit `.env`, `.env.local`, or any `.env.*` file
- Claude attempts to write to `*.pem`, `*.key`, or certificate files
- Claude attempts to modify `.github/workflows/*.yml` CI/CD pipelines
- Claude attempts to edit `Dockerfile` or `docker-compose.yml`

## When This Hook Does NOT Fire

- Claude reads protected files (Read tool is not matched)
- Claude runs bash commands that might touch these files (Bash not matched)
- Claude edits files not in the protected patterns list

## Examples

### Example 1: Editing a regular source file (allowed)

**Trigger:** Claude calls `Edit` on `src/utils/helpers.ts`
**Hook behavior:** Extracts path, checks against patterns — no match
**Result:** Returns exit code 0, edit proceeds normally

### Example 2: Editing an environment file (blocked)

**Trigger:** Claude calls `Write` on `.env.production`
**Hook behavior:** Extracts path, matches `.env.*` pattern
**Result:** Returns exit code 2 with message: "Protected file: .env files contain secrets and should be edited manually"

## Dependencies

- `jq` — for parsing JSON input from stdin
- Bash 4.0+ — for pattern matching with `=~`

## Limitations

- Does not protect against Bash commands that modify files (e.g., `sed -i`)
- Pattern matching is regex-based; complex glob patterns may need adjustment
- Cannot distinguish between "adding a comment" and "changing a secret value"

## Related Components

- [commit-guard](../commit-guard/) — Prevents committing sensitive files (complementary protection layer)
```
