---
name: spec
description: Turns an idea into an approved specification stored in gbrain, driven by a question loop that exits only when Hunter explicitly says the spec is correct. Entry point for the dev-flow chain -- classifies work as bounded or architectural, pulls prior decisions from gbrain and structure from graphify, proposes approaches, then writes the spec page. Use whenever Hunter starts new work, including "let's build X", "I want to add Y", "start a new project", "spec this out", "I've got an idea for", or any request to create a feature, subsystem, integration, or app that does not already exist in the repo. Do NOT use for fixing broken behavior in code that already exists (that is bounded work -- go straight to dev-flow:implement), for answering questions, or when a spec page already exists in gbrain (resume with dev-flow:plan).
allowed-tools: Read, Bash, Glob, Grep, WebFetch, AskUserQuestion, Skill, ToolSearch, mcp__gbrain__search, mcp__gbrain__recall, mcp__gbrain__list_pages, mcp__gbrain__get_page, mcp__gbrain__put_page
---

# Spec

## Description

First skill in the dev-flow chain. Produces one artifact: an approved spec page at
`projects/<area>/<slug>` in gbrain. Everything downstream reads that page, so its quality caps
the quality of the whole build.

Hands off to `dev-flow:plan` and to nothing else.

## Prerequisites

- gbrain reachable. Load tools in one call:
  `ToolSearch "select:mcp__gbrain__search,mcp__gbrain__recall,mcp__gbrain__list_pages,mcp__gbrain__get_page,mcp__gbrain__put_page"`
- Current directory is the target repo, or Hunter has said where the work lands.
- Read `references/gbrain-pages.md` before writing any page.

## Process

### 1. Classify and announce

State the tier in a few words so Hunter can override it in one word.

| Tier | Test | Path |
|---|---|---|
| bounded | the flow being changed already exists in this repo to read | stop here, hand to `dev-flow:implement` |
| architectural | new subsystem, new project, or a change that restructures how components fit | continue |

Understanding the kind of app is not enough. Bounded measures the repo, not your familiarity.
When torn between the two, take architectural: the ratchet is one-way, so hidden complexity
found mid-task upgrades the tier and says so out loud, and nothing downgrades mid-task.

### 2. Load context in one pass

Run these together, then report what came back in about four lines. Do not dump raw output.

```
gbrain     search + recall on the project name and any symbols Hunter named
graphify   god-nodes --top 15, and explain "<symbol>" per named symbol
repo       CLAUDE.md / AGENTS.md, recent commits, existing structure
```

Read `references/graphify.md` before running graphify commands.

The gbrain half is the point. Surfacing a decision Hunter already made three weeks ago before
asking him anything is the difference between this skill and a generic brainstorm.

### 3. Scope-check

If the request spans several independent subsystems, say so and decompose before spending
questions on detail. Each piece gets its own spec, plan, and build cycle. Refining details of a
project that needs splitting wastes the questions that matter.

### 4. Question loop

One question per message. Multiple choice with a stated recommendation whenever the options
enumerate; open-ended when they do not. Aim at purpose, constraints, and success criteria, not
implementation detail. Stop when you can state the design back.

### 5. Approaches

Propose 2-3 with trade-offs, recommendation first with the reasoning. Cut anything not needed
from every option before presenting -- an unnecessary feature is cheapest to remove before
Hunter has an opinion about it.

### 6. Design in sections

Present in sections scaled to their complexity. Ask after each whether it looks right. Cover
architecture, components, data flow, error handling, and verification strategy.

Ask how Hunter wants the work verified. That answer becomes the plan's Verification section and
is expensive to reconstruct later, in a session that has no memory of this conversation.

### 7. Write the spec page

Write `projects/<area>/<slug>` per `references/gbrain-pages.md`. Number the decisions D1, D2,
D3 with the reasoning for each, so a reader in Session B can tell a considered choice from an
arbitrary one.

### 8. Self-review

Read the written page fresh and fix inline:

- placeholders: TBD, TODO, "etc.", vague requirements
- contradictions between sections
- anything readable two ways -- pick one and make it explicit
- scope: still one plan's worth of work

Report what the self-review caught. A review that finds nothing on a long spec is a review that
did not happen.

### 9. Verification loop

## Critical
Only an explicit affirmative exits this loop.

Present the spec together with what you are still assuming, then ask whether it looks correct.

- Exits: "yes", "looks correct", "go", "that's right", or equivalent.
- Does not exit: silence, "ok", an unrelated question, an answer to a different question, or
  Hunter continuing to discuss the design.

There is no iteration cap. Each pass leads with what is still assumed rather than restating the
whole page, so Hunter reviews the gaps rather than rereading. Revisions rewrite the page rather
than appending to it.

Ambiguity means ask again. A spec advanced on a distracted "sure" costs an entire Session B.

### 10. Hand off

Invoke `dev-flow:plan`. Invoke no other skill -- not an implementation skill, not a design
skill, not a testing skill. The chain has one next step.

## Output

- One gbrain page at `projects/<area>/<slug>`, tagged `spec`, decisions numbered with reasoning
- A stated tier
- Explicit approval from Hunter, in his own words, before anything downstream runs
