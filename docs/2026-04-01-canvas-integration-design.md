# Canvas LMS Integration — Design Spec

**Date:** 2026-04-01  
**Status:** Implemented  
**Author:** Hunter Brewer

---

## Overview

A Claude Code skill that enables conversational access to Canvas LMS data directly inside any Claude Code session. Using a stored API token, Claude can pull course assignments, grades, files, announcements, discussions, quizzes, and planner items — and use that information to answer questions, help with academic work, and track deadlines.

---

## Problem Statement

Canvas contains all the context Claude needs to be a genuinely useful academic assistant (assignment descriptions, rubrics, due dates, grades), but Claude can't access it without being explicitly told. Copy-pasting from Canvas is tedious. A skill bridges this gap — one trigger phrase and Claude has full course context.

---

## Architecture

### Components

```
~/.claude/skills/canvas/           ← symlink to toolkit source
/Users/hunterbrewer/claude-toolkit/skills/canvas/
├── SKILL.md                       ← Core workflow (230 lines, 928 words)
├── README.md                      ← Setup guide
└── references/
    └── canvas-api-reference.md    ← Complete endpoint reference
```

### Auth Model

| Variable | Purpose | Storage |
|----------|---------|---------|
| `CANVAS_API_TOKEN` | Bearer token for all API calls | `~/.zshrc` |
| `CANVAS_BASE_URL` | School's Canvas domain (no trailing slash) | `~/.zshrc` |

Token is generated in Canvas → Account → Settings → Approved Integrations. Never hardcoded, never printed in output.

### How a Session Works

```
User: "what's due this week?"
   ↓
Canvas skill loads
   ↓
Claude checks CANVAS_API_TOKEN + CANVAS_BASE_URL env vars
   ↓
Claude calls: GET /api/v1/planner/items?start_date=TODAY
   ↓
Parses JSON response
   ↓
"You have 3 things due: HCE 1700 reading response (Thursday), 
 BIO 101 quiz (Friday), MATH 201 problem set (Sunday)"
```

---

## API Coverage

All operations are read-only. Claude uses `curl` with the Bearer token.

| Category | Endpoint | Use Case |
|----------|----------|---------|
| Courses | `GET /api/v1/courses?enrollment_state=active` | Identify course IDs by name |
| Syllabus | `include[]=syllabus_body` on courses | Pull grading breakdown |
| Assignments | `GET /api/v1/courses/:id/assignments` | List due dates, descriptions, rubrics |
| Submissions | `GET /api/v1/courses/:id/assignments/:id/submissions/self` | Check grades and feedback |
| Enrollments | `GET /api/v1/courses/:id/enrollments?user_id=self` | Overall course grade |
| Planner | `GET /api/v1/planner/items?start_date=:today` | Cross-course upcoming items |
| Upcoming events | `GET /api/v1/users/self/upcoming_events` | Calendar events |
| Files | `GET /api/v1/courses/:id/files` | List and download course materials |
| Modules | `GET /api/v1/courses/:id/modules?include[]=items` | Course structure navigation |
| Announcements | `GET /api/v1/courses/:id/announcements` | Instructor posts |
| Discussions | `GET /api/v1/courses/:id/discussion_topics` | Open discussion boards |
| Pages | `GET /api/v1/courses/:id/pages` | Instructor wiki content |
| Classic Quizzes | `GET /api/v1/courses/:id/quizzes` | Quiz list and scores |
| Outcome Results | `GET /api/v1/courses/:id/outcome_results` | Rubric/learning outcome tracking |

---

## Skill Workflow

### Intent Routing

| User says... | API Path |
|---|---|
| "what's due?", "upcoming", "planner" | Planner API → format by date |
| "help with [assignment]", "rubric" | Courses → Assignments → description + rubric |
| "grades", "how am I doing" | Enrollments → current_grade + submissions |
| "files", "download", "syllabus PDF" | Files → list or download |
| "announcement", "any new posts" | Announcements or Discussion Topics |
| "quiz", "test score" | Quizzes → submission score |

### Safety Rules

1. Never print `$CANVAS_API_TOKEN` in any output
2. Read-only by default — no submissions, no posts, no modifications
3. Confirm before downloading files to disk
4. Query one resource at a time (no bulk cross-course sweeps)

---

## Setup Instructions

### 1. Generate Token
Canvas → Account → Settings → Approved Integrations → New Access Token

### 2. Add to Shell Profile
```bash
# Add to ~/.zshrc
export CANVAS_API_TOKEN="your_token_here"
export CANVAS_BASE_URL="https://canvas.yourschool.edu"

# Reload
source ~/.zshrc
```

### 3. Verify
```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses?enrollment_state=active" | python3 -m json.tool
```
Should return a JSON array of your active courses.

---

## Example Use Cases

```
"What assignments are due this week?"
→ Planner API → formatted list grouped by course

"Help me understand my HCE 1700 paper assignment"
→ Fetch assignment description + rubric → explain + offer to help outline

"How am I doing in my courses?"
→ Enrollments for each active course → grade summary table

"Download the rubric PDF from my HCE 1700 course"
→ Files list → match by name → confirm → download

"Any new announcements?"
→ Announcements for each active course → summarize unread
```

---

## Technical Notes

- JSON parsing: `python3 -m json.tool` (always available) or `jq` if present
- HTML stripping: `python3 -c` with HTMLParser for description fields
- Pagination: `per_page=50` on all list endpoints; check `Link` header for `rel="next"`
- New Quizzes: if classic quiz endpoint returns empty, check assignments for `submission_types: ["external_tool"]`
- Date formatting: `date -u +%Y-%m-%dT%H:%M:%SZ` for ISO 8601 timestamps

---

## Files

| File | Location |
|------|---------|
| Skill | `/Users/hunterbrewer/claude-toolkit/skills/canvas/SKILL.md` |
| Setup guide | `/Users/hunterbrewer/claude-toolkit/skills/canvas/README.md` |
| API reference | `/Users/hunterbrewer/claude-toolkit/skills/canvas/references/canvas-api-reference.md` |
| This spec | `/Users/hunterbrewer/claude-toolkit/docs/2026-04-01-canvas-integration-design.md` |
| GitHub | `https://github.com/hunterbrewer04/claude-toolkit/tree/main/skills/canvas` |
