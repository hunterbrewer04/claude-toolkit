#!/usr/bin/env python3
"""Call Sapling's aidetect endpoint and produce a markdown analysis report."""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

API_URL = "https://api.sapling.ai/api/v1/aidetect"
MAX_CHARS = 200_000
DAILY_FREE_QUOTA = 50_000
DEFAULT_VERSION = "20251027"
DEFAULT_THRESHOLD = 0.7
# Sapling AI Detector entry tier (0–10M chars/month). Update if usage crosses 10M.
RATE_USD_PER_1K_CHARS = 0.005


def call_api(text: str, key: str, version: str) -> dict:
    payload = json.dumps({
        "key": key,
        "text": text,
        "sent_scores": True,
        "version": version,
    }).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Sapling API error {e.code}: {body}")
    except urllib.error.URLError as e:
        raise SystemExit(f"Network error contacting Sapling: {e.reason}")


def verdict(score: float) -> tuple[str, str]:
    if score < 0.30:
        return "LIKELY HUMAN", "Low overall AI probability across the document."
    if score < 0.70:
        return "MIXED / UNCERTAIN", "Document shows mixed signals — review flagged sentences before concluding."
    return "LIKELY AI", "High overall AI probability — most or all of the document reads as AI-generated."


def bar(score: float, width: int = 10) -> str:
    filled = round(score * width)
    return "`" + ("▓" * filled) + ("░" * (width - filled)) + "`"


def preview(sentence: str, max_len: int = 80) -> str:
    s = sentence.strip().replace("\n", " ")
    return s if len(s) <= max_len else s[: max_len - 1] + "…"


def build_report(
    response: dict,
    source_label: str,
    threshold: float,
    version: str,
) -> str:
    overall = float(response.get("score", 0.0))
    sentences = response.get("sentence_scores", []) or []
    text = response.get("text", "")
    char_count = len(text)
    sent_count = len(sentences)

    flagged = [
        (i + 1, float(s["score"]), s["sentence"])
        for i, s in enumerate(sentences)
        if float(s["score"]) >= threshold
    ]
    low = sum(1 for s in sentences if float(s["score"]) < 0.30)
    mod = sum(1 for s in sentences if 0.30 <= float(s["score"]) < 0.70)
    high = sum(1 for s in sentences if float(s["score"]) >= 0.70)

    pct = lambda n: f"{(n / sent_count * 100):.0f}%" if sent_count else "0%"

    label, interpretation = verdict(overall)
    quota_pct = (char_count / DAILY_FREE_QUOTA) * 100
    cost_usd = (char_count / 1000) * RATE_USD_PER_1K_CHARS
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")

    ranked = sorted(
        [(i + 1, float(s["score"]), s["sentence"]) for i, s in enumerate(sentences)],
        key=lambda r: r[1],
        reverse=True,
    )

    if sentences:
        scores = [float(s["score"]) for s in sentences]
        highest = max(scores)
        lowest = min(scores)
    else:
        highest = lowest = 0.0

    lines = []
    lines.append("# AI Detection Report\n")
    lines.append(f"**Source:** {source_label}  ")
    lines.append(f"**Analyzed:** {timestamp}  ")
    lines.append(f"**Detector version:** `{version}`  ")
    lines.append(f"**Threshold:** `{threshold}`\n")

    lines.append("## Verdict\n")
    lines.append(f"**{label}** — overall score `{overall:.2f}`\n")
    lines.append(f"{interpretation}\n")

    lines.append("## Document metrics\n")
    lines.append("| Metric | Value |")
    lines.append("|---|---|")
    lines.append(f"| Overall AI probability | `{overall:.2f}` |")
    lines.append(f"| Total characters | {char_count:,} |")
    lines.append(f"| Total sentences | {sent_count} |")
    lines.append(
        f"| Sentences above threshold ({threshold}) | {len(flagged)} ({pct(len(flagged))}) |"
    )
    lines.append(f"| Highest sentence score | `{highest:.2f}` |")
    lines.append(f"| Lowest sentence score | `{lowest:.2f}` |")
    lines.append(
        f"| Daily quota used (free tier) | ~{quota_pct:.1f}% ({char_count:,} / {DAILY_FREE_QUOTA:,} chars) |"
    )
    lines.append(
        f"| Cost (this scan) | **${cost_usd:.4f}** ({char_count:,} chars × ${RATE_USD_PER_1K_CHARS:.4f}/1K) |\n"
    )

    lines.append("## Risk distribution\n")
    lines.append("| Band | Count | % of doc |")
    lines.append("|---|---|---|")
    lines.append(f"| Low (0.00–0.30) | {low} | {pct(low)} |")
    lines.append(f"| Moderate (0.30–0.70) | {mod} | {pct(mod)} |")
    lines.append(f"| High (0.70–1.00) | {high} | {pct(high)} |\n")

    lines.append("## Per-sentence breakdown\n")
    lines.append("Sorted by AI probability, descending.\n")
    lines.append("| Rank | Doc # | Score | Bar | Sentence (preview) |")
    lines.append("|---|---|---|---|---|")
    for rank, (doc_idx, score, sent) in enumerate(ranked, start=1):
        lines.append(
            f"| {rank} | {doc_idx} | `{score:.2f}` | {bar(score)} | {preview(sent)} |"
        )
    lines.append("")

    lines.append("## Flagged sentences (full text)\n")
    if not flagged:
        lines.append(f"_No sentences scored at or above the threshold ({threshold})._\n")
    else:
        for doc_idx, score, sent in flagged:
            lines.append(f"### Sentence #{doc_idx} — score `{score:.2f}`")
            lines.append(f"> {sent.strip()}\n")

    lines.append("## Notes\n")
    lines.append("- Score range: `0.0` = confident human, `1.0` = confident AI.")
    lines.append(
        "- Sentence-level scores can diverge from the document score when AI text is concentrated in a few passages."
    )
    lines.append(
        f"- Detector version pinned (`{version}`) for reproducibility; rerunning with a newer version may produce different scores."
    )
    lines.append(
        "- AI detection has false positives and false negatives. Use as a signal, not a verdict."
    )

    return "\n".join(lines) + "\n"


def load_text(args) -> tuple[str, str]:
    if args.text and args.file:
        raise SystemExit("Pass either --text or --file, not both.")
    if args.text:
        return args.text, "inline text"
    if args.file:
        path = os.path.expanduser(args.file)
        if not os.path.isfile(path):
            raise SystemExit(f"File not found: {path}")
        with open(path, "r", encoding="utf-8") as f:
            return f.read(), path
    if not sys.stdin.isatty():
        return sys.stdin.read(), "stdin"
    raise SystemExit("Provide text via --text, --file, or stdin.")


def main():
    parser = argparse.ArgumentParser(
        description="Analyze text for AI-generated content using Sapling's aidetect API."
    )
    parser.add_argument("--text", help="Inline text to analyze.")
    parser.add_argument("--file", help="Path to a UTF-8 text file to analyze.")
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"Sentence-level threshold for flagging (default {DEFAULT_THRESHOLD}).",
    )
    parser.add_argument(
        "--version",
        default=DEFAULT_VERSION,
        help=f"Sapling detector version (default {DEFAULT_VERSION}).",
    )
    parser.add_argument(
        "--output",
        help="Write report to this path. If omitted, prints to stdout.",
    )
    args = parser.parse_args()

    key = os.environ.get("SAPLING_API_KEY")
    if not key:
        raise SystemExit(
            "SAPLING_API_KEY not set. Get a free key at https://sapling.ai/ and "
            "export SAPLING_API_KEY=<your-key>."
        )

    text, source_label = load_text(args)
    text = text.strip()
    if not text:
        raise SystemExit("Input text is empty.")
    if len(text) > MAX_CHARS:
        raise SystemExit(
            f"Text is {len(text):,} chars; Sapling's limit is {MAX_CHARS:,}. Split the input."
        )

    response = call_api(text, key, args.version)
    report = build_report(response, source_label, args.threshold, args.version)

    if args.output:
        out_path = os.path.expanduser(args.output)
        os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"Report written to {out_path}")
    else:
        sys.stdout.write(report)


if __name__ == "__main__":
    main()
