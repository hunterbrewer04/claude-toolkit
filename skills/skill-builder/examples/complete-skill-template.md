# Complete Skill Template

A skill with the full directory structure: SKILL.md, references/, examples/, and scripts/. Use for complex domains with validation utilities and extensive documentation.

## Directory Structure

```
skill-name/
├── SKILL.md
├── references/
│   ├── patterns.md
│   ├── advanced.md
│   └── api-reference.md
├── examples/
│   ├── basic-example.md
│   └── advanced-example.json
└── scripts/
    ├── validate.sh
    └── setup.py
```

## SKILL.md Template

```markdown
---
name: skill-name
description: This skill should be used when the user asks to "do X", "do Y", "do Z", "configure W", or needs guidance on [specific domain], [related topic], or [edge case].
---

# Skill Name

## Overview

[Core principle in 1-2 sentences.]

## When to Use

- [Symptom or scenario 1]
- [Symptom or scenario 2]
- [Symptom or scenario 3]

**Do NOT use when:**
- [Wrong-fit scenario 1]
- [Wrong-fit scenario 2]

## Core Process

1. [Step 1 — imperative form]
2. [Step 2]
3. [Step 3]
4. [Step 4]
5. [Step 5]

## Quick Reference

| Rule | Detail |
|------|--------|
| [Key rule 1] | [Concise explanation] |
| [Key rule 2] | [Concise explanation] |
| [Key rule 3] | [Concise explanation] |

## Utility Scripts

**validate.sh**: Validate [what it validates]

    bash scripts/validate.sh [arguments]

**setup.py**: Set up [what it sets up]

    python scripts/setup.py [arguments]

## Common Mistakes

1. **[Mistake]** — [Problem] → [Fix]
2. **[Mistake]** — [Problem] → [Fix]
3. **[Mistake]** — [Problem] → [Fix]

## Additional Resources

### Reference Files

For detailed guidance on specific topics, consult:

- **`references/patterns.md`** — Common patterns and best practices
- **`references/advanced.md`** — Advanced techniques and edge cases
- **`references/api-reference.md`** — Complete API documentation

### Examples

Working examples in `examples/`:

- **`examples/basic-example.md`** — Basic usage walkthrough
- **`examples/advanced-example.json`** — Advanced configuration example

### Scripts

Utility scripts in `scripts/`:

- **`scripts/validate.sh`** — Validates [target] structure and rules
- **`scripts/setup.py`** — Automates initial setup
```

## Script Template

```bash
#!/usr/bin/env bash
# validate.sh — Validates [what it validates]
# Usage: bash scripts/validate.sh [path-to-target]

set -euo pipefail

TARGET="${1:?Usage: bash scripts/validate.sh <path>}"

# [Validation logic here]

echo "Validation complete."
```

## When to Use This Pattern

- Complex domains requiring validation utilities
- Skills with extensive documentation across multiple areas
- Production workflows with reusable scripts
- Skills that benefit from working code examples users can copy
