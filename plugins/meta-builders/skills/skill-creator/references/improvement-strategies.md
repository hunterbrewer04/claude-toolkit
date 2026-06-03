# Skill Improvement Strategies

Reference for the "Improve" step of the iteration loop. Load this file after reading user feedback, before rewriting a skill.

## Four strategies for generalizing from feedback

### 1. Generalize, don't patch

The skill will run across many different prompts — possibly millions of invocations. The iteration loop uses a small set of test cases because they're fast to review, but **the skill must work beyond those cases.**

- Avoid fiddly, overfit changes targeted at one test case.
- Avoid increasingly rigid MUSTs that paper over a root cause.
- When stuck on a specific failure, step back and try a different metaphor or working pattern. It's cheap to try a new framing.

### 2. Keep the prompt lean

Read the transcripts, not just the final outputs. If the skill is making Claude waste time on unproductive work, remove the instructions causing that behavior.

- Remove anything not pulling its weight.
- Longer skills don't mean better skills — they often mean more attention fragmentation.

### 3. Explain the why

Today's LLMs have strong theory of mind. They generalize better when given reasoning, worse when given rigid rules without context.

- If the feedback is terse or frustrated, try to understand the underlying concern, not just the surface complaint.
- Writing `ALWAYS` or `NEVER` in caps is a yellow flag — reframe and explain the reasoning behind the rule instead.
- Humane instructions produce better outputs than authoritarian ones.

### 4. Spot repeated work across test cases

Read the transcripts from test runs. If multiple subagents independently wrote similar helper scripts or took the same multi-step approach, that's a signal the skill should bundle that work.

- If all three test cases wrote a `create_docx.py` → move it to `scripts/`, tell the skill to use it.
- Every bundled script saves every future invocation from reinventing the wheel.

## When to stop iterating

Stop when any of these is true:

- The user says they're happy
- The feedback is all empty (everything looks good)
- No meaningful progress between iterations

Don't keep iterating out of obligation. Diminishing returns are a signal.

## When pass rate plateaus

A stuck pass rate usually points to one of three causes:

1. **Contradictory test cases** — the prompt literally can't satisfy two cases at once
2. **Model ceiling** — the behavior is poorly handled by the underlying model regardless of prompt
3. **Assertion ceiling** — the skill is at the top of what binary assertions can measure; subjective quality is already saturated

Diagnose which one applies before attempting more iterations.
