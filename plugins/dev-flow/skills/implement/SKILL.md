---
name: implement
description: Executes a dev-flow plan by orchestrating a small pool of persistent subagent slots, each in its own git worktree, working through the plan's waves with per-task review pipelined as each task lands. Third skill in the dev-flow chain, and the one that runs after the context clear. Use when handoff.md exists and Hunter says "go", "resume", "implement the plan", "keep building", or "continue the build", and also for bounded work where it implements directly without slots or waves. Do NOT use to decide what to build (dev-flow:spec), to break work into tasks (dev-flow:plan), or to run the final whole-branch review (dev-flow:review).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, SendMessage, TaskOutput, Skill, ToolSearch, mcp__gbrain__get_page, mcp__gbrain__put_page, mcp__gbrain__add_timeline_entry
---

# Implement

## Description

Third skill in the dev-flow chain, and the first one in Session B. Orchestrates the build; it
does not write code. Every line of production code in an architectural build comes from a
subagent, which keeps the orchestrator's context free for coordination and keeps each task's
work isolated and reviewable.

## Prerequisites

- `handoff.md` at repo root, or Hunter naming the plan slug directly.
- Clean working tree. A dirty tree stops the skill: report exactly what is dirty and stop. Do
  not stash, commit, or discard anything on Hunter's behalf -- uncommitted work is usually
  uncommitted for a reason only Hunter knows.
- Load tools in one call:
  `ToolSearch "select:mcp__gbrain__get_page,mcp__gbrain__put_page,mcp__gbrain__add_timeline_entry"`
- Read `references/gbrain-pages.md` and `references/graphify.md`.

## Process

### 1. Wake up

Read `handoff.md`, pull the plan page, and report in two lines:

```
Resuming kilgus-zebra · wave 2 of 4 · 3 tasks · branch feat/zebra-completion
Slots: 3
```

Do not read the spec page unless a brief references it. Session B is context-poor deliberately.

### 2. Prepare slots

Register the graphify merge driver before creating any worktree:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/setup-merge-driver.sh"
```

Every slot runs `graphify update .` in its own worktree, so `graph.json` diverges across slots.
Without the union driver the first wave merge hits a multi-megabyte JSON conflict that nobody
can usefully resolve by hand. The script is idempotent and no-ops in repos with no graph.

Three slots by default, five at ceiling. Each slot is a persistent subagent with its own git
worktree under `.wt/slot<N>/`, and both survive across waves.

Slot reuse is what makes this fast. A slot's second task costs no cold start, and its worktree
keeps its build cache warm, which on Xcode is the difference between a twenty-second and a
four-minute rebuild.

Slots spin up lazily. A wave with two tasks uses two slots.

### 3. Run each wave

```
dispatch each task in the wave to a free slot
as a slot returns a task:
    ├─ send its diff to review immediately, without waiting for the wave
    └─ hand the slot the next queued task
when every task in the wave is reviewed clean:
    merge each agent/<task-id> into the feature branch
    resolve graph.json with the graphify union merge driver
    update handoff.md, add a timeline entry to the plan page
```

Merge is the only barrier. Reviewing a finished task while a slower sibling is still running
costs nothing and surfaces problems while there is still time for the rework to overlap with
work already in flight.

A wave holding more tasks than there are slots is normal. The extras queue.

### 4. Dispatch a task

Each slot cuts `agent/<task-id>` from the current feature head. Branch per task rather than per
slot, so each task's diff stays independently reviewable and independently revertible.

The brief goes to the agent verbatim from the plan. Do not summarize it, and do not add
decisions the plan did not make.

### 5. Retire heavy slots

Replace a slot with a fresh one, holding the count at three, when either applies:

- it has completed four tasks
- its latest task ran disproportionately long against its own earlier tasks

A slot accumulates context across its tasks, which is the cost paid for skipping cold starts.
Retirement is where that cost gets reset.

## Critical

The orchestrator never does any of the following:

- writes production code
- decides anything a brief left open
- accepts `Status: complete` without a Gauntlet section containing real command output
- proceeds past an unresolved deviation
- merges to main

The gauntlet rule is the load-bearing one. An agent reporting success is a claim; the command
output is evidence, and the two diverge exactly when it matters most.

## Failure handling

| Situation | Response |
|---|---|
| agent hits an open decision | it stops, writes `Status: blocked` with the decision, orchestrator surfaces it to Hunter. Neither the agent nor the orchestrator decides. |
| review finds a real problem | rework returns to the same slot, which still holds the context. This is the main payoff of persistent slots. |
| second failed review on one task | stop the wave and surface it. Two failures means the brief was wrong, and dispatching a third attempt against the same bad brief wastes another agent. |
| file touched outside OWNS | record in Deviation. If another task in the same wave owns that file, stop the wave immediately. |
| agent dies | its stub and timeline are already in gbrain. Re-dispatch to a fresh slot with that page as context. |
| gauntlet fails | the agent fixes it before returning. A failing gauntlet is not a finding to report up. |
| dirty tree at start | stop, report what is dirty, change nothing. |

## Bounded tier

No slots, no worktrees, no waves. Implement directly, dispatch one `code-reviewer` pass over
the diff, write one flat gbrain page at `projects/<area>/<slug>`.

The tier exists so a one-file fix pays for none of the machinery above. Running waves for a
three-line change would make this chain slower than working without it.

## Output

- A feature branch with every wave merged
- One gbrain build-log page per task, each with a real Gauntlet section
- `handoff.md` updated to `phase: review`
- A report: tasks completed, deviations recorded, follow-ups reported up, anything blocked
