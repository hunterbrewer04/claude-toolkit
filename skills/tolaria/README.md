# Tolaria

> Work efficiently with Tolaria vaults — pick the fastest tool (direct vs MCP), manage multiple vaults, and follow vault conventions.

## Overview

Tolaria vaults are folders of Markdown notes with YAML frontmatter forming a personal knowledge graph. The Tolaria MCP server (`mcp__tolaria__*`) provides metadata-aware tools, but it round-trips through a daemon and is noticeably slower than direct file tools for routine create/edit/move operations. This skill encodes the right tool-selection reflex (direct tools for file ops, MCP only for metadata-aware search and UI side-effects), the multi-vault registration model (one MCP server per vault), and the vault conventions for frontmatter, types, views, and relationships.

## Trigger Phrases

- "in my [name] vault" / "in my Life OS" / "in my School OS"
- "Tolaria vault"
- "create note in" / "move into my vault"
- "search my vault"
- "Tolaria MCP not working"
- "register vault" / "switch vaults" / "refresh vault"
- Editing `.md` files inside a directory whose `AGENTS.md` references Tolaria conventions

## Description Field

```yaml
description: This skill should be used when working with a Tolaria vault — creating, editing, moving, or organizing notes; searching across notes; managing multiple vaults (Life OS, School OS, etc.); or setting up/troubleshooting the Tolaria MCP server. Trigger phrases include "in my [name] vault", "in my Life OS", "Tolaria vault", "create note in", "move into my vault", "search my vault", "Tolaria MCP not working", "register vault", "switch vaults", "refresh vault". Also applies when editing .md files inside a directory whose AGENTS.md references Tolaria conventions.
```

## How It Works

1. **Detect vault context** — Identify which vault the user named (Life OS, School OS, etc.) and resolve to its absolute path.
2. **Choose tool by task type** — Direct tools (`Read`, `Edit`, `Write`, `Bash`) for create/edit/move/list; MCP tools (`mcp__tolaria__*`) for metadata-aware search, vault orientation, and UI affordances.
3. **Respect vault scoping** — Each MCP server is bound to one vault via the `VAULT_PATH` env var. Search and context tools cannot reach other vaults — for non-registered vaults, all operations use direct tools.
4. **Refresh after bulk ops** — After Bash `mv`/`rm` or batch `Write` operations on a registered vault, call `mcp__tolaria__refresh_vault` so Tolaria's UI catches up. Skip refresh for single `Edit` operations — the file watcher catches those.
5. **Enforce conventions** — Kebab-case filenames, first H1 as display title (no `title:` frontmatter), `type:` matching a type file at vault root, wikilinks in frontmatter quoted as scalars or in YAML lists.
6. **Cross-vault validation** — Before moving notes between vaults: verify destination has a matching `type:`, check wikilinks resolve in the destination, confirm filename is kebab-case.
7. **Multi-vault registration** — Each vault gets a distinct MCP server name (`tolaria`, `tolaria-school`, etc.). Tools appear with the corresponding prefix (`mcp__tolaria-school__*`).

## When to Use

- Creating, editing, or moving notes inside a Tolaria vault
- Searching for notes by content, type, or relationship
- Working across multiple vaults in one session
- The user names a vault explicitly ("in my Life OS", "to my School OS")
- Setting up, registering, or troubleshooting the Tolaria MCP server
- Editing any `.md` file inside a directory containing a Tolaria-flavored `AGENTS.md`

## When NOT to Use

- Tasks unrelated to vaults (general coding, web browsing, etc.)
- Working with `.md` files outside any vault
- Editing JSON canvas files in Obsidian — use `obsidian:json-canvas` instead
- Editing Obsidian Bases (`.base` files) — use `obsidian:obsidian-bases` instead

## Directory Structure

```
tolaria/
├── SKILL.md
├── README.md
└── references/
    ├── mcp-tool-reference.md
    ├── vault-conventions.md
    └── multi-vault-setup.md
```

- **references/mcp-tool-reference.md** — Per-tool reference for each `mcp__tolaria__*` with real schemas, when to use, when to skip, and decision examples
- **references/vault-conventions.md** — Frontmatter, type definitions, view filter syntax, wikilinks, relationships, and underscore-prefixed Tolaria-managed keys
- **references/multi-vault-setup.md** — Registration commands for multiple vaults, the `~/.claude/mcp.json` quirk, switching, and troubleshooting

## Setup & Installation

**Location:** `~/.claude/skills/tolaria/`

1. Copy or symlink the `tolaria/` directory to `~/.claude/skills/tolaria/`
2. Restart Claude Code so the skill registers in the available-skills list
3. Register at least one Tolaria vault as an MCP server (see Configuration below)

**Prerequisites:**
- Claude Code CLI installed
- Tolaria.app installed at `/Applications/Tolaria.app`
- Bash (for the registration commands)

## Configuration

This skill itself requires no configuration. The Tolaria MCP server it advises on is configured per-vault:

| Setting | Where | Purpose |
|---------|-------|---------|
| Server name | `claude mcp add <name>` | Determines the tool prefix (e.g., `tolaria-school` → `mcp__tolaria-school__*`) |
| `VAULT_PATH` env var | `claude mcp add ... -e VAULT_PATH="..."` | Binds the MCP server to one vault directory |
| Server scope | `-s user` flag | User-scope makes it available across all projects |

**Register a vault:**

```bash
claude mcp add tolaria-school -s user \
  -e VAULT_PATH="/Users/hunterbrewer/Desktop/School/School OS" \
  -- node /Applications/Tolaria.app/Contents/Resources/mcp-server/index.js
```

Restart Claude Code afterward. Tools then appear as `mcp__tolaria-school__*`.

## Dependencies

- Tolaria.app — provides the bundled MCP server at `/Applications/Tolaria.app/Contents/Resources/mcp-server/index.js`
- Claude Code's MCP support — for connecting the server
- No external packages required

## Examples

### Moving a Note Between Vaults

Trigger: "Move puzzle-game-all-requirements.md from Life OS to my School OS vault"

The skill:

1. Verifies the destination vault has a matching `type:` definition
2. Greps the note for wikilinks (`[[...]]`) — flags any that won't resolve in the destination
3. Confirms filename is kebab-case
4. Runs `Bash mv` (faster than MCP)
5. Calls `mcp__tolaria__refresh_vault({})` on the source if it's the registered vault, and on the destination if registered

### Searching the Registered Vault

Trigger: "Find notes in my Life OS about authentication"

The skill calls `mcp__tolaria__search_notes({ query: "authentication", limit: 20 })`, then optionally follows up with `Read` on specific paths. It does NOT use `Bash grep` because `search_notes` is indexed and frontmatter-aware.

### Diagnosing "MCP Not Working"

Trigger: "Tolaria MCP isn't working"

The skill skips diagnosis (the cause is known: Tolaria writes to `~/.claude/mcp.json` but Claude Code reads `~/.claude.json`) and runs the canonical `claude mcp add` registration command at user scope.

## Limitations

- The MCP server is scoped to one vault per registration — search and `get_vault_context` cannot reach unregistered vaults
- `refresh_vault` requires Tolaria.app to be running for UI updates to appear
- Cross-vault wikilinks are not validated automatically — the skill instructs to grep for `[[` before moves
- Hooks for automated post-edit `refresh_vault` are not included (would require a separate hook component)

## Related Components

- [skill-builder](../skill-builder/) — Used to create this skill
- [claude-documentation](../claude-documentation/) — Used to generate this README
- [claude-toolkit](../claude-toolkit/) — Used to publish this skill to the toolkit repo
