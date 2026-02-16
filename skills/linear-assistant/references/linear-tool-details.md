# Linear MCP Tool Details

Complete parameter reference for all Linear MCP tools available via `mcp__claude_ai_Linear__*`.

## Table of Contents

1. [Issue Tools](#issue-tools)
2. [Project Tools](#project-tools)
3. [Milestone Tools](#milestone-tools)
4. [Comment Tools](#comment-tools)
5. [Label Tools](#label-tools)
6. [Document Tools](#document-tools)
7. [Query Tools](#query-tools)
8. [Attachment Tools](#attachment-tools)
9. [Common Patterns](#common-patterns)

## Issue Tools

### create_issue

Creates a new issue in a Linear team.

**Required:**
- `title` (string) — Issue title. Keep concise but descriptive.
- `team` (string) — Team name or ID.

**Optional:**
- `description` (string) — Markdown content. Use structured sections for clarity.
- `assignee` (string) — User ID, name, email, or `"me"`.
- `priority` (number) — 0=None, 1=Urgent, 2=High, 3=Normal, 4=Low.
- `labels` (string[]) — Label names or IDs. Multiple labels supported.
- `project` (string) — Project name or ID to associate with.
- `milestone` (string) — Milestone name or ID within the project.
- `state` (string) — Workflow state type, name, or ID. Defaults to team's first backlog/triage state.
- `dueDate` (string) — ISO-8601 format (e.g., `"2026-03-15"`).
- `estimate` (number) — Story point estimate value.
- `cycle` (string) — Cycle name, number, or ID.
- `parentId` (string) — Parent issue ID for sub-issues.
- `blocks` (string[]) — Issue IDs/identifiers this issue blocks.
- `blockedBy` (string[]) — Issue IDs/identifiers blocking this issue.
- `relatedTo` (string[]) — Related issue IDs/identifiers.
- `links` (object[]) — Link attachments: `[{url: "...", title: "..."}]`.
- `delegate` (string) — Agent name or ID.
- `duplicateOf` (string) — Issue ID if this is a duplicate.

### update_issue

Updates an existing issue. All fields from create_issue are available as optional updates.

**Required:**
- `id` (string) — Issue ID or identifier (e.g., `"ENG-123"`).

**Special behaviors:**
- `assignee: null` — Removes the assignee.
- `parentId: null` — Removes the parent (un-nests the issue).
- `duplicateOf: null` — Removes duplicate marking.
- `blocks` / `blockedBy` / `relatedTo` — Replaces existing relations entirely; omit to keep unchanged.

### get_issue

Retrieves detailed information about an issue.

**Required:**
- `id` (string) — Issue ID.

**Optional:**
- `includeRelations` (boolean, default false) — Include blocking/related/duplicate relations.

### list_issues

Lists issues with optional filters.

**Optional filters:**
- `assignee` — Filter by assignee name, email, or `"me"`.
- `team` — Filter by team name or ID.
- `project` — Filter by project name or ID.
- `state` — Filter by workflow state.
- `labels` — Filter by label names.
- `priority` — Filter by priority value.
- `query` — Search query string.
- `limit` (default 50, max 250) — Number of results.
- `cursor` — Pagination cursor.
- `orderBy` — Sort by `createdAt` or `updatedAt`.
- `includeArchived` (default false) — Include archived issues.

## Project Tools

### create_project

**Required:**
- `name` (string) — Project name.
- `team` (string) — Team name or ID.

**Optional:**
- `description` (string) — Markdown content.
- `summary` (string) — Short summary, max 255 characters.
- `lead` (string) — User ID, name, email, or `"me"`.
- `labels` (string[]) — Label names or IDs.
- `priority` (integer) — 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low.
- `startDate` (string) — ISO-8601 format.
- `targetDate` (string) — ISO-8601 format.
- `state` (string) — Project state.
- `color` (string) — Hex color code.
- `icon` (string) — Emoji icon (e.g., `:eagle:`).
- `initiative` (string) — Initiative name or ID.

### update_project

**Required:**
- `id` (string) — Project ID.

All create_project fields available as optional updates. Additional:
- `initiatives` (string[]) — Initiative IDs or names.
- `lead: null` — Removes the lead.

### get_project

**Required:**
- `query` (string) — Project ID or name.

**Optional:**
- `includeMembers` (boolean, default false)
- `includeMilestones` (boolean, default false)
- `includeResources` (boolean, default false) — Documents, links, attachments.

### list_projects

**Optional:**
- `team`, `query`, `limit`, `cursor`, `orderBy`, `includeArchived`, `createdAt`, `updatedAt`.

## Milestone Tools

### create_milestone

**Required:**
- `project` (string) — Project name or ID.
- `name` (string) — Milestone name.

**Optional:**
- `description` (string) — Milestone description.
- `targetDate` (string) — ISO-8601 format.

### update_milestone

**Required:**
- `project` (string) — Project name or ID.
- `id` (string) — Milestone name or ID.

**Optional:**
- `name` (string) — Updated name.
- `description` (string) — Updated description.
- `targetDate` (string | null) — Updated target date, or null to remove.

## Comment Tools

### create_comment

**Required:**
- `issueId` (string) — Issue ID.
- `body` (string) — Comment content in Markdown.

**Optional:**
- `parentId` (string) — Parent comment ID for threaded replies.

### list_comments

**Required:**
- `issueId` (string) — Issue ID.

## Label Tools

### create_issue_label

**Required:**
- `name` (string) — Label name.

**Optional:**
- `color` (string) — Hex color code (e.g., `"#FF5733"`).
- `description` (string) — Label description.
- `teamId` (string) — Team UUID. Omit for workspace-wide label.
- `parentId` (string) — Parent label group UUID.
- `isGroup` (boolean, default false) — Whether this is a label group.

### list_issue_labels

**Optional:**
- `team`, `query`, `limit`, `cursor`, `orderBy`, `includeArchived`.

## Document Tools

### create_document

Create a document in the Linear workspace.

### update_document

Update an existing document.

### get_document

**Required:**
- `id` (string) — Document ID or slug.

### list_documents

**Optional:**
- `projectId`, `creatorId`, `initiativeId`, `query`, `limit`, `cursor`, `orderBy`, `includeArchived`, `createdAt`, `updatedAt`.

## Query Tools

### list_teams

List all teams in the workspace.
**Optional:** `query`, `limit`, `cursor`, `orderBy`, `includeArchived`, `createdAt`, `updatedAt`.

### get_team

**Required:**
- `id` (string) — Team ID.

### list_users

List workspace members.
**Optional:** `query`, `team`, `limit`, `cursor`, `orderBy`.

### get_user

**Required:**
- `id` (string) — User ID.

### list_cycles

**Required:**
- `teamId` (string) — Team ID.

**Optional:**
- `type` — Filter: `"current"`, `"previous"`, or `"next"`.

### list_issue_statuses

List workflow states for a team.

### get_issue_status

**Required:**
- `id`, `name`, `team` — All required to look up a specific status.

## Attachment Tools

### create_attachment

**Required:**
- `issue` (string) — Issue ID or identifier.
- `base64Content` (string) — Base64-encoded file content.
- `filename` (string) — Filename with extension.
- `contentType` (string) — MIME type (e.g., `"image/png"`).

**Optional:**
- `title` (string) — Attachment title.
- `subtitle` (string) — Attachment subtitle.

### get_attachment / delete_attachment

Operations on existing attachments by ID.

## Common Patterns

### Creating a well-structured issue

```
1. list_teams → get available teams
2. list_projects → get projects for the team
3. list_issue_labels → get available labels
4. Ask user qualifying questions
5. create_issue → with full context
6. Offer follow-ups: milestone, cycle, relations
```

### Updating issue status

```
1. get_issue → current state
2. list_issue_statuses → available states for the team
3. update_issue → set new state
```

### Project health check

```
1. get_project → with includeMilestones=true
2. list_issues → filtered by project, state
3. Report: open vs closed, milestone progress, blockers
```
