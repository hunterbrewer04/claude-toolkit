---
name: tolaria
description: This skill should be used when working with a Tolaria vault — creating, editing, moving, or organizing notes; searching across notes; or working across multiple vaults (Life OS, School OS, etc.). Trigger phrases include "in my [name] vault", "in my Life OS", "in my School OS", "Tolaria vault", "create note in", "move into my vault", "search my vault", "refresh vault". Also applies when editing .md files inside a directory whose AGENTS.md references Tolaria conventions.
---

# Tolaria

Tolaria vaults are folders of Markdown notes with YAML frontmatter forming a personal knowledge graph. The Tolaria MCP server (`mcp__tolaria__*`) provides metadata-aware tools, but **the MCP round-trips through a daemon and is noticeably slower than direct file tools for routine create/edit/move operations.**

## Core Principle

**Use direct file tools (Read, Edit, Write, Bash) for file operations. Reserve the MCP for what only the MCP can do: metadata-aware search, type-aware vault orientation, and triggering Tolaria's UI.**

The MCP is not a wrapper to prefer — it is a specialized lookup layer to invoke when its index pays for itself.

Vaults are just folders of `.md` files. **Any vault on disk can be operated on with direct tools, regardless of whether it has an MCP server registered.** Direct file operations work on every vault; the MCP server is a separate, optional indexing layer for one specific vault.

## When to Use This Skill

Activate when:

- Creating, editing, or moving notes inside a Tolaria vault
- Searching for notes by content, type, or relationship
- Working across multiple vaults (Life OS, School OS, etc.)
- The user names a vault explicitly ("in my Life OS", "to my School OS vault")
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
| Find notes by content/keyword | `Bash grep -r` for any vault; `mcp__tolaria__search_notes` for the registered vault if indexed search is desired | `grep` works everywhere; MCP search is indexed but only covers the one registered vault |
| **Orient in the registered vault** | `mcp__tolaria__get_vault_context` | Returns types, folders, recent notes in one call |
| **Open a note in the live app** | `mcp__tolaria__open_note` | Only way to surface in Tolaria's UI |
| **Refresh after Bash bulk ops** | `mcp__tolaria__refresh_vault` | Tells the running app the disk changed |
| **Highlight a UI element for the user** | `mcp__tolaria__highlight_editor` | UX affordance — draw attention to a tab/panel |

**Rule of thumb:** if the task is "move bytes around on disk," use direct tools. If the task is "find or understand notes by what they mean" *in the registered vault*, MCP earns its keep.

## The MCP Is Scoped to One Vault

Each MCP server is bound to exactly one vault via the `VAULT_PATH` env var set at registration time. Search and vault-context tools cannot reach other vaults — they will silently target the registered one.

**Implication:** for vaults that are *not* the MCP-registered one, every operation must use direct tools. This is fine — direct tools are faster anyway for create/edit/move work.

Most users only need one MCP-registered vault (typically the most heavily searched one). Other vaults work great via direct tools alone.

## The Refresh-After-Bulk-Ops Pattern

Tolaria has a file watcher that catches in-place edits, but bulk operations via Bash (`mv`, batch creates, deletes) sometimes outrun it. After bulk operations on the **registered vault**, call:

```
mcp__tolaria__refresh_vault({ path: "<relative-path>" })   # specific note changed
mcp__tolaria__refresh_vault({})                            # full rescan
```

Skip the refresh for single `Edit` operations on existing files — the file watcher catches those reliably. Skip entirely for non-registered vaults — there's no MCP server to refresh, and Tolaria's app picks up changes when the user opens that vault.

## Multi-Vault File Workflow

Vaults are independent folders on disk. The user names the target vault per task. Vault names are case-sensitive directory names: `Life OS`, `School OS`, etc.

**Move a note between vaults — pure filesystem op:**

```bash
mv "/Users/hunterbrewer/Desktop/Life OS/note.md" \
   "/Users/hunterbrewer/Desktop/School/School OS/note.md"
```

Before moving, verify three things:

1. **Frontmatter `type:` exists in the destination** — check the destination root for a matching `<type>.md` file. If `type: Project` is moving into a vault with no `project.md`, either copy the type definition first or change the type.
2. **Wikilinks resolve in the destination** — `grep -o '\[\[[^]]*\]\]' note.md` to list link targets. Any target not present in the destination becomes a broken link.
3. **Filename is kebab-case** with `.md` extension.

After moving, call `refresh_vault` only if the registered vault was source or destination.

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
2. If the vault is the MCP-registered one, optionally mcp__tolaria__open_note({ path: "<relative>" }) to surface it
```

### Search the registered vault

```
mcp__tolaria__search_notes({ query: "...", limit: 20 })
```

Returns paths, titles, snippets. Follow up with `Read` on specific paths.

### Search a non-registered vault

```bash
grep -r --include="*.md" "query" "/path/to/vault"
```

### Bulk reorganize files in any vault

```
1. Bash mv / rm operations
2. mcp__tolaria__refresh_vault({}) — only if it's the registered vault
```

## Setup & Troubleshooting (Single MCP Server)

If the user reports "Tolaria MCP isn't working," the cause is usually that Tolaria's in-app "Connect External AI Tools" wrote its config to `~/.claude/mcp.json`, but Claude Code reads from `~/.claude.json`. Skip diagnosis and run:

```bash
claude mcp add tolaria -s user \
  -e VAULT_PATH="<absolute path to vault>" \
  -- node /Applications/Tolaria.app/Contents/Resources/mcp-server/index.js
```

The bundled server path is stable. Tools appear as `mcp__tolaria__*` in **new** Claude Code sessions (existing sessions need a restart).

**Most users want exactly one MCP server**, pointed at whichever vault they search most. Other vaults still work — they just use direct tools.

## Quick Reference

| Action | Command |
|--------|---------|
| Create note | `Write` to `<vault>/<kebab-name>.md` |
| Edit note | `Edit` (file watcher catches it) |
| Move note | `Bash mv` (then `refresh_vault` if registered vault is involved) |
| Search registered vault | `mcp__tolaria__search_notes({ query, limit })` |
| Search any other vault | `Bash grep -r --include="*.md" ...` |
| Orient in registered vault | `mcp__tolaria__get_vault_context({})` |
| Read specific note | `Read` (or `mcp__tolaria__get_note({ path })` if frontmatter parsing needed) |
| Open in UI | `mcp__tolaria__open_note({ path })` (registered vault only) |
| Refresh after Bash ops | `mcp__tolaria__refresh_vault({})` (registered vault only) |

## Additional Resources

- `references/mcp-tool-reference.md` — Full reference for each `mcp__tolaria__*` tool with arguments, return shapes, and decision examples
- `references/vault-conventions.md` — Complete frontmatter, type, view, and relationship conventions
