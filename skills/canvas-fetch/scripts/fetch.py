#!/usr/bin/env python3
"""Fetch Canvas assignments and lay them out in the local course folder.

Two subcommands:
  fetch  - pull one assignment (by number, name, or raw Canvas id) into
           <target-dir>/assignments/assignment<N>/, converting the HTML
           description to markdown and downloading any linked files.
  sweep  - list upcoming work across one or more courses in a date window.
           Read-only: never writes folders. A human (via the SKILL.md
           confirm step) decides which sweep results become `fetch` calls.

Talks to Canvas only through composio (read-only tool slugs). Never calls
a Canvas write/submit tool.
"""

import argparse
import html
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser

COMPOSIO_BIN = "composio"


# --------------------------------------------------------------------------
# composio plumbing
# --------------------------------------------------------------------------

def composio_execute(slug: str, data: dict) -> dict:
    """Run `composio execute <slug> -d <json>` and return the parsed payload.

    composio spills large responses to a temp file instead of stdout
    (seen in practice with CANVAS_GET_ALL_ASSIGNMENTS on a 27-assignment
    course). Follow that indirection transparently so callers always get
    the real payload back.
    """
    cmd = [COMPOSIO_BIN, "execute", slug, "-d", json.dumps(data)]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    except FileNotFoundError:
        raise SystemExit(f"composio CLI not found on PATH (expected `{COMPOSIO_BIN}`).")
    except subprocess.TimeoutExpired:
        raise SystemExit(f"composio execute {slug} timed out after 120s.")

    if proc.returncode != 0:
        raise SystemExit(f"composio execute {slug} failed:\n{proc.stdout}\n{proc.stderr}")

    try:
        envelope = json.loads(proc.stdout)
    except json.JSONDecodeError:
        raise SystemExit(f"composio execute {slug} did not return JSON:\n{proc.stdout}")

    if envelope.get("storedInFile"):
        out_path = envelope.get("outputFilePath")
        if not out_path or not os.path.isfile(out_path):
            raise SystemExit(f"composio said output was stored in a file, but {out_path!r} is missing.")
        with open(out_path, "r", encoding="utf-8") as f:
            envelope = json.load(f)

    if not envelope.get("successful", True):
        raise SystemExit(f"composio execute {slug} returned an error:\n{json.dumps(envelope.get('error'), indent=2)}")

    return envelope


# --------------------------------------------------------------------------
# HTML -> markdown (stdlib only)
# --------------------------------------------------------------------------

class HTMLToMarkdown(HTMLParser):
    """Small best-effort HTML-to-markdown converter for Canvas descriptions.

    Canvas assignment descriptions are simple rich text (p/strong/em/lists/
    links/tables/images) -- this is not a general HTML-to-markdown engine,
    just enough to make that content readable as markdown.
    """

    BLOCK_TAGS = {"p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "tr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.list_stack = []  # each entry: {"type": "ul"/"ol", "index": int}
        self.in_pre = False
        self.link_href = None
        self.cell_buf = None
        self.row_cells = []
        self.table_rows = []
        self.in_table = False

    # -- helpers --------------------------------------------------------
    def _write(self, text):
        if self.cell_buf is not None:
            self.cell_buf.append(text)
        else:
            self.out.append(text)

    def _blank_line(self):
        if self.out and self.out[-1] != "\n\n":
            self.out.append("\n\n")

    def _indent(self):
        return "  " * max(len(self.list_stack) - 1, 0)

    # -- HTMLParser hooks -------------------------------------------------
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("strong", "b"):
            self._write("**")
        elif tag in ("em", "i"):
            self._write("_")
        elif tag == "code" and not self.in_pre:
            self._write("`")
        elif tag == "pre":
            self.in_pre = True
            self._blank_line()
            self._write("```\n")
        elif tag == "br":
            self._write("  \n")
        elif tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self._blank_line()
            self._write("#" * int(tag[1]) + " ")
        elif tag == "blockquote":
            self._blank_line()
            self._write("> ")
        elif tag == "a":
            self.link_href = attrs.get("href", "")
            self._write("\x00LINK_START\x00")
        elif tag == "img":
            src = attrs.get("src", "")
            alt = attrs.get("alt", "")
            self._write(f"![{alt}]({src})")
        elif tag == "ul":
            self.list_stack.append({"type": "ul", "index": 0})
        elif tag == "ol":
            self.list_stack.append({"type": "ol", "index": 0})
        elif tag == "li":
            self._blank_line() if not self.list_stack else self._write("\n")
            if self.list_stack:
                self.list_stack[-1]["index"] += 1
                entry = self.list_stack[-1]
                marker = "-" if entry["type"] == "ul" else f"{entry['index']}."
                self._write(f"{self._indent()}{marker} ")
        elif tag == "table":
            self.in_table = True
            self.table_rows = []
        elif tag == "tr":
            self.row_cells = []
        elif tag in ("td", "th"):
            self.cell_buf = []
        elif tag == "p" or tag == "div":
            self._blank_line()

    def handle_endtag(self, tag):
        if tag in ("strong", "b"):
            self._write("**")
        elif tag in ("em", "i"):
            self._write("_")
        elif tag == "code" and not self.in_pre:
            self._write("`")
        elif tag == "pre":
            self.in_pre = False
            self._write("\n```")
            self._blank_line()
        elif tag == "a":
            href = self.link_href or ""
            # collapse "[text](href)" — text already emitted via handle_data,
            # so pull it back out of the buffer (up to the start sentinel)
            # to wrap it properly.
            buf = self.cell_buf if self.cell_buf is not None else self.out
            parts = []
            while buf and buf[-1] != "\x00LINK_START\x00":
                parts.append(buf.pop())
            if buf:
                buf.pop()  # remove the sentinel itself
            text = "".join(reversed(parts))
            buf.append(f"[{text}]({href})")
            self.link_href = None
        elif tag in ("ul", "ol"):
            if self.list_stack:
                self.list_stack.pop()
            self._blank_line()
        elif tag == "li":
            pass
        elif tag in ("h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "blockquote"):
            self._blank_line()
        elif tag in ("td", "th"):
            cell_text = "".join(self.cell_buf or []).strip()
            self.row_cells.append(cell_text)
            self.cell_buf = None
        elif tag == "tr":
            self.table_rows.append(self.row_cells)
            self.row_cells = []
        elif tag == "table":
            self._render_table()
            self.in_table = False

    def handle_data(self, data):
        if self.in_pre:
            self._write(data)
            return
        text = data if self.in_table or self.cell_buf is not None else re.sub(r"\s+", " ", data)
        self._write(text)

    def _render_table(self):
        if not self.table_rows:
            return
        self._blank_line()
        header, *rest = self.table_rows
        self._write("| " + " | ".join(header) + " |\n")
        self._write("|" + "|".join(["---"] * len(header)) + "|\n")
        for row in rest:
            self._write("| " + " | ".join(row) + " |\n")
        self._blank_line()

    def get_markdown(self):
        text = "".join(self.out)
        text = html.unescape(text)
        # collapse runs of blank lines and trailing whitespace on each line
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip() + "\n"


def html_to_markdown(raw_html: str) -> str:
    if not raw_html:
        return "_No description provided._\n"
    parser = HTMLToMarkdown()
    parser.feed(raw_html)
    md = parser.get_markdown()
    return md if md.strip() else "_No description provided._\n"


# --------------------------------------------------------------------------
# assignment lookup + matching
# --------------------------------------------------------------------------

def list_all_assignments(course_id: str) -> list:
    """Page through CANVAS_GET_ALL_ASSIGNMENTS for a course."""
    assignments = []
    page = 1
    while True:
        resp = composio_execute(
            "CANVAS_GET_ALL_ASSIGNMENTS",
            {"course_id": str(course_id), "per_page": 100, "page": page},
        )
        data = resp.get("data", {})
        batch = data.get("response_data", [])
        assignments.extend(batch)
        next_page = data.get("next_page")
        if not next_page or not batch:
            break
        try:
            page = int(next_page)
        except (TypeError, ValueError):
            break
        if page <= 1:
            break
    return assignments


NUM_PREFIX_RE = re.compile(r"(?i)^assignment\s+0*(\d+)\b")


def assignment_number(name: str):
    m = NUM_PREFIX_RE.match(name.strip())
    return int(m.group(1)) if m else None


def find_assignment(assignments: list, spec: str) -> dict:
    """Resolve --assignment spec to one assignment dict, or raise SystemExit."""
    spec = spec.strip()

    if spec.lower().startswith("id:"):
        raw_id = spec[3:].strip()
        for a in assignments:
            if str(a.get("id")) == raw_id:
                return a
        raise SystemExit(f"No assignment with id {raw_id} in this course.")

    if spec.isdigit():
        target = int(spec)
        matches = [a for a in assignments if assignment_number(a.get("name", "")) == target]
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            raise SystemExit(f"Multiple assignments matched number {target}: "
                              + "; ".join(a["name"] for a in matches))
        # fall through to substring match in case numbering isn't "Assignment N"

    needle = spec.lower()
    matches = [a for a in assignments if needle in a.get("name", "").lower()]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        names = "\n".join(f"  - {a['name']} (id {a['id']})" for a in matches)
        raise SystemExit(f"'{spec}' matched multiple assignments, be more specific:\n{names}")

    available = "\n".join(f"  - {a['name']} (id {a['id']})" for a in assignments)
    raise SystemExit(f"No assignment matched '{spec}'. Available assignments:\n{available}")


# --------------------------------------------------------------------------
# attachment discovery + download
# --------------------------------------------------------------------------

FILE_LINK_RE = re.compile(r"/files/(\d+)")


def find_linked_file_ids(raw_html: str) -> list:
    if not raw_html:
        return []
    ids = []
    for m in FILE_LINK_RE.finditer(raw_html):
        fid = m.group(1)
        if fid not in ids:
            ids.append(fid)
    return ids


def download_file(file_id: str, dest_dir: str) -> str:
    """Resolve a Canvas file id via CANVAS_GET_FILE and download it. Returns
    the local path, or raises SystemExit-caught-by-caller on failure."""
    resp = composio_execute("CANVAS_GET_FILE", {"id": str(file_id)})
    info = resp.get("data", {}).get("response_data", {})
    url = info.get("url")
    name = info.get("display_name") or info.get("filename") or f"file_{file_id}"
    if not url:
        raise ValueError(f"file {file_id} has no download url")
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, name)
    req = urllib.request.Request(url, headers={"User-Agent": "canvas-fetch/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp_body, open(dest_path, "wb") as out:
        out.write(resp_body.read())
    return dest_path


# --------------------------------------------------------------------------
# fetch subcommand
# --------------------------------------------------------------------------

def cmd_fetch(args):
    assignments = list_all_assignments(args.course_id)
    if not assignments:
        raise SystemExit(f"CANVAS_GET_ALL_ASSIGNMENTS returned no assignments for course {args.course_id}.")

    assignment = find_assignment(assignments, args.assignment)

    name = assignment.get("name", "Untitled assignment")
    num = assignment_number(name)
    folder_num = num if num is not None else assignment.get("id")
    slug = f"assignment{folder_num}"

    base_dir = os.path.join(args.target_dir, "assignments", slug)
    code_dir = os.path.join(base_dir, "Code")
    submission_dir = os.path.join(base_dir, "Submission")
    os.makedirs(code_dir, exist_ok=True)
    os.makedirs(submission_dir, exist_ok=True)

    due_at = assignment.get("due_at")
    points = assignment.get("points_possible")
    sub_types = assignment.get("submission_types") or []
    html_url = assignment.get("html_url", "")
    description_html = assignment.get("description") or ""

    body_md = html_to_markdown(description_html)

    md_lines = [
        f"# {name}\n",
        f"**Due:** {due_at or 'No due date set'}  ",
        f"**Points:** {points if points is not None else 'n/a'}  ",
        f"**Submission type:** {', '.join(sub_types) if sub_types else 'n/a'}  ",
        f"**Canvas link:** {html_url}\n",
        "---\n",
        body_md,
    ]
    md_path = os.path.join(base_dir, f"Assignment-{folder_num}.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    file_ids = find_linked_file_ids(description_html)
    downloaded = []
    failed = []
    if file_ids:
        files_dir = os.path.join(base_dir, "Files")
        for fid in file_ids:
            try:
                path = download_file(fid, files_dir)
                downloaded.append(path)
            except Exception as e:  # noqa: BLE001 - report and continue
                failed.append((fid, str(e)))

    result = {
        "assignment_name": name,
        "assignment_id": assignment.get("id"),
        "due_at": due_at,
        "points_possible": points,
        "submission_types": sub_types,
        "html_url": html_url,
        "folder": base_dir,
        "markdown_file": md_path,
        "code_dir": code_dir,
        "submission_dir": submission_dir,
        "downloaded_files": downloaded,
        "failed_downloads": failed,
    }
    print(json.dumps(result, indent=2))


# --------------------------------------------------------------------------
# sweep subcommand (read-only, no folder writes)
# --------------------------------------------------------------------------

def load_registry(path: str) -> dict:
    if not os.path.isfile(path):
        raise SystemExit(f"Registry not found at {path}.")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def list_planner_items_for_course(context_code, start_date, end_date, incomplete_only=True):
    """Fetch planner items for exactly one course context.

    IMPORTANT: CANVAS_LIST_PLANNER_ITEMS's `context_codes` array is unreliable
    with more than one entry — verified experimentally that only the *last*
    context code in the array actually contributes items; the rest are
    silently dropped (reordering the same two course codes flipped the
    result from 18 items to 0). Calling once per course and merging locally
    is the only version that reliably returns every course's items.
    """
    items = []
    page = None
    while True:
        payload = {
            "start_date": start_date,
            "end_date": end_date,
            "context_codes": [context_code],
            "per_page": 100,
        }
        if incomplete_only:
            payload["filter"] = "incomplete_items"
        if page:
            payload["page"] = page
        resp = composio_execute("CANVAS_LIST_PLANNER_ITEMS", payload)
        data = resp.get("data", {})
        batch = data.get("response_data", [])
        items.extend(batch)
        page = data.get("next_page")
        if not page or not batch:
            break
    return items


def cmd_sweep(args):
    registry = load_registry(args.registry)
    courses = registry.get("courses", {})

    if args.courses:
        wanted = {c.strip() for c in args.courses.split(",")}
        courses = {k: v for k, v in courses.items() if k in wanted}

    id_to_key = {}
    course_ids = []
    skipped = []
    for key, entry in courses.items():
        cid = entry.get("canvas_id")
        if not cid:
            skipped.append(key)
            continue
        course_ids.append(cid)
        id_to_key[cid] = key

    if not course_ids:
        raise SystemExit("No registry courses have a canvas_id set; nothing to sweep.")

    now = datetime.now(timezone.utc)
    if args.start:
        start_date = args.start
    else:
        start_date = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    if args.end:
        end_date = args.end
    else:
        end_date = (now + timedelta(days=args.days)).strftime("%Y-%m-%dT%H:%M:%SZ")

    rows = []
    for cid in course_ids:
        items = list_planner_items_for_course(f"course_{cid}", start_date, end_date)
        for item in items:
            plannable = item.get("plannable", {})
            due = plannable.get("due_at") or item.get("plannable_date")
            rows.append({
                "course_key": id_to_key.get(cid, str(cid)),
                "course_id": cid,
                "title": plannable.get("title", "Untitled"),
                "due_at": due,
                "points_possible": plannable.get("points_possible"),
                "type": item.get("plannable_type"),
                "plannable_id": item.get("plannable_id"),
                "html_url": item.get("html_url"),
            })
    rows.sort(key=lambda r: r["due_at"] or "9999")

    if args.json:
        print(json.dumps({"window": {"start": start_date, "end": end_date},
                           "skipped_courses": skipped, "items": rows}, indent=2))
        return

    print(f"Upcoming work {start_date} .. {end_date}")
    if skipped:
        print(f"(skipped, no canvas_id in registry: {', '.join(skipped)})")
    if not rows:
        print("Nothing due in this window.")
        return

    col_course = max(6, max(len(r["course_key"]) for r in rows))
    col_title = max(5, min(60, max(len(r["title"]) for r in rows)))
    header = f"{'Course':<{col_course}}  {'Due':<20}  {'Pts':>5}  {'Title':<{col_title}}"
    print(header)
    print("-" * len(header))
    for r in rows:
        title = r["title"] if len(r["title"]) <= col_title else r["title"][: col_title - 1] + "…"
        pts = r["points_possible"] if r["points_possible"] is not None else ""
        print(f"{r['course_key']:<{col_course}}  {str(r['due_at']):<20}  {str(pts):>5}  {title:<{col_title}}")


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def build_parser():
    parser = argparse.ArgumentParser(description="Fetch Canvas assignments into the local course folder.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_fetch = sub.add_parser("fetch", help="Fetch a single assignment.")
    p_fetch.add_argument("--course-id", required=True, help="Canvas numeric course id.")
    p_fetch.add_argument("--assignment", required=True,
                          help="Assignment number (e.g. 15), 'id:<canvas_id>', or a name substring.")
    p_fetch.add_argument("--target-dir", required=True,
                          help="Local course folder to write assignments/assignmentN/ into.")
    p_fetch.set_defaults(func=cmd_fetch)

    p_sweep = sub.add_parser("sweep", help="List upcoming work across registry courses. Read-only.")
    p_sweep.add_argument("--registry", default=os.path.expanduser("/Users/hunterbrewer/Desktop/School/school.json"))
    p_sweep.add_argument("--courses", help="Comma-separated registry keys to limit the sweep to.")
    p_sweep.add_argument("--days", type=int, default=7, help="Lookahead window in days (default 7).")
    p_sweep.add_argument("--start", help="ISO8601 start (overrides --days start).")
    p_sweep.add_argument("--end", help="ISO8601 end (overrides --days end).")
    p_sweep.add_argument("--json", action="store_true", help="Print machine-readable JSON instead of a table.")
    p_sweep.set_defaults(func=cmd_sweep)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
