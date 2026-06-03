# Skill Writing Guide

Reference for writing the SKILL.md body itself — anatomy, progressive disclosure, patterns, and style. Load this file when drafting or revising a skill's content.

## Anatomy of a Skill

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic/repetitive tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Files used in output (templates, icons, fonts)
```

## Progressive Disclosure

Skills use a three-level loading system:

| Level | Content | Budget | When loaded |
|---|---|---|---|
| 1. Metadata | `name` + `description` | ~100 tokens | Always in system prompt |
| 2. SKILL.md body | Full procedural guidance | <500 lines ideal, <5000 words | When skill triggers |
| 3. Bundled resources | Reference files + scripts | Unlimited | On demand only |

### Key patterns

- Keep SKILL.md under 500 lines. If approaching this limit, add hierarchy and clear pointers to reference files.
- Reference files must be loaded by an explicit named step in SKILL.md (e.g., "Read `references/schemas.md` for the full schema").
- For large reference files (>300 lines), include a table of contents at the top.
- Use only one level of nesting below SKILL.md. Deeply nested references (A → B → C) cause navigation failures.

### Domain organization

When a skill supports multiple domains/frameworks, organize by variant:

```
cloud-deploy/
├── SKILL.md (workflow + selection)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```

Claude reads only the relevant reference file based on which domain applies.

## Writing Patterns

### Defining output formats

```markdown
## Report structure
ALWAYS use this exact template:
# [Title]
## Executive summary
## Key findings
## Recommendations
```

### Examples pattern

```markdown
## Commit message format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

### Imperative voice

Process steps use imperative verbs (`Extract`, `Run`, `Generate`), not explanatory paragraphs or conditional phrasing ("You might want to...").

## Writing Style

- **Explain the why.** Today's LLMs have strong theory of mind. When instructions include reasoning, the model generalizes better than when it only sees rigid MUSTs.
- **Reframe absolute rules.** If writing `ALWAYS` or `NEVER` in caps, that's a signal to explain the underlying reasoning instead.
- **Keep it lean.** Remove anything not pulling its weight. Fluff fragments the model's attention.
- **Default assumption:** Claude is already smart. Only add context Claude doesn't already have — don't reteach basics.
- **General over narrow.** Skills will be used across many prompts. Avoid overfitting instructions to specific examples.

## Principle of Lack of Surprise

Skills must not contain malware, exploit code, or content that compromises system security. A skill's contents should not surprise the user relative to its stated intent. Do not create skills designed to facilitate unauthorized access, data exfiltration, or malicious activity. Roleplay-style skills are acceptable.

## Description-field guidance

The `description` in YAML frontmatter is the primary triggering mechanism. Include BOTH:

- **What the skill does** (capability)
- **When to use it** (trigger conditions — be specific about user phrasings, file types, contexts)

Claude tends to under-trigger skills. To combat this, descriptions can be mildly insistent about trigger conditions — e.g., "Use this skill whenever the user mentions dashboards, data visualization, internal metrics, or wants to display any kind of company data, even if they don't explicitly ask for a 'dashboard.'" Don't overdo it to the point of false triggers.

For stronger guidance on trigger accuracy, see the **Description Optimization** procedure in SKILL.md (runs a 20-query eval loop).
