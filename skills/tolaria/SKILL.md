---
name: tolaria
description: This skill should be used when working with a Tolaria vault — creating, editing, moving, or organizing notes; searching across notes; managing multiple vaults (Life OS, School OS, etc.); or setting up/troubleshooting the Tolaria MCP server. Trigger phrases include "in my [name] vault", "in my Life OS", "Tolaria vault", "create note in", "move into my vault", "search my vault", "Tolaria MCP not working", "register vault", "switch vaults", "refresh vault". Also applies when editing .md files inside a directory whose AGENTS.md references Tolaria conventions.
---

# Tolaria

Tolaria vaults are folders of Markdown notes with YAML frontmatter forming a personal knowledge graph. The Tolaria MCP server (`mcp__tolaria__*`) provides metadata-aware tools, but **the MCP round-trips through a daemon and is noticeably slower than direct file tools for routine create/edit/move operations.**

## Core Principle

**Use direct file tools (Read, Edit, Write, Bash) for file operations. Reserve the MCP for what only the MCP can do: metadata-aware search, type-aware vault orientation, and triggering Tolaria's UI.**

The MCP is not a wrapper to prefer — it is a specialized lookup layer to invoke when its index pays for itself.

## When to Use This Skill

Activate when:

- Creating, editing, or moving notes inside a Tolaria vault
- Searching for notes by content, type, or relationship
- Working across multiple vaults (Life OS, School OS, etc.)
- The user names a vault explicitly ("in my Life OS", "to my School OS vault")
- Setting up, registering, or troubleshooting the Tolaria MCP server
- Editing any `.md` file inside a directory containing a Tolaria-flavored `AGENTS.md`

Skip when the task is unrelated to vaults.

## Tool Selection: MCP vs Direct

This is the most important decision. **Default to direct tools.** Escalate to MCP only when the task needs metadata or UI side-effects.

| Task | Best Tool | Why |
|------|-----------|-----|
| Create a note | `Write` | Direct disk write; no daemon round-trip |
| Edit a note's body or frontmatter | `Edit` | Same — and Tolaria's file watcher catches the change |
| Move a note (within or across vaults) | `Bash mv` | One syscall vs MCP traversal |
| List files in a vault | `Bash ls` | Faster than MCP for raw listing |
| Read one specific note | `Read` | MCP returns extra parsed metadata that's usually unneeded |
| **Find notes by content/keyword** | `mcp__tolaria__search_notes` | Indexed full-text — beats `grep` on large vaults |
| **Orient in a new vault session** | `mcp__tolaria__get_vault_context` | Returns types, folders, recent notes in one call |
| **Open a note in the live app** | `mcp__tolaria__open_note` | Only way to surface in Tolaria's UI |
| **Refresh after Bash bulk ops** | `mcp__tolaria__refresh_vault` | Tells the running app the disk changed |
| **Highlight a UI element for the user** | `mcp__tolaria__highlight_editor` | UX affordance — draw attention to a tab/panel |

**Rule of thumb:** if the task is "move bytes around on disk," use direct tools. If the task is "find or understand notes by what they mean," use MCP.

## The MCP Is Scoped to One Vault

Each MCP server registration points to exactly one vault via the `VAULT_PATH` env var. Currently `mcp__tolaria__*` is bound to `/Users/hunterbrewer/Desktop/Life OS`. Search and vault-context tools cannot reach other vaults.

**Implication:** for vaults that are *not* the registered one, every operation must use direct tools. Never call `mcp__tolaria__search_notes` expecting it to search a different vault — it will silently search the registered one.

To enable MCP-powered search in additional vaults, register each as a distinct server (e.g. `tolaria-school-os`). See `references/multi-vault-setup.md`.

## The Refresh-After-Bulk-Ops Pattern

Tolaria has a file watcher that catches in-place edits, but bulk operations via Bash (`mv`, batch creates, deletes) sometimes outrun it. After bulk operations on the registered vault, call:

```
mcp__tolaria__refresh_vault({ path: "<relative-path>" })   # specific note changed
mcp__tolaria__refresh_vault({})                            # full rescan
```

Skip the refresh for single `Edit` operations on existing files — the file watcher catches those reliably.

## Multi-Vault Workflow

The user names the target vault per task. Vault names are case-sensitive directory names: `Life OS`, `School OS`, etc.

**Move a note between vaults:**

```bash
mv "/Users/hunterbrewer/Desktop/Life OS/note.md" \
   "/Users/hunterbrewer/Desktop/School/School OS/note.md"
```

Before moving, verify three things:

1. **Frontmatter `type:` exists in the destination** — check the destination root for a matching `<type>.md` file. If `type: Project` is moving into a vault with no `project.md`, either copy the type definition first or change the type.
2. **Wikilinks resolve in the destination** — `grep -o '\[\[[^]]*\]\]' note.md` to list link targets. Any target not present in the destination becomes a broken link.
3. **Filename is kebab-case** with `.md` extension.

After moving, call `refresh_vault` on the registered vault if it was source or destination.

## Vault Conventions (Quick Form)

When creating or editing notes:

- **Filename**: kebab-case (`my-note-title.md`)
- **Title**: First H1 in the body — do not add a `title:` frontmatter key
- **Required frontmatter**: `type:` matching a type file at vault root (`Note`, `Project`, `Person`, etc.)
- **Optional frontmatter**: `status:`, `related_to:`, custom keys per the vault
- **Relationships**: Wikilinks in frontmatter — scalar uses quoted `"[[other-note]]"`, multi-value uses YAML list
- **Views**: `views/*.yml` only — never JSON
- **Underscore-prefixed keys** (`_icon`, `_color`, `_order`): Tolaria-managed; leave them alone unless the user explicitly asks

For the full convention set including view filter syntax and type metadata, see `references/vault-conventions.md`.

## Common Workflows

### Create a note (direct, fast)

```
1. Write to <vault>/<kebab-name>.md with frontmatter + H1
2. Optionally mcp__tolaria__open_note({ path: "<relative>" }) to surface it
```

### Search across the registered vault

```
mcp__tolaria__search_notes({ query: "...", limit: 20 })
```

Returns paths, titles, snippets. Follow up with `Read` on specific paths — `get_note` is rarely worth the round-trip unless parsed frontmatter is needed.

### Bulk reorganize files in the registered vault

```
1. Bash mv / rm operations
2. mcp__tolaria__refresh_vault({})
```

### Operate on a non-registered vault

All direct tools. No MCP calls — they would target the wrong vault.

## Setup & Troubleshooting

Tolaria's in-app "Connect External AI Tools" writes to `~/.claude/mcp.json`, but Claude Code reads from `~/.claude.json`. If MCP tools aren't appearing, register at user scope manually — the canonical command and multi-vault registration patterns live in `references/multi-vault-setup.md`.

## Quick Reference

| Action | Command |
|--------|---------|
| Create note | `Write` to `<vault>/<kebab-name>.md` |
| Edit note | `Edit` (file watcher catches it) |
| Move note | `Bash mv` then `refresh_vault` if source/dest is registered |
| Search by content | `mcp__tolaria__search_notes({ query, limit })` |
| Orient in vault | `mcp__tolaria__get_vault_context({})` |
| Read specific note | `Read` (or `mcp__tolaria__get_note({ path })` if frontmatter parsing needed) |
| Open in UI | `mcp__tolaria__open_note({ path })` |
| Refresh after Bash ops | `mcp__tolaria__refresh_vault({})` or `({ path })` |
| Register a vault | See `references/multi-vault-setup.md` |

## Additional Resources

- `references/mcp-tool-reference.md` — Full reference for each `mcp__tolaria__*` tool with arguments, return shapes, and decision examples
- `references/vault-conventions.md` — Complete frontmatter, type, view, and relationship conventions
- `references/multi-vault-setup.md` — Registration commands, naming patterns for multiple vaults, the `~/.claude/mcp.json` quirk, troubleshooting
