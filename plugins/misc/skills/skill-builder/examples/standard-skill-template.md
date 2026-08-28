# Standard Skill Template

A skill with SKILL.md and references/ directory. Use when detailed documentation should load on demand rather than with every trigger.

## Directory Structure

```
skill-name/
├── SKILL.md
├── references/
│   ├── detailed-guide.md
│   └── patterns.md
└── examples/
    └── working-example.sh
```

## SKILL.md Template

```markdown
---
name: skill-name
description: This skill should be used when the user asks to "do X", "do Y", "do Z", or needs guidance on [specific domain].
---

# Skill Name

## Overview

[Core principle in 1-2 sentences.]

## When to Use

- [Symptom or scenario 1]
- [Symptom or scenario 2]
- [Symptom or scenario 3]

**Do NOT use when:**
- [Wrong-fit scenario]

## Core Process

1. [Step 1 — imperative form]
2. [Step 2]
3. [Step 3]
4. [Step 4]

## Quick Reference

| Rule | Detail |
|------|--------|
| [Key rule 1] | [Concise explanation] |
| [Key rule 2] | [Concise explanation] |

## Common Mistakes

1. **[Mistake]** — [Problem] → [Fix]
2. **[Mistake]** — [Problem] → [Fix]

## Additional Resources

### Reference Files

For detailed guidance on specific topics, consult:

- **`references/detailed-guide.md`** — [What this file covers]
- **`references/patterns.md`** — [What this file covers]

### Examples

Working examples in `examples/`:

- **`examples/working-example.sh`** — [What this example demonstrates]
```

## Reference File Template

```markdown
# [Topic Name]

## Contents
- [Section 1]
- [Section 2]
- [Section 3]

## [Section 1]

[Detailed content that would bloat SKILL.md if inline.]

## [Section 2]

[More detailed content.]
```

## When to Use This Pattern

- Skills with detailed documentation (>100 lines) that not every use needs
- Domain-specific knowledge with multiple reference areas
- Most plugin skills with comprehensive documentation
