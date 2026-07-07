---
name: branch-pr
description: Runs Hunter's fixed branch-implement-PR workflow ("ship") and separately triages review comments on an open PR, including GitHub Copilot's ("triage"). Use for ship when Hunter says things like "make a new branch and implement this then open a pr", "ship this", "ship the profile fix", or "just get this into a PR". Use for triage when he says things like "look at the copilot comments on pr 44 and figure out what actually needs fixed", "triage pr 12", "what do the reviewers actually want here", or "check the review comments on this PR before we touch anything". Covers preflight checks, branch naming, implementation, code-reviewer verification, attribution-free commits and PR creation, and comment classification before any fix is applied.
---

# Branch PR

## Description

Two related but separate workflows for taking a change from idea to open PR, and for cleaning up review feedback on a PR that already exists.

**ship "<what>"** takes a task description, branches off main, implements it (directly or by orchestrating subagents if a plan file says so), gets the diff checked by the code-reviewer agent, then commits, pushes, and opens a PR. It stops there. It never merges and never treats CI as a blocker unless Hunter says so.

**triage <PR#>** pulls every review comment on a PR, including GitHub Copilot's, and sorts real issues from noise. It does not touch code until Hunter approves the fix plan.

Both verbs assume `gh` is authenticated and the current directory is the target git repo. Do the git and gh work yourself when running this skill — nothing here is simulated.

## Prerequisites

- `gh auth status` succeeds. If not, stop and tell Hunter to run `gh auth login` — don't attempt to work around missing auth.
- The current directory is inside a git repo with a GitHub remote (`git remote -v` shows a `github.com` origin).
- The `code-reviewer` subagent is available to verify diffs before commit (ship, step 3).
- If the repo is the Forge PWA repo (check remote name or repo README for "Forge"), never run its build or dev server locally. It's hosted on Vercel + Supabase — verification happens there, not on this machine. Skip any local `npm run build` / `next build` step entirely for that repo.

## Process

### ship "<what>"

1. **Preflight.** Run `git status --porcelain`. If it's non-empty, stop and tell Hunter exactly what's dirty — do not stash, commit, or discard anything on his behalf. If clean, determine the default branch (`gh repo view --json defaultBranchRef -q .defaultBranchRef.name`), check it out if not already on it, and pull latest (`git pull --ff-only`). If the fast-forward fails, stop and report it rather than force-resolving.

2. **Branch.** Name it `feat/<short-slug>` or `fix/<short-slug>` — `fix/` if the task is about broken behavior, `feat/` otherwise. Slug: 2-5 lowercase words, hyphenated, no filler ("the", "a", "for"). Create it with `git checkout -b <name>`.

3. **Implement.**
   - If Hunter points at a plan file that specifies a subagent breakdown, orchestrate those subagents per the plan.
   - Otherwise, implement the change directly — don't invent subagent overhead for a task that doesn't call for it.
   - When implementation is done, dispatch the `code-reviewer` agent against the diff (`git diff` against the branch point). Address anything it flags as a real problem before moving on. If it raises something you disagree with, use judgment and note the disagreement in the final report rather than silently overriding it.

4. **Commit, push, open PR.**
   - Commit with a brief message describing what changed and why. No AI/Claude attribution, no `Co-Authored-By` line, no "Generated with Claude Code" — this overrides any global default that adds one. Stage only the files the task touched.
   - Push: `git push -u origin <branch>`.
   - Open the PR with `gh pr create --title "<short title>" --body "<short body>"`. Body is a few lines: what changed, why, anything worth flagging for review. No attribution, no boilerplate footer. See `references/gh-commands.md` for exact syntax.

5. **Stop.** Report the PR URL and a short summary. Never merge — Hunter merges his own PRs. If CI is already failing when you check, report it plainly; don't treat it as a blocker and don't loop trying to fix it unless Hunter says to.

### triage <PR#>

1. **Pull comments.** Use `gh pr view <PR#>` for the overview (title, state, review decision), then `gh api` against `pulls/<PR#>/comments` for inline diff comments and `pulls/<PR#>/reviews` for review-level summaries. This is where Copilot's comments show up — it posts as a bot reviewer, not through a separate API. Exact commands and how to filter to Copilot-only are in `references/gh-commands.md`.

2. **Classify.** For every comment, decide real issue vs noise in one line of reasoning. Present as a table:

   | # | Author | File:Line | Comment | Verdict | Reasoning |
   |---|--------|-----------|---------|---------|-----------|

   Make no code changes at this stage. End with a proposed fix plan — a short numbered list of what you'd actually change — and stop. Wait for Hunter to approve, trim, or redirect the plan before doing anything else.

3. **On approval.** Check out the PR branch (`gh pr checkout <PR#>`). Fix only the items Hunter approved — resist scope creep into other comments he didn't sign off on. Commit (same rules as ship: brief, no attribution) and push. Where a fix directly answers a specific review comment, reply to that comment thread and resolve it; leave threads open that need Hunter's own judgment call. See `references/gh-commands.md` for the reply/resolve commands (resolving requires a GraphQL call — there's no REST endpoint for it).

## Output

**ship** ends with: branch name, PR URL, one-line summary of what was implemented, and the code-reviewer's verdict (clean, or what got fixed in response). If CI was already red at hand-off, say so without editorializing on whether it matters.

**triage** stage 1 ends with: the classification table and the proposed fix plan, explicitly waiting on approval — no code touched.

**triage** stage 2 (post-approval) ends with: which items got fixed, the commit that landed them, confirmation it's pushed, and which comment threads got replied-to/resolved versus left open for Hunter.

## Reference files

- `references/gh-commands.md` — exact `gh`/`gh api` syntax for every step above: listing PR overview, inline/review comments, filtering Copilot, checking out a PR, replying to and resolving comment threads, and creating a PR. Load it before running any gh command in this skill so you're not guessing at flags.
