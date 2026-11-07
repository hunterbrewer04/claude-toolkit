# Claude Toolkit

> Manage the claude-toolkit repo: a plugin marketplace of Claude Code skills, hooks, sub-agents, and mods.

## Trigger Phrases

- "add this to my toolkit"
- "push to claude-toolkit"
- "sync my claude-toolkit"
- "pull my toolkit on this machine"
- "publish this component"
- "claude-toolkit" (by name)

## What It Does

| Operation | Trigger | Key steps |
|-----------|---------|-----------|
| Add | "add/push/publish to toolkit" | Copy into the plugin, bump version or register, update README, open PR |
| Sync | "sync toolkit" | Check for local work, pull `main`, report changes |
| Setup | "pull/setup toolkit" | Clone, persist path, add marketplace, install plugins |
| List | "list/show toolkit" | Read the marketplace and plugin folders, show a summary |

## When NOT to Use

- Creating a new GitHub repository (this skill uses an existing repo)
- Building the component itself (use `skill-creator` for skills, `plugin-authoring` for mods)

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

## Configuration

| Setting | Location | Purpose |
|---------|----------|---------|
| `claude-toolkit-repo` | `~/.claude/CLAUDE.md` | Path to the local toolkit clone |

If the path is not set, the skill prompts on first use and offers to save it.

## Dependencies

- Claude Code with plugin support
- `git`
