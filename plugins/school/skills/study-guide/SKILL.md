---
name: study-guide
description: Turns lecture PDFs into a single self-contained interactive HTML study package (click-through lessons, quick-checks, a graded practice quiz, and flashcards) plus a study index and per-lecture walkthroughs, with the same look and behavior every time. Use when the user wants to study for an exam from their lecture material and asks for something like "make me a study guide for exam 4", "build an interactive html page that teaches module 6", "turn these lecture PDFs into a study site", or "make it like the one we did for exam 3". The content is model authored (worked examples, practice problems, plain direct prose); the layout and interactions are fixed by a template so output is consistent across modules.
---

# Study guide builder

## Description

Build the interactive study package Hunter converged on for CSCI-4610: one
self-contained HTML file with a sidebar of lecture views, collapsible topic
cards, reveal-answer quick checks, a filterable multiple-choice quiz with
instant grading, and flip-and-track flashcards. Progress saves to localStorage.
It ships alongside a study index and one walkthrough per lecture.

You supply the judgment: read the lectures, write the teaching content and quiz
questions as JSON. `scripts/build_guide.py` handles layout and assembly so every
guide looks and behaves identically. Do not hand-write HTML.

## Prerequisites

- `pandoc` (renders lesson markdown, including syntax-highlighted code). Check with `pandoc --version`.
- `python3` (standard library only).
- The lecture source material (PDFs, slides, or notes) for the module in scope.
- Read `references/schemas.md` before writing any JSON. It defines the config, lesson, and quiz shapes and what each field controls. A complete one-lecture set is in `references/` (the `example-*.json` files).

## Process

### 1. Read the lectures
Read every lecture PDF or deck in the exam's scope. Note the section structure,
the code examples, the definitions, and what the instructor stresses. One
"lecture" maps to one view in the guide.

### 2. Write the content as JSON
For each lecture write a lesson JSON file; write one quiz JSON file per lecture;
write one config JSON for the module. Follow `references/schemas.md` exactly.
Copy the `references/example-*.json` files as a starting point.

Per lecture, follow the section arc from the originals: an intro, then numbered
topic sections, then a "Most exam-likely points" (`kind: exam`) and a "Key terms
glossary" (`kind: gloss`). Each numbered topic should move through: what the
slides show, what it actually means, why it matters for the exam, common
pitfalls, and a quick check.

Quality bar (this is the whole point of the skill):
- **Worked examples.** Show real code or a real calculation, then explain it line by line. Use fenced code blocks so they render highlighted with copy buttons.
- **Practice problems with answers and explanations.** Every quiz question needs a correct `answer` index and a plain `explain`. Every quick check needs a real answer.
- **Plain, direct prose in Hunter's register.** Short sentences. Explain the idea like you are talking to a smart friend the night before the exam. Analogies are good. No textbook throat-clearing, no filler, no marketing tone.
- **Cover what the exam tests.** Pull the definitions, formulas, and distinctions the instructor emphasized. When a fact is exam-critical, say so.
- Write lesson `body` content in full. It is reused verbatim in the emitted walkthroughs, so do not abbreviate.

### 3. Build
Run the builder from anywhere:

```
python3 <skill>/scripts/build_guide.py path/to/study_config.json
```

It writes, into the config's `output_dir`:
- `<basename>_Study_Guide.html` (the interactive guide)
- `<basename>_STUDY_INDEX.md` (the study map, also rendered as the overview)
- `<basename>-N_<...>_Walkthrough.md` for each lecture that sets `walkthrough`
- `index.html` symlink to the guide (so serving the folder opens it)

Pass `--no-walkthroughs` to skip the walkthrough files. The build is
deterministic: same inputs produce byte-identical output.

### 4. Verify the walkthroughs
The walkthroughs are generated from your lesson JSON, so they stay in sync with
the HTML. Open one and confirm it reads as a standalone document following the
exam3 structure (H1, course/instructor header, table of contents, sections,
quick checks). Fix content in the lesson JSON and rebuild if anything is thin.

### 5. Drop everything in the exam folder
Place all inputs and outputs in the module's exam folder, for example
`~/Desktop/School/<Semester>/<Course>/Exams/exam<N>/`. Keep the JSON inputs next
to the outputs so the guide can be rebuilt later.

### 6. Offer to serve it for phone reading
Ask if Hunter wants to read it on his phone. If yes, serve the folder over the
tailnet and give him the URL:

```
~/.claude/skills/tailnet/scripts/serve.sh <exam-folder>
```

The `index.html` symlink means the folder root loads the guide. Shut the server
down when done: `~/.claude/skills/tailnet/scripts/stop.sh`.

## Output

Report the files written and the quiz/flashcard/word counts (the builder prints
them). If serving, give the tailnet URL. The HTML is fully self-contained: no
CDN or network dependencies, fonts are system stacks, and all CSS, JS, and quiz
data are inlined, so it works offline and over the tailnet.

## Notes

- The template shell (`templates/shell.html`) holds all CSS and JS. Do not edit it per module; every module reuses it so the look stays identical. Change it only to evolve the design for all future guides.
- Keep `storage_key` unique per module so progress does not collide between guides opened in the same browser.
- To add or reorder lectures, edit the `lectures` list in the config; view numbering, keyboard shortcuts, and the index table follow automatically.
