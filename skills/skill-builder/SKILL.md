---
name: skill-builder
description: This skill should be used when the user asks to "create a skill", "write a skill", "build a skill", "design a skill", "improve a skill description", "organize skill content", or needs guidance on skill structure, frontmatter, progressive disclosure, CSO optimization, or skill testing.
---

# Skill Builder

## Overview

A meta-skill for creating excellent Claude Code skills. Follow the 7-step process below to produce skills that are discoverable, lean, and effective.

**Core principle:** A skill's description determines whether Claude loads it. The body determines whether Claude follows it correctly. Optimize both — but never let the description summarize the workflow (Claude will shortcut the body).

**Personal skills location:** `~/.claude/skills/` for Claude Code, `~/.agents/skills/` for Codex.

## 7-Step Skill Creation Process

### Step 1: Gather Concrete Examples

Before writing anything, understand how the skill will be used. Ask the user:

- "What would someone say that should trigger this skill?"
- "Can you give 2-3 examples of tasks this skill should handle?"
- "What does success look like for each example?"

Conclude this step with a clear list of trigger phrases and use cases.

### Step 2: Plan Resources

Analyze each example to identify what reusable resources the skill needs:

| Resource Type | When to Include | Example |
|---------------|-----------------|---------|
| `scripts/` | Same code rewritten repeatedly; deterministic reliability needed | `scripts/validate.sh` |
| `references/` | Documentation >100 lines that Claude loads on demand | `references/api-docs.md` |
| `assets/` | Files used in output (templates, images), not loaded into context | `assets/template.html` |

Create a resource plan listing each file and its purpose. Only create directories that will contain files.

### Step 3: Write CSO-Optimized Description

The description is the most critical field — it controls whether Claude finds and loads the skill.

**Rules:**
1. Write in third person ("This skill should be used when...")
2. Include specific trigger phrases users would say
3. Describe ONLY triggering conditions — NEVER summarize workflow
4. Stay under 1024 characters (aim for under 500)
5. Cover synonyms and related terms

```yaml
# BAD: Summarizes workflow — Claude will follow this instead of reading body
description: Use when creating skills — gathers examples, writes description, tests with subagents

# GOOD: Triggers only — forces Claude to read the full body
description: This skill should be used when the user asks to "create a skill", "write a skill", or needs guidance on skill structure, frontmatter, or CSO optimization.
```

For detailed guidance, see **`references/description-writing.md`**.

### Step 4: Write SKILL.md Body

Write the skill body following these constraints:

- **Under 500 lines** — split into reference files if approaching this limit
- **Imperative form** — "Validate the input" not "You should validate the input"
- **1,500-2,000 words** — enough to be useful, lean enough for context efficiency
- **No second person** — never use "you" in instructions

**Required sections:**

1. **Overview** — Core principle in 1-2 sentences
2. **When to Use** — Bullet list of symptoms and use cases (include when NOT to use)
3. **Core Process/Pattern** — The actionable workflow or technique
4. **Quick Reference** — Table or bullets for scanning
5. **Additional Resources** — Pointers to all reference files

**Writing tips:**
- One excellent example beats many mediocre ones
- Move details >100 lines to `references/`
- Use flowcharts ONLY for non-obvious decision points
- Cross-reference other skills by name: `**REQUIRED:** Use superpowers:test-driven-development`
- Never use `@` links (force-loads files, burns context)

### Step 5: Organize Supporting Files (Progressive Disclosure)

Skills use a three-level loading system:

```
Level 1: Metadata (name + description)  — Always in context (~100 words)
Level 2: SKILL.md body                  — Loaded when skill triggers (<5k words)
Level 3: Bundled resources              — Loaded as needed by Claude (unlimited)
```

**Key rules:**
- All reference files must be linked directly from SKILL.md (one level deep)
- Never nest references (file A referencing file B referencing file C)
- Name files descriptively: `form_validation_rules.md`, not `doc2.md`
- Use forward slashes only: `references/guide.md`, never `references\guide.md`
- Include a table of contents in reference files >100 lines

**What goes where:**

| Location | Content | Loaded |
|----------|---------|--------|
| SKILL.md | Core concepts, essential procedures, quick reference, resource pointers | When skill triggers |
| `references/` | Detailed patterns, API docs, advanced techniques, edge cases | On demand |
| `examples/` | Complete, runnable code examples and templates | On demand |
| `scripts/` | Validation tools, testing helpers, automation | Executed, not loaded |
| `assets/` | Templates, images, fonts used in output | Used, not loaded |

For detailed patterns, see **`references/progressive-disclosure.md`**.

### Step 6: Validate

Run the quality checklist before deployment. At minimum, verify:

- [ ] SKILL.md exists with valid YAML frontmatter
- [ ] `name` is ≤64 characters, uses only letters/numbers/hyphens/spaces
- [ ] `description` is ≤1024 characters, third-person, triggers only
- [ ] Body uses imperative form (no "you should")
- [ ] Body is under 500 lines
- [ ] All referenced files exist
- [ ] No backslash paths
- [ ] No deeply nested references

Run the validation script:

```bash
bash scripts/validate-skill.sh /path/to/skill-directory/
```

For the complete checklist, see **`references/quality-checklist.md`**.

### Step 7: Test with Scenarios

Test the skill to verify it works as intended. Different skill types need different test approaches:

| Skill Type | Test Focus | Success Criteria |
|------------|-----------|------------------|
| Discipline (rules) | Pressure scenarios — does Claude comply under stress? | Agent follows rule under maximum pressure |
| Technique (how-to) | Application scenarios — can Claude apply it correctly? | Agent successfully applies technique |
| Pattern (mental model) | Recognition — does Claude know when to apply? | Agent correctly identifies when/how to use |
| Reference (docs/APIs) | Retrieval — can Claude find the right information? | Agent finds and applies info correctly |

**Minimum test coverage:**
1. Trigger test — start a new session, use a trigger phrase, verify skill loads
2. Application test — use the skill on a real task, verify correct behavior
3. Edge case test — try an unusual scenario, verify graceful handling

For the full TDD methodology, see **`references/testing-approach.md`**.

## Quick Reference Table

| Rule | Limit | Source |
|------|-------|--------|
| `name` field | ≤64 characters | Anthropic docs |
| `description` field | ≤1024 characters | Anthropic docs |
| `name` allowed characters | Letters, numbers, hyphens, spaces | Anthropic docs |
| SKILL.md body | <500 lines | Anthropic docs |
| SKILL.md target words | 1,500-2,000 | Best practice |
| Description format | Third-person, triggers only | CSO testing |
| Writing style | Imperative/infinitive form | Convention |
| Reference depth | One level from SKILL.md | Anthropic docs |
| Naming convention | Gerund form preferred | Anthropic docs |
| Path separators | Forward slashes only | Cross-platform |

## Skill Directory Patterns

### Minimal (just SKILL.md)
```
skill-name/
└── SKILL.md
```
When: All content fits inline, no heavy reference needed.

### Standard (with references)
```
skill-name/
├── SKILL.md
├── references/
│   └── detailed-guide.md
└── examples/
    └── working-example.sh
```
When: Detailed documentation that should load on demand.

### Complete (full structure)
```
skill-name/
├── SKILL.md
├── references/
│   ├── patterns.md
│   └── advanced.md
├── examples/
│   ├── example1.md
│   └── example2.json
└── scripts/
    └── validate.sh
```
When: Complex domains with validation utilities and extensive documentation.

## Common Mistakes

Avoid these pitfalls (details in **`references/common-mistakes.md`**):

1. **Weak description** — vague triggers, missing phrases
2. **Workflow in description** — Claude shortcuts the body
3. **Bloated SKILL.md** — everything inline, >500 lines
4. **Second-person writing** — "you should" instead of imperative
5. **Nested references** — file A → file B → file C
6. **Missing resource refs** — references/ exists but SKILL.md doesn't mention it
7. **Windows paths** — backslashes break on Unix systems

## Additional Resources

### Reference Files

For detailed guidance on specific topics, consult:

- **`references/description-writing.md`** — CSO optimization, trigger writing, keyword coverage
- **`references/progressive-disclosure.md`** — File organization patterns, what goes where
- **`references/frontmatter-guide.md`** — Field limits, naming rules, allowed characters
- **`references/quality-checklist.md`** — Pre-deployment validation checklist
- **`references/testing-approach.md`** — TDD methodology for skills, pressure scenarios
- **`references/common-mistakes.md`** — Top 7 pitfalls with fixes

### Example Templates

Working templates in `examples/`:

- **`examples/minimal-skill-template.md`** — Simple SKILL.md with frontmatter + core sections
- **`examples/standard-skill-template.md`** — Adds references/ directory and resource pointers
- **`examples/complete-skill-template.md`** — Full structure with scripts/, examples/, references/

### Validation Script

- **`scripts/validate-skill.sh`** — Validates skill structure, frontmatter rules, and content guidelines
