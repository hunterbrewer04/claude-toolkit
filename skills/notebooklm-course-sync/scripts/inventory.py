#!/usr/bin/env python3
"""inventory.py - local file diff for notebooklm-course-sync.

Scans a course directory for syncable files (Syllabus/**, Lectures/**,
Markdown files anywhere, COURSE_SCHEDULE.md), hashes each with sha256, and
diffs the result against a per-course manifest JSON
(<course>/.notebooklm-sync.json by default) of the form:

    {"<relative/path>": {"sha256": "...", "uploaded_at": "...", "source_id": "..."}}

Read-only: never writes the manifest, never touches the network, never
calls the notebooklm CLI. It only prints a JSON diff to stdout so the
calling skill can decide what to upload.

Usage:
    python3 inventory.py <course_path> [--manifest PATH] [--max-size-mb N]

Output JSON shape:
    {
      "to_upload": [{"path": str, "sha256": str, "reason": "new"|"changed"}],
      "unchanged": [{"path": str, "sha256": str}],
      "missing_manifest_entries": [{"path": str, "source_id": str|null, "uploaded_at": str|null}]
    }

"to_upload" and "unchanged" describe files that exist locally right now.
"missing_manifest_entries" lists manifest rows whose file is gone from
disk -- candidates for a stale-source report. This script does not decide
whether to delete anything; that stays a human/prose decision.
"""

import argparse
import hashlib
import json
import os
import stat
import sys
from pathlib import Path

# Directory names that are never course content, wherever they appear.
# Matched case-insensitively against a single path component.
EXCLUDED_DIR_NAMES = {
    "submission",
    ".venv",
    "venv",
    ".firecrawl",
    "__pycache__",
    ".git",
    ".claude",
    "node_modules",
    ".devcontainer",
}

# Extensions treated as source code -- excluded even inside Lectures/Syllabus.
CODE_EXTENSIONS = {
    ".py", ".pyc", ".pyo", ".ipynb",
    ".cpp", ".cc", ".cxx", ".c", ".h", ".hpp", ".cu", ".cuh",
    ".java", ".js", ".jsx", ".ts", ".tsx",
    ".go", ".rs", ".rb", ".php", ".pl", ".lua", ".swift", ".kt",
    ".m", ".mm", ".cs",
    ".sh", ".bash", ".zsh", ".fish", ".csh", ".ps1",
    ".r", ".sql", ".asm", ".s",
}

# Image extensions -- excluded per spec.
IMAGE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".svg", ".webp",
    ".tiff", ".tif", ".ico", ".heic",
}

# Binaries / archives / executables -- excluded per spec.
BINARY_EXTENSIONS = {
    ".exe", ".dylib", ".so", ".dll", ".o", ".a", ".out", ".bin",
    ".class", ".jar", ".whl",
    ".zip", ".tar", ".gz", ".tgz", ".7z", ".rar", ".dmg", ".pkg", ".app",
}

MAX_SIZE_DEFAULT_MB = 50

# Directory-name prefixes (case-insensitive) that are synced in full,
# subject to the exclusions above. Covers "Syllabus" and "Syllabus & Info"
# style naming across different course folders.
ALWAYS_INCLUDE_DIR_PREFIXES = ("syllabus", "lectures")


def is_excluded_dir(name: str) -> bool:
    return name.lower() in EXCLUDED_DIR_NAMES


def path_has_excluded_dir(rel_parts) -> bool:
    # rel_parts includes the filename as the last element.
    return any(is_excluded_dir(part) for part in rel_parts[:-1])


def is_always_include_dir(rel_parts) -> bool:
    for part in rel_parts[:-1]:
        lower = part.lower()
        if any(lower.startswith(prefix) for prefix in ALWAYS_INCLUDE_DIR_PREFIXES):
            return True
    return False


def is_binary_like(path: Path) -> bool:
    """Extensionless files with an executable bit set are compiled binaries."""
    if path.suffix:
        return False
    try:
        mode = path.stat().st_mode
    except OSError:
        return False
    return bool(mode & (stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH))


def is_syncable(path: Path, rel_parts, max_size_bytes: int) -> bool:
    if path_has_excluded_dir(rel_parts):
        return False
    if path.name.startswith("."):
        return False  # dotfiles are always junk (.DS_Store, .gitignore, ...)
    ext = path.suffix.lower()
    if ext in CODE_EXTENSIONS or ext in IMAGE_EXTENSIONS or ext in BINARY_EXTENSIONS:
        return False
    if is_binary_like(path):
        return False
    try:
        size = path.stat().st_size
    except OSError:
        return False
    if size > max_size_bytes:
        return False
    if ext == ".md":
        return True
    return is_always_include_dir(rel_parts)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def scan_course(course_root: Path, max_size_bytes: int):
    """Yield (relative_posix_path, sha256) for every syncable file."""
    for dirpath, dirnames, filenames in os.walk(course_root):
        # Prune excluded and dotfile directories before descending.
        dirnames[:] = [
            d for d in dirnames if not is_excluded_dir(d) and not d.startswith(".")
        ]
        for filename in filenames:
            full = Path(dirpath) / filename
            rel = full.relative_to(course_root)
            if not is_syncable(full, rel.parts, max_size_bytes):
                continue
            yield rel.as_posix(), sha256_file(full)


def build_diff(local_files: dict, manifest: dict) -> dict:
    to_upload = []
    unchanged = []
    for rel_path, sha in sorted(local_files.items()):
        entry = manifest.get(rel_path)
        if entry is None:
            to_upload.append({"path": rel_path, "sha256": sha, "reason": "new"})
        elif entry.get("sha256") != sha:
            to_upload.append({"path": rel_path, "sha256": sha, "reason": "changed"})
        else:
            unchanged.append({"path": rel_path, "sha256": sha})

    missing_manifest_entries = []
    for rel_path, entry in sorted(manifest.items()):
        if rel_path not in local_files:
            missing_manifest_entries.append(
                {
                    "path": rel_path,
                    "source_id": entry.get("source_id"),
                    "uploaded_at": entry.get("uploaded_at"),
                }
            )

    return {
        "to_upload": to_upload,
        "unchanged": unchanged,
        "missing_manifest_entries": missing_manifest_entries,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Diff local course files against a notebooklm-course-sync manifest."
    )
    parser.add_argument("course_path", help="Path to the course root directory")
    parser.add_argument(
        "--manifest",
        help="Path to the manifest JSON (default: <course_path>/.notebooklm-sync.json)",
    )
    parser.add_argument(
        "--max-size-mb",
        type=float,
        default=MAX_SIZE_DEFAULT_MB,
        help="Maximum file size in MB to include (default: 50)",
    )
    args = parser.parse_args()

    course_root = Path(args.course_path).expanduser().resolve()
    if not course_root.is_dir():
        print(json.dumps({"error": f"course path not found: {course_root}"}), file=sys.stderr)
        sys.exit(1)

    manifest_path = (
        Path(args.manifest).expanduser().resolve()
        if args.manifest
        else course_root / ".notebooklm-sync.json"
    )

    manifest = {}
    if manifest_path.is_file():
        try:
            with open(manifest_path) as f:
                manifest = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(
                json.dumps({"error": f"failed to read manifest {manifest_path}: {e}"}),
                file=sys.stderr,
            )
            sys.exit(1)

    max_size_bytes = int(args.max_size_mb * 1024 * 1024)
    local_files = dict(scan_course(course_root, max_size_bytes))
    result = build_diff(local_files, manifest)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
