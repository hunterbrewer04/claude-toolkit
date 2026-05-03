---
name: sapling-ai-detector
description: Use when the user wants to scan, analyze, or grade text for AI-generated content using the Sapling API and produce a sentence-by-sentence report. Triggers on phrases like "check this for AI", "is this AI-generated", "scan this writing for AI", "detect AI in this text", "grade this writing for AI content", "run this through Sapling", or when a file/passage is provided alongside a question about authorship or AI authorship probability. Produces a structured markdown report with overall score, per-sentence breakdown, flagged passages, and threshold-based verdict. Do NOT use for general writing feedback, grammar checking, or paraphrasing — only for AI-detection analysis.
---

# Sapling AI Detector

Wraps Sapling's `aidetect` endpoint to produce a comprehensive report analyzing every sentence in a piece of text for AI-generated content.

## Prerequisites

Before running:

1. **API key** — must be set as `SAPLING_API_KEY` env var. If missing, tell the user: *"Set `SAPLING_API_KEY` in your shell (free key at https://sapling.ai/)."* and stop.
2. **Text source** — either inline text from the user or a file path. Files larger than 200,000 characters are rejected by the API; tell the user to split the file if needed.
3. **Optional flags** — threshold (default `0.7`), output path (default stdout), detector version (default `20251027`).

## Process

### 1. Identify the input

Determine what the user wants analyzed:

- **Inline text** — a passage in the conversation. Pass via `--text`.
- **File path** — a local `.txt`, `.md`, `.docx`, or similar. Pass via `--file`. For non-plaintext formats (`.docx`, `.pdf`), extract text first using a separate tool, then pass the extracted text via `--text`.
- **Multiple files / batch** — call the script once per file.

If the user provides both inline text and a file, ask which they meant — do not analyze both silently.

### 2. Choose threshold and output

Defaults are sensible. Override only if the user asks:

- **Threshold** — sentences scoring above this are "flagged AI". Default `0.7`. Use `0.9` if the user wants a strict "high-confidence only" filter; use `0.5` for a sensitive scan.
- **Output path** — if the user wants a saved file, pass `--output <path>`. Otherwise the report prints to stdout and is returned in the conversation.
- **Verdict labels** — the script auto-classifies the document as `LIKELY HUMAN` (<0.3), `MIXED / UNCERTAIN` (0.3–0.7), or `LIKELY AI` (>0.7) based on overall score.

### 3. Run the script

```bash
python3 ~/.claude/skills/sapling-ai-detector/scripts/analyze.py \
  --file <path> \
  [--threshold 0.7] \
  [--output <path>] \
  [--version 20251027]
```

Or for inline text:

```bash
python3 ~/.claude/skills/sapling-ai-detector/scripts/analyze.py \
  --text "the passage to analyze" \
  [--threshold 0.7]
```

The script handles: API call, response parsing, char-limit validation, error messages, report generation. It exits non-zero on failure with a human-readable message.

### 4. Present the result

If the report was saved to a file, tell the user the path and summarize the headline verdict + flagged sentence count in 1–2 sentences. If the report printed to stdout, return it in full in the conversation.

Always include a one-line caveat: *"AI detectors have false positives — a high score is a signal to review, not a verdict. Sapling itself recommends against using detection as a standalone check."*

## Report structure

The script produces this exact format:

```markdown
# AI Detection Report

**Source:** <file path or "inline text">
**Analyzed:** <ISO timestamp>
**Detector version:** <pinned version>
**Threshold:** <float>

## Verdict

**<LIKELY HUMAN | MIXED / UNCERTAIN | LIKELY AI>** — overall score `<0.00–1.00>`

<one-line interpretation>

## Document metrics

| Metric | Value |
|---|---|
| Overall AI probability | `0.74` |
| Total characters | 1,247 |
| Total sentences | 12 |
| Sentences above threshold | 4 (33%) |
| Highest sentence score | 0.98 |
| Lowest sentence score | 0.02 |
| Daily quota used | ~2.5% (1,247 / 50,000 chars) |

## Risk distribution

| Band | Count | % of doc |
|---|---|---|
| Low (0.00–0.30) | 6 | 50% |
| Moderate (0.30–0.70) | 2 | 17% |
| High (0.70–1.00) | 4 | 33% |

## Per-sentence breakdown

Sorted by AI probability, descending.

| Rank | Score | Bar | Sentence (preview) |
|---|---|---|---|
| 1 | 0.98 | `▓▓▓▓▓▓▓▓▓▓` | Artificial intelligence has fundamentally transformed... |
| 2 | 0.94 | `▓▓▓▓▓▓▓▓▓░` | The implications of large language models extend... |
| ...

## Flagged sentences (full text)

Sentences with score ≥ threshold, in document order.

### Sentence #2 — score 0.98
> Artificial intelligence has fundamentally transformed the landscape of modern computational paradigms.

### Sentence #5 — score 0.94
> The implications of large language models extend across virtually every industry.

## Notes

- Score range: 0.0 = confident human, 1.0 = confident AI.
- Sentence-level scores can disagree with the document score when AI text is concentrated in a few passages.
- Detector version pinned for reproducibility; rerunning with a newer version may produce different scores.
- AI detection has false positives and false negatives. Use as a signal, not a verdict.
```

## Reference

For the full Sapling API spec (all parameters, response schema, error codes), read `references/api-reference.md`.
