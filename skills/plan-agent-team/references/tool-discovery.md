# Tool Discovery

How the skill enumerates installed MCPs, skills, plugins, and subagents to assign to teammates. The rule is strict: **only assign tools that are actually installed on this machine** — never recommend things the user does not have.

## Discovery sources

Check all four sources before assigning anything:

### 1. Active session's available skills

The most authoritative source for skills. The system reminder lists every skill currently loaded with its triggers and description. Parse that list and treat it as the canonical "skills available right now."

### 2. `~/.claude/settings.json` (user scope)

Read with `Read` tool. Inspect:

- `mcpServers` — globally installed MCPs (enabled and configured)
- `enabledPlugins` (or equivalent) — which plugin packs are active
- `permissions.allow` — pre-approved tool patterns; useful for understanding what the user is comfortable letting agents run

### 3. Project-scoped settings (`.claude/settings.json` in the cwd)

Read if it exists. Same shape as user scope but project-specific. Project overrides user scope for the matching keys.

### 4. Subagents on disk

Two paths to enumerate:

- User scope: `~/.claude/agents/*.md`
- Project scope: `<cwd>/.claude/agents/*.md`

Plus toolkit-managed subagents (typically symlinked into `~/.claude/agents/` from `~/claude-toolkit/sub-agents/`):

```bash
ls ~/.claude/agents/
```

Each `.md` file's frontmatter has `name`, `description`, `tools`, and `model`. Read frontmatter only — the body is the agent's system prompt and isn't needed for assignment.

## Building the tool inventory

Combine the four sources into a single inventory:

```
Inventory:
  MCPs:
    - tolaria
    - linear
    - sourcegraph
    - firecrawl
    - context7
    - <etc>
  Skills:
    - simplify
    - tolaria
    - update-config
    - <etc>
  Plugins:
    - superpowers
    - pr-review-toolkit
    - vercel
    - <etc>
  Subagents:
    - code-reviewer (model: opus)
    - frontend-developer (model: sonnet)
    - typescript-pro (model: sonnet)
    - refactoring-specialist (model: sonnet)
    - <etc>
```

Cache this inventory for the duration of the skill run. Don't re-read sources for each teammate.

## Matching tools to teammate roles

When composing each teammate's spec, decide what tools they need based on the role and the work scope. Then check the inventory.

### Decision rule

For every tool you'd want to assign:

1. Is it in the inventory? **Yes** → assign it.
2. Is it in the inventory? **No** → omit it. Optionally note it in the plan's "Open Questions" section if its absence meaningfully affects the team's capability.

Never write "consider installing X" in the assigned-tools list. Either it's there and assigned, or it's not. (Open Questions is for the user to act on; the assignment list is for the lead.)

### Common role-to-tool patterns

Use these as starting points, not as fixed catalogs. Adapt to the inventory.

**Code reviewer / final reviewer**
- Subagent: `code-reviewer` (opus, deep review)
- Skills: `simplify` (post-review cleanup), `pr-review-toolkit:review-pr` (if installed)
- MCPs: search MCP if available (Sourcegraph, Greptile, etc.) for context-aware review

**Frontend builder**
- Subagent: `frontend-developer`, `react-specialist`, or `ui-designer` (pick best match)
- Skills: `frontend-design` (if installed), `vercel:nextjs` (if installed and Next.js project), `vercel:shadcn` (if installed)
- MCPs: `context7` for library docs, `firecrawl` if scraping reference designs
- Allowed tools: `Read, Edit, Write, Bash` (for npm/test commands)

**Backend implementer**
- Subagent: `fullstack-developer`, `typescript-pro`, or domain-specific (`python-pro` if exists)
- Skills: `vercel:vercel-functions`, `vercel:next-cache-components`, `supabase:supabase` — pick those that match the stack
- MCPs: `supabase`, `firebase`, `stripe`, etc. matching the dependency stack
- Allowed tools: `Read, Edit, Write, Bash`

**Test engineer**
- Subagent: `code-reviewer` for test review, or custom
- Skills: `simplify`, project-specific test skills if any
- MCPs: `firecrawl` (for Playwright doc lookup), `context7`
- Allowed tools: `Read, Edit, Write, Bash` (must run tests)

**Researcher / investigator**
- Subagent: `Explore` (general-purpose), or custom researcher
- Skills: `firecrawl:firecrawl`, `context7`, `sourcegraph:searching-sourcegraph`
- MCPs: `firecrawl`, `sourcegraph`, `linear` (for issue context)
- Allowed tools: read-only — `Read, Grep, Glob, Bash(grep *), Bash(rg *)`

**Refactoring specialist**
- Subagent: `refactoring-specialist`
- Skills: `simplify`
- MCPs: search MCPs for finding usage patterns across codebase

**Performance investigator**
- Subagent: `performance-engineer`
- Skills: relevant profiling skills if any
- MCPs: `sourcegraph` for hot-path discovery

**Security reviewer**
- Subagent: `code-reviewer` (opus) with security-focused spawn prompt, or `pr-review-toolkit:silent-failure-hunter`
- MCPs: search MCPs

These patterns are **suggestions, not constraints**. If a teammate's work is genuinely outside these archetypes, design the tool set from first principles and only use what's in the inventory.

## File-ownership boundaries

Independent of tools, every teammate must have **non-overlapping file ownership**. Document each teammate's owned paths/globs in the plan. The lead enforces this at dispatch time and again at task assignment time.

When the source spec implies overlap (e.g., "frontend and backend both touch `src/api/types.ts`"), resolve in the plan:

- Designate one teammate as the owner
- The other consumes the file read-only via the shared task list
- If both need to write, sequence the work (one finishes, then the other starts)

Never let two teammates own the same file path. The agent-teams docs are explicit: the task-list lock does NOT protect your codebase.

## Sanity checks before finalizing

Before saving the plan, verify:

- [ ] Every assigned MCP is in the inventory
- [ ] Every assigned skill is in the inventory
- [ ] Every assigned subagent type is in the inventory (or marked as `custom`)
- [ ] No two teammates own the same file path
- [ ] Each teammate has at least one tool path that lets them do their job (a teammate without `Edit` can't implement)

If any check fails, fix before saving.
