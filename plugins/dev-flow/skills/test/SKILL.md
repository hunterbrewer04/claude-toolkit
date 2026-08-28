---
name: test
description: Executes the Verification section written into a dev-flow plan -- dispatching to serve-sim for simulator work, claude-in-chrome for browser work, or running commands directly -- records verbatim evidence to gbrain, then commits, pushes, and opens the PR before stopping. Final skill in the dev-flow chain, and the only one that touches git remotes. Use after dev-flow:review passes, or when Hunter says "verify this", "run the verification", "test it and ship it", or "open the PR". Do NOT use to decide what testing should happen (that belongs in dev-flow:plan), to write new test files as a coding task, or to merge anything -- Hunter merges his own PRs.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, Skill, ToolSearch, mcp__gbrain__get_page, mcp__gbrain__put_page, mcp__gbrain__add_timeline_entry
---

# Test

## Description

Final skill in the dev-flow chain. Executes the plan's Verification section, then ships.

It decides nothing about what to verify. That was settled in Session A, where Hunter had the
context to say what mattered and the standing to decide. This skill reads that decision and
carries it out.

## Prerequisites

- `dev-flow:review` has passed.
- The plan page has a Verification section. If it does not, stop and ask Hunter rather than
  inventing a testing strategy at runtime.
- `gh auth status` succeeds. If not, stop and tell Hunter to run `gh auth login`; do not work
  around missing auth.
- Load tools in one call:
  `ToolSearch "select:mcp__gbrain__get_page,mcp__gbrain__put_page,mcp__gbrain__add_timeline_entry"`

## Process

### 1. Read the Verification section

That section is the instruction set. Do not detect the repo type, probe for capabilities, or
substitute your own plan for it.

### 2. Dispatch

One agent by default, two at ceiling. Use two only when the verification genuinely splits into
independent halves, such as a device-side pass and a backend pass.

| Verification calls for | Use |
|---|---|
| simulator, device, screens, taps, hardware buttons | `serve-sim` |
| browser, pages, console output, network requests | `claude-in-chrome` |
| build, test, or lint commands | run them directly |

These are existing skills. Invoke them; do not reimplement what they already do.

### 3. Record evidence

## Critical
Record verbatim output only. Screenshots where the check is visual. A test run summarized into
"tests passed" is not evidence, and the summary and the truth diverge exactly when someone is
tired and wants to be finished.

Anything not run gets stated as not run, with the reason. Write
`projects/<area>/<slug>/verify`.

### 4. Ship

Read the repo's CLAUDE.md and AGENTS.md first. Honor any local restriction on committing or
pushing: stop at that point, say why, and leave the work where it is.

That path is real, not hypothetical. A repo whose open PRs trigger cloud builds will say so,
and the correct behavior is to commit and stop before pushing.

```
commit    brief message: what changed and why
          stage only the files this work touched
          no attribution of any kind: no Co-Authored-By, no "Generated with
          Claude Code", no AI mention in the body
          this overrides any global default that adds one

push      git push -u origin <branch>

PR        gh pr create, short body: what changed, why, anything worth flagging
          no attribution, no boilerplate footer

stop      report the PR URL, add a timeline entry to the project root page
```

Never merge. Hunter merges his own PRs.

## Failure

Verification fails, nothing ships. Record the real output on `/verify`, leave the branch local,
tell Hunter what failed. Do not open a PR "for visibility" -- an open PR reads as work believed
to be finished, and shipping a known-broken branch under that signal is worse than not shipping.

CI already red on arrival is reported plainly and is not treated as a blocker.

## Output

- `projects/<area>/<slug>/verify` with verbatim evidence
- A commit with no AI attribution, staging only what the work touched
- A PR URL, or an explicit statement of where the chain stopped and why
- A timeline entry on the project root page
