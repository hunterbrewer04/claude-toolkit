---
name: course-setup
description: Sets up new course folders and cleans Canvas file exports, for when Hunter starts a new class or needs a dump organized. Covers scaffolding a brand-new course folder ("set up my new course", "add 4610 to my school stuff", "new class this semester", "set up CORE 3500"), and cleaning a dumped course_files_export/ directory against the rest of the course ("organize the course files export", "clean up this export dump", "sort these files into modules", "dedupe the files Canvas gave me"). Owns and documents the school.json registry (course key, path, canvas_id, notebook, grades_file, semester) that other course skills read from.
---

# course-setup

## Description

Two verbs, both scoped to one course folder at a time:

- **new** — scaffold the canonical skeleton for a course, digest its syllabus
  into a study-ready schedule, and register it in `school.json`.
- **organize** — clean up a `course_files_export/` dump (Canvas's "export
  course content" output) by comparing it against files already in the
  course folder, then filing what's actually new.

course-setup **owns** `school.json` — it's the only skill that writes to it.
Other course skills only read it.

## Prerequisites

- `composio` on PATH, Canvas toolkit connected — used for `CANVAS_LIST_COURSES`
  to look up a `canvas_id` during `new`.
- `python3` (stdlib only).
- School layout: `~/Desktop/School/<Semester>/<Course>/`,
  each course holding `Syllabus/`, `Lectures/Module N/`, `Grades/`, `Exams/`,
  `assignments/assignmentN/`.

## Registry schema (school.json)

Single flat file at `~/Desktop/School/school.json`, shared
across every semester:

```json
{
  "courses": {
    "4610": {
      "name": "Concurrent and Parallel Programming",
      "path": "~/Desktop/School/Summer 26/4610",
      "canvas_id": 97411,
      "notebook": null,
      "grades_file": null,
      "semester": "Summer 26"
    }
  }
}
```

- **key** — matches the local folder name Hunter actually uses (`"4610"`,
  `"CP3"`, `"1520"`, `"Physics 1"`), not the Canvas course code. This is what
  users type and what other skills match against.
- **name** — human-readable course title, for display.
- **path** — absolute path to the course folder.
- **canvas_id** — Canvas's numeric course id from `CANVAS_LIST_COURSES`.
  `null` if the course isn't on Canvas or composio auth is down at setup time
  — record it as `null` rather than blocking the rest of setup, and note that
  it needs backfilling later.
- **notebook** — NotebookLM notebook name, if one already exists for this
  course. `null` until the user confirms one. **Never create a notebook to
  fill this field** — one notebook per course, found not created (see
  top-level CLAUDE.md). This field only records what already exists.
- **grades_file** — path to a grade-calc file if the user set one up via the
  `new` verb's offer, else `null`.
- **semester** — matches the semester folder name (`"Summer 26"`).

All registry writes go through `scripts/new_course.py` (see below) so there's
one code path that can upsert an entry, rather than ad hoc JSON edits drifting
out of sync with each other.

## Process

### Verb: new

1. **Gather inputs.** Course key (folder name), semester, human-readable
   name. If the user gives a syllabus file, note its path for step 4.
2. **Look up the Canvas course id.** Run `CANVAS_LIST_COURSES` (paginate with
   `per_page: 100` — Hunter's course list spans multiple terms) and match by
   course name/code against what the user described. If composio auth fails
   or nothing matches, proceed with `canvas_id: null` and tell the user it
   needs to be filled in later — don't block scaffolding on it.
3. **Show the plan, then scaffold.** Run without `--apply` first, confirm
   with the user, then apply:
   ```bash
   python3 ~/.claude/skills/course-setup/scripts/new_course.py \
     --semester "<semester>" --course-key "<key>" --name "<name>" \
     [--canvas-id <id>] --apply
   ```
   This creates `Syllabus/`, `Lectures/`, `Grades/`, `Exams/`, `assignments/`
   under the course folder and upserts the registry entry. It refuses to
   silently overwrite an already-registered `course-key` — pass `--force`
   only after confirming with the user that overwriting is intended.
4. **Digest the syllabus.** This step is judgment, not a script: read the
   syllabus PDF (or ask for it if not yet placed in `Syllabus/`) and write
   `Syllabus/COURSE_SCHEDULE.md` — a study-ready schedule (weekly topics,
   major deadlines, exam dates, grading breakdown) in your own words, not a
   raw text dump of the PDF. Pull dates forward into a scannable format
   (table or dated list); flag anything ambiguous (e.g. "TBD" dates) rather
   than guessing.
5. **Ask about NotebookLM.** Ask whether a NotebookLM notebook already exists
   for this course. If yes, record its name via `new_course.py --force
   --apply` reusing the existing registry values plus the new `--notebook`
   name (read the current entry first so you don't clobber other fields). If
   no, leave it `null` — do not create one.
6. **Offer grade-calc setup.** Ask if Hunter wants a lightweight grade
   tracker. If yes, write `Grades/GRADE_CALC.md` with a weighted-average
   template (assignment groups, weights, running grade) seeded from
   whatever grading breakdown the syllabus digest turned up, and record its
   path via `new_course.py --force --apply` in `grades_file`. If no, skip —
   this is optional, don't push it.

### Verb: organize

1. **Locate the export.** Default name is `course_files_export/` inside the
   course folder; ask if it's named or placed differently.
2. **Run the plan (no `--apply`).** Always show this before touching
   anything:
   ```bash
   python3 ~/.claude/skills/course-setup/scripts/organize.py <course_folder> \
     [--export-dir <name-or-path>]
   ```
   This sha256-compares every file in the export against every other file
   already in the course folder (outside the export dir). Matches are
   duplicates (planned for deletion); everything else is planned for a move,
   with a suggested destination guessed from the filename (`Module N` →
   `Lectures/Module N/`, `syllabus`/`exam`/`grade`/`assignment`/`lecture`
   keywords → the matching canonical folder, otherwise `Unsorted/`).
3. **Get approval.** Show the plan in full — files to delete, files to move
   and where. Suggested destinations are a guess, not a decision: if one
   looks wrong (e.g. a stray `assignment` in a filename that's really a
   lecture handout), let the user redirect it before applying, or move that
   one file manually afterward.
4. **Apply.**
   ```bash
   python3 ~/.claude/skills/course-setup/scripts/organize.py <course_folder> --apply
   ```
   Duplicates are deleted, new files are moved to their destination (existing
   files are never overwritten — a name collision is skipped and reported,
   not silently replaced), and the export directory is removed last, only
   once everything inside it has been accounted for. If anything was
   skipped, the export dir is deliberately left in place with the leftover
   file inside it — investigate before re-running.

## Output

**new:** confirm the folder path, the five skeleton dirs, the registry
entry (echo it back), whether a `canvas_id` was found, the syllabus digest
summary (a few lines on what's in `COURSE_SCHEDULE.md`), and the
notebook/grade-calc answers.

**organize:** report counts — files deleted as duplicates, files moved (with
destinations), anything skipped and why, and whether the export dir was
removed.
