# Toolkit Repository Structure

The repo is a Claude Code plugin marketplace. The repo is named `claude-toolkit`; the marketplace it declares is named `brewkit`, so plugins install as `<plugin>@brewkit`.

## Directory Layout

```
claude-toolkit/
├── README.md                     # Written by hand
├── .claude-plugin/
│   └── marketplace.json          # Lists every plugin
├── statusline/                   # Not a plugin, wired up in settings.json
└── plugins/
    ├── <plugin>/                 # A plugin that bundles skills, agents, or hooks
    │   ├── .claude-plugin/
    │   │   └── plugin.json       # Name, version, description
    │   ├── skills/
    │   │   └── <skill>/
    │   │       ├── SKILL.md
    │   │       ├── references/
    │   │       └── scripts/
    │   ├── agents/
    │   │   └── <agent>.md
    │   └── hooks/
    │       ├── hooks.json
    │       └── <script>.sh
    └── <mod>/                    # A mod is always its own plugin
        ├── .claude-plugin/
        │   └── plugin.json
        ├── hooks/
        │   ├── hooks.json        # { "modules": ["./register.tsx"] }
        │   └── register.tsx
        ├── tests/
        ├── types/
        └── tsconfig.json
```

## Plugins

| Plugin | Holds |
|--------|-------|
| `school` | Coursework skills |
| `personal` | Personal-life skills |
| `misc` | Cross-cutting skills and the global hooks |
| `dev-flow` | The development workflow chain, its reviewer agent, and its resume hook |
| `meta-builders` | Skill authoring and evaluation |
| `sidebar`, `checklist`, `questions`, `processes`, `review-pair` | Mods |

## Naming Conventions

| Rule | Example |
|------|---------|
| Directory names use kebab-case | `rubric-check`, `review-pair` |
| Skill files are always `SKILL.md` | `plugins/school/skills/rubric-check/SKILL.md` |
| Agent files are named after the agent | `plugins/dev-flow/agents/code-reviewer.md` |
| Hook scripts use descriptive names | `plugins/misc/hooks/block-env-commits.sh` |

## Hooks

Plugin hooks are wired in the plugin's own `hooks/hooks.json`, not in `settings.json`. Point commands at `${CLAUDE_PLUGIN_ROOT}` so they work from any install path, and make scripts executable.

## Versions

Bump `version` in `plugin.json` on every change to a plugin. Machines that installed from GitHub only pick up a change when the version moves. A marketplace added from a local path reads the clone's working tree directly, so version bumps do not affect it, but whatever branch the clone is on is what new sessions run.

## Top-Level README

The root `README.md` is written by hand. Add new components to it and update the counts in the intro.
