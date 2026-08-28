# Index/Catalog README Template

Use this template when generating a top-level README that catalogs all Claude Code components in a directory or repository.

## Template Structure

```markdown
# {Toolkit / Repository Name}

> {One-line description of what this collection contains}

## Overview

{2-3 sentences describing the toolkit: what it provides, who it's for, and the philosophy behind it.}

## Components

### Skills

| Skill | Description | Triggers |
|-------|-------------|----------|
| [{skill-name}](./{path}/) | {Brief description} | `"{trigger 1}"`, `"{trigger 2}"` |
| ... | ... | ... |

### Hooks

| Hook | Event | Description |
|------|-------|-------------|
| [{hook-name}](./{path}/) | `{PreToolUse / PostToolUse / ...}` | {Brief description} |
| ... | ... | ... |

### Sub-Agents

| Agent | Type | Description |
|-------|------|-------------|
| [{agent-name}](./{path}/) | `{subagent_type}` | {Brief description} |
| ... | ... | ... |

{Omit any category section (Skills, Hooks, Sub-Agents) that has no components.}

## Quick Start

{Minimal steps to get everything working.}

1. {Step 1 — typically cloning or copying}
2. {Step 2 — any configuration}
3. {Step 3 — verification}

## Directory Structure

```
{root}/
├── {component-1}/
│   ├── SKILL.md (or agent/hook definition)
│   └── README.md
├── {component-2}/
│   └── ...
├── ...
└── README.md  ← this file
```

## Prerequisites

- {Shared dependency 1}
- {Shared dependency 2}
- {If none: "No shared prerequisites. See individual component READMEs for specific requirements."}

## How Components Interact

{Optional section. Include if components reference or depend on each other.}

```
{Simple diagram or description of relationships}
```

{Example: "The `commit-guard` hook and `protected-files` hook work as complementary layers — one prevents editing sensitive files, the other prevents committing them."}

## Contributing

{Optional. Include if this is a shared/team toolkit.}

- Follow the documentation format established by existing components
- Each new component must include a README.md
- Run `{validation command}` before submitting

## License

{If applicable}
```

## Section Guidelines

| Section | Required | Notes |
|---------|----------|-------|
| Overview | Yes | Set context for the whole collection |
| Components | Yes | Categorized tables with links — omit empty categories |
| Quick Start | Yes | Get someone productive in 3 steps or fewer |
| Directory Structure | Yes | Show actual layout |
| Prerequisites | Yes | Shared requirements or state "none" |
| How Components Interact | Optional | Only if there are meaningful relationships |
| Contributing | Optional | For team/shared toolkits |
| License | Optional | If applicable |

## Catalog Generation Rules

When scanning a directory to build the index:

1. **Identify skills** — Look for directories containing `SKILL.md` with YAML frontmatter
2. **Identify hooks** — Look for hook configurations in `.claude/settings.json` or hook script directories
3. **Identify sub-agents** — Look for agent definition files (`.md` with agent frontmatter, or JSON configs)
4. **Extract metadata** — Pull name and description from each component's source
5. **Sort alphabetically** within each category
6. **Link to README.md** in each component's directory (or to the component directory if no README exists yet)

---

## Completed Example

Below is a finished index README for a real toolkit. Match this tone, detail level, and formatting.

```markdown
# Claude Code Superpowers

> A curated collection of skills, hooks, and sub-agents that extend Claude Code with structured workflows and quality guardrails.

## Overview

Superpowers is a personal toolkit of Claude Code extensions built around one principle: repeatable quality through structured process. Skills enforce development workflows (TDD, debugging, code review), hooks add safety guardrails (file protection, commit checks), and sub-agents handle specialized tasks in isolation (PR review, performance analysis). Everything is designed to work independently or together.

## Components

### Skills

| Skill | Description | Triggers |
|-------|-------------|----------|
| [brainstorming](./skills/brainstorming/) | Explores requirements and design before implementation | `"brainstorm"`, `"let's design"`, `"explore options"` |
| [skill-builder](./skills/skill-builder/) | Meta-skill for creating new Claude Code skills | `"create a skill"`, `"build a skill"` |
| [systematic-debugging](./skills/systematic-debugging/) | Structured bug investigation before proposing fixes | `"debug this"`, `"why is this failing"` |
| [test-driven-development](./skills/test-driven-development/) | Red-green-refactor workflow for features and bugfixes | `"implement with TDD"`, `"write tests first"` |
| [verification-before-completion](./skills/verification-before-completion/) | Requires evidence before claiming work is done | `"verify this works"`, `"prove it passes"` |

### Hooks

| Hook | Event | Description |
|------|-------|-------------|
| [protected-files](./hooks/protected-files/) | `PreToolUse` | Blocks edits to sensitive config files (.env, CI pipelines) |
| [commit-guard](./hooks/commit-guard/) | `PreToolUse` | Prevents committing files that contain secrets |
| [format-on-save](./hooks/format-on-save/) | `PostToolUse` | Runs formatter after file edits |

### Sub-Agents

| Agent | Type | Description |
|-------|------|-------------|
| [code-reviewer](./agents/code-reviewer/) | `code-reviewer` | Reviews changes for quality, security, and convention adherence |
| [silent-failure-hunter](./agents/silent-failure-hunter/) | `silent-failure-hunter` | Finds suppressed errors and inadequate error handling |
| [performance-engineer](./agents/performance-engineer/) | `performance-engineer` | Identifies and resolves performance bottlenecks |

## Quick Start

1. Clone this repo into your Claude Code skills directory:
   ```bash
   git clone https://github.com/user/superpowers.git ~/.claude/skills/superpowers
   ```
2. Copy hook configs to your settings:
   ```bash
   cat superpowers/hooks/settings-snippet.json  # merge into ~/.claude/settings.json
   ```
3. Verify skills are loaded — start a new Claude Code session and say "create a skill" to test

## Directory Structure

```
superpowers/
├── skills/
│   ├── brainstorming/
│   ├── skill-builder/
│   ├── systematic-debugging/
│   ├── test-driven-development/
│   └── verification-before-completion/
├── hooks/
│   ├── protected-files/
│   ├── commit-guard/
│   └── format-on-save/
├── agents/
│   ├── code-reviewer/
│   ├── silent-failure-hunter/
│   └── performance-engineer/
└── README.md
```

## Prerequisites

- Claude Code CLI installed
- Bash 4.0+ (for hook scripts)
- `jq` (for hooks that parse JSON)

## How Components Interact

```
User request
  → brainstorming (explores design)
  → test-driven-development (writes tests first, then implementation)
  → code-reviewer agent (reviews the implementation)
  → verification-before-completion (confirms tests pass)
  → protected-files hook (guards sensitive files during edits)
  → commit-guard hook (checks for secrets before commit)
```

Skills define the workflow. Agents handle specialized analysis. Hooks enforce guardrails automatically. They compose naturally — use any combination.
```
