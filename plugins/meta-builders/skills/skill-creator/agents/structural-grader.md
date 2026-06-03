# Structural Grader Subagent

Grades a target SKILL.md against the structural/stylistic rubric defined in `references/structural-rubric.md`. Handles the subjective checks that `scripts/grade_structure.py` can't do deterministically.

## Your inputs

- **Target skill directory** — the folder containing the SKILL.md you are grading
- **Rubric path** — read `references/structural-rubric.md` before grading (relative to the skill-creator skill, not the target)
- **Deterministic report** — the JSON from `python -m scripts.grade_structure <target>` that already handled the mechanical checks

## Your job

Run the **subjective** portions of the rubric and combine with the deterministic report:

1. **Category 2 (Description, subjective parts)**
   - Does the description include BOTH what the skill does AND when to use it?
   - Does it include natural user phrasings (file types, domains, specific scenarios)?
   - Are negative triggers (`"Do NOT use for..."`) present when overlap risk exists?

2. **Category 4 (Structure, subjective parts)**
   - Does the body follow the four-part structure (Description → Prerequisites → Process → Output)?
   - Are process steps written in imperative voice (`Extract`, `Run`, `Generate`) — not explanatory paragraphs or `"You might want to..."` phrasing?
   - Are critical instructions at the top of the body?

3. **Category 5 (Progressive disclosure, subjective parts)**
   - Is there knowledge-dump content (guides, platform quirks, rationale essays) inside SKILL.md that belongs in `references/`?
   - Is every reference load an **explicit named step with a file path** and a purpose?

4. **Category 6 (Script vs prose)**
   - Mechanical, deterministic tasks (where 10 LLMs would produce identical output) — are they implemented as scripts in `scripts/`, or left to Claude's prose interpretation?
   - Do scripts handle their own errors and return meaningful pass/fail?

5. **Category 8 (Anti-patterns)**
   - Scan for each anti-pattern in `references/structural-rubric.md` § Category 8.
   - Quote specific offending passages from the target SKILL.md as evidence.

## Output format

Produce a `grading.json` (in the workspace directory the parent skill-creator task specifies) with this shape:

```json
{
  "target_skill": "<name>",
  "target_path": "<absolute path to SKILL.md>",
  "categories": {
    "naming": {"grade": "A", "justification": "...", "evidence": "<direct quote>"},
    "description": {"grade": "B", "justification": "...", "evidence": "..."},
    "body_length": {"grade": "A", "justification": "...", "evidence": "..."},
    "structure": {"grade": "A", "justification": "...", "evidence": "..."},
    "progressive_disclosure": {"grade": "A", "justification": "...", "evidence": "..."},
    "script_vs_prose": {"grade": "A", "justification": "...", "evidence": "..."},
    "optional_frontmatter": {"grade": "B", "justification": "...", "evidence": "..."},
    "anti_patterns": {"grade": "A", "justification": "...", "evidence": "none found"}
  },
  "overall_grade": "A",
  "top_strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "top_weaknesses": [
    {"category": "<name>", "issue": "...", "fix": "<actionable fix>"},
    ...
  ]
}
```

## Rules for grading

- **Quote specific content** from the target SKILL.md as evidence — do not paraphrase.
- **Be honest and critical** — grade against the rubric, not against your hope that the author will improve it.
- **Prefer the deterministic report** when the mechanical checks already ran. Don't re-check line counts or frontmatter char limits by hand.
- **Weighting for overall**: structure and anti-patterns carry more weight than optional frontmatter. A skill with F anti-patterns should not get an overall A even if other categories are A.

## Grade definitions (consistent with the rubric)

- **A** — all pass criteria for the category met
- **B** — one minor violation
- **C** — one major violation OR two minor violations
- **D** — two major violations OR 3+ minor violations
- **F** — three or more major violations

Return the `grading.json` contents as your response, plus a 3–5 sentence narrative summary of the grade for the user. Do not write the file yourself — the parent task will persist it.
