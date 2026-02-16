# Linear Assistant

> Personal project management assistant for Linear.

## Overview

Linear Assistant acts as a conversational interface for managing Linear issues, milestones, projects, documents, comments, labels, and cycles. It gathers context through targeted questions before taking any action, ensuring every item created is well-structured and actionable. It also handles retrieval with context-dependent display — summarized for broad queries, detailed for specific items.

## Trigger Phrases

- "add this to linear"
- "update linear"
- "create a linear issue"
- "add a milestone"
- "log this in linear"
- "track this in linear"
- "check linear"
- "what's in linear"
- "show my issues"
- "what's on my plate"
- "linear status"
- "project progress"
- "sprint status"
- "show issue"

## Description Field

```yaml
description: Use when the user says "add this to linear", "update linear", "create a linear issue", "add a milestone", "log this in linear", "track this in linear", "check linear", "what's in linear", "show my issues", "what's on my plate", "linear status", "project progress", "sprint status", or "show issue". Applies to creating, updating, retrieving, or managing Linear issues, milestones, projects, documents, comments, labels, and cycles.
```

## How It Works

1. **Determine the Action Type** — Identify what the user wants: create issue, create milestone, create project, update issue, update project/milestone, add comment, retrieve/view data, or manage labels.
2. **Gather Context** — Ask targeted questions before calling any Linear MCP tool. For issue creation: title, business context, project/team, priority, type, acceptance criteria, blockers, assignee, target date. For retrieval: classify query scope as specific item, filtered list, or broad overview.
3. **Execute and Confirm** — Preview the data to be sent, call the appropriate Linear MCP tool, report results, and suggest follow-up actions (e.g., "Should I add this to a milestone?").

### Retrieval Flow Detail

The retrieval flow uses context-dependent display:

- **Specific item** ("show issue ENG-123") — Full description, all fields, relations, comments
- **Filtered list** ("show my issues", "high priority bugs") — Structured table with title, status, priority, assignee
- **Broad overview** ("project status", "sprint status") — Dashboard summary with counts, progress, blockers, recent activity

After presenting results, the skill suggests relevant next steps.

## When to Use

- Adding new issues, milestones, projects, or documents to Linear
- Updating existing issues (status, priority, assignee, description)
- Retrieving issues, milestones, project status, or sprint progress
- Checking personal workload ("what's on my plate")
- Getting a broad overview or drilling into specific items
- Managing labels, comments, or cycle assignments
- Any request mentioning "linear" in the context of project management

## When NOT to Use

- General project management not involving Linear
- Creating GitHub issues or pull requests
- Managing Jira, Asana, or other project management tools

## Directory Structure

```
linear-assistant/
├── SKILL.md
├── README.md
└── references/
    └── linear-tool-details.md
```

## Setup & Installation

1. Copy or symlink the `linear-assistant/` directory to `~/.claude/skills/linear-assistant/`
2. Ensure Linear MCP tools are available in your Claude Code environment (the skill uses Linear MCP tools like `create_issue`, `list_issues`, `get_project`, etc.)
3. Restart Claude Code to load the skill
4. Use any trigger phrase to invoke

## Configuration

No skill-level configuration is needed. Linear MCP tools must be configured and authenticated separately in your Claude Code environment.

## Dependencies

- Claude Code with skills support
- Linear MCP tools (provides `create_issue`, `update_issue`, `get_issue`, `list_issues`, `create_project`, `get_project`, `list_projects`, `create_milestone`, `update_milestone`, `list_milestones`, `create_comment`, `list_comments`, `create_issue_label`, `list_issue_labels`, `list_teams`, `list_users`, `list_cycles`, `list_documents`, `list_issue_statuses`, and more)

## Examples

### Creating a Well-Structured Issue

Trigger: "Add this to linear — we need to fix the login timeout bug"

The skill will:

1. Ask clarifying questions: "Which project/team does this belong to?", "What priority?", "What's the user impact?"
2. Compose a structured Markdown description with Context, Description, Acceptance Criteria, and Notes sections
3. Preview the issue before creating it
4. Call `create_issue` with title, team, description, priority, and labels
5. Confirm creation and ask: "Should I assign this to a milestone?" or "Want to add it to the current cycle?"

### Checking Personal Workload

Trigger: "What's on my plate?"

The skill will:

1. Classify as a filtered list retrieval
2. Call `list_issues` with `assignee: "me"`
3. Display a structured table with ID, Title, Status, Priority, and Due Date
4. Offer follow-up: "Want to reprioritize anything?" or "Should I reassign an issue?"

### Priority Values Reference

| Value | Meaning |
|-------|---------|
| 0 | None |
| 1 | Urgent |
| 2 | High |
| 3 | Normal |
| 4 | Low |

## Related Components

- [claude-documentation](../../skills/claude-documentation/) — For generating README documentation for this skill
- [claude-toolkit](../../skills/claude-toolkit/) — For publishing this skill to a toolkit repository
