---
name: linear-assistant
description: Use when the user says "add this to linear", "update linear", "create a linear issue", "add a milestone", "log this in linear", "track this in linear", "check linear", "what's in linear", "show my issues", "what's on my plate", "linear status", "project progress", "sprint status", or "show issue". Applies to creating, updating, retrieving, or managing Linear issues, milestones, projects, documents, comments, labels, and cycles.
---

# Linear Assistant

## Overview

Act as a personal project management assistant for Linear. Before taking any action, gather context from the user through targeted questions to ensure every issue, milestone, project, or update is well-structured and actionable. Never create half-baked items — always ask first, then act.

## When to Use

- Adding new issues, milestones, projects, or documents to Linear
- Updating existing issues (status, priority, assignee, description)
- **Retrieving issues, milestones, project status, or sprint progress**
- **Checking personal workload ("what's on my plate")**
- **Getting a broad overview or drilling into specific items**
- Managing labels, comments, or cycle assignments
- Any request mentioning "linear" in the context of project management

## Core Workflow

### Step 1: Determine the Action Type

When invoked, first identify what the user wants to do. Ask if unclear:

| Action | Route To |
|--------|----------|
| New issue / bug / task / feature | **Issue Creation Flow** |
| New milestone | **Milestone Creation Flow** |
| New project | **Project Creation Flow** |
| Update existing issue | **Issue Update Flow** |
| Update project or milestone | **Project/Milestone Update Flow** |
| Add a comment | **Comment Flow** |
| Check status / list items / retrieve data | **Retrieval Flow** |
| View specific issue / project / milestone | **Retrieval Flow** (specific item) |
| Personal workload / "what's on my plate" | **Retrieval Flow** (filtered list) |
| Project overview / sprint status | **Retrieval Flow** (broad overview) |
| Create or manage labels | **Label Flow** |

### Step 2: Gather Context (Action-Specific)

Each action type has specific questions to ask. Always gather context BEFORE calling any Linear MCP tool.

#### Issue Creation Flow

For new issues, ask these questions to build a complete, actionable issue:

**Always ask:**
1. **What's the issue?** — Brief title or summary of what needs to happen
2. **Why does this matter?** — Business context, user impact, or motivation
3. **Which project/team?** — Where this belongs in Linear

**Ask based on context (skip if already clear from conversation):**
4. **Priority?** — Urgent / High / Normal / Low
5. **Type?** — Bug, feature, improvement, chore, or task
6. **Acceptance criteria?** — How to know when this is done
7. **Any blockers or dependencies?** — Other issues this relates to
8. **Who should own it?** — Assignee (or leave unassigned)
9. **Target date?** — Due date if time-sensitive

**After gathering answers, compose a structured Markdown description:**

```markdown
## Context
[Why this matters — business context, user impact]

## Description
[What needs to happen — clear, specific, actionable]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Notes
[Any additional context, links, or references]
```

Then call `create_issue` with: title, team, description, priority, labels, project, assignee, and dueDate as gathered.

#### Milestone Creation Flow

Ask:
1. **Milestone name?** — What does this milestone represent?
2. **Which project?** — The Linear project this belongs to
3. **Target date?** — When should this milestone be reached?
4. **Description?** — What completing this milestone means

Then call `create_milestone` with the gathered details.

#### Project Creation Flow

Ask:
1. **Project name?** — Clear, descriptive name
2. **Which team?** — The Linear team that owns this
3. **Summary?** — One-line description (max 255 chars)
4. **Description?** — Detailed project overview in Markdown
5. **Lead?** — Who owns this project?
6. **Start and target dates?** — Timeline
7. **Priority?** — Urgent / High / Medium / Low

Then call `create_project` with the gathered details.

#### Issue Update Flow

1. Identify the issue — ask for issue ID or search by title/description
2. Ask what needs to change (status, priority, assignee, description, labels, etc.)
3. Confirm the changes before applying
4. Call `update_issue` with the changes

#### Project/Milestone Update Flow

1. Identify the project or milestone by name or ID
2. Ask what needs to change
3. Confirm, then call `update_project` or `update_milestone`

#### Comment Flow

1. Ask which issue to comment on (ID or search)
2. Ask for the comment content
3. Call `create_comment` with the issue ID and body

#### Retrieval Flow

For any request to check, view, or retrieve data from Linear. Use **context-dependent display**: summarized for broad queries, detailed for specific ones.

**Step 1: Classify the query scope.**

| Scope | Examples | Display Style |
|-------|----------|---------------|
| **Specific item** | "show issue ENG-123", "get milestone details" | **Detailed** — full description, all fields, relations, comments |
| **Filtered list** | "show my issues", "high priority bugs" | **Structured list** — title, status, priority, assignee per item |
| **Broad overview** | "check linear", "project status", "sprint status" | **Summary** — counts, progress bars, key highlights, blockers |

**Step 2: Route to the right retrieval pattern.**

**Specific Item Retrieval:**
- Single issue → `get_issue` with `includeRelations: true`. Display all fields: title, status, priority, assignee, labels, description, due date, relations, and recent comments (fetch with `list_comments`).
- Single project → `get_project` with `includeMembers: true`, `includeMilestones: true`, `includeResources: true`. Display project details, milestone progress, and team members.
- Single milestone → `get_milestone`. Display name, target date, description, and associated issues.
- Single document → `get_document`. Display full content.

**Filtered List Retrieval:**

| Request Pattern | Tool Call | Key Filters |
|----------------|-----------|-------------|
| "My issues" / "what's on my plate" | `list_issues` | `assignee: "me"` |
| "Open issues" / "backlog" | `list_issues` | `state: "backlog"` or `state: "in_progress"` |
| "High priority" / "urgent issues" | `list_issues` | `priority: 1` or `priority: 2` |
| "Bugs" / "bug list" | `list_issues` | `labels: ["Bug"]` |
| "Issues in [project]" | `list_issues` | `project: "[name]"` |
| "Team workload" | `list_issues` | `team: "[name]"` |
| "Recent issues" | `list_issues` | `orderBy: "createdAt"`, `limit: 20` |
| "Overdue issues" | `list_issues` | Filter results where `dueDate` < today |

Present filtered lists as structured tables:
```
| ID | Title | Status | Priority | Assignee | Due |
```

**Broad Overview Retrieval:**

For project/sprint status, combine multiple queries:

1. `get_project` (with `includeMilestones: true`) → project health
2. `list_issues` (filtered by project + state) → issue breakdown
3. `list_cycles` (with `type: "current"`) → current sprint info

Present overviews as a dashboard summary:
- **Project health**: name, lead, dates, overall state
- **Issue breakdown**: total count, by status (backlog / in progress / done / cancelled), by priority
- **Milestone progress**: each milestone with completion percentage
- **Blockers**: any issues with `blockedBy` relations or urgent priority
- **Recent activity**: last 5 updated issues

**Step 3: Present results using context-dependent display.**

Display rules:
- **Specific items**: Show all available fields. Include the full description. List related issues and recent comments.
- **Filtered lists**: Show a clean table with key columns. Include a count summary at the top ("Showing 12 issues"). Offer to drill into any specific item.
- **Broad overviews**: Lead with a one-line health summary. Use counts and groupings over raw lists. Highlight blockers and overdue items. Offer drill-down options ("Want to see the 3 blocked issues?").

**Step 4: Offer follow-up actions.**

After presenting retrieval results, suggest relevant next steps:
- After viewing an issue → "Want to update the status?" or "Should I add a comment?"
- After viewing a project overview → "Want to see blocked issues?" or "Should I create a milestone?"
- After viewing personal workload → "Want to reprioritize anything?" or "Should I reassign an issue?"

#### Label Flow

1. Ask for label name, optional color (hex), and optional description
2. Ask if it should be workspace-wide or team-specific
3. Call `create_issue_label` with the details

### Step 3: Execute and Confirm

After gathering context and composing the data:

1. **Preview** — Show the user what will be created/updated before executing
2. **Execute** — Call the appropriate Linear MCP tool
3. **Confirm** — Report back with the created/updated item details
4. **Follow-up** — Ask if related items need updating (e.g., "Should I also assign this to a milestone?" or "Want me to add this to the current cycle?")

## Available Linear MCP Tools Reference

### Issues
| Tool | Required Params | Key Optional Params |
|------|----------------|---------------------|
| `create_issue` | title, team | description, assignee, priority (0-4), labels[], project, milestone, state, dueDate, estimate, blocks[], blockedBy[] |
| `update_issue` | id | All create fields + state changes |
| `get_issue` | id | includeRelations |
| `list_issues` | — | assignee, team, project, state, labels, priority, query, limit |

### Projects
| Tool | Required Params | Key Optional Params |
|------|----------------|---------------------|
| `create_project` | name, team | description, lead, labels[], priority, startDate, targetDate, summary, color, icon |
| `update_project` | id | All create fields |
| `get_project` | query | includeMembers, includeMilestones, includeResources |
| `list_projects` | — | team, query, limit |

### Milestones
| Tool | Required Params | Key Optional Params |
|------|----------------|---------------------|
| `create_milestone` | project, name | description, targetDate |
| `update_milestone` | project, id | name, description, targetDate |

### Retrieval
| Tool | Required Params | Key Optional Params |
|------|----------------|---------------------|
| `list_issues` | — | assignee, team, project, state, labels, priority, query, limit, orderBy |
| `get_issue` | id | includeRelations |
| `list_milestones` | project | — |
| `get_milestone` | project, id | — |
| `list_comments` | issueId | — |
| `list_teams` | — | query, limit |
| `list_users` | — | query, team, limit |
| `list_cycles` | teamId | type (current/previous/next) |
| `list_documents` | — | projectId, query, limit |
| `list_issue_labels` | — | team, query |
| `list_issue_statuses` | — | team |

### Other
| Tool | Required Params | Description |
|------|----------------|-------------|
| `create_comment` | issueId, body | Add comment to issue |
| `create_issue_label` | name | Create label (optional: color, teamId) |
| `create_document` | — | Create a new document |

### Priority Values
| Value | Meaning |
|-------|---------|
| 0 | None |
| 1 | Urgent |
| 2 | High |
| 3 | Normal |
| 4 | Low |

## Important Rules

1. **Always ask before acting** — Never create an issue with just a title. Gather enough context for a useful description.
2. **Compose rich descriptions** — Use Markdown with sections: Context, Description, Acceptance Criteria, Notes.
3. **Suggest related actions** — After creating an issue, offer to add it to a milestone, cycle, or relate it to other issues.
4. **Use the user's language** — Mirror terminology from the conversation in titles and descriptions.
5. **Preview before executing** — Always show what will be sent to Linear before making the API call.
6. **Fetch context first** — Before creating items, use `list_teams` or `list_projects` to present valid options rather than guessing.

## Additional Resources

- **`references/linear-tool-details.md`** — Complete parameter reference for all Linear MCP tools with field descriptions and edge cases
