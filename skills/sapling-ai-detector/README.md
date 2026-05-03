# Sapling AI Detector

> Wrap Sapling's `aidetect` API to scan text for AI-generated content and produce a comprehensive sentence-by-sentence report.

## Overview

Sapling AI Detector is a thin, opinionated wrapper around Sapling's `/api/v1/aidetect` endpoint. It takes a piece of text (inline or from a file), calls the API, and produces a structured markdown report with a document-level verdict, per-sentence breakdown sorted by AI probability, a risk distribution table, and the full text of every flagged sentence. The skill pins the detector version by default (`20251027`) so scores stay reproducible across runs — a critical property if reports are stored as evidence or compared over time.

## Trigger Phrases

- `"check this for AI"`
- `"is this AI-generated"`
- `"scan this writing for AI"`
- `"detect AI in this text"`
- `"grade this writing for AI content"`
- `"run this through Sapling"`
- A file or passage provided alongside a question about authorship probability

## Description Field

```yaml
description: Use when the user wants to scan, analyze, or grade text for AI-generated content using the Sapling API and produce a sentence-by-sentence report. Triggers on phrases like "check this for AI", "is this AI-generated", "scan this writing for AI", "detect AI in this text", "grade this writing for AI content", "run this through Sapling", or when a file/passage is provided alongside a question about authorship or AI authorship probability. Produces a structured markdown report with overall score, per-sentence breakdown, flagged passages, and threshold-based verdict. Do NOT use for general writing feedback, grammar checking, or paraphrasing — only for AI-detection analysis.
```

## How It Works

1. **Identify the input** — Inline text via `--text`, a file path via `--file`, or piped stdin. For `.docx`/`.pdf`, extract to plain text first.
2. **Choose threshold and output** — Default threshold `0.7` flags high-confidence AI sentences; `0.9` for strict mode, `0.5` for sensitive scans. Pass `--output <path>` to save the report; otherwise it prints to stdout.
3. **Call the API** — `analyze.py` POSTs to `https://api.sapling.ai/api/v1/aidetect` with `sent_scores=true` and the pinned detector version. Validates the 200,000-char limit before sending.
4. **Generate the report** — Builds a markdown report with: source metadata, verdict (LIKELY HUMAN / MIXED / LIKELY AI), document metrics (overall score, char count, flagged count), risk distribution (low/moderate/high bands), per-sentence table sorted by score with visual bars, and flagged sentences in full text with document position.
5. **Present results** — Saved file: report path + 1-line verdict summary. Inline: full report returned in the conversation. Always includes the false-positive caveat.

## When to Use

- Grading writing assignments or submissions for AI-generated content
- Reviewing drafts before publication to flag AI-sounding passages
- Auditing user-generated content (reviews, comments) on a platform
- Comparing detection scores across different versions or detectors
- Building a reproducible record of detection results (with pinned version)

## When NOT to Use

- General writing feedback or grammar checking
- Paraphrasing or rewriting AI-detected content (out of scope by design)
- Detection-evasion / "humanizing" workflows
- Treating any single score as conclusive evidence — Sapling itself recommends against this

## Prerequisites

- `SAPLING_API_KEY` set in your shell environment (free tier key from https://sapling.ai/)
- Python 3.8+ (uses only the standard library — no `pip install` needed)

## Directory Structure

```
sapling-ai-detector/
├── SKILL.md
├── README.md
├── scripts/
│   └── analyze.py          # API call + report generator
├── references/
│   └── api-reference.md    # Full Sapling API spec (loaded on demand)
└── evals/
    └── evals.json          # Test cases for the skill-creator eval loop
```

## Report Format

Every report contains these sections in this order:

1. **Header** — source label, ISO timestamp, pinned detector version, threshold used
2. **Verdict** — `LIKELY HUMAN` / `MIXED / UNCERTAIN` / `LIKELY AI` with one-line interpretation
3. **Document metrics** — overall score, char/sentence counts, flagged count, highest/lowest scores, daily-quota usage
4. **Risk distribution** — count and percentage of sentences in low / moderate / high bands
5. **Per-sentence breakdown** — sorted descending by AI probability with visual score bars
6. **Flagged sentences (full text)** — every sentence at or above the threshold, in document order
7. **Notes** — score interpretation guide and false-positive caveat

## Usage Examples

```bash
# Inline text
python3 ~/.claude/skills/sapling-ai-detector/scripts/analyze.py \
  --text "Artificial intelligence has fundamentally transformed..."

# File with custom threshold and saved output
python3 ~/.claude/skills/sapling-ai-detector/scripts/analyze.py \
  --file ~/Documents/draft.txt \
  --threshold 0.9 \
  --output ~/Desktop/draft-ai-report.md

# Piped stdin
cat draft.md | python3 ~/.claude/skills/sapling-ai-detector/scripts/analyze.py
```

In Claude Code, just trigger the skill naturally: *"Grade `~/Documents/draft.txt` for AI content and save the report to `~/Desktop/report.md`"* — Claude will invoke `analyze.py` with the right flags.

## API Notes

- Free tier: 50,000 characters / 24 hours total
- Per-request limit: 200,000 characters
- Detector version: pinned to `20251027` for reproducibility (override with `--version`)
- Score range: `0.0` (confident human) to `1.0` (confident AI)
- See `references/api-reference.md` for the full request/response schema, error codes, and version history
