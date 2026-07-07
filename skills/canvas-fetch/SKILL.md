---
name: canvas-fetch
description: Pulls a Canvas assignment (or a batch of upcoming work) down into the local course folder as clean markdown. Covers pulling a single assignment ("grab assignment 15 for 4610 from canvas", "pull the CP3 resume assignment", "get me the details on the next physics lab"), sweeping for what's coming up across all courses ("whats due tonight", "what do I have due this week", "canvas sweep", "/canvas-fetch sweep"), and the explicit form ("/canvas-fetch 4610 assignment 15"). Resolves the course through the school.json registry, converts the Canvas HTML description to markdown, scaffolds assignments/assignmentN/ with Code/ and Submission/ folders, and downloads any linked files. Read-only against Canvas — never submits or modifies anything there.
---

# canvas-fetch

## Description

Pulls Canvas assignment data into the local course folder so Hunter can work
on it without opening Canvas. Two modes: fetch one assignment in full (markdown
description, due date, points, linked files), or sweep for what's due soon
across every course in the registry so Hunter can pick what to pull.

Everything this skill does against Canvas is read-only (composio `CANVAS_*`
GET/LIST tools). It never calls a Canvas write or submit tool, and it never
touches anything inside a real course folder except by writing new files
under `assignments/assignmentN/` — it doesn't edit or delete existing work.

## Prerequisites

- `composio` on PATH, Canvas toolkit connected. Sanity check: `composio execute CANVAS_LIST_COURSES -d '{"per_page": 1}'`.
- The school.json registry, owned and documented by the **course-setup** skill
  (`~/.claude/skills/course-setup/SKILL.md` — read it for the schema if a
  course lookup fails or the registry looks stale). This skill only reads it.
- `python3` (stdlib only, no extra packages).

## Process

### 1. Resolve the course

Read `/Users/hunterbrewer/Desktop/School/school.json`, match the user's course
reference (key, name substring, or common nickname) to a registry entry, and
pull its `canvas_id` and `path`. If the course isn't in the registry, or its
`canvas_id` is null, stop and say so — point at course-setup's `new` verb
rather than guessing a Canvas course id.

### 2. Single assignment: `/canvas-fetch <course> assignment <N>`

Run the fetch subcommand with the resolved `canvas_id` and the course's local
`path`:

```bash
python3 ~/.claude/skills/canvas-fetch/scripts/fetch.py fetch \
  --course-id <canvas_id> \
  --assignment <N-or-name-or-id:12345> \
  --target-dir <course path from registry>
```

`--assignment` accepts:
- a plain number (`15`) — matched against a leading `Assignment 15: ...` style
  name (case-insensitive, tolerates a `0`-padded number).
- a substring of the assignment name (`"resume"`) if the course doesn't
  number its assignments that way. Errors out and lists all assignment names
  if the substring is ambiguous or matches nothing.
- `id:<canvas_assignment_id>` to bypass name matching entirely.

The script:
1. Pages through `CANVAS_GET_ALL_ASSIGNMENTS` for the course and finds the match.
2. Converts the HTML `description` to markdown with a small stdlib
   (`html.parser`) converter — good enough for Canvas's simple rich text
   (paragraphs, lists, links, bold/italic, code, basic tables), not a general
   HTML-to-markdown engine.
3. Writes `assignments/assignment<N>/Assignment-<N>.md` (title, due date,
   points, submission type, Canvas link, then the converted description) and
   scaffolds empty `Code/` and `Submission/` folders next to it.
4. Scans the description HTML for links to Canvas-hosted files
   (`/files/<id>`), resolves each through `CANVAS_GET_FILE`, and downloads
   them into a `Files/` folder (only created if there's something to put in
   it). Files that fail to resolve or download are reported, not silently
   dropped — a failure here shouldn't fail the whole fetch, since not every
   assignment has attachments.
5. Prints a JSON summary: assignment name/id, due date, points, submission
   type, Canvas link, folder path, and any downloaded/failed files.

Relay that summary to the user in prose (see **Output** below) — don't just
dump the JSON.

### 3. Sweep: `/canvas-fetch sweep`, "whats due tonight", etc.

Sweep is read-only and never writes folders — it only lists. Compute a date
window from what the user asked for (`--days N` for a rolling lookahead,
or explicit `--start`/`--end` ISO8601 timestamps for something like "tonight"
— e.g. `--start` = now, `--end` = local midnight):

```bash
python3 ~/.claude/skills/canvas-fetch/scripts/fetch.py sweep \
  [--days 7] [--start <iso>] [--end <iso>] [--courses 4610,1520]
```

This calls `CANVAS_LIST_PLANNER_ITEMS` once per registry course (see **Known
quirks** below for why) and prints a table sorted by due date: course, due
date, points, title. Courses with no `canvas_id` are listed as skipped, not
silently dropped.

Present the table, then **ask which items to actually pull** — sweep never
creates folders on its own. For each item the user picks, map its course back
to a registry `canvas_id` and its title to an assignment number/id, then run
the **fetch** subcommand from step 2 for each one.

This is the same code path a future scheduled "morning digest" agent would
reuse: call `sweep --json` non-interactively, then decide what (if anything)
to auto-fetch versus just report.

### 4. Report

Always end with due date, points possible, submission type, and what's now in
the folder (markdown file, Code/, Submission/, any downloaded files) — see
**Output**.

## Known Canvas/composio quirks

Discovered by testing against real Summer 26 courses — worth knowing before
debugging a "why is this empty" surprise:

- **There is no `CANVAS_GET_ASSIGNMENT` slug.** `CANVAS_GET_ASSIGNMENT2` exists
  but only returns a name and submission ids via its GraphQL query — no
  description, due date, or points. `CANVAS_GET_ALL_ASSIGNMENTS` returns the
  full REST object (including HTML `description`) for every assignment in the
  course in one call, so `fetch.py` uses that as the single source of truth
  and filters client-side instead of fetching one assignment at a time.
- **`CANVAS_GET_ALL_ASSIGNMENTS` has no `bucket=upcoming` parameter** in this
  composio tool version (only `course_id`/`page`/`per_page`). Sweep mode uses
  `CANVAS_LIST_PLANNER_ITEMS` with a date window instead, which is the more
  natural fit for "what's due across courses" anyway.
- **`CANVAS_LIST_PLANNER_ITEMS`'s `context_codes` array is unreliable with
  more than one course in it** — verified experimentally that only the last
  context code in the array contributes items; reordering the same two course
  codes flipped the result from 18 items to 0. `fetch.py` calls it once per
  course and merges locally. If a future composio/Canvas update fixes this
  upstream, the multi-course call would be a safe simplification, but don't
  assume it's fixed without testing both orderings again.
- composio spills large tool outputs to a temp file (`storedInFile: true` +
  `outputFilePath`) instead of stdout — `fetch.py`'s `composio_execute()
  helper already follows that indirection, but any future script calling
  composio directly needs to do the same.

## Output

Report in prose, not raw JSON:

```
Assignment 15: C++ Thread Lec1&2 Labs (4610)
Due: Jun 11, 2026, 11:59 PM  |  30 points  |  online text entry + upload
https://canvas.slu.edu/courses/97411/assignments/744066

Written to .../4610/assignments/assignment15/
  Assignment-15.md
  Code/ (empty)
  Submission/ (empty)
  Files/ — none linked
```

For sweep, relay the table (or a short prose summary if it's long) and stop
there until the user says which ones to pull.
