# Plan Agent-Team

> Generates a comprehensive, executable blueprint for spawning a Claude Code agent-team — team composition, spawn prompts, file ownership, and testing playbook — saved as a Tolaria vault note.

## Overview

The plan-agent-team skill turns a feature spec or free-form task into a dispatch-ready agent-team plan: an Opus lead plus Sonnet teammates, each with explicit MCP/skill/subagent assignments and non-overlapping file ownership. The plan is written to the user's Tolaria vault, doubles as the run log once the team starts, and ends with a literal spawn prompt ready to dispatch. It plans — it never silently dispatches.

## Trigger Phrases

This skill activates when you say:

- "/plan-agent-team"
- "Plan an agent-team for X"
- "Make a team plan"
- "Build an agent-team blueprint"
- Any request to coordinate parallel work across modules, layers, or hypotheses

## Description Field

```
Generates a comprehensive, executable plan for spawning a Claude Code agent-team to deliver a
feature, refactor, debug, or review. Produces a Tolaria vault note with team composition
(Opus 4.7 lead + Sonnet 4.6 teammates), per-teammate spawn prompts with MCPs/skills/subagent
assignments, file-ownership boundaries, a standardized testing & review playbook (Playwright
for UI, curl for APIs, code-reviewer + simplify cycles), and a literal spawn prompt ready to
dispatch. Use whenever the user says "/plan-agent-team", "plan an agent-team for X", "make a
team plan", "build an agent-team blueprint", or asks to coordinate parallel work across
modules / layers / hypotheses. Auto-detects whether input is a markdown spec file path or a
free-form task description. Always saves output to the user's Tolaria vault. Skip for
single-agent work, simple sequential tasks, or sub-agent dispatch where there's no parallel
collaboration benefit.
```

## How It Works

1. **Resolve the input** — If the argument resolves to an existing `.md` file, it's read as the source spec; otherwise treated as a free-form task description
2. **Pick the destination vault** — Uses `mcp__tolaria__get_vault_context`; writes directly for non-registered vaults
3. **Auto-create the aggregation layer** — First run per vault installs a saved view (`views/agent-team-plans.yml`) and an Obsidian Base (`agent-team-runs.base`) for cross-run analysis
4. **Discover available tools** — Enumerates installed MCPs, skills, plugins, and subagents; only assigns what actually exists on the machine
5. **Compose the plan** — Team composition, per-teammate spawn prompts, file-ownership boundaries, testing & review playbook, pre-flight checklist
6. **Offer the spawn prompt** — Presents the literal dispatch prompt for the current session; never auto-dispatches

## When to Use

- Parallel multi-module feature implementation
- Cross-layer work (frontend + backend + tests, owned separately)
- Parallel code review with distinct lenses (security / performance / coverage)
- Competing-hypothesis debugging
- Refactors split across non-overlapping file sets

## When NOT to Use

- Single-agent work — coordination overhead with no benefit
- Strictly sequential tasks (B blocked by A)
- One-off focused subagent dispatch — use the Agent tool directly

## Directory Structure

```
plan-agent-team/
├── SKILL.md
├── references/
│   ├── hooks-config.md
│   ├── plan-template.md
│   ├── testing-playbook.md
│   ├── tool-discovery.md
│   └── vault-integration.md
└── assets/
    ├── agent-team-plans.yml
    └── agent-team-runs.base
```

- **references/** — Plan template, tool-discovery procedure, testing playbook, vault-integration logic, hooks config (loaded on demand)
- **assets/** — Saved-view and Obsidian Base files installed into the vault on first run

## Setup & Installation

**Location:** `~/.claude/skills/plan-agent-team/` (symlink to this repo directory)

**Prerequisites:**
- `claude --version` ≥ 2.1.32 (agent-teams requirement)
- `tmux` installed; a terminal supporting split panes (iTerm2 with `tmux -CC` recommended)
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `~/.claude/settings.json` env block
- Tolaria MCP configured (vault access)

The skill surfaces missing prerequisites in the plan's pre-flight section rather than installing them.

## Configuration

This skill requires no additional configuration beyond the prerequisites above.

## Dependencies

- Tolaria MCP (`mcp__tolaria__*` tools) for vault context and refresh
- Claude Code agent-teams (experimental feature flag)

## Examples

### Example 1: Plan from a spec file

**Input:** "/plan-agent-team 2026-04-26-tdarr-revamp-design.md"

**Result:** Reads the spec, composes a team plan with per-teammate spawn prompts and file ownership, saves it to the vault, and offers the literal spawn prompt.

### Example 2: Plan from a description

**Input:** "Plan an agent-team for adding OAuth login to the API"

**Result:** Treats the text as the task, discovers installed tools, and produces a dispatch-ready blueprint with testing playbook and pre-flight checks.

## Limitations

- Requires a Tolaria vault — output is always saved there
- Plans only; dispatching the team is a separate, explicit user action

## Related Components

- [tolaria](../tolaria/) — vault conventions and file workflows the plan notes follow
