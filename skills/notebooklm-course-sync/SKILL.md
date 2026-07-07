---
name: notebooklm-course-sync
description: Keeps a course's NotebookLM notebook in sync with the local course files (Syllabus, Lectures, assignment writeups, COURSE_SCHEDULE.md) under ~/Desktop/School, using a per-course manifest so repeat syncs only touch what changed. Use when Hunter asks to sync course files to NotebookLM, e.g. "sync my 4610 files to notebooklm", "make sure the databases notebook has everything thats here locally", "whats missing from the notebook", "update my calc 2 notebook", or otherwise wants to check a course notebook against what's on disk.
---

# NotebookLM Course Sync

Keeps one NotebookLM notebook per course current with the course's local files. Wraps the `notebooklm` CLI (see the `notebooklm` skill for the full command surface) with a registry that maps each course to its notebook, and a manifest that tracks what has already been uploaded so re-runs are incremental instead of re-uploading everything.

## Description

Each course under `~/Desktop/School/<Semester>/<Course>/` has exactly one NotebookLM notebook. This skill:

1. Resolves which course and which notebook from a shared registry.
2. Inventories which local files are syncable and hashes them.
3. Diffs that inventory against a per-course manifest (and the notebook's live source list) to find what's new, changed, or stale.
4. Presents the plan and uploads only on approval.

It never creates a notebook. If a course has no notebook mapped yet, it asks Hunter which existing notebook to use and stops if none exists.

## Prerequisites

- `notebooklm` CLI installed and authenticated. Verify with `notebooklm status`; if that fails, run `notebooklm auth check` then `notebooklm login`. Follow the `notebooklm` skill for anything beyond what's covered here (rate limits, retries, source processing waits).
- Registry file `/Users/hunterbrewer/Desktop/School/school.json`, owned by the `course-setup` skill. Schema:

  ```json
  {
    "courses": {
      "4610": {
        "name": "Concurrent and Parallel Programming",
        "path": "/Users/hunterbrewer/Desktop/School/Summer 26/4610",
        "canvas_id": 97411,
        "notebook": null,
        "grades_file": null,
        "semester": "Summer 26"
      }
    }
  }
  ```

  This skill reads `path` and reads/writes only the `notebook` field (a NotebookLM notebook UUID, or `null` if unresolved). Leave every other field alone. If the registry or the course entry is missing, run `course-setup` first (or add the entry by hand) rather than inventing a parallel format.
- `python3` (stdlib only, no pip install needed) for `scripts/inventory.py`.

## Process

### 1. Resolve course and notebook

Figure out which course Hunter means (from what he says, or the current directory). Look it up under the `courses` key in `school.json`, matching loosely on the course key or `name` (e.g. "4610" or "physics" both resolve to one entry; if more than one matches, ask which). Use the entry's `path` as the course folder.

Read `school.json`:

- If the file or the course's entry is missing, offer to run `course-setup` to register it (or add a minimal entry under `courses` with the standard fields and `"notebook": null`).
- If `notebook` is `null`: run `notebooklm list --json`, show Hunter the notebook titles, and ask which one belongs to this course. Write the chosen ID back into `school.json` under that course's `notebook` field.
- If Hunter says no notebook exists yet for this course: stop. Tell him to create it (web UI, or ask the `notebooklm` skill directly) and come back. This skill never runs `notebooklm create`.

### 2. Inventory local files

Run the bundled script against the course folder:

```bash
python3 scripts/inventory.py "/Users/hunterbrewer/Desktop/School/<Semester>/<Course>"
```

It defaults to the manifest at `<course>/.notebooklm-sync.json`. Pass `--manifest <path>` to override. It walks the tree and includes:

- Everything under any directory whose name starts with "Syllabus" or "Lectures" (case-insensitive, so "Syllabus & Info" counts).
- Any `.md` file anywhere in the tree (this covers assignment writeups and `COURSE_SCHEDULE.md` wherever it lives).

It excludes, regardless of location: code files (`.py`, `.cpp`, `.ipynb`, `.js`, `.sql`, shell scripts, etc.), images, binaries/archives (`.zip`, `.exe`, `.so`, extensionless executables), anything inside a `Submission/`, `.venv`, `.firecrawl`, `__pycache__`, `.git`, `.claude`, `.devcontainer`, or `node_modules` directory, dotfiles, and anything over 50MB (`--max-size-mb` to change).

It prints JSON: `to_upload` (new or changed, with sha256), `unchanged`, and `missing_manifest_entries` (manifest rows whose file no longer exists locally). It never touches the network or the manifest file, read-only.

### 3. Fetch the live source list

```bash
notebooklm source list -n <notebook_id> --json
```

Note each source's `id` and `title`.

### 4. Reconcile

- If the manifest existed, use step 2's diff as-is: `to_upload` needs uploading, `unchanged` needs nothing.
- If the manifest was missing (first sync for this course, so everything landed in `to_upload` with no history to compare against), don't assume every file is actually missing from the notebook. For each `to_upload` entry, check whether a source with a matching title (by filename) already exists in step 3's list. If so, treat it as already synced: drop it from the upload plan and seed a manifest entry for it (`sha256` from the inventory, `source_id` from the match, `uploaded_at` noted as backfilled) instead of re-uploading.
- For each entry in `missing_manifest_entries`, check whether its `source_id` is still in step 3's live list. If yes, it's a genuine stale source (local file is gone, but the notebook still has it), so carry it into the plan below. If no, the source is already gone from the notebook too; just drop it from the manifest quietly, no need to surface it.

### 5. Present the plan

Show Hunter, before touching anything:

- Files to upload (count + list, with new vs. changed noted).
- Stale sources still in the notebook whose local file is gone (count + list). Report only, never delete without him saying so.
- How many files are already in sync.

Ask him to confirm the upload. Ask separately if he wants any stale sources deleted; don't bundle that into the same yes/no as the upload.

### 6. Execute (on approval)

For each approved file:

```bash
notebooklm source add "<absolute path>" -n <notebook_id> --json
```

Capture `source_id` from the output. For more than a couple of files, add them all first, then wait for processing (use a background subagent per the `notebooklm` skill's pattern rather than blocking the conversation):

```bash
notebooklm source wait <source_id> -n <notebook_id> --timeout 120
```

After each successful upload, update the manifest entry for that file: `{"sha256": ..., "uploaded_at": "<ISO 8601 now>", "source_id": ...}`. Write the whole manifest back to `<course>/.notebooklm-sync.json` as pretty-printed JSON once all uploads for the run are done.

For stale sources Hunter approved deleting:

```bash
notebooklm source delete <source_id> -n <notebook_id> -y
```

(or `notebooklm source delete-by-title "<exact title>" -n <notebook_id> -y` if the ID wasn't captured). Remove the corresponding entry from the manifest.

### 7. `--dry-run` mode

When Hunter asks for a dry run (or says "what's missing" without asking to actually sync), stop after step 5. Report the plan and don't call `source add`, `source delete`, or write the manifest. Resolving the notebook mapping in step 1 is fine to persist even in dry-run, since it's local bookkeeping, not a NotebookLM mutation.

## Output

Report in this shape:

```
Course: <course name> (<semester>)
Notebook: <title> (<id>)

To upload (<n>):
  - <path> (new|changed)
  ...

Stale sources (<n>) - reported only:
  - <path> -> source "<title>" (<source_id>)

Unchanged: <n> files already in sync.
```

After execution, follow with a short confirmation: how many files uploaded, how many stale sources deleted (if any), and that the manifest at `<course>/.notebooklm-sync.json` was updated.
