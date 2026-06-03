# Communication Guide

Reference for calibrating technical vocabulary to the user's familiarity level. Load this file when the user's technical background is unclear.

## Context

Skill creators serve users across a wide range of coding/tooling familiarity — from long-time developers to first-time CLI users who have only recently opened a terminal.

## Vocabulary guidance

| Term | Default handling |
|---|---|
| "evaluation", "benchmark" | Usable without explanation in most cases |
| "JSON", "assertion" | Explain briefly unless the user demonstrates familiarity |
| "subagent", "stdout" | Explain briefly unless the user demonstrates familiarity |
| "YAML frontmatter" | Explain on first use |
| "eval harness", "pass rate" | Explain briefly |

## Pattern for term introduction

On first use, attach a short parenthetical definition:

- Good: "I'll run the evals (test cases with expected outputs) now..."
- Good: "We'll add assertions (pass/fail checks) in the next step."
- Bad: "Running the evals with the assertions defined in evals.json."

## When in doubt

Briefly clarify. A one-line definition is cheaper than a confused user.
