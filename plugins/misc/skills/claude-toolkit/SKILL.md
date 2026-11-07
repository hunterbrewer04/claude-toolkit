---
name: claude-toolkit
description: Use when the user asks to "add this to my toolkit", "push to claude-toolkit", "sync my claude-toolkit", "pull my toolkit on this machine", "publish this component", or needs to manage a GitHub repository of Claude Code skills, hooks, sub-agents, and mods. Also applies when the user says "claude-toolkit" by name or wants to organize, update, or set up their toolkit repo.
---

# Claude Toolkit Manager

Manage the claude-toolkit repo, a plugin marketplace of Claude Code skills, hooks, sub-agents, and mods. Add components, keep the repo synced, set it up on a new machine, and list what it holds.

## When to Use

- Adding a skill, hook, sub-agent, or mod to the toolkit repo
- Syncing a machine's clone of the repo
- Setting up the toolkit on a new machine
- Publishing a change to an existing component
- Checking what the toolkit holds

## When NOT to Use

- Creating a new GitHub repository (this skill uses an existing repo)
- Building the component itself (use `skill-creator` for skills, `plugin-authoring` for mods)

## Core Process

### 0. Resolve Toolkit Repo Path

Before any operation, determine where the toolkit repo lives:

1. Check `~/.claude/CLAUDE.md` for a line matching `claude-toolkit-repo: <path>`
2. If found, verify the path exists and is a git repo
3. If not found, prompt the user for the repo path (local path or GitHub URL)
4. Offer to persist the path by adding `claude-toolkit-repo: <path>` to `~/.claude/CLAUDE.md` (create the file if it does not exist)

If the user provides a GitHub URL and no local clone exists, clone it first (see Operation C below).

### Operation A: Add Component

The primary workflow. Trigger: "add this to my toolkit", "push to claude-toolkit", "publish this component."

**Step 1. Identify the component type and target plugin.**

| Type | Detection signal | Goes in |
|------|-----------------|---------|
| Skill | Directory contains `SKILL.md` with YAML frontmatter | `plugins/<plugin>/skills/<name>/` |
| Mod | Directory contains `hooks/hooks.json` listing a `register.tsx` module | `plugins/<name>/`, its own plugin |
| Hook | Script plus an entry for `settings.json` or `hooks.json` | `plugins/<plugin>/hooks/` |
| Sub-agent | Agent definition `.md` with frontmatter | `plugins/<plugin>/agents/<name>.md` |

If the type or the plugin is ambiguous, ask the user. See `references/repo-structure.md` for what each plugin holds.

**Step 2. Copy files into the repo, on a new branch.**

For a skill or a mod, run the script:

```bash
bash <repo>/plugins/misc/skills/claude-toolkit/scripts/add-component.sh skill <source-path> <repo> <plugin>
bash <repo>/plugins/misc/skills/claude-toolkit/scripts/add-component.sh mod <source-path> <repo>
```

If it reports `COLLISION:<path>`, ask before overwriting.

For a hook, copy the script into the plugin's `hooks/` folder, make it executable, and add its entry to that plugin's `hooks/hooks.json`, using `${CLAUDE_PLUGIN_ROOT}` for the path. For a sub-agent, copy the `.md` file into the plugin's `agents/` folder.

**Step 3. Register it.**

- Changed an existing plugin: bump `version` in its `.claude-plugin/plugin.json`. Machines that installed from GitHub only pick up a change when the version moves.
- New plugin or mod: add it to `.claude-plugin/marketplace.json`.
- Run `claude plugin validate <repo>` and fix anything it reports.

**Step 4. Update the top-level README by hand.**

Add the component to the matching table or section, and update the counts in the intro. Keep it short. The README is not generated.

**Step 5. Commit, push, and open a PR.**

Follow the user's git rules in `~/.claude/CLAUDE.md`. Never merge.

### Operation B: Sync Toolkit

Trigger: "sync my claude-toolkit", "update my toolkit."

1. Check `git status` in the repo. If it has uncommitted changes or is on a branch other than `main`, tell the user and ask before moving it.
2. `git checkout main && git pull --ff-only`
3. Report what changed: new, removed, and updated components.
4. If the machine installed from GitHub rather than a local directory, run `claude plugin update <plugin>@brewkit` for each changed plugin. Tell the user to restart Claude Code.

### Operation C: Pull/Setup on New Machine

Trigger: "pull my toolkit on this machine", "set up my toolkit."

1. Clone the repo to `~/claude-toolkit/` or a user-specified path. Prompt for the GitHub URL if it is not configured.
2. Add `claude-toolkit-repo: <path>` to `~/.claude/CLAUDE.md` (create if needed).
3. Add the marketplace: `claude plugin marketplace add <path>`. The marketplace is named `brewkit`.
4. Ask which plugins this machine needs, then run `claude plugin install <plugin>@brewkit` for each.
5. Report what was installed and tell the user to restart Claude Code.

A marketplace added from a local path is read straight from the clone's working tree. Whatever branch the clone is on is what new sessions run, so leave it on `main` when not working on the toolkit.

### Operation D: List Components

Trigger: "what's in my toolkit", "list toolkit components."

Read `.claude-plugin/marketplace.json` and each plugin's `skills/`, `agents/`, and `hooks/` folders, then display a summary grouped by plugin. A plugin whose `hooks/hooks.json` lists a `register.tsx` module is a mod.

## Error Handling

| Situation | Action |
|-----------|--------|
| Toolkit repo path not configured | Prompt user, offer to persist |
| Repo path exists but is not a git repo | Error with clear message |
| Target plugin does not exist | Ask whether to create it or pick another |
| Component name collision | Prompt before overwriting |
| Git push fails | Pull with rebase, retry once, then report |
| GitHub URL provided but git not installed | Error with install instructions |

## Additional Resources

- **`references/repo-structure.md`**: repo layout and naming conventions
- **`scripts/add-component.sh`**: copies a skill or mod into the right folder
