# Task brief format

The brief is the entire contract between the plan and a task agent. An agent that has to
discover, decide, or guess is an agent that runs long. Load this file before writing briefs.

## Template

```
TASK <ID> — <short title>                          Wave <N>

OWNS      <path>
          <path>
          Touching anything else is a Deviation. Record it and report up;
          do not silently expand scope.

CONTEXT   <pasted verbatim from: graphify query "<question>" --budget 800>
          <symbol>            <file> L<line>
          callers of <fn>:    <file> L<line>, <file> L<line>

DECIDED   <every decision this task needs, already made>
          <one line each, stated as fact, not as an option>

GAUNTLET  <the exact command line to run before claiming completion>

GBRAIN    slug: projects/<area>/<slug>/<task-id>
          first action:  put_page stub, Status: in-progress
          during:        add_timeline_entry at each milestone
          last action:   full build log, Status: complete
          ToolSearch "select:mcp__gbrain__put_page,mcp__gbrain__add_timeline_entry"

GRAPH     after editing: graphify update .
```

## The DECIDED block is the whole game

A task is ready when DECIDED contains every decision the work requires and the agent has none
left to make. If a decision cannot be resolved at plan time, it is its own task, sequenced
earlier, and the dependent task waits for it.

The failure mode this prevents is measurable. A build log listing eight entries under
"Decisions not in the brief" describes an agent that spent its time designing. That is the
single largest cause of slow agents, and it is a planning defect rather than an agent defect.

Write DECIDED as fact, not as permission:

- Good: `__Host- prefix, no exceptions. CSRF via Sec-Fetch-Site, not a token.`
- Bad: `Consider using the __Host- prefix. A token-based CSRF approach may also work.`

The second phrasing hands the decision back to the agent, which is exactly what the brief
exists to avoid.

## Sizing

| Ceiling | Value | On breach |
|---|---|---|
| files in OWNS | 6 | split the task |
| `graphify affected --depth 1` | ~50 nodes | split, or give it a wave to itself |
| open decisions | 0 | resolve, or split the decision into its own task |

The two numeric ceilings are starting points and are expected to move once production metrics
have data. The zero-open-decisions rule is not a starting point.

## CONTEXT is resolved once, not N times

Every symbol a task touches gets resolved at plan time and pasted in. The alternative is each
agent re-deriving the same map of the codebase, paying the same discovery cost in parallel,
which is pure duplicated work that also produces N slightly different mental models of the
same code.
