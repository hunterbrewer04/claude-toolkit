# Tolaria MCP Tool Reference

Each `mcp__tolaria__*` tool, its real arguments, return shape, and when to choose it over a direct tool.

All `path` arguments are **relative to the registered vault root**, not absolute. The MCP server is bound to one vault via the `VAULT_PATH` env var at registration time and cannot reach other vaults.

## Table of Contents

- [search_notes](#search_notes) — full-text search
- [get_vault_context](#get_vault_context) — vault orientation
- [get_note](#get_note) — read with parsed frontmatter
- [open_note](#open_note) — surface a note in the live app
- [refresh_vault](#refresh_vault) — force rescan after bulk ops
- [highlight_editor](#highlight_editor) — UI affordance

---

## search_notes

**Signature:** `search_notes({ query: string, limit?: number })`
**Default limit:** 10

Full-text search across the vault by title and content. Returns matching paths, titles, and snippets.

**Use when:**
- Looking for notes by keyword and the vault has more than ~50 notes
- Need ranked relevance, not exhaustive matches
- The query is conceptual ("authentication", "puzzle game") rather than a literal string

**Skip when:**
- Need exhaustive grep across files (use `Bash grep -r`)
- Need filtering by frontmatter `type:` or relationship — search_notes does full-text only; combine with `get_note` or `Bash grep` on frontmatter
- Vault is small enough that `Bash ls` + `Read` is faster

**Example:**
```
mcp__tolaria__search_notes({ query: "puzzle game requirements", limit: 5 })
```

---

## get_vault_context

**Signature:** `get_vault_context({})`
**Arguments:** none

Returns vault orientation: entity types, total note count, top-level folders, and the 20 most recently modified notes.

**Use when:**
- Entering a vault for the first time in a session and need to understand its shape
- The user asks "what's in my vault" or "what types do I have"
- Planning multi-step work that depends on the vault's type system

**Skip when:**
- Already oriented and just need a specific note (use `Read` or `get_note`)
- Vault is small and `Bash ls` gives the same info faster

**This is the single best first call when starting work in the registered vault.** One round-trip, complete orientation.

---

## get_note

**Signature:** `get_note({ path: string })`

Reads a note and returns `{ path, frontmatter, content }` with frontmatter already parsed as a structured object.

**Use when:**
- Need parsed frontmatter as structured data (e.g., to check a `type:` value or list all `related_to` wikilinks)
- The frontmatter is non-trivial and parsing it manually would be error-prone

**Skip when:**
- Just reading the note's body — `Read` is faster and shows the raw frontmatter inline
- Doing bulk reads across many notes — `Read` parallelizes better

---

## open_note

**Signature:** `open_note({ path: string })`

Opens a note in the Tolaria UI as a new tab.

**Use when:**
- Just created or significantly edited a note and the user should see it
- The user asked "show me X" or "open Y"
- Closing a workflow with a visible result improves UX

**Skip when:**
- The user is not at their desk / not actively using Tolaria
- Operation is part of a long batch — opening 10 tabs is hostile

**Pattern:** create or edit → call `open_note` once at the end.

---

## refresh_vault

**Signature:** `refresh_vault({ path?: string })`

Triggers a vault rescan so new or modified files appear in Tolaria's note list. Optional `path` targets a specific note for a faster, scoped refresh.

**Use when:**
- After `Bash mv`, `rm`, or batch `Write` operations on the registered vault
- After creating a file with frontmatter that defines a new type or view
- Tolaria's UI is showing stale state

**Skip when:**
- Single `Edit` to existing file content — file watcher catches it
- Working on a non-registered vault — refresh would target the wrong one

**Prefer scoped refresh when possible:**
```
mcp__tolaria__refresh_vault({ path: "projects/new-note.md" })   # one file
mcp__tolaria__refresh_vault({})                                  # full rescan, slower
```

---

## highlight_editor

**Signature:** `highlight_editor({ element: "editor" | "tab" | "properties" | "notelist", path?: string })`

Visually highlights a UI element in Tolaria. Auto-clears after a short delay.

**Use when:**
- Walking the user through where to look for something
- Just changed a property and want to draw attention to the properties panel
- Created a note and want to spotlight it in the note list

**Skip when:**
- The user isn't watching
- Used too liberally — pulses lose meaning if every action triggers one

**Elements:**
- `editor` — the main note editing area
- `tab` — the active note's tab
- `properties` — the frontmatter/properties panel
- `notelist` — the sidebar list of notes

---

## Decision Cheat Sheet

| Goal | Tool |
|------|------|
| Read 1 note's body | `Read` |
| Read 1 note's parsed frontmatter | `get_note` |
| Read N notes | `Read` (parallel) |
| Find notes by keyword | `search_notes` |
| Find notes by `type:` | `Bash grep -l "^type: X" *.md` (or `search_notes` + filter) |
| List all notes | `Bash ls *.md` |
| Understand vault structure | `get_vault_context` |
| Create note | `Write` |
| Edit note | `Edit` |
| Move/rename note | `Bash mv` + `refresh_vault` |
| Show user the result | `open_note` (and optionally `highlight_editor`) |
| Sync UI after Bash ops | `refresh_vault` |
