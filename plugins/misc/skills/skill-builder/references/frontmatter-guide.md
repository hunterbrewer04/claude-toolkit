# Frontmatter Guide

## Contents
- YAML frontmatter format
- Field limits and rules
- Naming conventions
- Allowed characters
- Examples

## YAML Frontmatter Format

Every SKILL.md requires YAML frontmatter at the top, delimited by `---`:

```yaml
---
name: Skill Name
description: This skill should be used when the user asks to "do X", "do Y", or needs guidance on Z.
---
```

Only two fields are supported: `name` and `description`. No other fields are read by the skill loading system (plugin skills may include `version` but it has no functional effect on personal skills).

## Field Limits

| Field | Max Length | Required |
|-------|-----------|----------|
| `name` | 64 characters | Yes |
| `description` | 1024 characters | Yes |
| Combined frontmatter | 1024 characters (total) | — |

**Important:** The 1024-character limit applies to the total frontmatter content in some implementations. Keep descriptions concise — aim for under 500 characters.

## Name Rules

### Allowed Characters
- Letters (a-z, A-Z)
- Numbers (0-9)
- Hyphens (-)
- Spaces

### Not Allowed
- Parentheses: `(`, `)`
- Special characters: `@`, `#`, `$`, `%`, `&`, `*`, etc.
- Underscores: `_` (use hyphens instead)
- Periods: `.`

### Naming Conventions

**Preferred: Gerund form** (verb + -ing) for process-oriented skills:
- "Processing PDFs"
- "Analyzing spreadsheets"
- "Managing databases"
- "Testing code"

**Acceptable alternatives:**
- Noun phrases: "PDF Processing", "Spreadsheet Analysis"
- Action-oriented: "Process PDFs", "Analyze Spreadsheets"
- Hyphenated-lowercase for directory names: `skill-builder`, `pdf-processing`

**Avoid:**
- Vague names: "Helper", "Utils", "Tools"
- Overly generic: "Documents", "Data", "Files"
- Names that don't describe the skill's purpose

### Matching Directory Name

The skill's directory name should match the `name` field in lowercase-hyphenated form:

```
skill-builder/        # directory
  SKILL.md            # name: skill-builder
```

## Description Rules

1. **Third person** — "This skill should be used when..." not "Use this when..."
2. **Triggers only** — describe WHEN to use, never summarize workflow
3. **Include specific phrases** — quoted user queries that should trigger the skill
4. **Cover synonyms** — include related terms Claude might search for
5. **Under 1024 characters** — aim for under 500

See `references/description-writing.md` for detailed description guidance.

## Examples

### Minimal Frontmatter

```yaml
---
name: pdf-processing
description: This skill should be used when the user asks to "extract PDF text", "rotate a PDF", "fill PDF forms", or needs to process PDF files.
---
```

### Comprehensive Frontmatter

```yaml
---
name: skill-builder
description: This skill should be used when the user asks to "create a skill", "write a skill", "build a skill", "design a skill", "improve a skill description", "organize skill content", or needs guidance on skill structure, frontmatter, progressive disclosure, CSO optimization, or skill testing.
---
```

### What NOT to Write

```yaml
# BAD: First person
---
name: my-helper
description: I help users create and manage skills for Claude Code
---

# BAD: Workflow in description
---
name: skill-creator
description: Creates skills by gathering examples, planning resources, writing CSO descriptions, validating with checklists, and testing with subagents
---

# BAD: Special characters in name
---
name: skill_builder (v2)
description: Helps with skills
---
```
