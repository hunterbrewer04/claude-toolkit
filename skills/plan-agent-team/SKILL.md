---
name: plan-agent-team
description: Generates a comprehensive, executable plan for spawning a Claude Code agent-team to deliver a feature, refactor, debug, or review. Produces a Tolaria vault note with team composition (Opus 4.7 lead + Sonnet 4.6 teammates), per-teammate spawn prompts with MCPs/skills/subagent assignments, file-ownership boundaries, a standardized testing & review playbook (Playwright for UI, curl for APIs, code-reviewer + simplify cycles), and a literal spawn prompt ready to dispatch. Use whenever the user says "/plan-agent-team", "plan an agent-team for X", "make a team plan", "build an agent-team blueprint", or asks to coordinate parallel work across modules / layers / hypotheses. Auto-detects whether input is a markdown spec file path or a free-form task description. Always saves output to the user's Tolaria vault. Skip for single-agent work, simple sequential tasks, or sub-agent dispatch where there's no parallel collaboration benefit.
---

# Plan Agent-Team

Generates an executable plan for a Claude Code agent-team. The plan lives as a note in the user's Tolaria vault and serves as both a blueprint for dispatch *and* the run log once the team starts working.

The skill plans; it does not silently dispatch. After the plan is saved, it offers the lead the literal spawn prompt to start the team in the current session.

## When this skill applies

Activate when the user wants:

- Parallel multi-module feature implementation
- Cross-layer feature work (frontend + backend + tests, owned separately)
- Parallel code review (security / performance / coverage lenses)
- Competing-hypothesis debugging
- Refactors split across files where teammates own non-overlapping sets

Skip when:

- A single agent can finish the work without coordination overhead
- Tasks are strictly sequential (B blocked by A — no parallelism benefit)
- The user is dispatching a one-off subagent for a focused task

## Prerequisites

Before drafting the plan, confirm or note in the plan's "Pre-flight" section:

- `claude --version` ≥ 2.1.32 (agent-teams requirement)
- `tmux` is installed (split-pane mode requirement)
- The terminal supports split panes (iTerm2 with `tmux -CC` is the recommended entrypoint; **VS Code integrated terminal, Windows Terminal, and Ghostty don't support split panes**)
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set in `~/.claude/settings.json` env block

The skill does NOT install these — it surfaces missing prerequisites in the plan so the user fixes them before dispatching.

## Process

### 1. Resolve the input

The skill accepts either a markdown spec file or a free-form task description.

**Auto-detect rule:** if the input string resolves to an existing `.md` file, read it and use it as the source spec. Otherwise treat it as a free-form task description.

```
Input examples:
  /plan-agent-team 2026-04-26-tdarr-revamp-design.md     # path → read file
  /plan-agent-team add OAuth login to the API            # text  → treat as task
  Plan an agent-team for the search filter feature       # text  → treat as task
  Plan an agent-team from /path/to/spec.md               # path  → read file
```

If a path is given but the file doesn't exist, ask the user to clarify before proceeding.

### 2. Pick the destination vault

Always call `mcp__tolaria__get_vault_context` to determine which vault to write to. The MCP is bound to one registered vault per session.

If the user explicitly named a different vault ("save this in my Life OS"), use direct file tools to write to that vault's root instead. The MCP can only target the registered vault — for other vaults, write directly via `Write` and skip `refresh_vault`.

### 3. Auto-create the aggregation layer (first run only)

Check whether these exist in the target vault:

- `views/agent-team-plans.yml` — saved view that lists all plan notes
- `agent-team-runs.base` — Obsidian Base for tabular cross-run analysis

If either is missing, create it from `assets/agent-team-plans.yml` and `assets/agent-team-runs.base`. This is a one-time setup per vault. After this, every plan the skill writes automatically appears in both surfaces.

For full vault-integration logic — including how to detect whether the active vault is the MCP-registered one, when to call `refresh_vault`, and how to write to non-registered vaults — read `references/vault-integration.md`.

### 4. Discover available tools

Read `references/tool-discovery.md` for the discovery procedure.

In short: enumerate the MCPs, skills, plugins, and subagents installed on this machine via `~/.claude/settings.json`, project `.claude/settings.json`, and the active session's available-skills list. Only assign tools that are actually installed — never recommend things the user does not have.

### 5. Compose the plan

Read `references/plan-template.md` for the full plan structure with all required sections, frontmatter, and per-section guidance.

The plan MUST include:

- **Frontmatter** — `type: Note`, `status: Draft`, `team_size`, `lead_model: claude-opus-4-7`, `teammate_model: claude-sonnet-4-6`, `started: null`, `completed: null`, `iterations: 0`, `outcome: null`, plus `related_to: "[[source-spec]]"` if the input was a file
- **Mission & Scope** — what the team is delivering, what's out of scope, success criteria
- **Pre-flight Checklist** — the prerequisites listed above, marked with status
- **Team Composition** — Opus 4.7 lead + Sonnet 4.6 teammates (3–5 sweet spot per the agent-teams docs; warn if the count exceeds 5)
- **Per-Teammate Spec** — for each teammate: spawn prompt, subagent type to reuse (if any), allowed tools, MCPs/skills/plugins assigned, files owned (no overlap with siblings), definition of done
- **Task Graph** — numbered tasks with explicit dependencies; mark which tasks are parallelizable
- **Testing & Review Playbook** — see step 6
- **Hooks Setup** — see step 7
- **Open Questions** — anything the skill could not resolve that the user must answer before dispatching
- **Spawn Prompt** — the literal natural-language prompt to paste into Claude Code to start the team
- **Execution Log** — empty at plan time, lead fills inline with timestamps as work proceeds
- **Test Results** — empty at plan time
- **Code Review Findings** — empty at plan time
- **Postmortem** — empty at plan time; lead auto-generates a draft when the team finishes

### 6. Embed the standardized testing & review playbook

Read `references/testing-playbook.md` and copy its content into the plan, tailored to the layers this work touches.

The playbook is non-negotiable:

- **Review & Iteration Loop** — `code-reviewer` subagent runs after each meaningful chunk; `simplify` skill runs after large implementation chunks or before merging a teammate's branch; tests must actually execute (no claiming success without evidence); iterate until passing
- **Layer-specific testing** — Web UI uses Playwright CLI walkthroughs; APIs use curl/HTTPie probes; databases verify migrations + queries; CLIs use smoke tests with expected stdout/stderr; background jobs verify idempotency and retry
- **Acceptance Gate** — concrete checklist that gates "done"

Tailor by **including only the layer sections that apply** (don't include "Background jobs" if there are no async workers in this feature). Default to including UI + API + DB if the source is ambiguous and the work clearly spans those.

### 7. Handle the hooks setup

Read `references/hooks-config.md` for the full procedure.

The skill auto-installs `TaskCompleted` and `TeammateIdle` hooks in `~/.claude/settings.json` with **one-time confirmation**:

1. Check whether the hooks exist
2. If not, show the exact JSON the skill wants to add and ask "Install these once? They'll fire for every agent-team going forward." (yes/no)
3. If yes: write to settings.json, persist a marker so the skill never re-prompts in this vault
4. If no: emit a manual setup snippet in the plan's "Hooks Setup" section and persist the opt-out

### 8. Write the plan

- Use a very descriptive kebab-case filename, date-prefixed: `YYYY-MM-DD-<descriptive-feature-name>-agent-team-plan.md`
- Examples: `2026-04-26-oauth-login-api-agent-team-plan.md`, `2026-04-26-product-search-filter-ui-agent-team-plan.md`
- Save at the destination vault's root
- If the vault is the MCP-registered one, optionally call `mcp__tolaria__open_note({ path })` to surface the plan in the UI

### 9. Offer to dispatch

After saving, print a concise summary in the chat:

```
Plan saved: <path>
Team: <N> teammates (Opus 4.7 lead + Sonnet 4.6 teammates)
Layers: <ui, api, db, ...>
Test gates: <Playwright UI walkthrough, curl probes, ...>

Want to dispatch this team now? (y/n)
```

If the user says yes, hand them the literal spawn prompt from the plan's "Spawn Prompt" section. The current session becomes the lead.

If the user says no or wants to review first, stop. They can dispatch later by reading the plan's "Spawn Prompt" section.

The skill does NOT execute the team itself. Once dispatched, the lead owns the plan file — it updates Execution Log, Test Results, Code Review Findings, and the frontmatter `status` / `started` / `completed` / `iterations` / `outcome` fields inline as work proceeds.

## Output

By the end of running this skill, the user has:

- A descriptively-named plan note at vault root with full team blueprint and standardized testing playbook
- (First run only) `views/agent-team-plans.yml` and `agent-team-runs.base` for cross-run analysis
- (First run only, if approved) `TaskCompleted` and `TeammateIdle` hooks installed in `~/.claude/settings.json`
- An offer to dispatch the team in the current session, with the literal spawn prompt ready to use

## Anti-patterns

These are common ways the skill goes wrong; avoid them:

- **Don't assign MCPs the user doesn't have.** Discovery in step 4 is non-negotiable. Recommending tools that aren't installed produces a plan the team can't execute.
- **Don't bloat the plan with sections that don't apply.** If there's no UI, drop the Playwright section. If there's no DB work, drop the migration tests. The playbook tailors to the work, it doesn't enumerate everything possible.
- **Don't silently dispatch.** Always offer first; the user might want to review before spending tokens on a 3-teammate run.
- **Don't write to a vault without first calling `get_vault_context`.** Even if the user named one explicitly, verify the vault exists before writing.
- **Don't skip the Spawn Prompt section.** It's the single most important deliverable — the team can't be dispatched without it.
- **Don't repeat the source spec verbatim in the plan.** Reference it via `related_to: "[[source-spec]]"` and summarize. The plan is a *blueprint*, not a copy.

## Reference files

Load on demand by step:

- `references/plan-template.md` — Full plan structure with section-by-section guidance (load before step 5)
- `references/testing-playbook.md` — Standardized review & test playbook to copy into every plan (load before step 6)
- `references/hooks-config.md` — Auto-install hooks procedure with one-time confirmation (load before step 7)
- `references/vault-integration.md` — Vault detection, MCP usage, view + Base auto-creation (load before steps 2–3)
- `references/tool-discovery.md` — How to enumerate installed MCPs/skills/plugins/subagents (load before step 4)

## Assets

- `assets/agent-team-plans.yml` — Saved view template for first-run auto-create
- `assets/agent-team-runs.base` — Obsidian Base template for first-run auto-create
