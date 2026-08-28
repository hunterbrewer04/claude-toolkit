# Description Writing Guide

## Contents
- The CSO principle
- The triggers-only rule
- Writing format
- Keyword coverage
- Good and bad examples

## The CSO Principle

Claude Search Optimization (CSO) determines whether Claude discovers and loads a skill. The `description` field is the single most important factor — Claude reads it to decide: "Should I load this skill right now?"

The description must answer one question: **When should this skill trigger?**

## The Triggers-Only Rule

**CRITICAL:** The description must contain ONLY triggering conditions. Never summarize the skill's process or workflow.

**Why this matters:** Testing revealed that when a description summarizes workflow, Claude follows the description as a shortcut instead of reading the full SKILL.md body. Example: a description saying "code review between tasks" caused Claude to do ONE review, even though the skill's body specified TWO reviews. Removing the workflow summary from the description forced Claude to read and follow the complete body.

**The trap:** Descriptions that summarize workflow create a shortcut Claude will take. The skill body becomes documentation Claude skips.

## Writing Format

### Third-Person Voice

Descriptions are injected into the system prompt. Write in third person for consistency.

```yaml
# GOOD: Third person
description: This skill should be used when the user asks to "create a skill"...

# BAD: First person
description: I can help you with skill creation...

# BAD: Second person
description: Use this skill when you want to create skills...
```

### Start with Trigger Conditions

Open with "This skill should be used when..." or "Use when..." to focus on triggering conditions.

```yaml
# GOOD: Condition-first
description: This skill should be used when the user asks to "rotate a PDF", "extract PDF text", "fill PDF forms", or needs to process PDF files programmatically.

# BAD: Capability-first
description: Provides PDF processing capabilities including rotation, text extraction, and form filling.
```

### Include Specific Phrases

List exact phrases users would say that should trigger the skill. Enclose them in quotes.

```yaml
# GOOD: Specific quoted phrases
description: This skill should be used when the user asks to "create a hook", "add a PreToolUse hook", "validate tool use", or mentions hook events (PreToolUse, PostToolUse, Stop).

# BAD: Abstract description
description: Helps with hook-related development tasks.
```

### Character Limit

Stay under 1024 characters total. Aim for under 500 characters when possible — longer descriptions consume metadata context in every session.

## Keyword Coverage

Include words Claude would search for when encountering relevant tasks:

- **Error messages**: "Hook timed out", "ENOTEMPTY", "race condition"
- **Symptoms**: "flaky", "hanging", "zombie", "pollution"
- **Synonyms**: "timeout/hang/freeze", "cleanup/teardown/afterEach"
- **Tools**: Actual commands, library names, file types
- **Actions**: What the user asks to do ("create", "build", "fix", "configure")

Describe the *problem* (race conditions, inconsistent behavior) not language-specific symptoms (setTimeout, sleep) — unless the skill itself is technology-specific.

## Good and Bad Examples

### Example 1: Skill Creation

```yaml
# BAD: Summarizes workflow
description: Use when creating skills — gathers examples, writes CSO description, validates with checklist, tests with subagents

# GOOD: Triggers only
description: This skill should be used when the user asks to "create a skill", "write a skill", "build a skill", "improve a skill description", or needs guidance on skill structure, frontmatter, or CSO optimization.
```

### Example 2: TDD

```yaml
# BAD: Too much process detail
description: Use for TDD — write test first, watch it fail, write minimal code, refactor

# GOOD: Triggering conditions only
description: Use when implementing any feature or bugfix, before writing implementation code
```

### Example 3: Async Testing

```yaml
# BAD: Technology-specific but skill is generic
description: Use when tests use setTimeout/sleep and are flaky

# GOOD: Problem-focused
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently
```

### Example 4: PDF Processing

```yaml
# BAD: Too vague
description: Helps with documents

# GOOD: Specific with triggers
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

## Naming Conventions

Skill names should use **gerund form** (verb + -ing) when describing processes:

- `creating-skills` not `skill-creation`
- `condition-based-waiting` not `async-test-helpers`
- `testing-code` not `test-utils`

Name by the action or core insight, not by tool category.

**Allowed characters in `name` field:** Letters, numbers, hyphens, spaces only. Maximum 64 characters. No parentheses or special characters.
