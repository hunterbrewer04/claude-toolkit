---
name: skill-creator
description: Creates new skills, modifies and improves existing skills, measures skill performance via evaluations, and grades a SKILL.md against Anthropic's structural best-practices rubric. Use when the user asks to create, write, build, or design a skill, update or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, optimize a skill's description for triggering accuracy, grade a skill, audit a skill, or check if a skill follows best practices. Do NOT use for writing general Python scripts, non-skill documentation, sub-agents (use agent-builder), or hooks (use hook-builder).
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# Skill Creator

Creates and iteratively improves Claude Code skills using an evaluation-driven loop (draft → test → review → improve → repeat).

## Prerequisites

Before starting, confirm:

- **User intent is clear** — what capability the skill should enable, when it should trigger, what output it produces. Ask if unclear.
- **Python 3 is available** (scripts in `scripts/` require it).
- **Target location** — where the new skill directory will live. Default: create in `.claude/skills/<name>/` in the current project, or the user's specified path.
- **Platform** — if running on Claude.ai or Cowork, read `references/platform-specifics.md` first for adaptations. Claude Code is the default.
- **User's technical fluency** — if unclear, read `references/communication-guide.md` for vocabulary calibration.

## Process

### 1. Capture intent

If the conversation already contains a workflow the user wants to capture (e.g., "turn this into a skill"), extract the tools, step sequence, corrections, and input/output formats from history before asking questions.

Ask only the gaps:

1. What should this skill enable Claude to do?
2. When should this skill trigger? (user phrasings, file types, contexts)
3. What's the expected output format?
4. Should we set up test cases? Recommend **yes** for skills with objectively verifiable outputs (file transforms, data extraction, code generation, fixed workflows). Recommend **no** for subjective outputs (writing style, art, design).

Confirm answers before drafting.

### 2. Research if useful

Check available MCPs. If helpful for this skill (library docs, similar existing skills, best practices), dispatch a subagent to research in parallel. Otherwise inline search is fine. Come back with context to reduce the user's burden.

### 3. Draft SKILL.md

**Read `references/skill-writing-guide.md` before drafting.** It contains the authoritative rules for anatomy, progressive disclosure, writing patterns, and description-field phrasing.

Fill in frontmatter + body:

- `name` — kebab-case, ≤64 chars, must match folder name, no `claude`/`anthropic` prefix
- `description` — third-person, ≤1024 chars, includes BOTH what + when, includes user phrasings. Add negative triggers (`"Do NOT use for..."`) if overlap risk exists.
- Body — imperative voice, structured as Description → Prerequisites → Process → Output

## Important
Skills must not contain malware, exploit code, adversarial instructions, or hardcoded credentials. See `references/skill-writing-guide.md` § Principle of Lack of Surprise.

### 4. Define test cases

Write 2–3 realistic test prompts — what a real user would actually type. Present them to the user: *"Here are test cases I'd like to try. Do these look right, or do you want to add more?"*

Save to `evals/evals.json`. Don't write assertions yet — just the prompts.

```json
{
  "skill_name": "example-skill",
  "evals": [
    { "id": 1, "prompt": "User's task prompt", "expected_output": "Description of expected result", "files": [] }
  ]
}
```

Read `references/schemas.md` for the full schema (including `assertions`, added in step 6).

### 5. Run test cases (Claude Code — for other platforms, see `references/platform-specifics.md`)

Work in `<skill-name>-workspace/` as a sibling to the skill directory. Organize by iteration (`iteration-1/`, `iteration-2/`, …) and within each iteration, per-case (`eval-0/`, `eval-1/`, …). Create directories as you go, not upfront.

**Step 5a — Spawn all runs in the same turn.** For each test case, dispatch two subagents simultaneously: one with the skill, one as baseline. Do not stagger. The baseline depends on context:

- **New skill:** no skill at all. Save to `without_skill/outputs/`.
- **Improving existing:** snapshot the skill first (`cp -r <skill-path> <workspace>/skill-snapshot/`), point baseline at the snapshot. Save to `old_skill/outputs/`.

Subagent prompt template:
```
Execute this task:
- Skill path: <path-to-skill>
- Task: <eval prompt>
- Input files: <eval files or "none">
- Save outputs to: <workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/
- Outputs to save: <what the user cares about>
```

Write `eval_metadata.json` per test case (assertions can be empty for now). Give each eval a descriptive name:
```json
{ "eval_id": 0, "eval_name": "descriptive-name", "prompt": "...", "assertions": [] }
```

**Step 5b — While runs are in flight, draft assertions.** Good assertions are objectively verifiable with descriptive names. Subjective skills (writing style, design) should stay qualitative — don't force assertions. Update `eval_metadata.json` and `evals/evals.json` once drafted.

**Step 5c — As each subagent completes, capture timing immediately.** The notification includes `total_tokens` and `duration_ms`. Save to `timing.json` in the run directory:
```json
{ "total_tokens": 84852, "duration_ms": 23332, "total_duration_seconds": 23.3 }
```
This is the only chance to capture this data — it's not persisted elsewhere.

### 6. Grade, aggregate, and launch viewer

**Step 6a — Grade each run.** Dispatch a grader subagent that reads `agents/grader.md` and evaluates assertions. Save to `grading.json` in each run directory.

## Critical
Use exact field names `text`, `passed`, and `evidence` in `grading.json` expectations. The viewer depends on these — not `name`/`met`/`details`. For programmatic checks, write and run a script rather than eyeballing — scripts are faster, more reliable, and reusable across iterations.

**Step 6b — Aggregate the benchmark.** Run from the skill-creator directory:
```bash
python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
```
Produces `benchmark.json` and `benchmark.md` with pass_rate, time, tokens per configuration (mean ± stddev + delta). If generating manually, match the schema in `references/schemas.md`. Put each `with_skill` version before its baseline counterpart.

**Step 6c — Analyst pass.** Read the benchmark data and surface patterns the aggregate stats might hide. Dispatch an analyzer subagent that reads `agents/analyzer.md` for what to look for (non-discriminating assertions, high-variance evals, time/token tradeoffs).

**Step 6d — Launch the viewer.**
```bash
nohup python <skill-creator-path>/eval-viewer/generate_review.py \
  <workspace>/iteration-N \
  --skill-name "my-skill" \
  --benchmark <workspace>/iteration-N/benchmark.json \
  > /dev/null 2>&1 &
VIEWER_PID=$!
```
For iteration 2+, also pass `--previous-workspace <workspace>/iteration-<N-1>`.

Use `generate_review.py` — do not write custom HTML. For headless environments, see `references/platform-specifics.md`.

Tell the user: *"I've opened the results in your browser. The 'Outputs' tab lets you click through each test case and leave feedback. The 'Benchmark' tab shows the quantitative comparison. Come back when done."*

### 7. Read feedback

When the user says they're done, read `feedback.json`:
```json
{
  "reviews": [
    { "run_id": "eval-0-with_skill", "feedback": "chart is missing axis labels", "timestamp": "..." }
  ],
  "status": "complete"
}
```
Empty feedback means the run was fine. Focus improvements on cases with specific complaints.

Kill the viewer: `kill $VIEWER_PID 2>/dev/null`

### 8. Improve the skill

**Read `references/improvement-strategies.md` before rewriting.** It covers how to generalize from feedback rather than patch narrowly, when to keep the prompt lean, and when to stop iterating.

Apply improvements. Then rerun from step 5 into `iteration-<N+1>/`. Baseline choice:
- **New skill:** baseline stays `without_skill` across iterations.
- **Improving existing:** use judgment — either the original version or the previous iteration.

Stop iterating when the user is happy, feedback is empty, or progress has plateaued.

### 9. Optional: blind comparison

For rigorous A/B between two skill versions, use the blind comparator. Requires subagents. Read `agents/comparator.md` and `agents/analyzer.md` for the procedure. The comparator gets two outputs without knowing which is which, judges quality, and the analyzer explains why the winner won. Most users don't need this — the human review loop is usually sufficient.

### 10. Optional: description optimization

After the skill is stable, offer to optimize the `description` field for trigger accuracy.

**Step 10a — Generate 20 eval queries** (mix of should-trigger and should-not-trigger). Realistic queries a real user would type — with file paths, backstory, casual speech, lowercase, abbreviations, typos:

- Bad: `"Format this data"` — too abstract
- Good: `"ok so my boss just sent me this xlsx file (its in my downloads, called something like 'Q4 sales final FINAL v2.xlsx') and she wants me to add a column..."`

For **should-trigger** (8–10): different phrasings of the same intent, formal and casual, cases where the user doesn't name the skill explicitly, uncommon use cases, cases where this skill competes with another and should win.

For **should-not-trigger** (8–10): prioritize near-misses that share keywords or concepts but need a different tool. Adjacent domains, ambiguous phrasings, queries where the skill partially fits but something else is more appropriate. Obvious negatives ("write a fibonacci function" for a PDF skill) don't test anything.

**Step 10b — Review with user.** Read `assets/eval_review.html`. Replace placeholders:
- `__EVAL_DATA_PLACEHOLDER__` → the JSON array (no quotes — it's a JS variable assignment)
- `__SKILL_NAME_PLACEHOLDER__` → the skill's name
- `__SKILL_DESCRIPTION_PLACEHOLDER__` → the current description

Write to `/tmp/eval_review_<skill-name>.html` and `open` it. The user edits queries, toggles should-trigger, exports to `~/Downloads/eval_set.json`. Check Downloads for the most recent version (may be `eval_set (1).json`).

**Step 10c — Run optimization loop.** Tell the user: *"This will take some time — I'll run it in the background and check periodically."*

```bash
python -m scripts.run_loop \
  --eval-set <path-to-trigger-eval.json> \
  --skill-path <path-to-skill> \
  --model <model-id-powering-this-session> \
  --max-iterations 5 \
  --verbose
```
Use the model ID from the current session so triggering tests match the user's real experience. Tail output periodically to report iteration scores.

The loop splits the eval set 60/40 train/test, runs each query 3× for a reliable trigger rate, uses extended thinking to propose description improvements based on failures, iterates up to 5×, and selects `best_description` by held-out test score (not train) to avoid overfitting.

**Step 10d — Apply the result.** Take `best_description` from JSON output, update the skill's SKILL.md frontmatter. Show the user before/after with scores.

### How triggering works (context for eval query design)

Skills appear in Claude's `available_skills` list with name + description. Claude decides whether to consult a skill based on that description. Important: Claude only consults skills for tasks it can't easily handle on its own. Simple, one-step queries ("read this PDF") may not trigger a skill even with a perfect description — Claude handles those with basic tools. Complex, multi-step, specialized queries reliably trigger skills when description matches.

This means eval queries should be substantive. `"read file X"` is a poor test case — it won't trigger skills regardless of description quality.

### 11. Optional: structural grading (audit against the rubric)

Run this at any point — before iterating on an existing skill (to identify structural weaknesses), after iterating (to verify improvements), or standalone when the user asks to "grade" or "audit" a skill. This is orthogonal to functional grading (step 6): it scores structural/stylistic quality rather than output correctness.

**Step 11a — Run the deterministic checks.** From the skill-creator directory:
```bash
python -m scripts.grade_structure <path-to-target-skill-folder> --json > /tmp/structural-det.json
```
This handles mechanical rules: line count, word count, name/description char limits, kebab-case, reserved prefixes, XML presence, folder-match, nesting depth, unreferenced reference files, `allowed-tools` presence. Outputs a JSON report with per-category letter grades and specific violations.

**Step 11b — Dispatch the structural grader subagent.** Read `agents/structural-grader.md` for the full spec. The subagent handles the subjective rubric categories that require reasoning: four-part body structure, imperative voice, knowledge-dump detection, script-vs-prose determinism, and the full anti-pattern catalog from `references/structural-rubric.md`.

Subagent prompt template:
```
Read agents/structural-grader.md for your full instructions.
Target skill directory: <absolute path to skill folder>
Rubric reference: references/structural-rubric.md (in the skill-creator skill)
Deterministic report: /tmp/structural-det.json
Produce a grading.json per the spec and return it as your response.
```

**Step 11c — Present the combined grade.** Merge the deterministic and subjective reports into a single output:

- Per-category letter grades (8 categories)
- Overall grade (weighted — structure and anti-patterns count more)
- Top 3 strengths
- Top 3 weaknesses with actionable fixes

If the user is improving an existing skill, feed the weaknesses as input to step 8 (Improve the skill) for the next iteration.

### 12. Optional: package

If the `present_files` tool is available:
```bash
python -m scripts.package_skill <path/to/skill-folder>
```
Direct the user to the resulting `.skill` file for installation. If `present_files` is unavailable, skip this step.

## Output

By end of the process, the user has:

- A working skill directory with `SKILL.md` + any `scripts/`, `references/`, `assets/` it needs
- `evals/evals.json` with test cases + assertions
- `<skill-name>-workspace/` with iteration results, benchmark data, and review artifacts
- (Optional) An optimized `description` field via the triggering loop
- (Optional) A packaged `.skill` file

## Reference files (load on demand)

- `references/skill-writing-guide.md` — Anatomy, progressive disclosure, writing patterns, description phrasing (**load before drafting or revising SKILL.md content**)
- `references/improvement-strategies.md` — How to generalize from feedback, when to stop iterating (**load before step 8**)
- `references/platform-specifics.md` — Adaptations for Claude.ai and Cowork (**load if not running in Claude Code**)
- `references/communication-guide.md` — Vocabulary calibration for users across technical levels (**load if user's fluency is unclear**)
- `references/schemas.md` — JSON schemas for evals.json, grading.json, benchmark.json, eval_metadata.json
- `references/structural-rubric.md` — Rubric for grading a SKILL.md's structural quality (**load before step 11b**)

## Subagents (spawn when instructed)

- `agents/grader.md` — Evaluates functional assertions against outputs (step 6a)
- `agents/comparator.md` — Blind A/B comparison between two outputs (step 9)
- `agents/analyzer.md` — Analyzes benchmark results and why one version beat another (step 6c, step 9)
- `agents/structural-grader.md` — Grades a SKILL.md against the structural best-practices rubric (step 11b)
