---
name: canvas
description: >
  This skill should be used when the user asks about their Canvas LMS account, courses,
  assignments, grades, files, announcements, discussions, quizzes, or due dates.
  Trigger phrases: "what's due", "canvas", "my assignments", "my grades", "course files",
  "help with my assignment", "what do I have", "upcoming in canvas", "download from canvas",
  "how am I doing in", "canvas planner", "check my canvas", "pull from canvas",
  "canvas grades", "canvas quiz", "course announcement".
---

# Canvas LMS Assistant

## Overview

Interact with the user's Canvas LMS account using the Canvas REST API. Call endpoints with a Bearer token, parse the JSON response, and answer questions conversationally. All operations are read-only unless the user explicitly requests a submission.

## When to Use

- Checking upcoming assignments, due dates, or the planner
- Getting help understanding or planning an assignment (pull description + rubric)
- Checking current grades or submission status
- Listing or downloading course files
- Reading course announcements or discussion topics
- Accessing quiz scores or upcoming quizzes
- Any question that references Canvas, a course, an assignment, or school deadlines

**Do NOT use for:** non-Canvas questions, submitting assignments on the user's behalf without explicit confirmation, or accessing student data for other users.

## Prerequisites

Before any Canvas operation, verify environment is configured:

```bash
# Check both vars are set
[ -z "$CANVAS_API_TOKEN" ] && echo "MISSING: CANVAS_API_TOKEN" || echo "OK: token set"
[ -z "$CANVAS_BASE_URL" ]  && echo "MISSING: CANVAS_BASE_URL"  || echo "OK: base URL set"
```

If either is missing, stop and print setup instructions:

> **Canvas skill is not configured.** Add these to your `~/.zshrc` (or shell profile):
>
> ```bash
> export CANVAS_API_TOKEN="your_token_here"
> export CANVAS_BASE_URL="https://canvas.yourschool.edu"
> ```
>
> To generate a token: Canvas → Account → Settings → **Approved Integrations** → New Access Token.
> Then run `source ~/.zshrc` and try again.

## Intent Routing

Determine which workflow to use based on the user's message:

| User says... | Workflow |
|---|---|
| "what's due", "upcoming", "planner", "today", "this week" | **[Planner Workflow]** |
| "help with", "tell me about", "what is this assignment", "rubric" | **[Assignment Detail Workflow]** |
| "grades", "how am I doing", "my score", "what did I get" | **[Grades Workflow]** |
| "files", "download", "syllabus PDF", "pull the rubric" | **[Files Workflow]** |
| "announcement", "discussion", "forum", "any posts" | **[Announcements/Discussions Workflow]** |
| "quiz", "test score", "quiz due" | **[Quiz Workflow]** |
| "my courses", "what am I enrolled in" | **[Courses Workflow]** |

If intent is ambiguous, ask one clarifying question before calling any API.

## Workflows

### Standard API Call Pattern

All Canvas API calls follow this pattern:

```bash
curl -s \
  -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  -H "Accept: application/json" \
  "$CANVAS_BASE_URL/api/v1/ENDPOINT" \
  | python3 -m json.tool 2>/dev/null || echo "Parse error — raw response above"
```

Use `jq` instead of `python3 -m json.tool` if available (`which jq`).

For paginated results, add `?per_page=50`. Check the `Link` response header for additional pages.

---

### [Courses Workflow]

List the user's active enrollments:

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses?enrollment_state=active&include[]=syllabus_body&per_page=50"
```

Extract: `id`, `name`, `course_code` — use these IDs in all subsequent calls. Present as a simple list and ask which course (if needed).

---

### [Planner Workflow]

Get all upcoming items across all courses (best for "what's due?"):

```bash
# Today's date in ISO format
TODAY=$(date -u +%Y-%m-%dT%H:%M:%SZ)

curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/planner/items?start_date=$TODAY&per_page=50"
```

Also fetch upcoming calendar events for a richer view:

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/users/self/upcoming_events"
```

Extract: `plannable.title`, `plannable_date`, `course_id`, `plannable_type`. Sort by date. Present as a prioritized list grouped by course.

---

### [Assignment Detail Workflow]

1. If course is not specified, run [Courses Workflow] first and ask which course.
2. List assignments for that course:

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/assignments?per_page=50&order_by=due_at&include[]=submission"
```

3. Find the matching assignment by name (fuzzy match). Extract: `name`, `description` (HTML — strip tags), `due_at`, `points_possible`, `rubric` (if present).
4. Present the assignment description and rubric clearly. Offer to help brainstorm, outline, or review the work.

---

### [Grades Workflow]

Get grade summary per course:

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/enrollments?user_id=self"
```

Extract: `grades.current_grade`, `grades.current_score`, `grades.final_grade`, `grades.final_score`.

For individual assignment grades, fetch submissions:

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/assignments/ASSIGNMENT_ID/submissions/self"
```

Extract: `score`, `grade`, `submitted_at`, `grader_id`, `body` (feedback).

---

### [Files Workflow]

List available files for a course:

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/files?per_page=50&sort=updated_at&order=desc"
```

Extract: `display_name`, `content-type`, `size`, `url`. Present as a list with file types. To download, confirm with the user first, then:

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  -o "FILENAME" "FILE_URL"
```

Course wiki pages (instructor-written content):

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/pages?per_page=50"
```

---

### [Announcements/Discussions Workflow]

Announcements:

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/announcements?per_page=20"
```

Discussions:

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/discussion_topics?per_page=20"
```

Extract: `title`, `message` (HTML — strip tags), `posted_at`, `read_state`. Summarize unread items first.

---

### [Quiz Workflow]

Classic quizzes:

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/quizzes?per_page=50"
```

Quiz submission (score):

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/quizzes/QUIZ_ID/submissions?user_id=self"
```

Note: Some schools use "New Quizzes" (a separate engine). If classic quiz API returns empty, check modules for quiz-type items.

---

## Safety Rules

- **Never print `$CANVAS_API_TOKEN`** in output, logs, or explanations — not even partially
- **Read-only by default** — do not submit assignments, post to discussions, or modify any data unless user explicitly confirms
- **Confirm before downloading files** — ask "Download X to your current directory?" before writing to disk
- **No bulk operations** — never loop across all courses and all endpoints in one shot; query one resource at a time

## Additional Resources

See `references/canvas-api-reference.md` for:
- Complete endpoint list with all query parameters
- Response field reference (what fields to extract from each response)
- Pagination handling details
- HTML stripping patterns for description fields
- New Quizzes vs classic quizzes differences
