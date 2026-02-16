---
name: claude-toolkit
description: Use when the user asks to "add this to my toolkit", "push to claude-toolkit", "sync my claude-toolkit", "pull my toolkit on this machine", "publish this component", or needs to manage a GitHub repository of Claude Code skills, hooks, and sub-agents. Also applies when the user says "claude-toolkit" by name or wants to organize, update, or set up their toolkit repo.
---

# Claude Toolkit Manager

Manage a GitHub repository of Claude Code components (skills, hooks, sub-agents) — add components, generate documentation, update the index, and keep the repo synced.

## Overview

This skill orchestrates the full lifecycle of adding Claude Code components to an existing GitHub toolkit repository. It handles file organization, documentation generation (via `claude-documentation`), index maintenance, and git operations. The toolkit repo is the single source of truth; local Claude Code directories use symlinks.

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

## Core Process

### 0. Resolve Toolkit Repo Path

Before any operation, determine where the toolkit repo lives:

1. Check `~/.claude/CLAUDE.md` for a line matching `claude-toolkit-repo: <path>`
2. If found, verify the path exists and is a git repo
3. If not found, prompt the user for the repo path (local path or GitHub URL)
4. Offer to persist the path by adding `claude-toolkit-repo: <path>` to `~/.claude/CLAUDE.md` (create the file if it does not exist)

If the user provides a GitHub URL and no local clone exists, clone it first (see Operation C below).

### Operation A: Add Component

The primary workflow. Trigger: "add this to my toolkit", "push to claude-toolkit", "publish this component."

**Step 1 — Identify the component type and source path.**

Detect type from source files:

| Type | Detection Signal |
|------|-----------------|
| Skill | Directory contains `SKILL.md` with YAML frontmatter (`name`, `description`) |
| Hook | Directory contains hook scripts, or user points to hook config in `settings.json` |
| Sub-agent | Directory contains agent definition `.md` with frontmatter (`name`, `subagent_type`) |

If ambiguous, ask the user to clarify.

**Step 2 — Copy files into the toolkit repo.**

Run the add-component script:

```bash
bash ~/.claude/skills/claude-toolkit/scripts/add-component.sh <component-type> <source-path> <toolkit-repo-path>
```

This copies the component directory into the correct subfolder (`skills/`, `hooks/`, or `sub-agents/`) within the toolkit repo. If a component with the same name already exists, prompt the user before overwriting.

**Step 3 — Generate component README.**

Invoke the `claude-documentation` skill to generate a standardized `README.md` for the newly added component. Target the component's directory inside the toolkit repo.

**Step 4 — Regenerate the index README.**

Invoke `claude-documentation` in index mode to regenerate the top-level `README.md` for the toolkit repo. This scans all components and produces a categorized catalog.

**Step 5 — Commit and push.**

```bash
cd <toolkit-repo-path>
git add -A
git commit -m "Add <type>: <component-name>"
git push
```

Confirm with the user before pushing. If the push fails (e.g., upstream changes), pull with rebase first, then retry.

### Operation B: Sync Toolkit

Trigger: "sync my claude-toolkit", "update my toolkit."

1. `cd <toolkit-repo-path> && git pull --rebase`
2. Regenerate the top-level index README via `claude-documentation` in index mode
3. If the index changed, commit and push the update
4. Report a summary of what changed (new components, updated files)

### Operation C: Pull/Setup on New Machine

Trigger: "pull my toolkit on this machine", "set up my toolkit."

**Step 1 — Clone the repo.**

Prompt for the GitHub URL if not already configured. Clone to a sensible default location (e.g., `~/claude-toolkit/`) or a user-specified path.

**Step 2 — Persist the repo path.**

Add `claude-toolkit-repo: <path>` to `~/.claude/CLAUDE.md` (create if needed).

**Step 3 — Create symlinks.**

For each component in the toolkit repo, create a symlink in the corresponding local Claude Code directory:

| Component Type | Symlink Target |
|---------------|----------------|
| Skills | `~/.claude/skills/<name>` → `<repo>/skills/<name>` |
| Sub-agents | `~/.claude/agents/<name>` → `<repo>/sub-agents/<name>` |
| Hooks | Manual — hooks live in `settings.json`, so print instructions for the user to copy hook config entries |

Before creating each symlink:
- Check if the target already exists
- If it is already a symlink pointing to the correct location, skip it
- If it is a symlink pointing elsewhere or a real directory, warn the user and ask before replacing

**Step 4 — Report setup summary.**

List all symlinked components and any manual steps needed (hook configuration).

### Operation D: List Components

Trigger: "what's in my toolkit", "list toolkit components."

Read the toolkit repo directory and display a categorized summary:

```
Skills (3):
  - skill-builder
  - claude-documentation
  - claude-toolkit

Hooks (1):
  - pre-commit-lint

Sub-agents (2):
  - code-reviewer
  - test-runner
```

## Handling Hooks

Hooks are special because their runtime configuration lives in `.claude/settings.json`, not in the filesystem hierarchy. When adding a hook:

1. Copy hook script files into `<repo>/hooks/<hook-name>/`
2. Generate a README via `claude-documentation`
3. Include a `config-snippet.json` in the hook directory showing the `settings.json` entry the user needs
4. After pushing, print the config snippet and instruct the user to add it to their local `.claude/settings.json`

On new machine setup, print all hook config snippets that need manual installation.

## Error Handling

| Situation | Action |
|-----------|--------|
| Toolkit repo path not configured | Prompt user, offer to persist |
| Repo path exists but is not a git repo | Error with clear message |
| Component name collision | Prompt before overwriting |
| Git push fails | Pull with rebase, retry once, then report |
| Symlink target already exists | Warn and ask before replacing |
| GitHub URL provided but git not installed | Error with install instructions |

## Quick Reference

| Operation | Trigger | Key Steps |
|-----------|---------|-----------|
| Add | "add/push/publish to toolkit" | Copy → Document → Index → Commit → Push |
| Sync | "sync toolkit" | Pull → Reindex → Commit if changed → Push |
| Setup | "pull/setup toolkit" | Clone → Persist path → Symlink → Report |
| List | "list/show toolkit" | Read repo dirs → Display summary |

## Additional Resources

- **`references/repo-structure.md`** — Expected toolkit repo folder layout, naming conventions, and file placement rules
- **`scripts/add-component.sh`** — Shell script for copying component files into the correct toolkit subfolder
