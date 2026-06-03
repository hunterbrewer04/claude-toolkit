#!/usr/bin/env python3
"""Deterministic structural checks for a SKILL.md file.

Runs the mechanical parts of the rubric (line count, char limits, naming format,
XML presence, YAML parsing) and prints a JSON report. The subjective parts
(four-part structure, imperative voice, knowledge-dump detection) are left to
the structural-grader subagent in agents/structural-grader.md.

Usage:
    python -m scripts.grade_structure <path-to-skill-directory>

The path should point to the skill's folder (containing SKILL.md), not SKILL.md
directly, so the script can also verify the folder-name-matches-`name` rule.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

RESERVED_PREFIXES = ("claude", "anthropic")
KEBAB = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
FRONTMATTER = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Extract YAML frontmatter as a flat dict. Returns (fields, body)."""
    match = FRONTMATTER.match(content)
    if not match:
        return {}, content
    raw = match.group(1)
    body = content[match.end():]
    fields: dict = {}
    current_key = None
    for line in raw.splitlines():
        if not line.strip():
            continue
        if line.startswith(" ") or line.startswith("-"):
            # list item or continuation
            if current_key and line.strip().startswith("-"):
                fields.setdefault(current_key, []).append(line.strip()[1:].strip())
            continue
        if ":" in line:
            key, _, value = line.partition(":")
            current_key = key.strip()
            value = value.strip()
            if value:
                fields[current_key] = value
            else:
                fields[current_key] = []
    return fields, body


def check_name(name: str, folder_name: str) -> list[dict]:
    issues: list[dict] = []
    if not name:
        issues.append({"severity": "major", "rule": "name present", "detail": "no `name` field in frontmatter"})
        return issues
    if len(name) > 64:
        issues.append({"severity": "major", "rule": "name ≤64 chars", "detail": f"{len(name)} chars"})
    if not KEBAB.match(name):
        issues.append({"severity": "major", "rule": "kebab-case", "detail": f"`{name}` is not kebab-case"})
    for prefix in RESERVED_PREFIXES:
        if name.startswith(prefix):
            issues.append({"severity": "major", "rule": "reserved prefix", "detail": f"starts with `{prefix}`"})
    if folder_name and name != folder_name:
        issues.append({"severity": "minor", "rule": "folder match", "detail": f"name `{name}` ≠ folder `{folder_name}`"})
    return issues


def check_description(desc: str) -> list[dict]:
    issues: list[dict] = []
    if not desc:
        issues.append({"severity": "major", "rule": "description present", "detail": "no `description` field"})
        return issues
    if len(desc) > 1024:
        issues.append({"severity": "major", "rule": "≤1024 chars", "detail": f"{len(desc)} chars"})
    if "<" in desc or ">" in desc:
        issues.append({"severity": "major", "rule": "no XML", "detail": "contains `<` or `>` — injection risk"})
    # Heuristic: starts with an imperative verb like "Create"/"Build"/"Update"/"Make"?
    first_word = desc.split()[0] if desc else ""
    imperative_starters = {
        "create", "creates", "build", "builds", "make", "makes", "update", "updates",
        "generate", "generates", "use", "uses", "run", "runs", "write", "writes",
        "check", "checks", "verify", "verifies",
    }
    if first_word.lower() in imperative_starters and first_word.lower() not in {"creates", "builds", "makes", "updates", "generates", "uses", "runs", "writes", "checks", "verifies"}:
        issues.append({
            "severity": "major",
            "rule": "third-person",
            "detail": f"starts with `{first_word}` (imperative) — third-person form would be `{first_word}s`",
        })
    if "use when" not in desc.lower() and "when " not in desc.lower():
        issues.append({"severity": "minor", "rule": "USE WHEN clause", "detail": "no explicit trigger phrasing"})
    return issues


def check_body_length(body: str) -> list[dict]:
    issues: list[dict] = []
    lines = body.count("\n") + 1
    words = len(body.split())
    if lines > 500:
        issues.append({"severity": "major", "rule": "≤500 lines", "detail": f"{lines} lines"})
    elif lines > 450:
        issues.append({"severity": "minor", "rule": "approaching 500 lines", "detail": f"{lines} lines"})
    if words > 5000:
        issues.append({"severity": "major", "rule": "≤5000 words", "detail": f"{words} words (degradation threshold)"})
    return issues


def check_headers(body: str) -> list[dict]:
    issues: list[dict] = []
    has_important = re.search(r"^#{2,4}\s+(Important|Critical)\b", body, re.MULTILINE | re.IGNORECASE)
    if not has_important:
        issues.append({
            "severity": "minor",
            "rule": "critical-rule header",
            "detail": "no `## Important` or `## Critical` header found",
        })
    return issues


def check_nesting(skill_dir: Path) -> list[dict]:
    issues: list[dict] = []
    refs = skill_dir / "references"
    if not refs.is_dir():
        return issues
    for entry in refs.rglob("*"):
        rel = entry.relative_to(refs)
        if entry.is_file() and len(rel.parts) > 1:
            issues.append({
                "severity": "major",
                "rule": "single-level nesting",
                "detail": f"`references/{rel}` is deeper than one level",
            })
            break
    return issues


def check_reference_loading(body: str, skill_dir: Path) -> list[dict]:
    issues: list[dict] = []
    refs_dir = skill_dir / "references"
    if not refs_dir.is_dir():
        return issues
    existing = sorted(p.name for p in refs_dir.glob("*.md") if p.is_file())
    referenced_in_body = {name for name in existing if name in body}
    orphans = [n for n in existing if n not in referenced_in_body]
    if orphans:
        issues.append({
            "severity": "major",
            "rule": "explicit reference loading",
            "detail": f"unreferenced files in references/: {', '.join(orphans)}",
        })
    return issues


def check_frontmatter_optional(fields: dict) -> list[dict]:
    issues: list[dict] = []
    if "allowed-tools" not in fields:
        issues.append({
            "severity": "minor",
            "rule": "allowed-tools",
            "detail": "no `allowed-tools` declared — consider adding if the skill uses specific tools",
        })
    return issues


def grade_from_issues(issues: list[dict]) -> str:
    major = sum(1 for i in issues if i["severity"] == "major")
    minor = sum(1 for i in issues if i["severity"] == "minor")
    if major == 0 and minor == 0:
        return "A"
    if major == 0 and minor == 1:
        return "B"
    if major == 1 or minor >= 2:
        return "C"
    if major == 2 or major + minor >= 4:
        return "D"
    return "F"


def main() -> int:
    parser = argparse.ArgumentParser(description="Deterministic structural checks for a SKILL.md file.")
    parser.add_argument("skill_dir", type=Path, help="Path to the skill directory (contains SKILL.md)")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of human-readable output")
    args = parser.parse_args()

    skill_dir: Path = args.skill_dir.resolve()
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.is_file():
        print(f"error: {skill_md} not found", file=sys.stderr)
        return 1

    content = skill_md.read_text()
    fields, body = parse_frontmatter(content)
    folder_name = skill_dir.name

    name_issues = check_name(fields.get("name", ""), folder_name)
    desc_issues = check_description(fields.get("description", ""))
    length_issues = check_body_length(body)
    header_issues = check_headers(body)
    nest_issues = check_nesting(skill_dir)
    ref_issues = check_reference_loading(body, skill_dir)
    frontmatter_issues = check_frontmatter_optional(fields)

    categories = {
        "naming": {"issues": name_issues, "grade": grade_from_issues(name_issues)},
        "description": {"issues": desc_issues, "grade": grade_from_issues(desc_issues)},
        "body_length": {"issues": length_issues, "grade": grade_from_issues(length_issues)},
        "structure_headers": {"issues": header_issues, "grade": grade_from_issues(header_issues)},
        "progressive_disclosure_nesting": {"issues": nest_issues, "grade": grade_from_issues(nest_issues)},
        "progressive_disclosure_loading": {"issues": ref_issues, "grade": grade_from_issues(ref_issues)},
        "optional_frontmatter": {"issues": frontmatter_issues, "grade": grade_from_issues(frontmatter_issues)},
    }

    lines_count = body.count("\n") + 1
    word_count = len(body.split())

    report = {
        "skill": {
            "name": fields.get("name", ""),
            "folder": folder_name,
            "path": str(skill_md),
            "body_lines": lines_count,
            "body_words": word_count,
        },
        "deterministic_categories": categories,
        "notes": [
            "Subjective categories (four-part structure, imperative voice, knowledge-dump detection, "
            "script-vs-prose determinism, anti-pattern catalog) require the structural-grader subagent. "
            "See agents/structural-grader.md.",
        ],
    }

    if args.json:
        print(json.dumps(report, indent=2))
        return 0

    # Human-readable
    print(f"Skill: {fields.get('name', '(missing)')}  ({skill_md})")
    print(f"Body: {lines_count} lines, {word_count} words")
    print()
    for cat, data in categories.items():
        print(f"[{data['grade']}] {cat}")
        for issue in data["issues"]:
            print(f"    - ({issue['severity']}) {issue['rule']}: {issue['detail']}")
    print()
    print("Subjective checks remaining (dispatch agents/structural-grader.md):")
    print("  - Four-part body structure")
    print("  - Imperative voice in process steps")
    print("  - Knowledge-dump detection")
    print("  - Script-vs-prose determinism")
    print("  - Anti-pattern catalog (reference §7)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
