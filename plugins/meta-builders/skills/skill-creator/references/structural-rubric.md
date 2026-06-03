# Structural Grading Rubric for SKILL.md files

Reference for the structural grader. Evaluates whether a SKILL.md follows Anthropic's documented skill-authoring best practices. Each category gets a letter grade (A/B/C/D/F) with justification.

## Category 1 — Naming

| Rule | Pass criteria |
|---|---|
| Format | kebab-case (lowercase + digits + hyphens only, no spaces/underscores/capitals) |
| Length | ≤ 64 characters |
| Reserved prefixes | Must not start with `claude` or `anthropic` |
| Folder match | `name` in frontmatter must equal the containing folder name |

## Category 2 — Description

| Rule | Pass criteria |
|---|---|
| Perspective | Third-person only ("Processes..." not "I can process..." or "Process..." as imperative) |
| Content | Must include BOTH what the skill does AND when to use it |
| Length | ≤ 1024 characters |
| XML | No `<` or `>` tags (injection prevention) |
| Natural phrasing | Includes specific user phrases, file types, domains |
| Trigger clause | "USE WHEN" phrasing or equivalent explicit trigger guidance |
| Negative triggers | If overlap risk exists with other skills, includes "Do NOT use for..." |
| Combined length | `description` + `when_to_use` front-loads triggers in first 1,536 chars (hard truncation point) |

## Category 3 — Body length

| Rule | Target |
|---|---|
| Hard target | ≤ 500 lines |
| Degradation threshold | ≤ 5,000 words |
| Level 2 token budget | ≤ 5,000 tokens of procedural guidance |

## Category 4 — Structure

| Rule | Pass criteria |
|---|---|
| Four-part body | Description → Prerequisites → Process → Output |
| Critical-rule headers | `## Important` or `## Critical` headers on key rules |
| Imperative voice | Process steps use imperative verbs (`Extract`, `Run`, `Generate`), not explanatory paragraphs |
| Top-loaded | Critical instructions appear at the top of the body |
| No mixed voice | Steps don't mix execution with lengthy rationale paragraphs |

## Category 5 — Progressive disclosure

| Rule | Pass criteria |
|---|---|
| No knowledge dump | Background/guide/quirks content is in `references/`, not SKILL.md body |
| Explicit loading | Every reference file is loaded via a named step with file path + purpose |
| Nesting | Only one level below SKILL.md (no A → B → C navigation) |
| Path separators | Forward slashes only |
| Edge cases | Edge-case handling in `references/`, not inline |

## Category 6 — Script vs prose

| Rule | Pass criteria |
|---|---|
| Determinism check | Mechanical tasks (where 10 LLMs would produce identical output) are implemented as scripts in `scripts/`, not prose |
| Error handling | Scripts handle their own errors (return meaningful pass/fail), not deferred to Claude |
| Script calls | SKILL.md invokes scripts with exact commands, not pseudocode |

## Category 7 — Optional frontmatter

| Rule | Pass criteria |
|---|---|
| `allowed-tools` | Present and scoped to what's strictly needed (not blank if the skill uses specific tools) |
| `user-invocable` | Explicit `false` if the skill is background knowledge, otherwise OK to omit (default `true`) |
| `disable-model-invocation` | Explicit `true` for side-effect workflows (deploys, publishes); otherwise OK to omit |
| `when_to_use` | Considered if trigger phrasing would benefit from a separate field |

## Category 8 — Anti-patterns (from reference §7)

Flag if any of these are present:

| Symptom | Anti-pattern |
|---|---|
| Description too vague ("Helps with projects") | Broad description — won't trigger |
| Description lacks technical keywords | Under-triggering |
| Description too broad ("Processes documents") | Over-triggering |
| First-person description ("I can process...") | POV mismatch |
| Skill tries to set global agent behavior | Global override (wrong scope) |
| Multiple open options presented ("use X, or Y, or Z...") | No default path |
| Mechanical validation left to prose | Missing determinism |
| SKILL.md over 500 lines with mixed content | Monolithic mega-skill |
| Background info inline instead of references/ | Knowledge dump |
| Rationale paragraphs buried in process steps | Mixed execution + explanation |
| Reference files exist but aren't explicitly loaded | Dead references |
| Nested references (A → B → C) | Over-nested navigation |
| Chatty tone ("Cool? Cool.", jokes, asides) | Conversational bloat |
| `ALWAYS`/`NEVER` caps without reasoning | Rigid rules without theory of mind |

## Grade conversion

| Pass count in category | Grade |
|---|---|
| All pass criteria met | A |
| 1 minor violation | B |
| 1 major or 2 minor violations | C |
| 2 major or 3+ violations | D |
| 3+ major violations | F |

## Output format

The grader should produce:

1. Per-category: letter grade + 1–2 sentence justification with direct quotes from the target SKILL.md
2. Overall grade (average weighted toward category 4 Structure and category 8 Anti-patterns)
3. Top 3 weaknesses with actionable fixes
4. Top 3 strengths
