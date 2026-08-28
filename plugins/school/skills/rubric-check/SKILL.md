---
name: rubric-check
description: Runs a pre-submission review that grades draft work strictly against its assignment spec, using a fresh-context subagent with zero knowledge of the session that produced the work, so the verdict reflects only what's on disk versus what the spec asks. Produces a requirement-by-requirement table, a predicted score, an ordered fix list, and the exact files to turn in. Use when the user says things like "grade my assignment against the spec", "check my submission before i turn it in", "spawn a subagent and grade this explicitly off the assignment details", or "what files do i need to turn in", or asks to double-check work against a rubric before submitting. Do NOT use to grade someone else's work or to invent a rubric from scratch.
---

# Rubric Check

## Description

A pre-submission review. A subagent with no memory of how the work was produced reads the assignment spec and the draft artifacts cold, and grades strictly against what the spec asks, not against what the session believes it accomplished.

The isolation is the entire point. If the orchestrating session summarizes the work into the subagent's prompt, the grader inherits the session's blind spots and grades the summary instead of the artifacts. The subagent must read the spec and the files itself.

### When not to use

- Grading someone else's work. This skill assumes the artifacts on disk are the user's own submission.
- Generating a rubric from scratch. This skill grades against an existing spec; it does not invent grading criteria when the assignment has none.
- Early-draft brainstorming or writing coaching. This is a final check before turning something in, not iterative feedback during drafting.

## Prerequisites

- **A spec.** Usually `Assignment-N.md`, `Assignment-N-details.md`, `assignmentN.md`, an `Assignment8_Rubric.md`-style file, or a PDF, inside the assignment folder (commonly `~/Desktop/School/<Semester>/<Course>/assignments/assignmentN/`). A README works too if that's what the course uses.
- **Artifacts to grade.** Usually a `Submission/` folder, or the code/report files the user names directly.
- **No API keys or external services.** The grading subagent runs locally through the Agent tool.
- **Read-only.** This skill never runs git and never edits, moves, or deletes files. It only reads and reports.

## Process

### 1. Locate the spec and the artifacts

Find the spec file in the current assignment folder. Find the artifacts too: the `Submission/` folder contents, or the specific files the user points at.

If there is exactly one obvious spec file and one obvious set of artifacts, proceed without asking. If there are multiple candidate spec files (a rubric doc and a separate assignment doc, or several PDFs), or the artifact set is unclear (loose files scattered outside any `Submission/` folder, or several draft versions of the same file), list what you found and ask the user which to use before spawning the subagent. A wrong file list makes the whole review worthless, so this is the one point in the flow worth pausing for.

Read the spec file yourself at this stage, since you need its full text to paste into the subagent prompt in the next step. Do not read the artifact files yourself; leave that to the subagent.

### 2. Spawn the grading subagent

Use the Agent tool with `subagent_type: general-purpose`. Run it in the foreground (`run_in_background: false`) since you need its verdict before you can present anything. No worktree isolation is needed, since this is a read-only review, not a code change.

The subagent's prompt must contain ONLY three things:

1. The full spec text, pasted verbatim.
2. The list of artifact file paths for the subagent to read itself.
3. The grading instructions template below, verbatim.

Do not summarize, paraphrase, or characterize the work in the subagent's prompt. Do not tell the subagent what you think is good or missing. Do not mention the session's history with the work at all. The subagent reads the artifacts cold, and that is what makes its verdict trustworthy. If you catch yourself writing a sentence like "the student attempted X" or "note that Y still needs work," delete it; that belongs in the grader's output, not its input.

**Grading instructions template** (paste this block into the subagent prompt after the spec text and file list):

```
You are grading submitted work against an assignment spec. You have no knowledge of how this work was produced or any context beyond what is in this prompt. Judge only what is on disk against what the spec asks. This is a read-only review: do not modify any files, and do not run git.

## Grading instructions

1. Read every artifact file listed above in full before forming any judgment. Do not skim, do not sample.
2. Build a requirement-by-requirement table. Pull every explicit requirement out of the spec individually; do not collapse several distinct requirements into one vague row. Columns: Requirement | Status (Met / Partial / Missing) | Evidence (file:line, or "not found" if missing).
3. Flag anything the spec requires that is absent from the artifacts, even if it seems minor or easy to overlook.
4. If the spec assigns points, weights, or a rubric, predict a score using that weighting and show the arithmetic.
5. End the report with two lists:
   a. An exact, ordered fix list: the specific changes needed to close every Partial or Missing gap, ordered highest-value fix first (by rubric weight if the spec has one, otherwise by how central the requirement is to the assignment).
   b. The exact list of files to submit, quoting the spec's own submission instructions (naming convention, folder structure, format).

Grade as strictly as the spec is written. Do not soften the verdict to be encouraging, and do not credit effort or intent that isn't actually reflected in the artifacts.
```

### 3. Optional: parallel NotebookLM review

If the user asks for both a subagent grade and a NotebookLM read (or explicitly mentions NotebookLM), invoke the `notebooklm` skill with the same spec and artifacts, then present both verdicts side by side. This is a comparison the user does routinely, not a replacement for the subagent grade. Skip this step entirely if the user didn't ask for it; it's an addition, not a default part of the flow.

### 4. Present the result

Present the grader's requirement table verbatim, exactly as the subagent produced it. Follow it with the fix list and the submission file list, also verbatim. If a NotebookLM review ran in parallel, present its verdict directly after the subagent's, clearly labeled, so the user can compare them.

Do not soften, hedge, or rephrase the grader's verdict to make it more encouraging. The value of this skill is an unfiltered read against the spec, and passing it through a second layer of politeness defeats the purpose.

## Output

By the end of this skill, the user has, in the chat:

- The requirement-by-requirement table (Requirement | Status | Evidence), verbatim from the subagent.
- Any predicted score, with the arithmetic shown.
- An exact, ordered fix list.
- The exact list of files to turn in, per the spec's own submission instructions.
- If requested, a NotebookLM verdict presented alongside the subagent's for comparison.
