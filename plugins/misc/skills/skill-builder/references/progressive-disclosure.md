# Progressive Disclosure Patterns

## Contents
- The three-level loading system
- What goes where
- Organization patterns
- Anti-patterns

## The Three-Level Loading System

Skills manage context efficiently through progressive disclosure:

| Level | What | When Loaded | Token Budget |
|-------|------|-------------|--------------|
| 1. Metadata | `name` + `description` from frontmatter | Always in context | ~100 words |
| 2. SKILL.md body | Core instructions and workflow | When skill triggers | <5,000 words |
| 3. Bundled resources | references/, examples/, scripts/, assets/ | As needed by Claude | Unlimited* |

*Scripts can be executed without reading into context window, making them effectively unlimited.

## What Goes Where

### In SKILL.md (always loaded when triggered)

- Core concepts and overview
- Essential procedures and workflows
- Quick reference tables
- Pointers to all reference files
- Most common use cases

**Target:** 1,500-2,000 words, under 500 lines.

### In references/ (loaded on demand)

- Detailed patterns and advanced techniques
- Comprehensive API documentation
- Migration guides and edge cases
- Extensive examples and walkthroughs
- Troubleshooting guides

**Each file can be 2,000-5,000+ words** — no context penalty until accessed.

### In examples/ (loaded on demand)

- Complete, runnable code examples
- Configuration file templates
- Real-world usage examples
- Files users can copy and adapt directly

### In scripts/ (executed, not loaded)

- Validation tools
- Testing helpers
- Parsing utilities
- Automation scripts

**Benefits:** Token efficient, deterministic, consistent. Only script output consumes tokens.

### In assets/ (used in output, not loaded)

- Templates, images, fonts
- Boilerplate code projects
- Files that get copied or modified in output

## Organization Patterns

### Pattern 1: High-Level Guide with References

SKILL.md provides overview and quick start; reference files contain details.

```
pdf-processing/
├── SKILL.md            # Quick start + workflow overview
├── FORMS.md            # Form-filling guide (loaded when needed)
├── reference.md        # API reference (loaded when needed)
└── examples.md         # Usage examples (loaded when needed)
```

```markdown
# In SKILL.md:
## Advanced features
**Form filling**: See [FORMS.md](FORMS.md) for complete guide
**API reference**: See [reference.md](reference.md) for all methods
```

### Pattern 2: Domain-Specific Organization

For skills with multiple domains, organize by domain so Claude loads only relevant context.

```
bigquery-skill/
├── SKILL.md
└── reference/
    ├── finance.md     # Revenue, billing metrics
    ├── sales.md       # Opportunities, pipeline
    └── product.md     # API usage, features
```

Include grep patterns in SKILL.md for large reference files:

```markdown
## Quick search
Find specific metrics:
grep -i "revenue" reference/finance.md
grep -i "pipeline" reference/sales.md
```

### Pattern 3: Conditional Details

Show basic content inline, link to advanced content.

```markdown
## Creating documents
Use docx-js for new documents. See [DOCX-JS.md](DOCX-JS.md).

## Editing documents
For simple edits, modify the XML directly.
**For tracked changes**: See [REDLINING.md](REDLINING.md)
```

Claude reads the advanced files only when the user needs those features.

### Pattern 4: Table of Contents for Large Files

For reference files longer than 100 lines, include a table of contents at the top so Claude can see the full scope even when previewing.

```markdown
# API Reference

## Contents
- Authentication and setup
- Core methods (create, read, update, delete)
- Advanced features (batch operations, webhooks)
- Error handling patterns
- Code examples

## Authentication and setup
...
```

## Anti-Patterns

### Deeply Nested References

Claude may partially read files when they're referenced from other referenced files, using commands like `head -100` instead of reading complete files.

```markdown
# BAD: Too deep
SKILL.md → advanced.md → details.md → actual-info.md

# GOOD: One level deep
SKILL.md → advanced.md
SKILL.md → details.md
SKILL.md → api-reference.md
```

**Rule:** All reference files link directly from SKILL.md. Never chain references.

### Unreferenced Resources

If references/ or examples/ exist but SKILL.md doesn't mention them, Claude won't know they're available.

```markdown
# BAD: No mention of resources
# SKILL.md just has core content, no "Additional Resources" section

# GOOD: Explicit resource section
## Additional Resources
- **references/patterns.md** — Common patterns and techniques
- **examples/basic-setup.sh** — Working example
```

### Everything in SKILL.md

Putting all content in SKILL.md means it all loads into context every time the skill triggers, regardless of relevance.

```
# BAD: 8,000 words in one file
skill-name/
└── SKILL.md  (everything inline)

# GOOD: Progressive disclosure
skill-name/
├── SKILL.md  (1,800 words — core essentials)
└── references/
    ├── patterns.md (2,500 words)
    └── advanced.md (3,700 words)
```
