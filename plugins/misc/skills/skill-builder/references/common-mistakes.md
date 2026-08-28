# Common Mistakes When Building Skills

Seven pitfalls that undermine skill quality, with fixes for each.

## 1. Weak Description

**The mistake:** Vague or generic trigger conditions that don't help Claude decide when to load the skill.

```yaml
# BAD
description: Provides guidance for working with hooks.
description: Helps with documents.
description: Processes data.
```

**Why it fails:** Claude scans descriptions to match skills to tasks. Vague descriptions match too broadly or not at all.

**The fix:** Include specific trigger phrases users would say, in quotes:

```yaml
# GOOD
description: This skill should be used when the user asks to "create a hook", "add a PreToolUse hook", "validate tool use", or mentions hook events (PreToolUse, PostToolUse, Stop).
```

## 2. Workflow in Description

**The mistake:** Summarizing the skill's process in the description field.

```yaml
# BAD
description: Use when creating skills — gathers examples, writes CSO description, validates with checklist, tests with subagents
```

**Why it fails:** Testing showed Claude uses the description as a shortcut, following the summarized workflow instead of reading the full SKILL.md body. A description saying "code review between tasks" caused Claude to do ONE review when the body specified TWO.

**The fix:** Description contains ONLY triggering conditions:

```yaml
# GOOD
description: This skill should be used when the user asks to "create a skill", "write a skill", or needs guidance on skill structure, frontmatter, or CSO optimization.
```

## 3. Bloated SKILL.md

**The mistake:** Putting everything in SKILL.md — 5,000+ words, 800+ lines, all inline.

```
# BAD
skill-name/
└── SKILL.md  (8,000 words)
```

**Why it fails:** Everything loads into context when the skill triggers, regardless of relevance. Wastes tokens, slows processing, competes with conversation history.

**The fix:** Keep SKILL.md at 1,500-2,000 words (<500 lines). Move detailed content to references/:

```
# GOOD
skill-name/
├── SKILL.md  (1,800 words — core essentials)
└── references/
    ├── patterns.md (2,500 words)
    └── advanced.md (3,700 words)
```

## 4. Second-Person Writing

**The mistake:** Writing instructions with "you should", "you need to", "you can".

```markdown
# BAD
You should start by reading the configuration file.
You need to validate the input.
You can use the grep tool to search.
```

**Why it fails:** Skills are consumed by AI agents, not humans reading a tutorial. Imperative form is clearer and more direct.

**The fix:** Use imperative/infinitive form:

```markdown
# GOOD
Start by reading the configuration file.
Validate the input before processing.
Use the grep tool to search for patterns.
```

## 5. Nested References

**The mistake:** Chaining references so file A points to file B which points to file C.

```markdown
# BAD
# SKILL.md → See advanced.md
# advanced.md → See details.md
# details.md → Here's the actual information...
```

**Why it fails:** Claude may partially read files when they're referenced from other referenced files, using commands like `head -100` to preview instead of reading complete files. Critical information in deeply nested files may never be fully loaded.

**The fix:** All reference files link directly from SKILL.md:

```markdown
# GOOD
# SKILL.md:
**Advanced features**: See [advanced.md](advanced.md)
**Implementation details**: See [details.md](details.md)
**API reference**: See [reference.md](reference.md)
```

## 6. Missing Resource References

**The mistake:** Having references/, examples/, or scripts/ directories but not mentioning them in SKILL.md.

```markdown
# BAD: SKILL.md has no "Additional Resources" section
# references/patterns.md exists but Claude doesn't know about it
```

**Why it fails:** Claude discovers bundled resources by reading SKILL.md. If SKILL.md doesn't mention them, they're invisible.

**The fix:** Include an explicit "Additional Resources" section:

```markdown
# GOOD
## Additional Resources

### Reference Files
- **references/patterns.md** — Common patterns and techniques
- **references/advanced.md** — Advanced configuration

### Examples
- **examples/basic-setup.sh** — Working example

### Scripts
- **scripts/validate.sh** — Validates skill structure
```

## 7. Windows-Style Paths

**The mistake:** Using backslashes in file paths.

```markdown
# BAD
See references\guide.md for details.
Run scripts\validate.sh to check.
```

**Why it fails:** Backslash paths cause errors on Unix/macOS systems. Since skills are often shared across platforms, forward slashes ensure compatibility everywhere.

**The fix:** Always use forward slashes:

```markdown
# GOOD
See references/guide.md for details.
Run scripts/validate.sh to check.
```

## Quick Diagnostic

If a skill isn't working as expected, check these in order:

1. **Not triggering?** → Check description for specific trigger phrases
2. **Claude not following body?** → Check if description summarizes workflow
3. **Context too large?** → Check SKILL.md line count, move content to references/
4. **Missing information?** → Check if resources are referenced in SKILL.md
5. **Cross-platform issues?** → Check for backslash paths
