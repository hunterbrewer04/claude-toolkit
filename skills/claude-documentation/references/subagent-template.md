# Sub-Agent Documentation Template

Use this template when generating a README for a Claude Code sub-agent.

## Template Structure

```markdown
# {Agent Name}

> {One-line description of what the agent does}

## Overview

{2-3 sentences explaining the agent's purpose, what tasks it handles, and why it exists as a separate agent rather than inline work.}

## Agent Configuration

| Property | Value |
|----------|-------|
| **Type** | `{subagent_type}` |
| **Model** | `{sonnet / opus / haiku, or "inherits from parent"}` |
| **Max Turns** | `{number, or "default"}` |

## Capabilities

{What this agent can do. List its core capabilities and the tools it has access to.}

**Available Tools:**
- {Tool 1} — {what it's used for}
- {Tool 2} — {what it's used for}
- ...

**Key Strengths:**
- {Strength 1}
- {Strength 2}

## Invocation Pattern

{How to invoke this agent. Show the Task tool call pattern.}

```
Task tool call:
  subagent_type: "{agent-type}"
  prompt: "{description of what to do}"
  description: "{short 3-5 word summary}"
```

**Example invocation:**

```
Task tool call:
  subagent_type: "{agent-type}"
  prompt: "Review the authentication module in src/auth/ for security vulnerabilities and report findings"
  description: "Review auth security"
```

## When to Use

- {Use case 1 — specific scenario}
- {Use case 2 — specific scenario}
- ...

## When NOT to Use

- {Anti-pattern 1 — what to use instead}
- {Anti-pattern 2 — what to use instead}

## How It Works

{Explain the agent's typical workflow or approach when handling a task.}

1. **{Phase 1}** — {What the agent does first}
2. **{Phase 2}** — {What it does next}
3. **{Phase 3}** — {How it concludes}

## Input/Output

**Input:** {What information the agent needs in its prompt — be specific about what context to provide}

**Output:** {What the agent returns — analysis report, modified files, recommendations, etc.}

## Directory Structure

```
{agent-name}/
├── {agent-definition-file}
└── {any supporting files}
```

## Setup & Installation

{How to install or register this agent.}

**Location:** `{where the agent definition lives}`

**Prerequisites:**
- {Any dependencies}

## Configuration Options

{Any configurable behavior.}

| Option | Default | Description |
|--------|---------|-------------|
| `model` | {default} | {what changing it does} |
| `max_turns` | {default} | {what changing it does} |

{If no configuration: "This agent uses default configuration."}

## Dependencies

- {Other agents it delegates to}
- {External tools or services it requires}
- {If none: "No external dependencies."}

## Examples

### Example 1: {Scenario name}

**Task:** "{What the user or parent agent asks for}"

**Agent behavior:** {What the agent does step by step}

**Result:** {What gets produced or returned}

### Example 2: {Scenario name}

**Task:** "{What the user or parent agent asks for}"

**Agent behavior:** {What the agent does}

**Result:** {What gets produced}

## Limitations

- {Known limitation 1}
- {Known limitation 2}
- {If none known: omit this section}

## Related Components

- [{Related agent/skill/hook}]({path}) — {relationship}
```

## Section Guidelines

| Section | Required | Notes |
|---------|----------|-------|
| Overview | Yes | Explain why this is an agent vs. inline work |
| Agent Configuration | Yes | Table format — type, model, max_turns |
| Capabilities | Yes | List tools and strengths |
| Invocation Pattern | Yes | Show exact Task tool call syntax |
| When to Use | Yes | Concrete scenarios |
| When NOT to Use | Yes | Prevent misuse |
| How It Works | Yes | Step-by-step workflow |
| Input/Output | Yes | What goes in, what comes out |
| Directory Structure | Conditional | If agent has supporting files |
| Setup & Installation | Yes | Copy-paste ready |
| Configuration Options | Conditional | Include if configurable |
| Dependencies | Yes | List all or state "none" |
| Examples | Yes | At least one realistic example |
| Limitations | Optional | Include if known |
| Related Components | Optional | Include if part of a toolkit |

---

## Completed Example

Below is a finished README for a real sub-agent. Match this tone, detail level, and formatting.

```markdown
# Code Reviewer Agent

> Expert code reviewer that analyzes changes for quality, security, and adherence to project standards.

## Overview

The code-reviewer agent performs thorough code reviews on recent changes, checking for style violations, security vulnerabilities, performance issues, and deviations from project conventions. It runs as a sub-agent to keep review context separate from the main conversation, preventing large diffs from consuming the parent's context window.

## Agent Configuration

| Property | Value |
|----------|-------|
| **Type** | `code-reviewer` |
| **Model** | Inherits from parent |
| **Max Turns** | Default |

## Capabilities

**Available Tools:**
- Read — Read source files and diffs
- Write — Create review report files
- Edit — Suggest fixes inline
- Bash — Run linters, type checkers, test suites
- Glob — Find files by pattern
- Grep — Search code for patterns

**Key Strengths:**
- Identifies security vulnerabilities (OWASP Top 10)
- Checks adherence to CLAUDE.md project conventions
- Spots performance anti-patterns
- Validates test coverage for changed code

## Invocation Pattern

```
Task tool call:
  subagent_type: "code-reviewer"
  prompt: "Review the unstaged changes in this repo for code quality, security issues, and adherence to project standards defined in CLAUDE.md"
  description: "Review recent changes"
```

**Example invocation:**

```
Task tool call:
  subagent_type: "code-reviewer"
  prompt: "Review the changes in src/auth/ for security vulnerabilities. Focus on input validation, SQL injection, and session management."
  description: "Review auth security"
```

## When to Use

- After completing a feature implementation, before committing
- Before creating a pull request
- After making security-sensitive changes (auth, payments, data access)
- When the user asks "review my code" or "check this looks good"

## When NOT to Use

- For simple typo fixes or one-line changes (overkill)
- For architectural planning (use Plan agent instead)
- For running tests only (use Bash directly)

## How It Works

1. **Gather context** — Reads CLAUDE.md for project standards, runs `git diff` to identify changed files
2. **Analyze changes** — Reviews each changed file for style, security, performance, and correctness issues
3. **Cross-reference** — Checks changes against project conventions and existing patterns
4. **Report findings** — Returns a structured summary with issues categorized by severity

## Input/Output

**Input:** A prompt describing what to review and what to focus on. Include specific file paths or directories if the review should be scoped. Mention particular concerns (security, performance) to guide focus.

**Output:** A structured review summary returned as text, containing:
- Issues found, categorized by severity (critical, warning, suggestion)
- Specific file and line references
- Recommended fixes or alternatives
- Overall assessment

## Setup & Installation

This agent is built into Claude Code's agent system. No additional installation required.

**Location:** Available via the Task tool with `subagent_type: "code-reviewer"`

**Prerequisites:**
- Project should have a CLAUDE.md for convention checking (optional but recommended)
- Git repository with changes to review

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `model` | Parent model | Use `haiku` for faster, cheaper reviews of small changes |
| `max_turns` | Default | Increase for very large changesets |

## Dependencies

- Git — for diffing changes
- Project's linter/formatter (if configured) — for style checking

## Examples

### Example 1: Pre-commit review

**Task:** "Review the unstaged changes for code quality and security issues"

**Agent behavior:** Runs `git diff`, reads each changed file, checks against CLAUDE.md conventions, scans for common vulnerabilities

**Result:** Returns summary: "2 warnings found: (1) Unvalidated user input in `src/api/users.ts:45` passed directly to SQL query — use parameterized query instead. (2) Missing error handling in `src/services/payment.ts:112` — catch block is empty."

### Example 2: Focused security review

**Task:** "Review src/auth/login.ts for authentication security issues"

**Agent behavior:** Reads the file, analyzes authentication flow, checks password handling, session management, rate limiting

**Result:** Returns summary: "1 critical issue: Password comparison at line 34 uses `===` instead of constant-time comparison — vulnerable to timing attacks. Use `crypto.timingSafeEqual()` instead. 1 suggestion: Consider adding rate limiting to prevent brute force attempts."

## Limitations

- Cannot run the application to test behavior (static analysis only)
- May miss issues that require full project context beyond the changed files
- Does not automatically fix issues — reports findings for human decision

## Related Components

- [pr-review-toolkit](../pr-review-toolkit/) — Orchestrates multiple review agents for comprehensive PR review
- [silent-failure-hunter](../silent-failure-hunter/) — Specialized agent for finding suppressed errors
```
