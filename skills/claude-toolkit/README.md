# Claude Toolkit

> Manage a GitHub repository of Claude Code skills, hooks, and sub-agents.

## Overview

Claude Toolkit orchestrates the full lifecycle of managing a GitHub repository of Claude Code components. It handles adding components (with file organization and documentation generation), syncing the repo, setting up on new machines via clone and symlinks, and listing all components. The toolkit repo serves as the single source of truth, with local Claude Code directories using symlinks to the repo.

## Trigger Phrases

- "add this to my toolkit"
- "push to claude-toolkit"
- "sync my claude-toolkit"
- "pull my toolkit on this machine"
- "publish this component"
- "claude-toolkit" (by name)
- Organizing, updating, or setting up a toolkit repo

## Description Field

```yaml
description: Use when the user asks to "add this to my toolkit", "push to claude-toolkit", "sync my claude-toolkit", "pull my toolkit on this machine", "publish this component", or needs to manage a GitHub repository of Claude Code skills, hooks, and sub-agents. Also applies when the user says "claude-toolkit" by name or wants to organize, update, or set up their toolkit repo.
```

## How It Works

1. **Resolve Toolkit Repo Path** — Check `~/.claude/CLAUDE.md` for `claude-toolkit-repo: <path>`, verify it exists and is a git repo, or prompt the user and offer to persist the path.
2. **Operation A: Add Component** — Identify component type (skill/hook/sub-agent), copy files via `scripts/add-component.sh`, generate README via `claude-documentation`, regenerate index README, then commit and push.
3. **Operation B: Sync Toolkit** — Pull with rebase, regenerate the index README, commit and push if changed, report summary.
4. **Operation C: Pull/Setup on New Machine** — Clone repo, persist path in `~/.claude/CLAUDE.md`, create symlinks for skills and agents (hooks require manual `settings.json` configuration), report setup summary.
5. **Operation D: List Components** — Read toolkit repo directories and display a categorized summary of all skills, hooks, and sub-agents.

## When to Use

- Adding a new skill, hook, or sub-agent to the toolkit repo
- Syncing the toolkit repo (pull latest, regenerate index)
- Setting up the toolkit on a new machine (clone + symlink)
- Publishing or updating a component after changes
- Checking what components are in the toolkit

## When NOT to Use

- Creating a new GitHub repository (this skill uses an existing repo)
- Building the component itself (use `skill-builder`, `hook-builder`, or `agent-builder`)
- Writing documentation standalone (use `claude-documentation` directly)

## Directory Structure

```
claude-toolkit/
├── SKILL.md
├── README.md
├── references/
│   └── repo-structure.md
└── scripts/
    └── add-component.sh
```

## Setup & Installation

1. Copy or symlink the `claude-toolkit/` directory to `~/.claude/skills/claude-toolkit/`
2. Ensure `git` is installed and available on PATH
3. Configure the toolkit repo path in one of two ways:
   - Add `claude-toolkit-repo: /path/to/repo` to `~/.claude/CLAUDE.md`
   - Or let the skill prompt you on first use (it will offer to persist the path)
4. Restart Claude Code to load the skill

## Configuration

| Setting | Location | Purpose |
|---------|----------|---------|
| `claude-toolkit-repo` | `~/.claude/CLAUDE.md` | Path to the local toolkit repository clone |

The skill reads and writes this configuration automatically. If the path is not set, the skill prompts on first use.

## Dependencies

- Claude Code with skills support
- `git` (for clone, pull, commit, push operations)
- `claude-documentation` skill (invoked to generate component READMEs and index)
- `scripts/add-component.sh` (bundled shell script for copying components into the repo)

## Examples

### Adding a Skill to the Toolkit

Trigger: "Add the hook-builder skill to my toolkit"

The skill will:

1. Resolve the toolkit repo path from `~/.claude/CLAUDE.md`
2. Detect `SKILL.md` in the source, identifying it as a skill
3. Run `add-component.sh skill /path/to/hook-builder /path/to/toolkit-repo`
4. Invoke `claude-documentation` to generate a README in the toolkit copy
5. Regenerate the top-level index README
6. Commit with message "Add skill: hook-builder" and push (after confirmation)

### Setting Up on a New Machine

Trigger: "Pull my toolkit on this machine"

The skill will:

1. Prompt for the GitHub URL
2. Clone to `~/claude-toolkit/` (or a user-specified path)
3. Add `claude-toolkit-repo: ~/claude-toolkit` to `~/.claude/CLAUDE.md`
4. Create symlinks: `~/.claude/skills/<name>` pointing to `<repo>/skills/<name>` for each skill
5. Create symlinks: `~/.claude/agents/<name>` pointing to `<repo>/sub-agents/<name>` for each agent
6. Print hook config snippets that need manual addition to `.claude/settings.json`

### Operations Quick Reference

| Operation | Trigger | Key Steps |
|-----------|---------|-----------|
| Add | "add/push/publish to toolkit" | Copy, Document, Index, Commit, Push |
| Sync | "sync toolkit" | Pull, Reindex, Commit if changed, Push |
| Setup | "pull/setup toolkit" | Clone, Persist path, Symlink, Report |
| List | "list/show toolkit" | Read repo dirs, Display summary |

## Related Components

- [claude-documentation](../../skills/claude-documentation/) — Invoked to generate component READMEs and index catalogs
- [skill-builder](../../skills/skill-builder/) — For creating skills before adding them to the toolkit
- [hook-builder](../../skills/hook-builder/) — For creating hooks before adding them to the toolkit
- [agent-builder](../../skills/agent-builder/) — For creating sub-agents before adding them to the toolkit
