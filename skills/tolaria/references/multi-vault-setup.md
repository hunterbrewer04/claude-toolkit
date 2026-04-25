# Multi-Vault Setup & Troubleshooting

How to register multiple Tolaria vaults so each gets its own MCP-powered search and orientation in Claude Code.

## Table of Contents

- [The registration quirk](#the-registration-quirk)
- [Registering a single vault](#registering-a-single-vault)
- [Registering multiple vaults](#registering-multiple-vaults)
- [Listing and removing registrations](#listing-and-removing-registrations)
- [Switching the "active" vault](#switching-the-active-vault)
- [Troubleshooting](#troubleshooting)

---

## The registration quirk

Tolaria's in-app **"Connect External AI Tools"** dialog writes its MCP entry to `~/.claude/mcp.json`. **Claude Code does not read that file** — it reads `~/.claude.json` (the `mcpServers` block).

**Symptom:** User reinstalls Tolaria or runs the in-app setup, then says "MCP isn't showing up in Claude Code." Both files may have the entry, but only `~/.claude.json` matters.

**Fix:** Skip diagnosis. Register at user scope manually with `claude mcp add` (commands below). The bundled server path `/Applications/Tolaria.app/Contents/Resources/mcp-server/index.js` is stable across Tolaria releases.

This is upstream Tolaria's ADR-0011 targeting the wrong path; user can file the bug report.

---

## Registering a single vault

```bash
claude mcp add tolaria -s user \
  -e VAULT_PATH="/Users/hunterbrewer/Desktop/Life OS" \
  -- node /Applications/Tolaria.app/Contents/Resources/mcp-server/index.js
```

Tools appear as `mcp__tolaria__*` in **new** Claude Code sessions. Existing sessions need a restart to pick up the new server.

**Flags explained:**
- `-s user` — user scope, available across all projects on the machine
- `-e VAULT_PATH=...` — env var the server reads to know which vault to bind to
- `--` — separator before the command and args
- `node <path>` — runs the bundled server

---

## Registering multiple vaults

**Each vault needs its own server name.** The MCP tool prefix follows the server name, so:

| Server name | Tool prefix |
|-------------|-------------|
| `tolaria` | `mcp__tolaria__*` |
| `tolaria-school-os` | `mcp__tolaria-school-os__*` |
| `tolaria-work` | `mcp__tolaria-work__*` |

**Naming convention:** lowercase, kebab-case, prefixed with `tolaria-` so all related servers cluster together in tool listings.

**Example — register 4 vaults:**

```bash
# Life OS (the default)
claude mcp add tolaria -s user \
  -e VAULT_PATH="/Users/hunterbrewer/Desktop/Life OS" \
  -- node /Applications/Tolaria.app/Contents/Resources/mcp-server/index.js

# School OS
claude mcp add tolaria-school -s user \
  -e VAULT_PATH="/Users/hunterbrewer/Desktop/School/School OS" \
  -- node /Applications/Tolaria.app/Contents/Resources/mcp-server/index.js

# Work OS (example)
claude mcp add tolaria-work -s user \
  -e VAULT_PATH="/Users/hunterbrewer/Desktop/Work/Work OS" \
  -- node /Applications/Tolaria.app/Contents/Resources/mcp-server/index.js

# Personal OS (example)
claude mcp add tolaria-personal -s user \
  -e VAULT_PATH="/Users/hunterbrewer/Desktop/Personal/Personal OS" \
  -- node /Applications/Tolaria.app/Contents/Resources/mcp-server/index.js
```

After registration, restart Claude Code. Tools then show up as:

- `mcp__tolaria__search_notes` (Life OS)
- `mcp__tolaria-school__search_notes` (School OS)
- `mcp__tolaria-work__search_notes` (Work OS)
- `mcp__tolaria-personal__search_notes` (Personal OS)

**When the user says "search my school vault for X":** call `mcp__tolaria-school__search_notes({ query: "X" })`.

---

## Listing and removing registrations

```bash
claude mcp list                      # show all registered servers
claude mcp remove tolaria-school     # unregister a vault
claude mcp get tolaria               # inspect one server's config
```

To re-bind an existing server to a different vault, remove and re-add — there's no in-place env edit.

---

## Switching the "active" vault

There is no concept of an "active" vault — all registered servers are always available simultaneously. The user picks per task by naming the vault:

- "in my Life OS" → use `mcp__tolaria__*`
- "in my School OS" → use `mcp__tolaria-school__*`

If the user says something ambiguous like "search my vault" without naming one, ask which vault before calling search tools.

---

## Troubleshooting

| Symptom | Diagnosis | Fix |
|---------|-----------|-----|
| `mcp__tolaria__*` tools missing in new session | Likely registered to `~/.claude/mcp.json` only | Re-register with `claude mcp add ... -s user` |
| Search returns nothing for notes that exist | Likely searching the wrong vault | Verify the server name matches the intended vault — `claude mcp get <name>` shows the `VAULT_PATH` |
| `refresh_vault` doesn't update Tolaria's UI | App may not be running | Open Tolaria.app first |
| Tool calls hang / time out | MCP server failed to start | Check `claude mcp list` for the server's status; verify the server file exists at `/Applications/Tolaria.app/Contents/Resources/mcp-server/index.js` |
| New vault registered but tools don't appear | Session needs restart | Quit and reopen Claude Code |
| Spaces in vault path break the command | Shell quoting | Quote the entire `VAULT_PATH` value with double quotes |
| Vault renamed/moved on disk | Path in MCP env is stale | Remove and re-add the server with the new path |

---

## Verification after registration

```bash
# Confirm the server is registered and points at the right vault
claude mcp get tolaria-school

# In a new Claude Code session, verify tools loaded:
# Look for mcp__tolaria-school__* in available tools
# Then run a smoke test:
mcp__tolaria-school__get_vault_context({})
```

If `get_vault_context` returns the expected types and folders, the vault is correctly bound.
