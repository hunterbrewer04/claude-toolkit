# Vault Integration

How the skill writes plans to a Tolaria vault and sets up the cross-run aggregation layer.

## Picking the destination vault

The skill calls `mcp__tolaria__get_vault_context` first. This MCP tool returns metadata for the **registered vault** — the one the MCP server is bound to via `VAULT_PATH`.

### Cases

**Case 1 — User did not name a vault**

Use the registered vault from `get_vault_context`. This is the most common case.

**Case 2 — User named the registered vault explicitly**

E.g., user said "save this in my Servers vault" and `get_vault_context` returns `Servers`. Use the registered vault path. The MCP can be used for `open_note` and `refresh_vault` follow-ups.

**Case 3 — User named a different vault**

E.g., user said "save in my Life OS" but the registered vault is `Servers`. The MCP cannot help — it's bound to one vault per session. Resolve the path manually:

- Common location: `~/Desktop/<Vault Name>/` or wherever the user keeps vaults
- If the path is ambiguous, ask the user: "Which path is your Life OS vault?"
- Write directly with `Write` tool
- **Skip `mcp__tolaria__refresh_vault`** — it would target the wrong vault and silently no-op

**Case 4 — `get_vault_context` fails (no registered vault)**

The MCP isn't configured for this session. Ask the user for the destination vault path explicitly. Write directly. Skip MCP follow-ups.

## Filename rules

- Date-prefixed: `YYYY-MM-DD-...`
- Kebab-case: lowercase with hyphens, no underscores or spaces
- Very descriptive: 4–8 words capturing the feature, not just the topic
- Suffix: `-agent-team-plan.md`
- Saved at vault root (alongside other notes), NOT in a subdirectory

Examples:
- ✅ `2026-04-26-product-search-filter-with-faceted-results-agent-team-plan.md`
- ✅ `2026-04-26-oauth-login-google-github-providers-agent-team-plan.md`
- ❌ `2026-04-26-search.md` (too vague)
- ❌ `agent-team-plans/2026-04-26-search.md` (wrong location)

## Writing the plan note

Use the `Write` tool directly. The tolaria skill's guidance applies: **direct file tools are faster than the MCP for create/edit operations** — only use the MCP for metadata-aware operations.

After writing:
- If the vault is the MCP-registered one, optionally call `mcp__tolaria__open_note({ path: "<filename>" })` to surface the note in the Tolaria UI.
- The file watcher catches the create event automatically — no `refresh_vault` call needed for a single Write.

## First-run aggregation setup

The skill auto-creates two aggregation surfaces in any vault, **one time per vault**.

### Detection

Check whether these exist in the destination vault:

- `views/agent-team-plans.yml`
- `agent-team-runs.base`

Use `Bash ls` for the check. If both exist, skip setup. If either is missing, create the missing one(s) from the asset templates.

### Saved view: `views/agent-team-plans.yml`

Copy `assets/agent-team-plans.yml` to `<vault>/views/agent-team-plans.yml`.

If `<vault>/views/` doesn't exist, create it first.

This view appears as a sidebar entry in Tolaria, listing all notes whose title contains "agent-team-plan", sorted by status.

### Base: `agent-team-runs.base`

Copy `assets/agent-team-runs.base` to `<vault>/agent-team-runs.base`.

The Base lives at vault root (Obsidian convention). It provides a tabular view across all plans with columns from frontmatter: title, status, started, completed, team_size, outcome, iterations, test_layers.

### Refresh after first-run setup

After creating either file, call `mcp__tolaria__refresh_vault({})` if the destination is the MCP-registered vault. This tells Tolaria to rescan and pick up the new view definition.

## Multi-vault behavior

The skill supports any number of vaults the user has on disk. Discovery rules:

- The MCP-registered vault is always known via `get_vault_context`
- Other vaults are referenced by name; the user provides paths if ambiguous
- The aggregation setup runs **once per vault**, so each vault accumulates its own plan history independently

**No cross-vault aggregation.** A plan in vault A doesn't appear in vault B's Base. This is intentional — vaults are personal knowledge graphs scoped by purpose (Life OS vs School OS vs work).

## Frontmatter compatibility

The plan's frontmatter uses these custom keys:

- `team_size`, `lead_model`, `teammate_model`, `started`, `completed`, `iterations`, `test_layers`, `outcome`

These are NOT standard Tolaria type fields and don't need a corresponding `<key>.md` type file. They're just custom note metadata that Bases can read as columns.

The required `type:` key is `Note` — the same as a standard note in the user's vault. Existing `note.md` type definition at vault root applies.

## Existing AGENTS.md compatibility

This vault may have an `AGENTS.md` (or `CLAUDE.md`) that codifies vault conventions. Always respect:

- Filename casing (kebab-case)
- Type field requirements (don't introduce a new type without the user asking)
- Relationship key conventions (`related_to`, `belongs_to`, etc.)
- Frontmatter style (don't normalize underscored keys vault-wide)

If the vault's `AGENTS.md` says something different from this skill's defaults, the vault's instructions win. Adapt the plan to match.
