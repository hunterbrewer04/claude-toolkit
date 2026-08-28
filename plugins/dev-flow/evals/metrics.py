#!/usr/bin/env python3
"""Production metrics for dev-flow, read from gbrain build-log pages.

Takes no credentials. Fetch the pages through the gbrain MCP tools and hand this
script the result:

    list_pages(tag="build-log")  ->  get_page(slug) for each
    write [{"slug": ..., "compiled_truth": ...}, ...] to pages.json
    python3 metrics.py pages.json

Every metric here answers a question about the SKILLS, not about the build. A high
decisions-not-in-the-brief count is a planning defect, not an agent defect.
"""
import json
import re
import sys
from collections import defaultdict


def section(body, heading):
    """Return the lines under a '## heading' up to the next '## '."""
    m = re.search(rf"^##\s+{re.escape(heading)}\s*$", body, re.M | re.I)
    if not m:
        return ""
    rest = body[m.end():]
    nxt = re.search(r"^##\s+", rest, re.M)
    return rest[: nxt.start()] if nxt else rest


def count_items(text):
    """Count numbered or bulleted entries in a section."""
    return len(re.findall(r"^\s*(?:\d+\.|[-*])\s+\S", text, re.M))


def field(body, name):
    m = re.search(rf"\*\*{name}:\*\*\s*([^\n·]+)", body)
    return m.group(1).strip() if m else None


def analyze(pages):
    tasks, reviews = [], []
    for p in pages:
        body = p.get("compiled_truth") or p.get("content") or ""
        slug = p.get("slug", "?")
        if slug.endswith("/review"):
            reviews.append((slug, body))
            continue
        if not re.search(r"^\*\*Status:\*\*", body, re.M):
            continue
        tasks.append(
            {
                "slug": slug,
                "status": (field(body, "Status") or "unknown").lower(),
                "wave": field(body, "Wave"),
                "decisions": count_items(section(body, "Decisions not in the brief")),
                "deviations": count_items(section(body, "Deviation")),
                "followups": count_items(section(body, "Follow-ups")),
                "has_gauntlet": bool(section(body, "Gauntlet").strip()),
            }
        )

    if not tasks:
        print("No build-log pages found. Check the input file.")
        return 1

    done = [t for t in tasks if t["status"].startswith("complete")]
    blocked = [t for t in tasks if t["status"].startswith("blocked")]
    liars = [t for t in done if not t["has_gauntlet"]]
    dec = [t["decisions"] for t in tasks]
    dev = [t["deviations"] for t in tasks]

    print(f"\ndev-flow production metrics — {len(tasks)} task pages\n")
    print(f"  completed                    {len(done)}")
    print(f"  blocked                      {len(blocked)}  ({len(blocked)/len(tasks):.0%})")
    print(f"  decisions not in the brief   {sum(dec)} total, {sum(dec)/len(dec):.1f} per task, max {max(dec)}")
    print(f"  deviations                   {sum(dev)} total, {sum(dev)/len(dev):.1f} per task, max {max(dev)}")

    if liars:
        print(f"\n  INTEGRITY FAILURE: {len(liars)} page(s) claim complete with no Gauntlet section")
        for t in liars:
            print(f"    {t['slug']}")

    print("\n  reads as:")
    avg = sum(dec) / len(dec)
    if avg > 2:
        print(f"    briefs are underspecified ({avg:.1f} decisions/task). Tighten DECIDED blocks in dev-flow:plan.")
    else:
        print(f"    briefs are holding ({avg:.1f} decisions/task).")
    if sum(dev):
        print(f"    ownership lists missed {sum(dev)} file(s). Widen graphify affected depth in dev-flow:plan.")
    if blocked:
        print(f"    {len(blocked)} task(s) blocked. Check whether the blockers were resolvable at plan time.")

    worst = sorted(tasks, key=lambda t: -t["decisions"])[:3]
    if worst and worst[0]["decisions"]:
        print("\n  worst-specified tasks:")
        for t in worst:
            if t["decisions"]:
                print(f"    {t['decisions']:2d} decisions  {t['slug']}")

    for slug, body in reviews:
        kept = count_items(section(body, "Findings"))
        dropped = count_items(section(body, "Dropped"))
        total = kept + dropped
        if total:
            print(f"\n  {slug}: {kept} findings kept, {dropped} dropped ({dropped/total:.0%} drop rate)")
            if dropped / total > 0.5:
                print("    specialists are noisy; tighten the failure-scenario requirement")

    by_wave = defaultdict(list)
    for t in tasks:
        if t["wave"]:
            by_wave[t["wave"]].append(t)
    if by_wave:
        print("\n  per wave:")
        for w in sorted(by_wave):
            ts = by_wave[w]
            print(f"    wave {w}: {len(ts)} tasks, {sum(x['decisions'] for x in ts)} decisions, {sum(x['deviations'] for x in ts)} deviations")
    print()
    return 1 if liars else 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    with open(sys.argv[1]) as fh:
        data = json.load(fh)
    sys.exit(analyze(data if isinstance(data, list) else data.get("pages", [])))
