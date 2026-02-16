# Claude Documentation

> Generate standardized README documentation for Claude Code components.

## Overview

Claude Documentation produces consistent, high-quality markdown READMEs adapted by component type — skills, sub-agents, and hooks. Each type has distinct sections: skills document trigger phrases and workflow steps, hooks document lifecycle events and matching rules, sub-agents document capabilities and invocation patterns. The skill extracts metadata from source files, applies the appropriate template, and outputs a polished README.

## Trigger Phrases

- "document this skill"
- "document this hook"
- "document this sub-agent"
- "generate a README for this component"
- "write documentation for this"
- "update the docs for my toolkit"
- "generate an index README"
- "claude-documentation" (by name)

## Description Field

```yaml
description: Use when the user asks to "document this skill", "document this hook", "document this sub-agent", "generate a README for this component", "write documentation for this", "update the docs for my toolkit", "generate an index README", or needs standardized documentation for any Claude Code component (skill, hook, or sub-agent). Also applies when the user says "claude-documentation" by name.
```

## How It Works

1. **Identify the Component** — Determine the type (skill, hook, sub-agent, or index mode) by looking for `SKILL.md`, hook configuration in `settings.json`, or agent definition files.
2. **Extract Metadata from Source Files** — Parse YAML frontmatter, scan body content for workflow steps, check for `references/`, `scripts/`, `examples/`, `assets/` directories.
3. **Ask Clarifying Questions (If Needed)** — If source files are missing key information, ask about purpose, use cases, setup requirements, and known limitations.
4. **Apply the Appropriate Template** — Load the template matching the component type: `references/skill-template.md`, `references/hook-template.md`, `references/subagent-template.md`, or `references/index-template.md`.
5. **Generate the README** — Write the README following quality standards: accurate, complete, concise, consistent, and actionable.
6. **Place the Output** — Write to `README.md` in the component's directory (or parent directory for index mode), confirming the path with the user if ambiguous.

## When to Use

- Documenting a new or existing skill, hook, or sub-agent
- Generating a top-level index/catalog README for a directory of components
- Updating stale documentation after component changes
- Standardizing inconsistent docs across a toolkit

## When NOT to Use

- Documenting general application code (use standard doc tools)
- Writing CLAUDE.md project memory files (use `claude-md-management` skills)
- Creating the component itself (use `skill-builder`, `hook-builder`, or `agent-builder`)

## Directory Structure

```
claude-documentation/
├── SKILL.md
├── README.md
└── references/
    ├── skill-template.md
    ├── subagent-template.md
    ├── hook-template.md
    └── index-template.md
```

## Setup & Installation

1. Copy or symlink the `claude-documentation/` directory to `~/.claude/skills/claude-documentation/`
2. Restart Claude Code to load the skill
3. Use any trigger phrase to invoke

No additional dependencies are required.

## Configuration

No configuration is needed. The skill uses standard Claude Code skill loading via YAML frontmatter in `SKILL.md`.

## Dependencies

- Claude Code with skills support
- No external tools or packages required

## Examples

### Documenting a Skill

Trigger: "Document the hook-builder skill"

The skill will:

1. Detect `SKILL.md` in the hook-builder directory, identifying it as a skill
2. Parse YAML frontmatter for `name` and `description`
3. Scan the body for workflow steps, references, and resource files
4. Load `references/skill-template.md` for the output format
5. Generate a README.md with sections for overview, trigger phrases, how it works, directory structure, setup, examples, and related components
6. Write the file to `hook-builder/README.md`

### Index/Catalog Mode

Trigger: "Generate an index README for my toolkit"

The skill will:

1. Scan the target directory for all skills, hooks, and sub-agents
2. Categorize components by type
3. Extract name and brief description for each
4. Generate a categorized listing with links to individual READMEs using `references/index-template.md`

### Component Type Detection

| Component Type | Detection Signal |
|---------------|-----------------|
| Skill | `SKILL.md` with YAML frontmatter (`name`, `description`) |
| Hook | Hook configuration in `.claude/settings.json` or standalone hook scripts |
| Sub-agent | Agent `.md` file with `name`, `description`, `subagent_type` frontmatter |

## Related Components

- [skill-builder](../../skills/skill-builder/) — For creating new skills (use before documenting)
- [hook-builder](../../skills/hook-builder/) — For creating new hooks (use before documenting)
- [agent-builder](../../skills/agent-builder/) — For creating new sub-agents (use before documenting)
- [claude-toolkit](../../skills/claude-toolkit/) — For publishing documented components to a toolkit repository
