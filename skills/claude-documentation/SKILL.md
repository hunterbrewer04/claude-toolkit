---
name: claude-documentation
description: Use when the user asks to "document this skill", "document this hook", "document this sub-agent", "generate a README for this component", "write documentation for this", "update the docs for my toolkit", "generate an index README", or needs standardized documentation for any Claude Code component (skill, hook, or sub-agent). Also applies when the user says "claude-documentation" by name.
---

# Claude Documentation Generator

Generate standardized, high-quality README documentation for Claude Code components — skills, sub-agents, and hooks.

## Overview

This skill produces consistent markdown READMEs adapted by component type. Each component type has distinct sections: skills document trigger phrases and descriptions, hooks document lifecycle events and matching rules, sub-agents document capabilities and invocation patterns. The skill extracts metadata from source files, applies the appropriate template, and outputs a polished README.

## When to Use

- Documenting a new or existing skill, hook, or sub-agent
- Generating a top-level index/catalog README for a directory of components
- Updating stale documentation after component changes
- Standardizing inconsistent docs across a toolkit

## When NOT to Use

- Documenting general application code (use standard doc tools)
- Writing CLAUDE.md project memory files (use `claude-md-management` skills)
- Creating the component itself (use `skill-builder`, `hook-builder`, or `agent-builder`)

## Core Process

### 1. Identify the Component

Determine what is being documented and where it lives:

- **Skill:** Look for `SKILL.md` with YAML frontmatter (`name`, `description` fields)
- **Hook:** Look for hook configuration in `.claude/settings.json` under `hooks` key, or standalone hook scripts
- **Sub-agent:** Look for agent definition files (typically `.md` files with `name`, `description`, `subagent_type` frontmatter, or JSON config)
- **Index mode:** The user asks to document "all components", "the whole toolkit", or "generate an index"

If the component type is ambiguous, ask the user to clarify.

### 2. Extract Metadata from Source Files

Read the actual source files to populate documentation fields:

**For skills:**
- Parse YAML frontmatter for `name` and `description`
- Scan SKILL.md body for workflow steps, resource references, dependencies
- Check for `references/`, `scripts/`, `examples/`, `assets/` directories

**For hooks:**
- Parse `.claude/settings.json` for hook entries (`PreToolUse`, `PostToolUse`, `Stop`, etc.)
- Read hook scripts to understand what they do
- Identify matchers (tool names, glob patterns), commands, and timeout settings

**For sub-agents:**
- Parse agent definition for `name`, `description`, `subagent_type`
- Identify available tools and capabilities
- Note any model preferences or max_turns settings

### 3. Ask Clarifying Questions (If Needed)

If source files are missing key information, ask about:

- **Purpose:** What problem does this component solve?
- **Use cases:** When should someone use this?
- **Setup requirements:** Any dependencies, environment variables, or prerequisites?
- **Known limitations:** Anything the component does NOT handle?

Keep questions focused — skip anything already extractable from source.

### 4. Apply the Appropriate Template

Load the template matching the component type:

| Component Type | Template Reference |
|---------------|-------------------|
| Skill | `references/skill-template.md` |
| Hook | `references/hook-template.md` |
| Sub-agent | `references/subagent-template.md` |
| Index/catalog | `references/index-template.md` |

Follow the template structure exactly. Match the tone and detail level shown in the completed example at the bottom of each template.

### 5. Generate the README

Write the README following these quality standards:

- **Accurate:** Every claim must match the actual source code
- **Complete:** All template sections filled (mark optional sections N/A if truly not applicable)
- **Concise:** No filler text or generic platitudes — every sentence earns its place
- **Consistent:** Follow the template formatting, heading levels, and section order
- **Actionable:** Setup instructions should be copy-paste ready

### 6. Place the Output

- **Individual README:** Write to `README.md` in the component's directory
- **Index README:** Write to `README.md` in the parent/root directory specified by the user
- Confirm the output path with the user before writing if there is any ambiguity

## Index/Catalog Mode

When generating a top-level index:

1. Scan the target directory for all skills, hooks, and sub-agents
2. Categorize components by type
3. For each component, extract name and brief description
4. Generate a categorized listing with links to individual READMEs
5. Load `references/index-template.md` for the format

## Quick Reference

| Field | Skills | Hooks | Sub-agents |
|-------|--------|-------|------------|
| Source files | `SKILL.md`, `references/` | `settings.json`, scripts | Agent `.md` or config |
| Key sections | Triggers, description, workflow | Lifecycle, matchers, config | Capabilities, invocation |
| Template | `references/skill-template.md` | `references/hook-template.md` | `references/subagent-template.md` |
| Output location | Component's `README.md` | Component's `README.md` | Component's `README.md` |

## Additional Resources

- **`references/skill-template.md`** — Template and completed example for skill documentation
- **`references/hook-template.md`** — Template and completed example for hook documentation
- **`references/subagent-template.md`** — Template and completed example for sub-agent documentation
- **`references/index-template.md`** — Template and completed example for index/catalog READMEs
