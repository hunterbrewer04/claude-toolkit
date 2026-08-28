# gbrain page conventions

gbrain is the system of record for every dev-flow build. The repo holds code and a bookmark;
gbrain holds the reasoning. Load this file before any gbrain write.

## Load the tools in one call

Subagents pay a round trip per `ToolSearch`. Make one call, not three:

```
ToolSearch "select:mcp__gbrain__put_page,mcp__gbrain__add_timeline_entry,mcp__gbrain__get_page"
```

An orchestrator that also searches prior work adds `mcp__gbrain__search,mcp__gbrain__list_pages`.

## Slugs

```
projects/<area>/<slug>              root, holds the SPEC
projects/<area>/<slug>/plan         wave table + verification strategy
projects/<area>/<slug>/<task-id>    one per task, e.g. a2-cookie-csrf
projects/<area>/<slug>/review       review findings
projects/<area>/<slug>/verify       test results
```

`<area>` is one of `brewmint`, `school`, `personal`, `homelab`, `toolkit`. `<slug>` is 2-4
hyphenated lowercase words. Pages written before this convention stay where they are; do not
migrate them.

Every child page ends with `Parent: [[projects/<area>/<slug>]]` so the graph links up.

## Who writes what, and when

| Trigger | Writer | Page |
|---|---|---|
| spec approved | spec skill | root, tagged `spec` |
| plan approved | plan skill | `/plan` |
| wave starts | orchestrator | timeline entry on `/plan` |
| task starts | task agent, FIRST action | `/<task-id>` stub, `Status: in-progress` |
| milestone during task | task agent | timeline entry on `/<task-id>` |
| task ends | task agent, LAST action | `/<task-id>` full build log, `Status: complete` |
| task blocked | task agent | `/<task-id>`, `Status: blocked` + the blocker |
| review done | review skill | `/review` |
| test done | test skill | `/verify` |
| PR opened | test skill | timeline entry on root, with the URL |

Stub-first matters because a run in progress is otherwise invisible and a dead agent otherwise
leaves nothing behind. With the stub, `list_pages --sort updated_desc` is a live status board
and a dead agent's work is recoverable by a replacement.

## Build-log page format

```markdown
# <TASK-ID> — <short title>

**Status:** complete · **Model:** <model> · **Wave:** <N> · **PR:** <N or -->

Branch `agent/<task-id>`, commit `<sha>`, cut from `<base>` @ `<sha>`.
<N> files, +<add>/-<del>.

## What changed
### <file path> (new, <N> lines)
- what and, more importantly, why. A reader six months out needs the reasoning,
  not a restatement of the diff.

## Decisions not in the brief
1. ...

## Deviation
Files touched outside the OWNS list, each with why it was unavoidable and whether
another task in the same wave owns it.

## Follow-ups
- things this task surfaced but does not own -- mark these "not owned — reported up"

## Gauntlet
```
<verbatim command output. Not a summary. Not "tests passed".>
```

## Git proof
`git status --porcelain` — empty. `git diff <base>...HEAD --stat` — <N> files.

Parent: [[projects/<area>/<slug>]] · Spec: [[projects/<area>/<slug>]]
```

Frontmatter carries `type: project` and tags including `build-log`, the area, and the project.

## Two rules that are checked, not trusted

- **No `Status: complete` without a Gauntlet section containing real command output.** A claim
  of passing tests is not evidence of passing tests, and the difference matters most exactly
  when someone is tired and wants to be done.
- **Any file touched outside the OWNS list appears in Deviation, or the task is not complete.**
  Silent out-of-scope edits are how parallel work corrupts itself.

## Decisions-not-in-the-brief is a metric, not decoration

A high count means the brief was underspecified and the agent spent its time designing rather
than implementing. That number is the primary feedback signal into the plan skill. Record it
honestly even when it is embarrassing, because a suppressed count removes the only evidence
that planning needs to improve.
