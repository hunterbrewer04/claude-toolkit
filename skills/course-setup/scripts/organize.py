#!/usr/bin/env python3
"""Plan (and, with --apply, execute) cleanup of a course_files_export/ dump.

Compares every file in the export folder against every other file already
in the course folder by sha256. Files that already exist elsewhere in the
course are duplicates (safe to delete from the export). Files with no
match anywhere are new — suggest a destination under the course's
canonical skeleton (Syllabus/, Lectures/Module N/, Grades/, Exams/,
assignments/) based on the filename, and plan a move.

Always prints the plan. Only touches the filesystem when --apply is
passed. The export directory itself is only removed at the very end, and
only if everything in it was accounted for (deleted as a dupe or moved).
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import sys

DEFAULT_EXPORT_DIR_NAME = "course_files_export"
CHUNK_SIZE = 1024 * 1024

MODULE_RE = re.compile(r"(?i)module[\s_-]*0*(\d+)")
KEYWORD_DESTINATIONS = [
    (re.compile(r"(?i)syllabus"), "Syllabus"),
    (re.compile(r"(?i)\bexam\b|\bmidterm\b|\bfinal\b"), "Exams"),
    (re.compile(r"(?i)grade"), "Grades"),
    (re.compile(r"(?i)assignment|\bhw\b|homework"), "assignments"),
    (re.compile(r"(?i)lecture"), "Lectures"),
]


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(CHUNK_SIZE)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def walk_files(root: str, skip_dir: str = None):
    """Yield (absolute_path, relative_path) for every regular file under root,
    skipping skip_dir (an absolute path) if given."""
    for dirpath, dirnames, filenames in os.walk(root):
        if skip_dir and os.path.abspath(dirpath) == os.path.abspath(skip_dir):
            dirnames[:] = []
            continue
        # also prune if skip_dir is nested under dirpath's children
        if skip_dir:
            dirnames[:] = [
                d for d in dirnames
                if os.path.abspath(os.path.join(dirpath, d)) != os.path.abspath(skip_dir)
            ]
        for name in filenames:
            if name in (".DS_Store",):
                continue
            abs_path = os.path.join(dirpath, name)
            rel_path = os.path.relpath(abs_path, root)
            yield abs_path, rel_path


def suggest_destination(course_root: str, rel_path: str) -> str:
    """Suggest a destination directory (relative to course_root) for a new file."""
    name = os.path.basename(rel_path)
    # Filenames commonly use "_"/"-" where a word boundary would go
    # ("Exam_Review.pdf") — normalize to spaces so \b in the keyword
    # patterns actually lands on a boundary.
    normalized = re.sub(r"[_\-]+", " ", name)

    m = MODULE_RE.search(rel_path)
    if m:
        return os.path.join("Lectures", f"Module {int(m.group(1))}")

    for pattern, dest in KEYWORD_DESTINATIONS:
        if pattern.search(normalized):
            return dest

    return "Unsorted"


def build_plan(course_root: str, export_dir: str) -> dict:
    course_root = os.path.abspath(course_root)
    export_dir = os.path.abspath(export_dir)

    existing_hashes = {}
    for abs_path, rel_path in walk_files(course_root, skip_dir=export_dir):
        h = sha256_file(abs_path)
        existing_hashes.setdefault(h, []).append(rel_path)

    duplicates = []
    new_files = []
    for abs_path, rel_path in walk_files(export_dir):
        h = sha256_file(abs_path)
        if h in existing_hashes:
            duplicates.append({
                "export_path": rel_path,
                "matches": existing_hashes[h],
                "sha256": h,
            })
        else:
            dest_dir = suggest_destination(course_root, rel_path)
            new_files.append({
                "export_path": rel_path,
                "suggested_dest_dir": dest_dir,
                "suggested_dest_path": os.path.join(dest_dir, os.path.basename(rel_path)),
                "sha256": h,
            })

    return {
        "course_root": course_root,
        "export_dir": export_dir,
        "duplicates": duplicates,
        "new_files": new_files,
    }


def print_plan_text(plan: dict):
    print(f"Course folder: {plan['course_root']}")
    print(f"Export dir:    {plan['export_dir']}")
    print()
    print(f"Duplicates to delete ({len(plan['duplicates'])}):")
    if not plan["duplicates"]:
        print("  (none)")
    for d in plan["duplicates"]:
        matches = ", ".join(d["matches"])
        print(f"  DELETE  {d['export_path']}   (matches: {matches})")
    print()
    print(f"New files to move ({len(plan['new_files'])}):")
    if not plan["new_files"]:
        print("  (none)")
    for n in plan["new_files"]:
        print(f"  MOVE    {n['export_path']}  ->  {n['suggested_dest_path']}")
    print()
    total = len(plan["duplicates"]) + len(plan["new_files"])
    print(f"{total} file(s) in export dir accounted for.")
    if total == 0:
        print("Export dir is empty or already fully processed.")


def apply_plan(plan: dict) -> dict:
    course_root = plan["course_root"]
    export_dir = plan["export_dir"]

    deleted = []
    moved = []
    skipped = []

    for d in plan["duplicates"]:
        abs_path = os.path.join(export_dir, d["export_path"])
        try:
            os.remove(abs_path)
            deleted.append(d["export_path"])
        except OSError as e:
            skipped.append({"path": d["export_path"], "reason": str(e)})

    for n in plan["new_files"]:
        src = os.path.join(export_dir, n["export_path"])
        dest = os.path.join(course_root, n["suggested_dest_path"])
        if os.path.exists(dest):
            skipped.append({"path": n["export_path"], "reason": f"destination already exists: {dest}"})
            continue
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.move(src, dest)
        moved.append({"from": n["export_path"], "to": n["suggested_dest_path"]})

    # Remove now-empty directories left behind in export_dir, bottom-up.
    # topdown=False visits export_dir itself last, so this also removes
    # export_dir in the same pass once every subdirectory under it is empty.
    for dirpath, dirnames, filenames in os.walk(export_dir, topdown=False):
        if not os.listdir(dirpath):
            os.rmdir(dirpath)

    export_removed = not os.path.isdir(export_dir)
    if not export_removed:
        skipped.append({"path": os.path.basename(export_dir), "reason": "export dir left in place: files remain unaccounted for"})

    return {"deleted": deleted, "moved": moved, "skipped": skipped, "export_dir_removed": export_removed}


def main():
    parser = argparse.ArgumentParser(description="Plan/apply course_files_export cleanup by sha256 comparison.")
    parser.add_argument("course_folder", help="Path to the course folder (contains the export dir plus canonical subfolders).")
    parser.add_argument("--export-dir", default=DEFAULT_EXPORT_DIR_NAME,
                         help=f"Export directory name or path (default '{DEFAULT_EXPORT_DIR_NAME}', "
                              "resolved relative to course_folder if not absolute).")
    parser.add_argument("--apply", action="store_true", help="Execute the plan. Without this flag, only prints the plan.")
    parser.add_argument("--json", action="store_true", help="Print the plan (or apply result) as JSON.")
    args = parser.parse_args()

    course_folder = os.path.abspath(os.path.expanduser(args.course_folder))
    if not os.path.isdir(course_folder):
        raise SystemExit(f"Course folder not found: {course_folder}")

    export_dir = args.export_dir
    if not os.path.isabs(export_dir):
        export_dir = os.path.join(course_folder, export_dir)
    export_dir = os.path.abspath(os.path.expanduser(export_dir))
    if not os.path.isdir(export_dir):
        raise SystemExit(f"Export dir not found: {export_dir}")

    plan = build_plan(course_folder, export_dir)

    if not args.apply:
        if args.json:
            print(json.dumps(plan, indent=2))
        else:
            print_plan_text(plan)
        return

    if args.json:
        print(json.dumps(plan, indent=2), file=sys.stderr)
    else:
        print_plan_text(plan)
        print()
        print("Applying...")
        print()

    result = apply_plan(plan)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Deleted {len(result['deleted'])} duplicate(s).")
        print(f"Moved {len(result['moved'])} new file(s).")
        if result["skipped"]:
            print(f"Skipped {len(result['skipped'])} item(s):")
            for s in result["skipped"]:
                print(f"  {s['path']}: {s['reason']}")
        print(f"Export dir removed: {result['export_dir_removed']}")


if __name__ == "__main__":
    main()
