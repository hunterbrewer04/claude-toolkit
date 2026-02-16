# Skill Documentation Template

Use this template when generating a README for a Claude Code skill.

## Template Structure

```markdown
# {Skill Name}

> {One-line description of what the skill does}

## Overview

{2-3 sentences explaining the skill's purpose, what problem it solves, and who benefits from it.}

## Trigger Phrases

This skill activates when you say:

- "{trigger phrase 1}"
- "{trigger phrase 2}"
- "{trigger phrase 3}"
- ...

## Description Field

```
{The exact description from the skill's YAML frontmatter}
```

## How It Works

{Step-by-step explanation of the skill's workflow. Use a numbered list for sequential processes, bullet list for non-sequential behaviors.}

1. **{Step name}** — {What happens in this step}
2. **{Step name}** — {What happens in this step}
3. ...

## When to Use

- {Use case 1}
- {Use case 2}
- ...

## When NOT to Use

- {Anti-pattern 1 — what to use instead}
- {Anti-pattern 2 — what to use instead}

## Directory Structure

```
{skill-name}/
├── SKILL.md
├── references/
│   └── {list actual reference files}
├── scripts/
│   └── {list actual scripts}
└── examples/
    └── {list actual examples}
```

{Brief explanation of what each directory/file contains.}

## Setup & Installation

{How to install or enable this skill. Include the exact path where it should live.}

**Location:** `~/.claude/skills/{skill-name}/`

**Prerequisites:**
- {Any dependencies, tools, or configurations required}

## Configuration

{Any configurable options, environment variables, or settings. Use a table if there are multiple options.}

| Option | Default | Description |
|--------|---------|-------------|
| {option} | {default} | {what it controls} |

{If no configuration options exist, state: "This skill requires no additional configuration."}

## Dependencies

- {Other skills this skill references or requires}
- {External tools or CLIs needed}
- {If none: "No external dependencies."}

## Examples

### Example 1: {Scenario name}

**Input:** "{What the user says}"

**Result:** {What the skill produces}

### Example 2: {Scenario name}

**Input:** "{What the user says}"

**Result:** {What the skill produces}

## Limitations

- {Known limitation 1}
- {Known limitation 2}
- {If none known: omit this section}

## Related Components

- [{Related skill/hook/agent name}]({relative path}) — {brief relationship description}
```

## Section Guidelines

| Section | Required | Notes |
|---------|----------|-------|
| Overview | Yes | Keep to 2-3 sentences |
| Trigger Phrases | Yes | Extract from description field; list all phrases that activate the skill |
| Description Field | Yes | Show the exact YAML frontmatter description |
| How It Works | Yes | Mirror the actual workflow from SKILL.md |
| When to Use | Yes | Concrete scenarios, not vague generalities |
| When NOT to Use | Yes | Helps users pick the right tool |
| Directory Structure | Yes | Only show directories/files that actually exist |
| Setup & Installation | Yes | Copy-paste ready |
| Configuration | Conditional | Include if configurable; state "none" otherwise |
| Dependencies | Yes | List all or state "none" |
| Examples | Yes | At least one realistic example |
| Limitations | Optional | Include if known |
| Related Components | Optional | Include if part of a toolkit |

---

## Completed Example

Below is a finished README for a real skill. Match this tone, detail level, and formatting.

```markdown
# Skill Builder

> A meta-skill for creating excellent Claude Code skills — from gathering requirements through validation and testing.

## Overview

The skill-builder skill guides the creation of new Claude Code skills through a structured 7-step process. It ensures skills are discoverable (CSO-optimized descriptions), lean (progressive disclosure), and effective (validated and tested). Use this when building any new skill from scratch or improving an existing one.

## Trigger Phrases

This skill activates when you say:

- "Create a skill"
- "Write a skill"
- "Build a skill"
- "Design a skill"
- "Improve a skill description"
- "Organize skill content"

## Description Field

```
This skill should be used when the user asks to "create a skill", "write a skill", "build a skill", "design a skill", "improve a skill description", "organize skill content", or needs guidance on skill structure, frontmatter, progressive disclosure, CSO optimization, or skill testing.
```

## How It Works

1. **Gather Concrete Examples** — Asks what triggers the skill, collects 2-3 use cases, defines success criteria
2. **Plan Resources** — Identifies which supporting files are needed (references, scripts, examples, assets)
3. **Write CSO-Optimized Description** — Crafts the frontmatter description with trigger phrases only (never workflow summaries)
4. **Write SKILL.md Body** — Authors the core skill content under 500 lines in imperative form
5. **Organize Supporting Files** — Applies progressive disclosure: core in SKILL.md, details in references
6. **Validate** — Runs structural checks (frontmatter, line counts, path format, reference integrity)
7. **Test with Scenarios** — Verifies trigger detection, correct application, and edge case handling

## When to Use

- Building a brand new skill from scratch
- Restructuring an existing skill that's too large or poorly organized
- Optimizing a skill's description for better discoverability
- Learning best practices for skill authoring

## When NOT to Use

- Writing hooks — use `hook-builder` instead
- Writing sub-agents — use `agent-builder` instead
- Editing CLAUDE.md files — use `claude-md-management` skills instead

## Directory Structure

```
skill-builder/
├── SKILL.md
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

- **references/** — Detailed guides on specific topics (loaded on demand)
- **examples/** — Working SKILL.md templates at three complexity levels
- **scripts/** — Validation tooling for pre-deployment checks

## Setup & Installation

**Location:** `~/.claude/skills/skill-builder/`

Copy the entire `skill-builder/` directory to your skills folder. No additional setup required.

**Prerequisites:**
- Claude Code CLI installed
- Bash available (for validation script)

## Configuration

This skill requires no additional configuration.

## Dependencies

- No external dependencies
- References `hook-builder` and `agent-builder` skills by name (for "when NOT to use" guidance)

## Examples

### Example 1: Creating a new documentation skill

**Input:** "Build a skill that generates READMEs for Claude Code components"

**Result:** Walks through all 7 steps — gathers examples of trigger phrases, plans resource files, writes a CSO-optimized description, authors SKILL.md with workflow, creates reference templates, validates structure, and suggests test scenarios.

### Example 2: Fixing a poorly discoverable skill

**Input:** "Improve the description for my deployment skill"

**Result:** Reviews the current description, identifies missing trigger phrases and keyword gaps, rewrites in third-person with triggers only (no workflow summary), and validates character count.

## Related Components

- [hook-builder](../hook-builder/) — Creates hooks (complementary to skill-builder)
- [agent-builder](../agent-builder/) — Creates sub-agents (complementary to skill-builder)
```
