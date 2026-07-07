# gh commands crib sheet

Every `gh` subcommand and flag below was checked against `gh --help` output on this machine (gh version 2.95.0). REST/GraphQL endpoint paths (`repos/{owner}/{repo}/pulls/...`, `graphql`) are standard, stable GitHub API paths passed through `gh api` as-is — `gh --help` doesn't describe them since `gh api` is a generic HTTP passthrough, so treat those as GitHub API surface, not gh CLI surface. `{owner}` and `{repo}` are literal placeholders gh substitutes from the current repo; leave them as-is unless targeting a different repo.

## PR overview

```
gh pr view <PR#> --json title,body,state,url,reviewDecision,statusCheckRollup,latestReviews
gh pr view <PR#> --comments
```
`--json` gives structured data for the title/state/CI-rollup/latest-review-summary. `--comments` renders the top-level conversation thread (not inline diff comments — those are separate, see below).

## Inline / review comments (this is where Copilot shows up)

```
gh api repos/{owner}/{repo}/pulls/<PR#>/comments --paginate
gh api repos/{owner}/{repo}/pulls/<PR#>/comments --paginate --jq '.[] | {id, author: .user.login, path, line, body}'
```
Returns every inline diff comment, across all reviews. Copilot posts through this same endpoint as a bot reviewer (login is typically `copilot-pull-request-reviewer[bot]`, but match case-insensitively since GitHub has changed bot login strings before):
```
gh api repos/{owner}/{repo}/pulls/<PR#>/comments --paginate --jq '.[] | select(.user.login | test("copilot"; "i"))'
```

```
gh api repos/{owner}/{repo}/pulls/<PR#>/reviews --paginate
```
Returns review-level summaries (APPROVED / CHANGES_REQUESTED / COMMENTED) with each review's overall body text — use alongside the inline comments, not instead of them.

```
gh api repos/{owner}/{repo}/pulls/<PR#>/reviews/<REVIEW_ID>/comments
```
Comments scoped to one specific review, if you need to correlate a comment back to which review it came from.

## General conversation comments (non-inline)

```
gh api repos/{owner}/{repo}/issues/<PR#>/comments --paginate
```
A PR is an issue under the hood, so top-level conversation comments (not tied to a diff line) live under `issues/<N>/comments`, not `pulls/<N>/comments`.

## Checking out the PR branch

```
gh pr checkout <PR#>
gh pr checkout <PR#> -f
```
Plain checkout creates/updates a local branch tracking the PR. Add `-f` only if the local branch has diverged and needs to be reset to match the remote PR state — verify with `git status` first, don't reach for `-f` by default.

## Replying to a review comment thread

```
gh api repos/{owner}/{repo}/pulls/comments/<COMMENT_ID>/replies -f body="<reply text>"
```
`<COMMENT_ID>` is the `id` field from the `pulls/<PR#>/comments` listing above, not the PR number.

## Resolving a review comment thread

REST has no resolve endpoint — this is GraphQL-only, and needs the thread's GraphQL node ID (different from the REST comment ID above). Two steps:

1. Get thread IDs:
```
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            comments(first: 1) { nodes { path line body } }
          }
        }
      }
    }
  }' -f owner='{owner}' -f repo='{repo}' -F number=<PR#>
```

2. Resolve the thread once the matching fix has landed:
```
gh api graphql -f query='
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread { isResolved }
    }
  }' -f threadId="<THREAD_NODE_ID>"
```

## Creating the PR

```
gh pr create --title "<short title>" --body "<short body, no attribution>"
```
Write the title and body directly — don't use `--fill` or `--fill-verbose`, since those pull from commit messages/history and can drag in more than the short, attribution-free body this workflow wants. For a multi-line body, write it to a scratch file and pass `--body-file <path>` instead of fighting shell quoting.

## Pushing (plain git, not gh)

```
git push -u origin <branch>
```
Needed before `gh pr create` will succeed against a branch with no upstream yet.
