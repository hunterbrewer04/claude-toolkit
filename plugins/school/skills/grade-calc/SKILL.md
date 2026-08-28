---
name: grade-calc
description: Computes exact current grades, "what if I get X on Y" scenarios, and target scores needed for a letter grade, from a course's syllabus weights and a grades file. All arithmetic runs through a bundled script, never estimated by the model. Use for setting up grade tracking for a course, or for questions like "what do i need on the final to pass with a C-", "if i get a 70 on quiz 10 whats my grade", "what's my grade in 4610 right now", or "set up grade tracking for 4610".
---

# Grade Calc

Grade math from syllabus weights: current grade, what-if scenarios, and target scores. Every number in this skill's output comes from `scripts/calc.py` -- never do the arithmetic yourself, even for something that looks simple like a single weighted average. Hunter has caught fabricated numbers from model math before; the whole point of this skill is that the numbers are exact.

## Prerequisites

- A course's grades file at `<course>/Grades/grades.json`. If it doesn't exist yet, run Mode 1 (setup) first.
- A registry at `~/Desktop/School/school.json` mapping course name to its grades file. May not exist yet -- Mode 1 creates or updates it.
- Python 3, stdlib only. `pyyaml` is not installed on this machine (checked directly) -- JSON is the canonical format for grades files. Do not introduce YAML.

## Data format

`grades.json`:

```json
{
  "course": "4610",
  "cutoffs": {"A": 93, "A-": 90, "B+": 87, "B": 83, "F": 0},
  "categories": [
    {
      "name": "Quizzes",
      "weight": 0.2,
      "drop_lowest": 1,
      "items": [
        {"name": "Quiz 1", "earned": 8, "possible": 10},
        {"name": "Quiz 10", "earned": null, "possible": 10}
      ]
    }
  ]
}
```

Rules the script enforces (fails clearly if violated):
- `categories[].weight` must sum to `1.0` across the file.
- `drop_lowest` must leave at least one item in its category.
- Item `name` must be unique across the *whole file*, not just within a category -- `--set` and `--item` target items by name, so collisions would be ambiguous.
- `earned: null` means pending (not yet graded). Any other value is treated as a real score, in the same units as `possible` (points, not percentage).

Category percentage = mean of item percentages after dropping the lowest `drop_lowest` items (by percentage, evaluated after any overlay). This means items are weighted equally within a category regardless of point totals -- if a syllabus instead weights items by points within a category, flag that to Hunter before writing the file, since the script doesn't model it.

## Process

### Mode 1: setup a course

1. Find the course folder (`~/Desktop/School/<Semester>/<Course>/` per the machine map). Locate the syllabus (usually in a `Syllabus/` or `Syllabus & Info/` folder) and any grades export from the LMS.
2. Read the syllabus and pull out: grading categories and their weights, drop-lowest rules per category, and letter cutoffs. Read the grades export (if one exists) for earned/possible per item. This extraction is model work -- read the actual documents, don't guess at structure.
3. Assemble the `grades.json` object matching the schema above. Items not yet graded (future quizzes, the final, etc.) get `"earned": null`.
4. Show Hunter the parsed structure -- weights, drop rules, cutoffs, and the item list -- before writing anything, and ask him to confirm or correct it. A misread syllabus poisons every calculation that follows, so this check matters more than speed here.
5. Once confirmed, write the file to `<course>/Grades/grades.json`, creating the `Grades/` directory if it doesn't exist.
6. Update `~/Desktop/School/school.json`: a JSON object keyed by course name, e.g. `{"4610": {"grades_file": "~/Desktop/School/Summer 26/4610/Grades/grades.json"}}`. If the registry file doesn't exist, create it with just this course's entry. If it exists, merge this course's entry in without touching any other course's entry.
7. Run `python3 scripts/calc.py current --file <path>` once and show Hunter the result. This doubles as validation -- if the weights or schema are wrong, the script will say so here rather than silently producing a bad answer later.

### Mode 2: scenario query ("if I get a 70 on quiz 10, what's my grade")

1. Resolve the course and its `grades_file` path. If more than one course could match, check `school.json` for the mapping rather than guessing; ask if still ambiguous.
2. Match the phrase to an exact item `name` in the file. If the wording doesn't map cleanly (e.g. "the final" vs. an item literally named "Final Exam"), confirm rather than assume.
3. Run:
   ```bash
   python3 scripts/calc.py current --file <path> --set "Quiz 10=7"
   ```
   The `--set` value is raw points earned, on the same scale as that item's `possible` -- not a percentage. If the user says "a 70" and the item is out of 100, that's `70`; if it's out of 10, ask which scale they mean before assuming.
4. For multiple simultaneous hypotheticals, repeat `--set`:
   ```bash
   python3 scripts/calc.py current --file <path> --set "Quiz 10=8" --set "Final=90"
   ```
5. Relay the script's output. Don't re-derive or re-round any number it prints.

### Mode 3: targets ("what do I need on the final for a C-")

1. Resolve the course and file as in Mode 2.
2. For a single cutoff and a single named pending item:
   ```bash
   python3 scripts/calc.py targets --file <path> --cutoff C- --item Final
   ```
   `--cutoff` accepts a letter from the file's `cutoffs` (case-insensitive) or a raw percentage.
3. For the full picture -- every cutoff, every solvable pending item, plus the "if everything left is scored the same" uniform case -- run with no `--cutoff`/`--item`:
   ```bash
   python3 scripts/calc.py targets --file <path>
   ```
4. If the requested item's category has more than one pending item, the script refuses the single-item solve (the question isn't well-formed until the others are decided) and tells you which items are still open. Lock them in with `--set` and re-run, or fall back to the uniform row in the full table.
5. If a target would require more than 100% on the remaining work, the script reports it as not possible and gives the max achievable grade instead of inventing a number over 100.

## Output

Print the script's table or line output as-is -- it's already aligned plain text. Add at most one short sentence of interpretation (e.g. which letter that corresponds to, or what to do next). Never restate a figure from the script with different rounding or precision than it printed.
