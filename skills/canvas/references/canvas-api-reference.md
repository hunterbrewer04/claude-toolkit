# Canvas API Reference

Complete endpoint reference for the Canvas LMS REST API. All endpoints are read-only student-facing operations.

## Table of Contents

1. [Authentication](#authentication)
2. [Courses](#courses)
3. [Assignments](#assignments)
4. [Submissions & Grades](#submissions--grades)
5. [Planner & Calendar](#planner--calendar)
6. [Files](#files)
7. [Modules](#modules)
8. [Announcements](#announcements)
9. [Discussions](#discussions)
10. [Quizzes](#quizzes)
11. [Pages (Wiki)](#pages-wiki)
12. [Outcome Results](#outcome-results)
13. [Pagination](#pagination)
14. [HTML Stripping](#html-stripping)
15. [New Quizzes vs Classic Quizzes](#new-quizzes-vs-classic-quizzes)

---

## Authentication

Every request requires the Authorization header:

```bash
-H "Authorization: Bearer $CANVAS_API_TOKEN"
```

Base URL pattern: `$CANVAS_BASE_URL/api/v1/ENDPOINT`

Full example:
```bash
curl -s \
  -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  -H "Accept: application/json" \
  "$CANVAS_BASE_URL/api/v1/courses"
```

---

## Courses

### List Active Courses

```
GET /api/v1/courses?enrollment_state=active&include[]=syllabus_body&per_page=50
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses?enrollment_state=active&include[]=syllabus_body&per_page=50"
```

**Key response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Course ID — used in all other endpoints |
| `name` | string | Full course name (e.g., "HCE 1700: Disability, Difference, and Design") |
| `course_code` | string | Short code (e.g., "HCE 1700") |
| `start_at` | string | Course start date (ISO 8601) |
| `end_at` | string | Course end date |
| `syllabus_body` | string | HTML content of syllabus (only with `include[]=syllabus_body`) |

**Query parameters:**

| Parameter | Description |
|-----------|-------------|
| `enrollment_state=active` | Only return currently active enrollments |
| `include[]=syllabus_body` | Include syllabus HTML in response |
| `enrollment_type=student` | Filter to student enrollments only |

---

## Assignments

### List Assignments for a Course

```
GET /api/v1/courses/:course_id/assignments?per_page=50&order_by=due_at&include[]=submission
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/assignments?per_page=50&order_by=due_at&include[]=submission"
```

**Key response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Assignment ID |
| `name` | string | Assignment title |
| `description` | string | Full assignment description (HTML) |
| `due_at` | string | Due date (ISO 8601), null if no due date |
| `lock_at` | string | Lock date (no submissions after this) |
| `points_possible` | float | Maximum points |
| `submission_types` | array | e.g., `["online_text_entry", "online_upload"]` |
| `rubric` | array | Rubric criteria if attached (each has `description`, `points`, `ratings`) |
| `submission` | object | User's submission (only with `include[]=submission`) |
| `submission.workflow_state` | string | `submitted`, `unsubmitted`, `graded`, `pending_review` |
| `submission.score` | float | Points received |
| `submission.grade` | string | Letter/percent grade |

**Query parameters:**

| Parameter | Description |
|-----------|-------------|
| `order_by=due_at` | Sort by due date ascending |
| `include[]=submission` | Attach the user's submission to each assignment |
| `include[]=rubric_assessment` | Include rubric scores |
| `bucket=upcoming` | Only return upcoming assignments |
| `bucket=overdue` | Only return overdue/unsubmitted assignments |

### Get Single Assignment

```
GET /api/v1/courses/:course_id/assignments/:assignment_id
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/assignments/ASSIGNMENT_ID"
```

---

## Submissions & Grades

### Get User's Submission for an Assignment

```
GET /api/v1/courses/:course_id/assignments/:assignment_id/submissions/self
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/assignments/ASSIGNMENT_ID/submissions/self"
```

**Key response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `score` | float | Points received |
| `grade` | string | Letter or percentage grade |
| `submitted_at` | string | Submission timestamp |
| `workflow_state` | string | `submitted`, `graded`, `unsubmitted`, `pending_review` |
| `late` | boolean | Whether submission was late |
| `body` | string | Submission text (if text entry) |
| `submission_comments` | array | Instructor feedback comments |

### Get Course Enrollment (Overall Grade)

```
GET /api/v1/courses/:course_id/enrollments?user_id=self
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/enrollments?user_id=self"
```

**Key response fields (inside `grades` object):**

| Field | Description |
|-------|-------------|
| `grades.current_grade` | Current letter grade |
| `grades.current_score` | Current percentage score |
| `grades.final_grade` | Final letter grade (includes ungraded as zero) |
| `grades.final_score` | Final percentage score |

### All Submissions for a Course

```
GET /api/v1/courses/:course_id/students/submissions?student_ids[]=self&per_page=50
```

Useful for seeing all assignment scores at once.

---

## Planner & Calendar

### Planner Items (Cross-Course, Best for "What's Due?")

```
GET /api/v1/planner/items?start_date=:today&per_page=50
```

```bash
TODAY=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/planner/items?start_date=$TODAY&per_page=50"
```

**Key response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `plannable_date` | string | Due/scheduled date |
| `plannable_type` | string | `assignment`, `quiz`, `discussion_topic`, `announcement`, `wiki_page` |
| `plannable.title` | string | Item title |
| `plannable.points_possible` | float | Points (for assignments) |
| `course_id` | integer | Which course this belongs to |
| `planner_override.marked_complete` | boolean | Whether user marked it done |
| `submissions.submitted` | boolean | Whether assignment has been submitted |

**Query parameters:**

| Parameter | Description |
|-----------|-------------|
| `start_date` | Only items on or after this date (ISO 8601) |
| `end_date` | Only items on or before this date |
| `context_codes[]` | Filter to specific courses (e.g., `course_12345`) |
| `per_page` | Number of items (max 100) |

### Upcoming Events

```
GET /api/v1/users/self/upcoming_events
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/users/self/upcoming_events"
```

Returns calendar events and assignment due dates within the next week.

### To-Do Items

```
GET /api/v1/users/self/todo
```

Returns items that need attention (unsubmitted assignments, unread discussions, etc.).

---

## Files

### List Course Files

```
GET /api/v1/courses/:course_id/files?per_page=50&sort=updated_at&order=desc
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/files?per_page=50&sort=updated_at&order=desc"
```

**Key response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | File ID |
| `display_name` | string | File name as shown in Canvas |
| `filename` | string | Actual filename |
| `content-type` | string | MIME type (e.g., `application/pdf`) |
| `size` | integer | File size in bytes |
| `url` | string | Authenticated download URL (expires) |
| `updated_at` | string | Last modified date |
| `folder_id` | integer | Folder this file belongs to |

### Download a File

```bash
# Confirm with user first, then:
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  -o "FILENAME.pdf" "FILE_URL_FROM_RESPONSE"
```

Note: The `url` field in file responses is a pre-authenticated URL — it may not require the Authorization header, but include it anyway.

### List Course Folders

```
GET /api/v1/courses/:course_id/folders
```

---

## Modules

### List Modules with Items

```
GET /api/v1/courses/:course_id/modules?include[]=items&per_page=50
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/modules?include[]=items&per_page=50"
```

**Key response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Module name (e.g., "Week 3: Identity") |
| `position` | integer | Order in course |
| `items` | array | Module items (only with `include[]=items`) |
| `items[].type` | string | `Assignment`, `Quiz`, `File`, `Page`, `Discussion`, `ExternalUrl` |
| `items[].title` | string | Item title |
| `items[].html_url` | string | Canvas web URL for the item |
| `items[].content_id` | integer | ID of the underlying object |

---

## Announcements

```
GET /api/v1/courses/:course_id/announcements?per_page=20
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/announcements?per_page=20"
```

**Key response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Announcement subject |
| `message` | string | Body content (HTML) |
| `posted_at` | string | Post date |
| `read_state` | string | `read` or `unread` |
| `author.display_name` | string | Posted by |

---

## Discussions

```
GET /api/v1/courses/:course_id/discussion_topics?per_page=20
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/discussion_topics?per_page=20"
```

**Key response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Discussion title |
| `message` | string | Opening post (HTML) |
| `posted_at` | string | Post date |
| `due_at` | string | Required reply due date (if graded) |
| `discussion_subentry_count` | integer | Number of replies |
| `read_state` | string | `read` or `unread` |
| `unread_count` | integer | Unread replies |
| `assignment` | object | Grading info if it's a graded discussion |

---

## Quizzes

### Classic Quizzes

```
GET /api/v1/courses/:course_id/quizzes?per_page=50
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/quizzes?per_page=50"
```

**Key response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Quiz ID |
| `title` | string | Quiz title |
| `due_at` | string | Due date |
| `lock_at` | string | Closes after this time |
| `points_possible` | float | Total points |
| `quiz_type` | string | `practice_quiz`, `assignment`, `graded_survey` |
| `time_limit` | integer | Minutes (null = no limit) |

### Quiz Submissions (Scores)

```
GET /api/v1/courses/:course_id/quizzes/:quiz_id/submissions?user_id=self
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/quizzes/QUIZ_ID/submissions?user_id=self"
```

**Key response fields:** `score`, `kept_score`, `finished_at`, `time_spent`, `attempt`

---

## Pages (Wiki)

### List Course Pages

```
GET /api/v1/courses/:course_id/pages?per_page=50
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/pages?per_page=50"
```

### Get Page Content

```
GET /api/v1/courses/:course_id/pages/:url
```

```bash
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/pages/PAGE_URL_SLUG"
```

The `url` field from the list response is the URL slug (not the full URL).

---

## Outcome Results

```
GET /api/v1/courses/:course_id/outcome_results?user_ids[]=self
```

Returns rubric/learning outcome scores. Useful for seeing detailed performance breakdown by learning objective.

---

## Pagination

Canvas paginates most list endpoints. To get all results:

1. Include `per_page=50` (or up to 100) in every list request
2. Check the `Link` response header for a `next` URL:

```bash
curl -s -I -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/assignments?per_page=50" \
  | grep -i "^link:"
```

Example `Link` header:
```
Link: <https://canvas.school.edu/api/v1/courses/123/assignments?page=2&per_page=50>; rel="next",
      <https://canvas.school.edu/api/v1/courses/123/assignments?page=1&per_page=50>; rel="first"
```

If there's no `rel="next"` in the Link header, you have all results.

For typical student use (< 50 assignments per course), pagination is rarely needed.

---

## HTML Stripping

Many Canvas fields (description, message, syllabus_body) return HTML. Strip tags for clean text:

```bash
# Using python3 (always available)
echo "$HTML_CONTENT" | python3 -c "
import sys, html
from html.parser import HTMLParser

class Stripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
    def handle_data(self, d):
        self.text.append(d)
    def get_text(self):
        return ' '.join(self.text)

s = Stripper()
s.feed(sys.stdin.read())
print(s.get_text())
"
```

Or use `sed` for a quick approximation:
```bash
echo "$HTML_CONTENT" | sed 's/<[^>]*>//g'
```

---

## New Quizzes vs Classic Quizzes

Canvas has two quiz engines:

| Feature | Classic Quizzes | New Quizzes |
|---------|----------------|-------------|
| API | `/api/v1/courses/:id/quizzes` | Separate API (limited access) |
| Identifier | `quiz_type` field | Appears as assignment with `submission_types: ["external_tool"]` |
| Detection | Normal quizzes endpoint | Check assignments list for external tool submissions |

If a school uses New Quizzes, the classic quizzes endpoint may return an empty array. In that case, look for quiz-like items in:
1. Assignments with `submission_types: ["external_tool"]`
2. Modules with `type: "Quiz"` items

New Quizzes scores appear as regular assignment submissions and are accessible via the submissions endpoint.
