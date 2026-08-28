---
name: plan
description: Turns an approved dev-flow spec into an executable implementation plan -- task IDs, waves, file-ownership lists derived from graphify blast radius, fully-resolved task briefs with zero open decisions, and a verification strategy -- then writes it to gbrain and stops so the session can be cleared. Second skill in the dev-flow chain, normally invoked by dev-flow:spec rather than directly. Use when a spec page exists and the work needs breaking into tasks, or when Hunter says "plan this", "break this into tasks", "write the build plan", or "turn the spec into a plan". Do NOT use to design or decide what to build (that is dev-flow:spec), to execute tasks (dev-flow:implement), or for work classified bounded, which skips planning entirely.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion, Skill, ToolSearch, mcp__gbrain__search, mcp__gbrain__get_page, mcp__gbrain__put_page
---

# Plan

## Description

Second skill in the dev-flow chain. Produces the wave table and the briefs that Session B
executes. Everything expensive about a build is decided here: a brief that leaves a decision
open becomes an agent that spends its time designing instead of implementing.

Ends by telling Hunter to clear the session. Does not invoke `dev-flow:implement` -- the clear
is the entire point of the two-session split.

## Prerequisites

- An approved spec page in gbrain. If none exists, stop and invoke `dev-flow:spec`.
- Load tools in one call:
  `ToolSearch "select:mcp__gbrain__get_page,mcp__gbrain__put_page,mcp__gbrain__search"`
- Read `references/briefs.md` and `references/graphify.md` before writing any brief.
- Read `references/gbrain-pages.md` before writing the plan page.

## Process

### 1. Load the spec

Read `projects/<area>/<slug>`. Every requirement in it must map to at least one task by the end
of this skill.

### 2. Decompose into tasks

Task ID is a workstream letter plus a sequence number. Declare the legend per project rather
than reusing one from another build -- a past build used F for foundation, A for API, B for
backend, U for UI, I for integration audit, W for wave verification, but the letters should
describe this project.

Apply the sizing ceilings in `references/briefs.md`. The one that matters: a task is ready when
its brief has zero open decisions. Anything unresolvable at plan time becomes its own earlier
task rather than a note for the agent to figure out.

### 3. Derive ownership from blast radius

For each task, run `graphify affected "<symbol>" --depth 1`. That set becomes the OWNS list.
Deriving ownership from the graph rather than from intuition catches the files a change reaches
that nobody remembered it reaches.

If the repo has no graph, say so once, offer `graphify update .`, and fall back to explicit file
lists. Do not stall the plan over it.

### 4. Assign waves

## Important
A wave is a dependency group. It is not a concurrency limit.

Two tasks may share a wave only when their depth-1 affected sets are disjoint. Comparing file
lists instead misses the collision that matters: two tasks editing different files that a third
file depends on, which git merges cleanly and wrongly.

Waves take whatever size the dependency graph gives them. Concurrency is capped by slots in
`dev-flow:implement`, not by wave width, so a wave holding six tasks is fine -- the extras queue
and are picked up as slots free. Constraining wave width would fragment the graph for nothing.

A task that breached the affected-set ceiling gets a wave to itself.

### 5. Write the briefs

Use the template in `references/briefs.md`. Resolve every symbol once here with
`graphify query "<question>" --budget 800` and paste it into CONTEXT, so that N agents do not
each re-derive the same map of the codebase in parallel.

### 6. Write the verification strategy

Write what Hunter said about how he wants this verified, in enough detail for a session with no
memory of the conversation to execute it.

If he said nothing, ask now. The question is cheap here and expensive at runtime, where the
session has neither the context to ask well nor the standing to decide.

```
## Verification
serve-sim. Launch, walk every screen, exercise every button, confirm
printer connect / disconnect / reconnect, confirm the label preview
matches printed output. Report anything unresponsive.
Agents: 1.
```

### 7. Self-check before handing off

Fix inline, do not report as findings:

- placeholder scan across every brief
- type consistency across tasks -- `clearLayers()` in task 3 against `clearFullLayers()` in
  task 7 is a real bug, found at the worst possible time
- every spec requirement maps to at least one task
- no file owned by two tasks in the same wave
- no depth-1 affected-set overlap within a wave
- no task carrying an open decision
- every task's dependencies land in an earlier wave than the task itself

### 8. Write the plan and the bookmark

Write `projects/<area>/<slug>/plan`. Then write a gitignored `handoff.md` at repo root:

```
dev-flow: <slug>
spec:   projects/<area>/<slug>
plan:   projects/<area>/<slug>/plan
branch: <feature branch>
phase:  implement
wave:   1 of <N>
```

The `dev-flow:` line is the marker the SessionStart hook matches on. Without it the hook stays
silent, and every unrelated `handoff.md` in every other repo would otherwise claim a build is in
progress. Downstream phases update `phase:` and `wave:` in place and leave that line intact.

Add `handoff.md` and `.wt/` to `.gitignore` if absent.

### 9. Stop

Print the wave table and tell Hunter to clear:

```
Plan written. 14 tasks, 4 waves.
  W1  F1                    W3  U1 U2 U3
  W2  A1 A2 A3              W4  B1 B2

Run /clear, then say "go" -- the session hook picks it up from handoff.md.
```

Do not invoke `dev-flow:implement`. Session B exists to start context-poor, and invoking it here
would defeat the split this whole design is built around.

## Output

- `projects/<area>/<slug>/plan` with the wave table, per-task briefs, and Verification section
- A gitignored `handoff.md` at repo root
- A printed wave table and an instruction to clear
