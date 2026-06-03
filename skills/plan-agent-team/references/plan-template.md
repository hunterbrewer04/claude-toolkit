# Plan Template

This is the canonical structure every generated plan note must follow. Copy this template, fill it in based on the source spec or task description, then tailor sections to the actual work scope.

## Filename

`YYYY-MM-DD-<descriptive-feature-slug>-agent-team-plan.md`

The slug should be **descriptive enough that a future self scanning the vault root knows exactly what this plan was for** without opening it. Prefer 4–8 words over 1–2.

Good: `2026-04-26-oauth-login-with-google-and-github-providers-agent-team-plan.md`
Bad: `2026-04-26-auth-plan.md`

## Frontmatter

```yaml
---
type: Note
related_to: "[[<source-spec-filename-without-extension>]]"   # omit if no source file
status: Draft
team_size: 3
lead_model: claude-opus-4-7
teammate_model: claude-sonnet-4-6
started: null
completed: null
iterations: 0
test_layers: [ui, api, db]      # tailor to the work
outcome: null
---
```

`status` lifecycle: `Draft` → `In Progress` (set by lead on dispatch) → `Complete` | `Abandoned` | `Needs Rework`.

`outcome` (set by lead at end): `success` | `partial` | `failed` | `null` if not yet finished.

## Body Structure

```markdown
# Agent-Team Plan: <Feature Name>

## Mission & Scope

**What we're building:**
<2–3 sentences from the source spec or task description>

**Out of scope:**
- <explicit non-goals>

**Success criteria:**
- <concrete, testable conditions for "done">

## Pre-flight Checklist

Before dispatching, confirm:

- [ ] `claude --version` ≥ 2.1.32
- [ ] `tmux` installed (`which tmux`)
- [ ] Terminal supports split panes (iTerm2 with `tmux -CC` recommended; NOT VS Code, Windows Terminal, or Ghostty)
- [ ] `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` set in `~/.claude/settings.json` env block
- [ ] Working directory is the right repo / branch
- [ ] All teammates' MCPs/skills are installed (see Per-Teammate Spec below)
- [ ] (Recommended) Hooks installed — see Hooks Setup section

## Team Composition

**Lead:** Opus 4.7 — orchestrator, coordinates the dependency graph, synthesizes findings, runs final review pass.

**Teammates:** All Sonnet 4.6 unless a role explicitly needs Opus reasoning.

| # | Role | Subagent type (if reused) | Files owned |
| - | ---- | ------------------------- | ----------- |
| 1 | <role> | <subagent or "custom"> | <paths/globs> |
| 2 | <role> | <subagent or "custom"> | <paths/globs> |
| 3 | <role> | <subagent or "custom"> | <paths/globs> |

> Sweet spot is 3–5 teammates per the agent-teams docs. If team_size > 5, justify it in this section — coordination overhead at 6+ usually exceeds the gain.

## Per-Teammate Spec

For each teammate, fill out:

### Teammate <#>: <role>

**Subagent type:** `<from claude-toolkit/sub-agents/ or plugin agents, or "custom" if no match>`
**Model:** `claude-sonnet-4-6` (or `claude-opus-4-7` if justified)

**Allowed tools:** `[Read, Edit, Write, Bash, Grep, ...]`

**MCPs / Skills / Plugins:**
- MCPs: <only those installed on this machine>
- Skills: <only those available in this session>
- Plugins: <only those installed>

**Files owned:** `<exact paths or globs — must NOT overlap with sibling teammates>`

**Definition of done:**
- <concrete deliverable>
- <tests written and passing>
- <code-reviewer pass clean>

**Spawn prompt** (lead pastes this when spawning the teammate):

> Spawn a teammate using the `<subagent-type>` agent type to <one-sentence mission>. Their scope: <specific files/modules>. They must follow the Review & Iteration Loop in this plan. Report progress via the shared task list. <any special instructions>.

---

(Repeat per teammate)

## Task Graph

Numbered tasks with explicit dependencies. Tasks with the same prerequisites can run in parallel.

| ID | Task | Owner | Blocked by | Parallelizable with |
| -- | ---- | ----- | ---------- | ------------------- |
| 1  | <task> | T1 | — | 2, 3 |
| 2  | <task> | T2 | — | 1, 3 |
| 3  | <task> | T3 | — | 1, 2 |
| 4  | <task> | T1 | 1 | 5 |
| 5  | <integration test> | T3 | 1, 2 | 4 |
| 6  | <final review> | Lead | 4, 5 | — |

## Testing & Review Playbook

<Insert content from `references/testing-playbook.md` here, tailored to the layers this work touches. Drop sections that don't apply.>

## Hooks Setup

<One of two outcomes from step 7 of the skill:>

**Option A — Hooks already installed:** ✅ `TaskCompleted` and `TeammateIdle` hooks active.

**Option B — User opted out:** Manual setup snippet:

```jsonc
// Add to ~/.claude/settings.json under "hooks"
{
  "TaskCompleted": [{
    "matcher": ".*",
    "hooks": [{ "type": "command", "command": "<path-to-hook-script>" }]
  }],
  "TeammateIdle": [{
    "matcher": ".*",
    "hooks": [{ "type": "command", "command": "<path-to-hook-script>" }]
  }]
}
```

## Open Questions

Things the skill could not resolve. The user must answer these before dispatching:

- [ ] <question>
- [ ] <question>

(If none, write "None — ready to dispatch.")

## Spawn Prompt

This is the literal natural-language prompt to paste into Claude Code (already in a tmux-ready session) to start the team:

```text
Create an agent-team to <high-level mission>.

Use Opus 4.7 for the lead and Sonnet 4.6 for all teammates.

Spawn <N> teammates:
1. <role 1> — <one-sentence scope>. Use the <subagent-type> agent type. Owns: <files>. Tools: <list>. MCPs/skills: <list>.
2. <role 2> — ...
3. <role 3> — ...

Each teammate must follow the Review & Iteration Loop and the layer-specific
testing strategy from this plan: <vault-path-to-this-plan>.

Wait for all teammates to complete their tasks before declaring the work
done. Run the Acceptance Gate checklist before marking the plan Complete.

Update the plan note at <vault-path-to-this-plan> inline with timestamps as
work progresses (Execution Log section), test results (Test Results section),
and code review findings (Code Review Findings section).

When the team finishes (success or otherwise), generate a draft Postmortem in
the plan note and set frontmatter `status` and `outcome` accordingly.
```

## Execution Log

(Lead fills this in as work proceeds, with ISO timestamps. Format: `YYYY-MM-DDTHH:MM:SS — <event>`.)

## Test Results

(Lead fills this in. One subsection per layer with pass/fail evidence — Playwright trace excerpts, curl response codes, query output, etc.)

## Code Review Findings

(Lead fills this in. Critical / Major / Minor / Info findings from `code-reviewer` passes. Include resolution status per finding.)

## Postmortem

(Lead drafts this when the team finishes. User edits before marking `status: Complete`.)

**What worked:**
- <bullet>

**What didn't:**
- <bullet>

**Lessons for next time:**
- <bullet>

**Suggested playbook improvements:**
- <bullet>
```

## Tailoring Rules

- **Layers in `test_layers` frontmatter must match the layer sections actually present in the Testing Playbook** — keep these in sync.
- **Drop the Hooks Setup section entirely** if hooks were installed AND there's no manual snippet to show. A one-line "✅ Hooks active" is enough.
- **If there are no Open Questions, write "None — ready to dispatch."** Don't leave the section empty.
- **The Spawn Prompt is the single most important deliverable.** It must be complete and copy-pasteable. Never use placeholder text like `<TODO>` in the spawn prompt.
