# Skill Builder

> Meta-skill for creating excellent Claude Code skills via a 7-step process.

## Overview

Skill Builder is the foundational skill for creating new Claude Code skills. It enforces a structured 7-step process — from gathering concrete examples through CSO-optimized description writing, progressive disclosure organization, validation, and testing. The core principle: a skill's description determines whether Claude loads it, and the body determines whether Claude follows it correctly. Both must be optimized, but the description must never summarize the workflow.

## Trigger Phrases

- "create a skill"
- "write a skill"
- "build a skill"
- "design a skill"
- "improve a skill description"
- "organize skill content"
- Guidance on skill structure, frontmatter, progressive disclosure, CSO optimization, or skill testing

## Description Field

```yaml
description: This skill should be used when the user asks to "create a skill", "write a skill", "build a skill", "design a skill", "improve a skill description", "organize skill content", or needs guidance on skill structure, frontmatter, progressive disclosure, CSO optimization, or skill testing.
```

## How It Works

1. **Gather Concrete Examples** — Ask the user for trigger phrases, 2-3 example tasks the skill should handle, and what success looks like for each.
2. **Plan Resources** — Analyze examples to identify needed `scripts/`, `references/`, `examples/`, and `assets/` directories. Create a resource plan listing each file and its purpose.
3. **Write CSO-Optimized Description** — Write in third person, include specific trigger phrases, describe only triggering conditions (never summarize workflow), stay under 1024 characters, and cover synonyms.
4. **Write SKILL.md Body** — Under 500 lines, imperative form, 1,500-2,000 words. Required sections: Overview, When to Use, Core Process/Pattern, Quick Reference, Additional Resources.
5. **Organize Supporting Files (Progressive Disclosure)** — Apply three-level loading: Level 1 (metadata, always in context), Level 2 (SKILL.md body, loaded when triggered), Level 3 (bundled resources, loaded on demand).
6. **Validate** — Run the quality checklist and `scripts/validate-skill.sh` to verify frontmatter, naming rules, content guidelines, and file references.
7. **Test with Scenarios** — Run trigger tests, application tests, and edge case tests. Match test approach to skill type (discipline, technique, pattern, or reference).

## When to Use

- Creating a new Claude Code skill from scratch
- Improving or restructuring an existing skill
- Optimizing a skill's description for better discoverability
- Organizing skill content with progressive disclosure
- Validating skill structure against Anthropic conventions
- Testing skill behavior with scenarios

## When NOT to Use

- Creating sub-agents (use `agent-builder`)
- Creating hooks (use `hook-builder`)
- Documenting an existing skill (use `claude-documentation`)
- Managing a toolkit repository (use `claude-toolkit`)

## Directory Structure

```
skill-builder/
├── SKILL.md
├── README.md
├── references/
│   ├── description-writing.md
│   ├── progressive-disclosure.md
│   ├── frontmatter-guide.md
│   ├── quality-checklist.md
│   ├── testing-approach.md
│   └── common-mistakes.md
├── examples/
│   ├── minimal-skill-template.md
│   ├── standard-skill-template.md
│   └── complete-skill-template.md
└── scripts/
    └── validate-skill.sh
```

## Setup & Installation

1. Copy or symlink the `skill-builder/` directory to `~/.claude/skills/skill-builder/`
2. Restart Claude Code to load the skill
3. Use any trigger phrase to invoke

For the validation script:
```bash
chmod +x ~/.claude/skills/skill-builder/scripts/validate-skill.sh
```

## Configuration

No configuration is needed. The skill uses standard Claude Code skill loading via YAML frontmatter in `SKILL.md`.

**Personal skills location:** `~/.claude/skills/` for Claude Code, `~/.agents/skills/` for Codex.

## Dependencies

- Claude Code with skills support
- `bash` (for running `scripts/validate-skill.sh`)
- No external packages required

## Examples

### Creating a New Skill from Scratch

Trigger: "Create a skill for managing database migrations"

The skill will walk through:

1. **Gather examples**: "What triggers this? What tasks should it handle?"
2. **Plan resources**: Decide if `references/` is needed for migration patterns, `scripts/` for validation
3. **Write description**: CSO-optimized, third-person, triggers only — e.g., "This skill should be used when the user asks to 'run migrations', 'create a migration', or 'check migration status'..."
4. **Write SKILL.md**: Core process for migration handling, imperative form, under 500 lines
5. **Organize files**: Move detailed migration patterns to `references/migration-patterns.md`
6. **Validate**: Run `scripts/validate-skill.sh /path/to/skill/`
7. **Test**: Trigger test, application test, edge case test

### Skill Directory Patterns

| Pattern | When to Use | Structure |
|---------|-------------|-----------|
| Minimal | All content fits inline | `SKILL.md` only |
| Standard | Detailed docs needed on demand | `SKILL.md` + `references/` + `examples/` |
| Complete | Complex domain with validation | `SKILL.md` + `references/` + `examples/` + `scripts/` |

### Quick Reference Table

| Rule | Limit |
|------|-------|
| `name` field | 64 characters max |
| `description` field | 1024 characters max |
| `name` allowed characters | Letters, numbers, hyphens, spaces |
| SKILL.md body | Under 500 lines |
| SKILL.md target words | 1,500-2,000 |
| Description format | Third-person, triggers only |
| Writing style | Imperative/infinitive form |
| Reference depth | One level from SKILL.md |
| Path separators | Forward slashes only |

### Common Mistakes to Avoid

1. **Weak description** — vague triggers, missing phrases
2. **Workflow in description** — Claude shortcuts the body
3. **Bloated SKILL.md** — everything inline, over 500 lines
4. **Second-person writing** — "you should" instead of imperative
5. **Nested references** — file A references file B references file C
6. **Missing resource refs** — `references/` exists but SKILL.md does not mention it
7. **Windows paths** — backslashes break on Unix systems

## Related Components

- [agent-builder](../../skills/agent-builder/) — For creating sub-agents instead of skills
- [hook-builder](../../skills/hook-builder/) — For creating hooks instead of skills
- [claude-documentation](../../skills/claude-documentation/) — For generating README documentation for skills
- [claude-toolkit](../../skills/claude-toolkit/) — For publishing skills to a toolkit repository
