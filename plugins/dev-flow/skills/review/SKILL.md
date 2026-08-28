---
name: review
description: Runs the whole-branch review pass for a dev-flow build -- checks blast radius outside the ownership lists with graphify, applies /simplify, re-runs the gauntlet, then fans out up to three pr-review-toolkit specialists chosen by what the diff actually contains, and writes ranked findings to gbrain. Fourth skill in the dev-flow chain. Use after implementation completes and before testing, or when Hunter says "review this branch", "review the build", "check the whole diff", or "run the review pass". Do NOT use for per-task review during implementation (dev-flow:implement does that inline), for triaging incoming comments on an existing PR, or as a substitute for dev-flow:test.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, Skill, ToolSearch, mcp__gbrain__get_page, mcp__gbrain__put_page
---

# Review

## Description

Fourth skill in the dev-flow chain. Runs once over the whole feature branch, after every task
has already had its own `code-reviewer` pass and a passing gauntlet during implementation.

Its job is finding what per-task review structurally cannot: interactions between tasks,
duplication introduced across task boundaries, and impact reaching outside the ownership lists
the plan drew.

## Prerequisites

- Every task in the plan is merged into the feature branch with a passing gauntlet.
- Load tools in one call:
  `ToolSearch "select:mcp__gbrain__get_page,mcp__gbrain__put_page"`
- Read `references/graphify.md` and `references/gbrain-pages.md`.

## Process

Run these in order. The order is not arbitrary -- step 2 changes code, so anything that
inspected the branch before it has inspected a branch that no longer exists.

### 1. Blast radius outside ownership

```bash
graphify affected "<changed symbol>" --depth 2
```

Union the OWNS lists from every task in the plan. Anything the changed symbols reach that falls
outside that union is flagged. This is a CLI step and spends no agent.

The plan predicted what the work would touch. This measures what it actually touched, and the
gap is where cross-task surprises live.

### 2. Simplify

Run `/simplify` over the full branch diff. It applies reuse, simplification, efficiency, and
altitude cleanups. It is quality-only and does not hunt for bugs, which is why it runs before
the specialists rather than instead of them.

### 3. Re-run the gauntlet

## Critical
Re-run it. A green gauntlet from before `/simplify` is not evidence about the code that exists
after `/simplify`, and treating it as evidence is how a clean branch ships broken.

### 4. Specialist fan-out

Up to three, in parallel, chosen by what the diff contains rather than from a fixed list:

| Diff contains | Dispatch |
|---|---|
| catch blocks, fallbacks, error paths, retries | `silent-failure-hunter` |
| new types, interfaces, or type-level changes | `type-design-analyzer` |
| new logic with thin or absent test changes | `pr-test-analyzer` |
| substantial new doc comments or docstrings | `comment-analyzer` |
| fewer than three matched above | fill remaining slots with `code-reviewer` under a distinct lens |

Hard cap three. These do not count against the implement skill's slot budget.

### 5. Write findings

Write `projects/<area>/<slug>/review`. Rank most severe first.

## Important

Every finding carries a concrete failure scenario: specific inputs or state, then the wrong
output or crash that results. A finding that cannot be stated that way gets dropped, and the
drop is recorded with its reason under a `## Dropped` heading.

Dropping is deliberate. A plausible-sounding finding that turns out to be wrong costs more than
silence, because Hunter has to spend real attention refuting it, and a review that cries wolf
gets skimmed the next time it matters.

Never run or recommend `/code-review ultra`.

## Bounded tier

One `code-reviewer` pass over the diff, `/simplify`, re-run the gauntlet, one flat gbrain page.
No fan-out.

## Output

`projects/<area>/<slug>/review` containing:

- status, branch, `diff --stat`
- out-of-ownership impact from graphify
- what `/simplify` changed, and the re-run gauntlet output
- findings, ranked, each with a concrete failure scenario and a verdict
- dropped findings, with the reason each was dropped

`handoff.md` updated to `phase: test`.
