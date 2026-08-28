# dev-flow evaluation loop

Three layers, cheapest first. Run layer 1 on every SKILL.md edit, layer 2 before shipping a
change to behavior, layer 3 after real builds.

## Layer 1 — structural (seconds, deterministic)

Grades each SKILL.md against Anthropic's structural rubric. No model calls.

```bash
./evals/structural.sh
```

Wraps `skill-creator`'s `scripts.grade_structure`. Covers line count, word count, name and
description limits, kebab-case, reserved prefixes, folder-match, nesting depth, unreferenced
reference files, and `allowed-tools` presence.

For the subjective categories (four-part body, imperative voice, knowledge-dump detection,
anti-patterns), dispatch `skill-creator`'s `agents/structural-grader.md` against a skill
directory.

## Layer 2 — behavioral (minutes, model calls)

`evals.json` holds 8 cases and 34 assertions across the five skills. Each case names the skill
under test and the behavior that must hold.

Run through `skill-creator` step 5: dispatch one subagent per case with the skill and one
without, grade with `agents/grader.md`, aggregate with `scripts.aggregate_benchmark`.

The cases exist to catch the failures this design is specifically vulnerable to:

| Case | Guards against |
|---|---|
| 1 | bounded work getting dragged through the full chain |
| 2 | asking questions before reading what gbrain already knows |
| 3 | a distracted "ok" advancing the spec |
| 4 | wave assignment falling back to file-list comparison |
| 5 | slot count scaling with wave width |
| 6 | accepting a completion claim without gauntlet evidence |
| 7 | specialists reviewing pre-simplify code, and unbacked findings surviving |
| 8 | pushing to a repo whose CLAUDE.md forbids it |

## Layer 3 — production (free, from real builds)

The strongest layer, because every real run already emits structured gbrain pages. No synthetic
fixtures, no grading model, and the sample grows on its own.

```bash
# fetch pages through the gbrain MCP tools, then:
python3 evals/metrics.py pages.json
```

Reports decisions-not-in-the-brief per task, deviations per task, blocked rate, finding drop
rate, per-wave breakdown, and any page claiming completion without a Gauntlet section.

### What each metric changes

| Signal | Change |
|---|---|
| decisions per task above ~2 | tighten DECIDED blocks in `plan` |
| deviations above 0 | widen `graphify affected` depth in `plan` |
| blocked rate rising | briefs incomplete; check whether blockers were resolvable at plan time |
| finding drop rate above 50% | specialists noisy; tighten the failure-scenario requirement in `review` |
| a page complete with no Gauntlet | integrity failure in `implement`; the enforcement is not holding |

Feed the weaknesses into `skill-creator` step 8, and use `agents/comparator.md` to score a
proposed revision against the current one before shipping it.

## Tunable numbers

These are starting points that this loop is expected to correct, not laws:

- 6 files per OWNS list
- ~50 nodes at `graphify affected --depth 1`
- 3 slots default, 5 ceiling
- 4 completed tasks before slot retirement

The zero-open-decisions rule is not tunable.
