#!/usr/bin/env python3
"""
calc.py -- exact grade arithmetic for grade-calc skill.

All grade math (current grade, what-if overlays, target-score solving) lives
here so the model never has to do this arithmetic itself. Stdlib only.

Subcommands:
    current --file PATH [--set "Item Name=7"]...
    targets --file PATH [--cutoff LETTER|NUMBER] [--item "Item Name"] [--set ...]...

grades.json schema:
{
  "course": "4610",
  "cutoffs": {"A": 93, "A-": 90, ...},
  "categories": [
    {
      "name": "Quizzes",
      "weight": 0.2,
      "drop_lowest": 1,
      "items": [
        {"name": "Quiz 1", "earned": 8, "possible": 10},
        {"name": "Quiz 10", "earned": null, "possible": 10}
      ]
    }
  ]
}
null earned = pending (not yet graded).
"""

import argparse
import copy
import json
import math
import sys


WEIGHT_TOLERANCE = 0.001
BISECT_ITERS = 100


class GradeError(Exception):
    """Malformed input or an unsatisfiable request. Caught in main() and
    printed as a clean error, never a traceback."""


# ---------------------------------------------------------------------------
# Loading and validation
# ---------------------------------------------------------------------------

def load_grades(path):
    try:
        with open(path, "r") as f:
            raw = f.read()
    except OSError as e:
        raise GradeError(f"Can't read grades file '{path}': {e}")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise GradeError(f"Malformed JSON in '{path}': {e}")

    validate(data)
    return data


def validate(data):
    if not isinstance(data, dict):
        raise GradeError("grades.json must be a JSON object at the top level.")

    if "categories" not in data or not isinstance(data["categories"], list) or not data["categories"]:
        raise GradeError("grades.json must have a non-empty 'categories' list.")

    cutoffs = data.get("cutoffs", {})
    if not isinstance(cutoffs, dict):
        raise GradeError("'cutoffs' must be an object of letter -> minimum percentage.")
    for letter, val in cutoffs.items():
        if not isinstance(val, (int, float)) or isinstance(val, bool):
            raise GradeError(f"cutoff '{letter}' has a non-numeric value: {val!r}")

    seen_item_names = {}
    weight_sum = 0.0

    for cat in data["categories"]:
        if not isinstance(cat, dict):
            raise GradeError("Each category must be an object.")
        name = cat.get("name")
        if not isinstance(name, str) or not name.strip():
            raise GradeError("Every category needs a non-empty 'name'.")
        weight = cat.get("weight")
        if not isinstance(weight, (int, float)) or isinstance(weight, bool):
            raise GradeError(f"Category '{name}' needs a numeric 'weight'.")
        if weight <= 0:
            raise GradeError(f"Category '{name}' has non-positive weight {weight}.")
        weight_sum += weight

        drop_lowest = cat.get("drop_lowest", 0)
        if not isinstance(drop_lowest, int) or isinstance(drop_lowest, bool) or drop_lowest < 0:
            raise GradeError(f"Category '{name}' has an invalid 'drop_lowest' (must be a non-negative integer).")

        items = cat.get("items")
        if not isinstance(items, list) or not items:
            raise GradeError(f"Category '{name}' needs a non-empty 'items' list.")

        if drop_lowest >= len(items):
            raise GradeError(
                f"Category '{name}' has drop_lowest={drop_lowest} but only {len(items)} item(s) "
                f"-- that would drop every item. drop_lowest must leave at least one item."
            )

        for item in items:
            if not isinstance(item, dict):
                raise GradeError(f"Every item in category '{name}' must be an object.")
            iname = item.get("name")
            if not isinstance(iname, str) or not iname.strip():
                raise GradeError(f"Every item in category '{name}' needs a non-empty 'name'.")
            if iname in seen_item_names:
                raise GradeError(
                    f"Item name '{iname}' appears in both '{seen_item_names[iname]}' and '{name}'. "
                    f"Item names must be unique across the whole file so --set/--item can target them unambiguously."
                )
            seen_item_names[iname] = name

            possible = item.get("possible")
            if not isinstance(possible, (int, float)) or isinstance(possible, bool) or possible <= 0:
                raise GradeError(f"Item '{iname}' needs a positive numeric 'possible'.")

            earned = item.get("earned", None)
            if earned is not None:
                if not isinstance(earned, (int, float)) or isinstance(earned, bool):
                    raise GradeError(f"Item '{iname}' has a non-numeric 'earned' value: {earned!r}")
                if earned < 0:
                    raise GradeError(f"Item '{iname}' has a negative 'earned' value: {earned}")

    if abs(weight_sum - 1.0) > WEIGHT_TOLERANCE:
        raise GradeError(f"Category weights sum to {weight_sum:.4f}, not 1.0. Fix the weights in grades.json.")


# ---------------------------------------------------------------------------
# Core math
# ---------------------------------------------------------------------------

def item_pct(item):
    """Percentage for a single item, or None if pending."""
    if item.get("earned") is None:
        return None
    return item["earned"] / item["possible"] * 100.0


def category_pct_from_values(values, drop_lowest):
    """Average percentage for a category given a flat list of resolved
    percentages, dropping the lowest `drop_lowest` of them first."""
    n = len(values)
    if n == 0:
        return None
    k = min(drop_lowest, n - 1) if drop_lowest > 0 else 0
    kept = sorted(values)[k:]
    return sum(kept) / len(kept)


def category_pct_with_names(pairs, drop_lowest):
    """Like category_pct_from_values but tracks which named item(s) got
    dropped, for display. pairs: list of (name, pct)."""
    n = len(pairs)
    if n == 0:
        return None, []
    k = min(drop_lowest, n - 1) if drop_lowest > 0 else 0
    ordered = sorted(pairs, key=lambda p: p[1])
    dropped = ordered[:k]
    kept = ordered[k:]
    pct = sum(p[1] for p in kept) / len(kept)
    return pct, [d[0] for d in dropped]


def compute_grade(data):
    """Current grade counting only graded items. Categories with zero
    graded items are excluded and the remaining categories' weights are
    renormalized to sum to 1."""
    categories_out = []
    weighted_sum = 0.0
    total_weight_included = 0.0

    for cat in data["categories"]:
        drop_lowest = cat.get("drop_lowest", 0)
        pairs = [(it["name"], item_pct(it)) for it in cat["items"] if item_pct(it) is not None]
        total_count = len(cat["items"])
        graded_count = len(pairs)

        if graded_count == 0:
            categories_out.append({
                "name": cat["name"], "weight": cat["weight"], "included": False,
                "pct": None, "dropped": [], "graded_count": 0, "total_count": total_count,
            })
            continue

        pct, dropped = category_pct_with_names(pairs, drop_lowest)
        categories_out.append({
            "name": cat["name"], "weight": cat["weight"], "included": True,
            "pct": pct, "dropped": dropped, "graded_count": graded_count, "total_count": total_count,
        })
        weighted_sum += cat["weight"] * pct
        total_weight_included += cat["weight"]

    overall = weighted_sum / total_weight_included if total_weight_included > 0 else None
    return {
        "categories": categories_out,
        "overall": overall,
        "total_weight_included": total_weight_included,
    }


def letter_for_pct(pct, cutoffs):
    if not cutoffs or pct is None:
        return None
    ordered = sorted(cutoffs.items(), key=lambda kv: -kv[1])
    for letter, thresh in ordered:
        if pct >= thresh:
            return letter
    return None


def parse_target_cutoff(raw, cutoffs):
    """Accepts either a raw number ('87.5') or a cutoff letter ('B+',
    case-insensitive). Returns (target_pct, label)."""
    try:
        return float(raw), raw
    except ValueError:
        pass
    for letter, val in cutoffs.items():
        if letter.upper() == raw.upper():
            return float(val), letter
    valid = ", ".join(cutoffs.keys()) if cutoffs else "(none defined)"
    raise GradeError(f"Unknown cutoff '{raw}'. Valid letters: {valid}. Or pass a raw percentage.")


# ---------------------------------------------------------------------------
# Overlay ("what-if")
# ---------------------------------------------------------------------------

def parse_set_args(set_list):
    overlay = {}
    for raw in set_list or []:
        if "=" not in raw:
            raise GradeError(f"--set '{raw}' is malformed. Use \"Item Name=score\".")
        name, _, value = raw.partition("=")
        name = name.strip()
        value = value.strip()
        try:
            overlay[name] = float(value)
        except ValueError:
            raise GradeError(f"--set '{raw}': '{value}' isn't a number.")
    return overlay


def apply_overlay(data, overlay):
    if not overlay:
        return data
    d = copy.deepcopy(data)
    name_to_item = {}
    for cat in d["categories"]:
        for item in cat["items"]:
            name_to_item[item["name"]] = item

    lower_map = {n.lower(): n for n in name_to_item}
    applied = set()
    for name, value in overlay.items():
        target = None
        if name in name_to_item:
            target = name
        elif name.lower() in lower_map:
            target = lower_map[name.lower()]
        if target is None:
            available = ", ".join(sorted(name_to_item))
            raise GradeError(f"--set item '{name}' not found. Known items: {available}")
        name_to_item[target]["earned"] = value
        applied.add(target)

    return d


def pending_items(data):
    """List of (category_name, item_name, possible) for all items with
    earned == None."""
    out = []
    for cat in data["categories"]:
        for item in cat["items"]:
            if item.get("earned") is None:
                out.append((cat["name"], item["name"], item["possible"]))
    return out


# ---------------------------------------------------------------------------
# Target solving (bisection -- overall grade is monotonic non-decreasing in
# any single unknown score, even with drop_lowest branching, so bisection is
# safe and doesn't need closed-form case analysis)
# ---------------------------------------------------------------------------

def round_up(x, decimals=2):
    factor = 10 ** decimals
    return math.ceil(x * factor - 1e-9) / factor


def bisect_min_x(f, target, lo=0.0, hi=100.0, iters=BISECT_ITERS):
    """Find the minimal x in [lo, hi] such that f(x) >= target, assuming f
    is non-decreasing. Returns (status, x_or_None, boundary_value).
    status is one of: 'secured' (0 needed), 'ok', 'impossible'."""
    f_lo = f(lo)
    if f_lo >= target:
        return "secured", lo, f_lo
    f_hi = f(hi)
    if f_hi < target:
        return "impossible", None, f_hi
    for _ in range(iters):
        mid = (lo + hi) / 2.0
        if f(mid) >= target:
            hi = mid
        else:
            lo = mid
    return "ok", hi, f(hi)


def uniform_overall(data, x):
    """Overall grade if every currently-pending item scores x% uniformly."""
    total = 0.0
    for cat in data["categories"]:
        vals = [item_pct(it) if item_pct(it) is not None else x for it in cat["items"]]
        pct = category_pct_from_values(vals, cat.get("drop_lowest", 0))
        total += cat["weight"] * pct
    return total


def solve_uniform(data, target_pct):
    if not pending_items(data):
        return {"status": "no_pending"}
    status, x, boundary = bisect_min_x(lambda v: uniform_overall(data, v), target_pct)
    return {"status": status, "needed": x, "boundary": boundary}


def find_item(data, item_name):
    for cat in data["categories"]:
        for item in cat["items"]:
            if item["name"] == item_name:
                return cat, item
            if item["name"].lower() == item_name.lower():
                return cat, item
    return None, None


def categories_with_single_pending(data):
    out = []
    for cat in data["categories"]:
        pend = [it for it in cat["items"] if it.get("earned") is None]
        if len(pend) == 1:
            out.append((cat, pend[0]))
    return out


def solve_single_item(data, item_name, target_pct):
    cat, item = find_item(data, item_name)
    if cat is None:
        names = ", ".join(n for _, n, _ in pending_items(data))
        raise GradeError(f"Item '{item_name}' not found. Pending items: {names or '(none)'}")
    if item.get("earned") is not None:
        raise GradeError(
            f"Item '{item['name']}' already has a score ({item['earned']}/{item['possible']}). "
            f"Nothing to solve for -- use --set on 'current' if you want a what-if instead."
        )
    pending_in_cat = [it for it in cat["items"] if it.get("earned") is None]
    if len(pending_in_cat) != 1:
        other_names = ", ".join(it["name"] for it in pending_in_cat if it["name"] != item["name"])
        raise GradeError(
            f"Category '{cat['name']}' has {len(pending_in_cat)} pending items, not just '{item['name']}' "
            f"(also pending: {other_names}). A single-item solve needs everything else in the category "
            f"decided -- lock the others in with --set first, or use the uniform all-pending solve instead."
        )

    other_weight = 0.0
    fixed = 0.0
    for c in data["categories"]:
        if c is cat:
            continue
        pairs_vals = [item_pct(it) for it in c["items"] if item_pct(it) is not None]
        if not pairs_vals:
            continue
        pct = category_pct_from_values(pairs_vals, c.get("drop_lowest", 0))
        other_weight += c["weight"]
        fixed += c["weight"] * pct

    total_weight = other_weight + cat["weight"]
    graded_vals_in_cat = [item_pct(it) for it in cat["items"] if item_pct(it) is not None]

    def f(x):
        vals = graded_vals_in_cat + [x]
        cat_pct = category_pct_from_values(vals, cat.get("drop_lowest", 0))
        return (fixed + cat["weight"] * cat_pct) / total_weight

    status, x, boundary = bisect_min_x(f, target_pct)
    return {
        "status": status, "needed": x, "boundary": boundary,
        "category": cat["name"], "item": item["name"], "possible": item["possible"],
    }


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def fmt_pct(x):
    return f"{x:.2f}%" if x is not None else "--"


def print_table(headers, rows):
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(str(cell)))
    line = "  ".join(h.ljust(widths[i]) for i, h in enumerate(headers))
    print(line)
    print("  ".join("-" * w for w in widths))
    for row in rows:
        print("  ".join(str(cell).ljust(widths[i]) for i, cell in enumerate(row)))


def cmd_current(args):
    data = load_grades(args.file)
    overlay = parse_set_args(args.set)
    data = apply_overlay(data, overlay)
    result = compute_grade(data)
    cutoffs = data.get("cutoffs", {})

    headers = ["Category", "Weight", "Graded", "Pct", "Dropped"]
    rows = []
    for cat in result["categories"]:
        weight_str = f"{cat['weight']*100:.1f}%"
        graded_str = f"{cat['graded_count']}/{cat['total_count']}"
        pct_str = fmt_pct(cat["pct"]) if cat["included"] else "excluded (no graded items)"
        dropped_str = ", ".join(cat["dropped"]) if cat["dropped"] else "--"
        rows.append([cat["name"], weight_str, graded_str, pct_str, dropped_str])
    print_table(headers, rows)

    print()
    if result["overall"] is None:
        print("No graded items yet -- nothing to compute.")
        return

    if abs(result["total_weight_included"] - 1.0) > WEIGHT_TOLERANCE:
        print(f"(weights renormalized: only {result['total_weight_included']*100:.1f}% of nominal weight has graded items)")
        print()

    letter = letter_for_pct(result["overall"], cutoffs)
    if letter:
        print(f"Overall: {fmt_pct(result['overall'])} -> {letter}")
    else:
        print(f"Overall: {fmt_pct(result['overall'])}")

    if overlay:
        print()
        print("(what-if overlay applied: " + ", ".join(f"{k}={v}" for k, v in overlay.items()) + ")")


def format_solve_cell(res):
    if res["status"] == "secured":
        return "secured"
    if res["status"] == "impossible":
        return f"not possible (max {fmt_pct(res['boundary'])})"
    return fmt_pct(res["needed"])


def cmd_targets(args):
    data = load_grades(args.file)
    overlay = parse_set_args(args.set)
    data = apply_overlay(data, overlay)
    cutoffs = data.get("cutoffs", {})

    if args.item:
        if not args.cutoff:
            raise GradeError("--item requires --cutoff.")
        target_pct, label = parse_target_cutoff(args.cutoff, cutoffs)
        res = solve_single_item(data, args.item, target_pct)
        print(f"Target: {label} ({fmt_pct(target_pct)}) on '{res['item']}' ({res['category']}, out of {res['possible']})")
        if res["status"] == "secured":
            print(f"Already secured regardless of this item's score.")
        elif res["status"] == "impossible":
            print(f"Not possible. Max achievable overall: {fmt_pct(res['boundary'])}")
        else:
            needed_pct = round_up(res["needed"])
            needed_pts = round_up(needed_pct / 100.0 * res["possible"])
            print(f"Need >= {fmt_pct(needed_pct)} ({needed_pts:.2f} / {res['possible']:.2f} pts)")
        return

    if args.cutoff:
        target_pct, label = parse_target_cutoff(args.cutoff, cutoffs)
        targets_to_run = [(label, target_pct)]
    else:
        if not cutoffs:
            raise GradeError("No cutoffs defined in grades.json and no --cutoff given; nothing to solve for.")
        targets_to_run = sorted(cutoffs.items(), key=lambda kv: -kv[1])

    if not pending_items(data):
        print("All items are graded -- no pending items to solve for.")
        result = compute_grade(data)
        letter = letter_for_pct(result["overall"], cutoffs)
        suffix = f" -> {letter}" if letter else ""
        print(f"Current grade: {fmt_pct(result['overall'])}{suffix}")
        return

    single_cats = categories_with_single_pending(data)

    headers = ["Target"] + [label for label, _ in targets_to_run]
    rows = []

    uniform_row = ["All remaining (uniform)"]
    for _, target_pct in targets_to_run:
        res = solve_uniform(data, target_pct)
        uniform_row.append(format_solve_cell(res))
    rows.append(uniform_row)

    for cat, item in single_cats:
        row = [f"{item['name']} ({cat['name']})"]
        for _, target_pct in targets_to_run:
            res = solve_single_item(data, item["name"], target_pct)
            row.append(format_solve_cell(res))
        rows.append(row)

    print_table(headers, rows)

    multi_pending_cats = [
        cat["name"] for cat in data["categories"]
        if len([it for it in cat["items"] if it.get("earned") is None]) > 1
    ]
    if multi_pending_cats:
        print()
        print(
            "Categories with more than one pending item (not individually solvable without "
            "locking the others in via --set): " + ", ".join(sorted(set(multi_pending_cats)))
        )


def build_parser():
    p = argparse.ArgumentParser(description="Exact grade math for the grade-calc skill.")
    sub = p.add_subparsers(dest="command", required=True)

    p_current = sub.add_parser("current", help="Current grade, optionally with a what-if overlay.")
    p_current.add_argument("--file", required=True, help="Path to grades.json")
    p_current.add_argument("--set", action="append", default=[], help='Overlay, e.g. "Quiz 10=7". Repeatable.')
    p_current.set_defaults(func=cmd_current)

    p_targets = sub.add_parser("targets", help="Score needed for target letter grades.")
    p_targets.add_argument("--file", required=True, help="Path to grades.json")
    p_targets.add_argument("--set", action="append", default=[], help='Overlay, e.g. "Quiz 10=7". Repeatable.')
    p_targets.add_argument("--cutoff", default=None, help="Target cutoff letter (e.g. B+) or raw percentage.")
    p_targets.add_argument("--item", default=None, help="Solve for a single pending item (requires --cutoff).")
    p_targets.set_defaults(func=cmd_targets)

    return p


def main():
    parser = build_parser()
    args = parser.parse_args()
    try:
        args.func(args)
    except GradeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
