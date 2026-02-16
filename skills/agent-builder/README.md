# Agent Builder

> Create high-quality Claude Code sub-agents following Anthropic patterns.

## Overview

Agent Builder guides you through creating Claude Code sub-agents — markdown files with YAML frontmatter and a system prompt body. It covers the full lifecycle from purpose definition through frontmatter configuration, description writing, system prompt structuring, and installation. Agents are stored in `~/.claude/agents/` for global use or `.claude/agents/` for project-local scope.

## Trigger Phrases

- "create an agent"
- "create a sub-agent"
- "build a sub-agent"
- "make a new agent"
- "write an agent"
- Discussions about agent frontmatter, agent prompts, agent tools configuration, or agent file format

## Description Field

```yaml
description: Use when the user asks to "create an agent", "create a sub-agent", "build a sub-agent", "make a new agent", "write an agent", or needs help designing, structuring, or improving Claude Code sub-agents. Also applies when discussing agent frontmatter, agent prompts, agent tools configuration, or agent file format.
```

## How It Works

1. **Understand the Agent's Purpose** — Clarify the specific task, trigger conditions, required tools, model selection, and global vs. project-local scope.
2. **Write the Frontmatter** — Configure required fields (`name`, `description`) and optional fields (`model`, `color`, `tools`, `category`).
3. **Write the Description** — Define trigger conditions using patterns like "Use this agent when..." with concrete examples and synonym coverage.
4. **Write the System Prompt (Body)** — Structure with a role statement, core responsibilities, process/workflow steps, and output format definition.
5. **Validate and Install** — Save to the correct location, verify YAML frontmatter, confirm name matches filename, and restart Claude Code.

## When to Use

- Creating a new sub-agent from scratch
- Improving or restructuring an existing agent
- Choosing the right frontmatter configuration (model, tools, color)
- Writing effective agent system prompts
- Deciding between global vs. project-local agent placement

## When NOT to Use

- Creating skills (use `skill-builder`)
- Creating hooks (use `hook-builder`)
- Documenting an existing agent (use `claude-documentation`)

## Directory Structure

```
agent-builder/
├── SKILL.md
├── README.md
├── references/
│   └── agent-prompt-patterns.md
└── examples/
    ├── complete-agent-example.md
    └── minimal-agent-example.md
```

## Setup & Installation

1. Copy or symlink the `agent-builder/` directory to `~/.claude/skills/agent-builder/`
2. Restart Claude Code to load the skill
3. Use any trigger phrase to invoke

No additional dependencies are required.

## Configuration

No configuration is needed. The skill uses standard Claude Code skill loading via YAML frontmatter in `SKILL.md`.

## Dependencies

- Claude Code with skills support
- No external tools or packages required

## Examples

### Creating a Code Reviewer Agent

Trigger: "Create a sub-agent that reviews PRs for security issues"

The skill will walk through:

1. **Purpose**: Reviews pull requests for security vulnerabilities
2. **Frontmatter**: `name: security-reviewer`, `model: opus`, `tools: ["Read", "Bash", "Glob", "Grep"]`
3. **Description**: Trigger conditions covering "review PR", "security check", "audit code"
4. **System prompt**: Role as security expert, OWASP top 10 checklist, structured finding format
5. **Installation**: Save to `~/.claude/agents/security-reviewer.md`

### Model Selection Quick Reference

| Model | Best For | Trade-off |
|-------|----------|-----------|
| `inherit` | Default — uses parent session model | Balanced |
| `opus` | Complex reasoning, architecture | Slower, higher quality |
| `sonnet` | General tasks, code generation | Good speed/quality balance |
| `haiku` | Quick lookups, simple formatting | Fast, lower cost |

## Related Components

- [skill-builder](../../skills/skill-builder/) — For creating skills instead of agents
- [hook-builder](../../skills/hook-builder/) — For creating hooks instead of agents
- [claude-documentation](../../skills/claude-documentation/) — For generating README documentation for agents
- [claude-toolkit](../../skills/claude-toolkit/) — For publishing agents to a toolkit repository
