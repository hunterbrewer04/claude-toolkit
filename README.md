# BrewKit

> My personal Claude Code setup, packaged as a plugin marketplace so I can install exactly the pieces a given machine needs.

This is a public snapshot of how I extend [Claude Code](https://docs.claude.com/en/docs/claude-code).
It ships **6 plugins** covering 20 skills, 1 sub-agent, 4 hooks, and a custom status line.

Most pieces follow my own paths and conventions, so treat them as reference patterns
to borrow from rather than drop-in installs.

## Install

```
/plugin marketplace add hunterbrewer04/claude-toolkit
/plugin install school@brewkit
```

Install only the plugins that machine actually needs. Nothing here assumes the others
are present.

## Plugins

### school

Coursework tooling.

| Skill | What it does |
|---|---|
| [course-setup](./plugins/school/skills/course-setup/) | Scaffold a new course folder and clean Canvas file dumps; owns the `school.json` registry |
| [grade-calc](./plugins/school/skills/grade-calc/) | Exact grade math from syllabus weights: current grade, what-ifs, target scores |
| [rubric-check](./plugins/school/skills/rubric-check/) | Grade a draft against its assignment spec before submitting |
| [study-guide](./plugins/school/skills/study-guide/) | Turn lecture PDFs into a self-contained interactive HTML study package |
| [notebooklm-course-sync](./plugins/school/skills/notebooklm-course-sync/) | Keep a course's NotebookLM notebook in sync with local files |
| [sapling-ai-detector](./plugins/school/skills/sapling-ai-detector/) | Scan text for AI-generated content with a per-sentence report |

### work

Client and project delivery.

| Skill | What it does |
|---|---|
| [linear-assistant](./plugins/work/skills/linear-assistant/) | Create, update, and query Linear issues, projects, milestones, and cycles |

### personal

Personal-life tooling.

| Skill | What it does |
|---|---|
| [apple-calendar](./plugins/personal/skills/apple-calendar/) | Read and write Apple Calendar from a machine that reaches it over the network via the apple-calendar MCP server |

### misc

Everything cross-cutting.

| Skill | What it does |
|---|---|
| [claude-toolkit](./plugins/misc/skills/claude-toolkit/) | Add, sync, and set up this repo's components across machines |
| [claude-documentation](./plugins/misc/skills/claude-documentation/) | Generate consistent README docs for skills, hooks, and sub-agents |
| [skill-builder](./plugins/misc/skills/skill-builder/) | Build a new skill through a structured, validated process |
| [docx](./plugins/misc/skills/docx/) | Create, read, and edit Word documents, including tracked changes and comments |
| [notebooklm](./plugins/misc/skills/notebooklm/) | Full programmatic NotebookLM API: notebooks, sources, artifacts, downloads |
| [tailnet](./plugins/misc/skills/tailnet/) | Move files to tailnet servers, serve files over Tailscale, Taildrop to a phone |

Also ships three hooks that apply everywhere: a `PreToolUse` guard against committing
`.env` files, a `SessionStart` agent-state tracker, and a `Stop` desktop notification.

### dev-flow

My development workflow chain, split across two sessions with a context clear in between.

| Skill | What it does |
|---|---|
| [spec](./plugins/dev-flow/skills/spec/) | Turn an idea into an approved specification |
| [plan](./plugins/dev-flow/skills/plan/) | Break an approved spec into waves of file-disjoint tasks |
| [implement](./plugins/dev-flow/skills/implement/) | Execute the plan across persistent subagent slots in git worktrees |
| [review](./plugins/dev-flow/skills/review/) | Whole-branch review pass with specialist fan-out |
| [test](./plugins/dev-flow/skills/test/) | Run the plan's verification section, then commit and open the PR |

Includes the `code-reviewer` sub-agent used by the review step, and a `SessionStart`
resume hook.

### meta-builders

| Skill | What it does |
|---|---|
| [skill-creator](./plugins/meta-builders/skills/skill-creator/) | Create and improve skills, run evals, benchmark performance, grade a `SKILL.md` against a structural rubric |

## Status line

[`statusline/`](./statusline/) holds an agnoster-inspired three-row status line:
where you are, what you are running, and what you are burning. Point
`statusLine.command` in `settings.json` at `statusline-command.sh`.

## Machine-local configuration

Nothing machine-specific is committed here. Two files live outside the repo:

| File | Used by | Notes |
|---|---|---|
| `~/.claude/tailnet-servers.json` | `tailnet` | Server registry: addresses, SSH aliases, default destinations. See [`servers.example.json`](./plugins/misc/skills/tailnet/servers.example.json) for the schema |
| `~/.claude/settings.json` | everything | Permissions, env, enabled plugins, status line wiring |
