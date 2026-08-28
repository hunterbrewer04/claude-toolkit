# graphify cookbook

`graphify` builds a code graph so agents traverse instead of grepping. Binary at
`~/.local/bin/graphify`. A repo has one when `graphify-out/graph.json` exists.

Load this file before running any graphify command.

## Check first

```bash
test -f graphify-out/graph.json && echo present || echo absent
```

Absent: say so once, offer `graphify update .`, and proceed without it. graphify is an
accelerator. Treating it as a hard dependency would make the chain unusable in any repo that
has not been indexed, which is most of them on first contact.

## Per phase

| Phase | Command | Purpose |
|---|---|---|
| spec | `graphify god-nodes --top 15` | architectural hubs -- where the weight already is |
| spec | `graphify explain "<symbol>"` | plain-language summary of a node and its neighbors |
| plan | `graphify affected "<symbol>" --depth 1` | blast radius; becomes the task's OWNS list |
| plan | `graphify affected "<symbol>" --depth 2` | wider set; used for wave conflict detection |
| plan | `graphify query "<question>" --budget 800` | resolved symbols to paste into a brief |
| plan | `graphify path "<A>" "<B>"` | how two subsystems actually connect |
| implement | `graphify update .` | re-extract after editing. No LLM, safe to run often |
| review | `graphify affected "<changed symbol>"` | impact outside the union of OWNS lists |

## Budgets

`query` truncates to `--budget` tokens and says how many nodes it cut. A query returning 200+
nodes at depth 2 is a signal in itself: the symbol is central, and any task touching it is a
task that should run alone.

Narrow with `--context <relation>` rather than raising the budget indefinitely. A brief with
800 tokens of precise context beats one with 4000 tokens of everything.

## Wave conflict detection

Two tasks may share a wave only when their depth-1 affected sets are disjoint.

```bash
graphify affected "CreateSession" --depth 1 --graph graphify-out/graph.json
graphify affected "requireSameOrigin" --depth 1 --graph graphify-out/graph.json
# intersect the node lists; any overlap means these two cannot run together
```

Comparing file lists instead is the common mistake and it misses the case that actually bites:
two tasks editing different files that a third file depends on. git will merge those cleanly
and the result will still be wrong.

## Parallel worktrees

Each slot works in its own worktree and each runs `graphify update .`, so `graph.json` diverges
across slots. Install the union merge driver once per repo so the wave merge resolves it
instead of conflicting:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/setup-merge-driver.sh"
```

That registers `graphify merge-driver` as a git merge driver and adds
`graphify-out/graph.json merge=graphify` to `.gitattributes`. It is idempotent, preserves any
existing `.gitattributes` content, and exits quietly in repos with no graph.

`dev-flow:implement` runs it before creating the first worktree. Run it by hand in any repo
where you plan to work on graph.json across branches. Without it, every wave merge hits a
multi-megabyte JSON conflict that nobody can usefully resolve by hand.
