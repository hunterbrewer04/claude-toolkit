---
name: agent-builder
description: Use when the user asks to "create an agent", "create a sub-agent", "build a sub-agent", "make a new agent", "write an agent", or needs help designing, structuring, or improving Claude Code sub-agents. Also applies when discussing agent frontmatter, agent prompts, agent tools configuration, or agent file format.
---

# Agent Builder

## Overview

Create high-quality Claude Code sub-agents that follow official Anthropic patterns. Every agent is a markdown file with YAML frontmatter (metadata) and a body (system prompt), stored in `~/.claude/agents/` for global use or `.claude/agents/` for project-local scope.

## When to Use

- Creating a new sub-agent from scratch
- Improving or restructuring an existing agent
- Choosing the right frontmatter configuration (model, tools, color)
- Writing effective agent system prompts
- Deciding between global vs. project-local agent placement

## Agent Creation Process

### Step 1: Understand the Agent's Purpose

Before writing anything, clarify:

1. **What specific task does this agent handle?** (e.g., "reviews PRs for security issues")
2. **When should Claude invoke it?** (trigger conditions)
3. **What tools does it need?** (Read, Write, Edit, Bash, Glob, Grep)
4. **What model should it use?** (inherit, opus, sonnet, haiku)
5. **Should it be global or project-local?**

| Scope | Location | When to Use |
|-------|----------|-------------|
| Global | `~/.claude/agents/` | General-purpose agents useful across all projects |
| Project | `.claude/agents/` | Domain-specific agents tied to a codebase |

### Step 2: Write the Frontmatter

The YAML frontmatter controls agent metadata and invocation behavior.

**Required fields:**

| Field | Purpose | Rules |
|-------|---------|-------|
| `name` | Unique identifier | Lowercase, hyphens, no spaces (e.g., `code-reviewer`) |
| `description` | Trigger conditions + examples | Controls when Claude loads the agent |

**Optional fields:**

| Field | Purpose | Options |
|-------|---------|---------|
| `model` | Which Claude model to use | `inherit` (default), `opus`, `sonnet`, `haiku` |
| `color` | Terminal display color | `blue`, `green`, `red`, `yellow`, `cyan`, `magenta` |
| `tools` | Restrict available tools | Array: `["Read", "Write", "Edit", "Bash", "Glob", "Grep"]` |
| `category` | Organizational grouping | Free-form string for categorization |

### Step 3: Write the Description (Critical)

The description determines whether Claude finds and invokes the agent. Follow these rules:

1. **Start with "Use this agent when..."** to define trigger conditions
2. **Include `<example>` blocks** showing concrete user interactions
3. **Cover synonyms** — if the agent does "code review", also mention "review code", "check code quality"
4. **Mention proactive triggers** if the agent should auto-invoke (e.g., "Use PROACTIVELY after writing code")

**Official Anthropic example pattern:**

```markdown
description: Use this agent when the user asks to review a pull request, check code quality, or analyze PR changes. Examples:

<example>
Context: User has created a PR and wants quality review
user: "Can you review PR #123 for code quality?"
assistant: "I'll use the pr-quality-reviewer agent to analyze the PR."
<commentary>
PR review request triggers the pr-quality-reviewer agent.
</commentary>
</example>
```

**Simpler community pattern (also valid):**

```markdown
description: Design RESTful APIs, microservice boundaries, and database schemas. Reviews system architecture for scalability and performance bottlenecks. Use PROACTIVELY when creating new backend services or APIs.
```

### Step 4: Write the System Prompt (Body)

The body below the frontmatter is the agent's system prompt. Structure it with these sections:

**1. Role Statement** — One sentence defining who the agent is.

```markdown
You are an expert code quality reviewer specializing in security, performance, and maintainability.
```

**2. Core Responsibilities** — Numbered list of primary duties.

```markdown
**Core Responsibilities:**
1. Analyze code changes for quality issues
2. Check adherence to project coding standards
3. Identify security vulnerabilities
4. Suggest performance improvements
```

**3. Process/Workflow** — Step-by-step instructions for how the agent operates.

```markdown
**Process:**
- Start by reading the relevant files to understand context
- Identify patterns and anti-patterns in the code
- Check for OWASP top 10 vulnerabilities
- Verify error handling completeness
- Assess test coverage adequacy
```

**4. Output Format** — Define what the agent returns.

```markdown
**Output Format:**
Provide findings as a structured report:
- **Critical**: Issues that must be fixed before merge
- **Warning**: Issues that should be addressed
- **Suggestion**: Optional improvements
- Include file paths and line numbers for each finding
```

### Step 5: Validate and Install

1. Save the file to the appropriate location:
   - Global: `~/.claude/agents/<agent-name>.md`
   - Project: `.claude/agents/<agent-name>.md`

2. Validate the file structure:
   - YAML frontmatter is properly delimited with `---`
   - `name` field matches the filename (without `.md`)
   - `description` is present and descriptive
   - Body contains actionable instructions
   - Tools listed in `tools` array are valid Claude Code tools

3. Restart Claude Code to load the new agent.

## Model Selection Guide

| Model | Best For | Trade-off |
|-------|----------|-----------|
| `inherit` | Default — uses whatever the parent session uses | Balanced |
| `opus` | Complex reasoning, architecture, deep analysis | Slower, higher quality |
| `sonnet` | General tasks, code generation, reviews | Good balance of speed/quality |
| `haiku` | Quick lookups, simple transformations, formatting | Fast, lower cost |

## Tool Selection Guide

Only restrict tools when the agent should NOT have access to certain capabilities. Omitting the `tools` field gives the agent access to all tools.

| Tool | Purpose | Include When |
|------|---------|-------------|
| `Read` | Read files | Almost always |
| `Write` | Create new files | Agent creates files |
| `Edit` | Modify existing files | Agent modifies code |
| `Bash` | Run shell commands | Agent runs tests, git, builds |
| `Glob` | Find files by pattern | Agent searches for files |
| `Grep` | Search file contents | Agent searches code |

## Common Agent Categories

| Category | Examples |
|----------|----------|
| `development-architecture` | Backend architect, API designer, system designer |
| `language-specialists` | Python pro, TypeScript expert, Rust specialist |
| `infrastructure-operations` | Docker, Kubernetes, CI/CD, deployment |
| `quality-security` | Code reviewer, security auditor, test analyzer |
| `data-ai` | Data pipeline, ML ops, analytics |
| `specialized-domains` | Domain-specific experts |

## Quick Reference

| Element | Rule |
|---------|------|
| File format | Markdown with YAML frontmatter |
| Global location | `~/.claude/agents/<name>.md` |
| Project location | `.claude/agents/<name>.md` |
| Name format | Lowercase, hyphens only |
| Description | Start with "Use this agent when..." |
| Model options | `inherit`, `opus`, `sonnet`, `haiku` |
| Valid tools | `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep` |
| Invocation | Automatic via description matching or explicit via `@agent-name` |

## Additional Resources

- **`references/agent-prompt-patterns.md`** — Detailed system prompt patterns and anti-patterns
- **`examples/complete-agent-example.md`** — Full working agent with all sections
- **`examples/minimal-agent-example.md`** — Bare-minimum agent template
