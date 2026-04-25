# Tolaria

> Work efficiently with Tolaria vaults — pick the fastest tool for the task and follow vault conventions.

## Overview

Tolaria vaults are folders of Markdown notes with YAML frontmatter forming a personal knowledge graph. The Tolaria MCP server (`mcp__tolaria__*`) provides metadata-aware tools, but it round-trips through a daemon and is noticeably slower than direct file tools for routine create/edit/move operations. This skill encodes the right tool-selection reflex (direct tools for file ops, MCP only for metadata-aware search and UI side-effects), the file workflow for working across multiple vaults, and the vault conventions for frontmatter, types, views, and relationships.

## Trigger Phrases

- "in my [name] vault" / "in my Life OS" / "in my School OS"
- "Tolaria vault"
- "create note in" / "move into my vault"
- "search my vault" / "refresh vault"
- Editing `.md` files inside a directory whose `AGENTS.md` references Tolaria conventions

## Description Field

```yaml
description: This skill should be used when working with a Tolaria vault — creating, editing, moving, or organizing notes; searching across notes; or working across multiple vaults (Life OS, School OS, etc.). Trigger phrases include "in my [name] vault", "in my Life OS", "in my School OS", "Tolaria vault", "create note in", "move into my vault", "search my vault", "refresh vault". Also applies when editing .md files inside a directory whose AGENTS.md references Tolaria conventions.
```

## How It Works

1. **Detect vault context** — Identify which vault the user named (Life OS, School OS, etc.) and resolve to its absolute path.
2. **Choose tool by task type** — Direct tools (`Read`, `Edit`, `Write`, `Bash`) for create/edit/move/list; MCP tools (`mcp__tolaria__*`) only for metadata-aware search, vault orientation, and UI affordances on the registered vault.
3. **Operate on any vault directly** — Vaults are folders of `.md` files. Direct tools work on every vault on disk regardless of MCP registration.
4. **Use MCP only for the registered vault** — The MCP server is bound to one vault via `VAULT_PATH`. Search and context tools cannot reach other vaults; for those, fall back to `Bash grep` / `Bash ls`.
5. **Refresh after bulk ops** — After Bash `mv`/`rm` or batch `Write` operations on the registered vault, call `mcp__tolaria__refresh_vault` so Tolaria's UI catches up. Skip for single `Edit` operations and for non-registered vaults.
6. **Enforce conventions** — Kebab-case filenames, first H1 as display title (no `title:` frontmatter), `type:` matching a type file at vault root, wikilinks in frontmatter quoted as scalars or in YAML lists.
7. **Cross-vault validation** — Before moving notes between vaults: verify destination has a matching `type:`, check wikilinks resolve in the destination, confirm filename is kebab-case.

## When to Use

- Creating, editing, or moving notes inside a Tolaria vault
- Searching for notes by content, type, or relationship
- Working across multiple vaults in one session
- The user names a vault explicitly ("in my Life OS", "to my School OS")
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
    └── vault-conventions.md
```

- **references/mcp-tool-reference.md** — Per-tool reference for each `mcp__tolaria__*` with real schemas, when to use, when to skip, and decision examples
- **references/vault-conventions.md** — Frontmatter, type definitions, view filter syntax, wikilinks, relationships, and underscore-prefixed Tolaria-managed keys

## Setup & Installation

**Location:** `~/.claude/skills/tolaria/`

1. Copy or symlink the `tolaria/` directory to `~/.claude/skills/tolaria/`
2. Restart Claude Code so the skill loads into the available-skills list

**Prerequisites:**
- Claude Code CLI installed
- Tolaria.app installed (the skill assumes the vault format and the MCP server bundled with the app)
- A Tolaria MCP server already registered (the skill works fine without one too, just falls back to direct tools for everything)

## Configuration

This skill itself requires no configuration. The Tolaria MCP server it advises on is configured at registration time:

| Setting | Where | Purpose |
|---------|-------|---------|
| `VAULT_PATH` env var | `claude mcp add tolaria -s user -e VAULT_PATH="..."` | Binds the MCP server to one vault directory |
| Server scope | `-s user` flag | User-scope makes it available across all projects |

**Single-server registration (typical setup):**

```bash
claude mcp add tolaria -s user \
  -e VAULT_PATH="<absolute path to your most-searched vault>" \
  -- node /Applications/Tolaria.app/Contents/Resources/mcp-server/index.js
```

Restart Claude Code afterward. Tools then appear as `mcp__tolaria__*`. **Most users want exactly one MCP server, pointed at the vault they search most.** Other vaults still work — they just use direct file tools.

If MCP tools fail to appear after registration, it's usually because Tolaria's in-app "Connect External AI Tools" wrote the config to `~/.claude/mcp.json` instead of `~/.claude.json`. The `claude mcp add` command above writes to the right file.

## Dependencies

- Tolaria.app — provides the bundled MCP server at `/Applications/Tolaria.app/Contents/Resources/mcp-server/index.js`
- Claude Code's MCP support — for connecting the server (optional; the skill works without MCP)
- No external packages required

## Examples

### Moving a Note Between Vaults

Trigger: "Move puzzle-game-all-requirements.md from Life OS to my School OS vault"

The skill:

1. Verifies the destination vault has a matching `type:` definition
2. Greps the note for wikilinks (`[[...]]`) — flags any that won't resolve in the destination
3. Confirms filename is kebab-case
4. Runs `Bash mv` (faster than MCP)
5. Calls `mcp__tolaria__refresh_vault({})` only if the registered vault is source or destination

### Searching the Registered Vault

Trigger: "Find notes in my Life OS about authentication" (assuming Life OS is the MCP-registered vault)

The skill calls `mcp__tolaria__search_notes({ query: "authentication", limit: 20 })`, then optionally follows up with `Read` on specific paths.

### Searching a Non-Registered Vault

Trigger: "Find notes in my School OS about deadlines" (assuming School OS is not MCP-registered)

The skill falls back to `Bash grep -r --include="*.md" "deadlines" "/path/to/School OS"`. No MCP call — search_notes would silently target the wrong vault.

## Limitations

- The MCP server is scoped to one vault per registration — `search_notes` and `get_vault_context` cannot reach unregistered vaults (the skill knows to fall back to direct tools)
- `refresh_vault` requires Tolaria.app to be running for UI updates to appear
- Cross-vault wikilinks are not validated automatically — the skill instructs to grep for `[[` before moves

## Related Components

- [skill-builder](../skill-builder/) — Used to create this skill
- [claude-documentation](../claude-documentation/) — Used to generate this README
- [claude-toolkit](../claude-toolkit/) — Used to publish this skill to the toolkit repo
