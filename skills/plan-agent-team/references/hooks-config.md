# Hooks Configuration

How the skill auto-installs the `TaskCompleted` and `TeammateIdle` hooks with one-time confirmation.

## Why these hooks

Agent-team hooks are the "structural" version of the Acceptance Gate. They fire automatically when teammates try to mark tasks complete or go idle, and exit code 2 prevents the action — sending feedback to the agent. This means quality gates are enforced even if the lead forgets to manually invoke them.

| Hook | Fires when | Effect of exit code 2 |
| ---- | ---------- | --------------------- |
| `TaskCompleted` | A task is being marked complete | Prevents completion; sends feedback |
| `TeammateIdle` | A teammate is about to go idle | Sends feedback and keeps the teammate working |

Without these hooks, agent-teams will sometimes self-declare success without running the playbook tests. With them, the playbook becomes structurally enforced, not vibes.

## One-time confirmation flow

The skill never silently mutates `~/.claude/settings.json`. Procedure:

### 1. Check current state

Read `~/.claude/settings.json`. Look for:

- An existing `hooks` block with `TaskCompleted` and `TeammateIdle` entries that match the skill's hook command (or any hook reasonably enforcing test gates)
- A persisted opt-out marker (see step 4)

### 2. Decision tree

| Current state | Action |
| ------------- | ------ |
| Hooks already installed (matching this skill or equivalent) | Skip; mark plan's "Hooks Setup" section as ✅ active |
| User previously opted out (marker present) | Skip auto-install; emit manual snippet in plan |
| No hooks, no opt-out marker | Show the JSON to install and ask for one-time approval |

### 3. Approval prompt

When asking for approval, show the exact JSON the skill wants to add. Be specific so the user can audit it. Example phrasing:

> The plan-agent-team skill wants to install two global hooks in `~/.claude/settings.json`:
>
> - `TaskCompleted` — blocks task completion if the playbook tests haven't been recorded in the plan note
> - `TeammateIdle` — nudges teammates to run the Review & Iteration Loop before going idle
>
> ```jsonc
> {
>   "hooks": {
>     "TaskCompleted": [{ "matcher": ".*", "hooks": [{ "type": "command", "command": "<hook-script-path>" }] }],
>     "TeammateIdle":  [{ "matcher": ".*", "hooks": [{ "type": "command", "command": "<hook-script-path>" }] }]
>   }
> }
> ```
>
> These will fire for **every** agent-team going forward, not just plans from this skill. Install once and remember? (y/n)

### 4. Persistence

After the user answers:

- **Yes:** Write the hooks block to `~/.claude/settings.json` (merge with existing settings, don't overwrite). Persist a marker so the skill never re-prompts. Marker location: `~/.claude/skills/plan-agent-team/.installed-hooks` (touch file with timestamp).
- **No:** Persist an opt-out marker: `~/.claude/skills/plan-agent-team/.opted-out-hooks`. Future runs skip auto-install and emit the manual snippet in plans.

The user can re-trigger the prompt by deleting the marker file.

## Hook script behavior

The hook script (referenced as `<hook-script-path>` above) is a small bash script that:

### TaskCompleted hook

1. Read the task's title and ID from the hook's stdin payload
2. Check whether the corresponding plan note exists at any vault root the user has registered
3. If yes: verify the plan's "Test Results" section has at least one entry for the layer(s) this task touches
4. If "Test Results" is missing or empty: exit 2 with feedback like "Task X cannot complete — no Test Results recorded for the layer this task touched. Run the playbook and update the plan note."
5. Otherwise exit 0

### TeammateIdle hook

1. Read the teammate's recent activity from the hook's stdin payload
2. If the teammate just finished implementation work and the plan's "Code Review Findings" section is empty for that teammate: exit 2 with feedback "Run code-reviewer on your changes before idling."
3. Otherwise exit 0

The script is permissive by design — it doesn't block on edge cases it can't reason about (e.g., plan note in a non-default vault). It enforces the obvious cases and lets the lead's judgment cover the rest.

## Manual setup snippet

If the user opts out, the plan's "Hooks Setup" section emits this snippet:

```jsonc
// Add to ~/.claude/settings.json under the top-level "hooks" key
"hooks": {
  "TaskCompleted": [{
    "matcher": ".*",
    "hooks": [{
      "type": "command",
      "command": "/path/to/plan-agent-team/hooks/task-completed.sh"
    }]
  }],
  "TeammateIdle": [{
    "matcher": ".*",
    "hooks": [{
      "type": "command",
      "command": "/path/to/plan-agent-team/hooks/teammate-idle.sh"
    }]
  }]
}
```

The user can adapt the matcher (e.g., scope to specific projects) or the command (e.g., point to their own script).

## Hook scripts shipped with the skill

> **Status:** v1 of this skill ships **without bundled hook scripts**. The auto-install flow shows the JSON shape but installs hook entries with a placeholder command. The user wires up the actual script later, or writes their own.
>
> Bundling functional hook scripts is planned for v2 once the skill has been used enough to understand the right enforcement boundary. Until then, the manual snippet is the recommended path for users who want active enforcement.

If a future version ships hook scripts, they live at `<skill-path>/hooks/task-completed.sh` and `<skill-path>/hooks/teammate-idle.sh`. The skill rewrites the placeholder command in `~/.claude/settings.json` to point at the actual scripts.

## Compatibility with existing hooks

If the user already has `TaskCompleted` or `TeammateIdle` entries in their settings, **do not overwrite them**. Append the skill's hook to the array of hooks for that event. The hook command names should be distinct enough to coexist.

If a conflict is unavoidable (e.g., the user's existing hook does the opposite of what this skill needs), surface the conflict in the approval prompt and let the user decide.
