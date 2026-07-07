#!/usr/bin/env python3
"""Scaffold a new course folder and register it in school.json.

Creates the canonical skeleton (Syllabus/, Lectures/, Grades/, Exams/,
assignments/) under <school_root>/<semester>/<course_key>/, then upserts
an entry into the school.json registry. Both steps are purely additive:
mkdir -p never deletes anything, and the registry write only touches the
one course_key being added.

Refuses to run against a course_key that's already registered unless
--force is passed, so re-running "course-setup new" by accident doesn't
silently stomp an existing course's registry entry (notebook/grades_file
the user has already filled in).

Shows the plan by default; writes only with --apply, matching organize.py's
plan/apply pattern.
"""

import argparse
import json
import os

SKELETON_DIRS = ["Syllabus", "Lectures", "Grades", "Exams", "assignments"]


def load_registry(path: str) -> dict:
    if not os.path.isfile(path):
        return {"courses": {}}
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    data.setdefault("courses", {})
    return data


def main():
    parser = argparse.ArgumentParser(description="Scaffold a course folder and add it to school.json.")
    parser.add_argument("--school-root", default=os.path.expanduser("/Users/hunterbrewer/Desktop/School"),
                         help="Directory containing school.json and <semester>/ folders.")
    parser.add_argument("--semester", required=True, help='e.g. "Summer 26"')
    parser.add_argument("--course-key", required=True, help='Registry key and folder name, e.g. "4610"')
    parser.add_argument("--name", required=True, help="Human-readable course name for the registry.")
    parser.add_argument("--canvas-id", type=int, default=None, help="Canvas numeric course id, if known.")
    parser.add_argument("--notebook", default=None, help="NotebookLM notebook name, if the user already has one.")
    parser.add_argument("--grades-file", default=None, help="Path to a grade-calc file, if set up.")
    parser.add_argument("--force", action="store_true", help="Overwrite an existing registry entry for this course_key.")
    parser.add_argument("--apply", action="store_true", help="Create the folders and write the registry. Without this, only prints the plan.")
    args = parser.parse_args()

    school_root = os.path.abspath(os.path.expanduser(args.school_root))
    registry_path = os.path.join(school_root, "school.json")
    course_path = os.path.join(school_root, args.semester, args.course_key)

    registry = load_registry(registry_path)
    already_registered = args.course_key in registry["courses"]

    if already_registered and not args.force:
        raise SystemExit(
            f"'{args.course_key}' is already in the registry "
            f"({registry_path}). Pass --force to overwrite its entry, "
            "or pick a different --course-key."
        )

    entry = {
        "name": args.name,
        "path": course_path,
        "canvas_id": args.canvas_id,
        "notebook": args.notebook,
        "grades_file": args.grades_file,
        "semester": args.semester,
    }

    print("Plan:")
    print(f"  Create folder: {course_path}")
    for d in SKELETON_DIRS:
        print(f"    {d}/")
    action = "Update" if already_registered else "Add"
    print(f"  {action} registry entry ({registry_path}):")
    print(f"    \"{args.course_key}\": {json.dumps(entry, indent=6)}")

    if not args.apply:
        print("\nDry run. Re-run with --apply to create the folders and write the registry.")
        return

    for d in SKELETON_DIRS:
        os.makedirs(os.path.join(course_path, d), exist_ok=True)

    registry["courses"][args.course_key] = entry
    os.makedirs(school_root, exist_ok=True)
    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)
        f.write("\n")

    verb = "Updated" if already_registered else "Added"
    print(f"\nCreated {course_path} and its skeleton.")
    print(f"{verb} registry entry for '{args.course_key}' in {registry_path}.")


if __name__ == "__main__":
    main()
