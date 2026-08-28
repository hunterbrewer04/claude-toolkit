#!/usr/bin/env python3
"""Assemble a self-contained interactive HTML study guide from a config JSON.

Generalized from the hand-built exam3/exam4 CSCI-4610 study packages. Given a
config that names the module and points at per-lecture lesson-content JSON and
quiz JSON files, this emits, deterministically:

    <basename>_Study_Guide.html   the interactive single-file study console
    <basename>_STUDY_INDEX.md      the study map (also rendered as the overview)
    <basename>-N_<...>_Walkthrough.md   one per lecture (unless --no-walkthroughs)
    index.html                     symlink -> the study guide, for `serve`

The output HTML has zero external network references: fonts are system stacks,
all CSS/JS is inlined from templates/shell.html, and quiz data is embedded.

Schemas are documented in ../references/schemas.md. Requires pandoc + python3.

Usage:
    build_guide.py path/to/study_config.json [--no-walkthroughs] [-v]
"""
import argparse
import html as _html
import json
import pathlib
import random
import re
import subprocess
import sys

TEMPLATE_PATH = pathlib.Path(__file__).resolve().parent.parent / "templates" / "shell.html"

# Fallback badge glyphs for sections that are not numbered "1. ..." topics.
KIND_GLYPH = {"exam": "★", "gloss": "❡", "intro": "›", "topic": "▪"}

NUM_WORDS = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
             6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten"}


# --------------------------------------------------------------------------- #
# Markdown rendering (pandoc gfm -> html, with skylighting code highlighting). #
# --------------------------------------------------------------------------- #
def md_to_html(md: str) -> str:
    """Render GitHub-flavored markdown to HTML via pandoc."""
    md = md.replace("```cuda", "```cpp")  # skylighting has no 'cuda' lexer
    p = subprocess.run(
        ["pandoc", "-f", "gfm", "-t", "html", "--wrap=none"],
        input=md, capture_output=True, text=True,
    )
    if p.returncode != 0:
        raise RuntimeError(f"pandoc failed: {p.stderr}")
    return p.stdout


def inline_md(s: str) -> str:
    """Render a short markdown string and unwrap a single enclosing <p>."""
    h = md_to_html(s).strip()
    h = re.sub(r"^<p>(.*)</p>$", r"\1", h, flags=re.S)
    return h.strip()


def fmt(s: str) -> str:
    """Escape HTML, then re-enable inline `code` and **bold** for quiz/card text."""
    s = _html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    return s


def gh_slug(title: str) -> str:
    """Approximate GitHub's heading-anchor slug for a walkthrough table of contents."""
    s = title.strip().lower()
    s = re.sub(r"[^\w\s-]", "", s)       # drop punctuation and emoji
    s = re.sub(r"\s+", "-", s.strip())
    return s


# --------------------------------------------------------------------------- #
# Section classification + quick-check rendering.                             #
# --------------------------------------------------------------------------- #
def classify(title: str, explicit: str | None) -> str:
    """Return the section kind. An explicit kind in the JSON always wins."""
    if explicit:
        return explicit
    t = title.lower()
    if "exam-likely" in t or "exam likely" in t:
        return "exam"
    if "glossary" in t:
        return "gloss"
    if t.startswith("introduction") or "where this lecture fits" in t:
        return "intro"
    return "topic"


def build_qc(quickcheck: list) -> str:
    """Render a structured quick-check list into the reveal-answer widget."""
    items = ""
    for pair in quickcheck:
        q, a = pair.get("q", ""), pair.get("a", "")
        items += (
            '<div class="qc-item">'
            f'<div class="qc-q">{inline_md(q)}</div>'
            '<button class="qc-reveal" type="button"><span class="eye">◉</span> Reveal answer</button>'
            f'<div class="qc-a-wrap"><div class="qc-a">{inline_md(a)}</div></div>'
            "</div>"
        )
    return '<div class="qc"><div class="qc-head">Quick check</div>' + items + "</div>"


# --------------------------------------------------------------------------- #
# Article (per-lecture view) assembly.                                        #
# --------------------------------------------------------------------------- #
def build_article(lec: dict, lesson: dict, cfg: dict) -> str:
    sections = lesson.get("sections", [])
    subtitle = lesson.get("subtitle", lec.get("label", ""))
    topic_count = sum(
        1 for s in sections if classify(s["title"], s.get("kind")) in ("topic", "intro")
    )

    src_tag = (
        f'<span class="tag">source: {lec["walkthrough"]}</span>'
        if lec.get("walkthrough") else ""
    )
    hero = (
        '<div class="hero">'
        f'<div class="hero-emoji">{lec["emoji"]}</div>'
        '<div class="hero-meta">'
        f'<div class="hero-kicker">{cfg["module_name"]} · Lecture {lec["num"]} · {cfg["subject"]}</div>'
        f'<h1 class="hero-title">{lec["label"]}</h1>'
        f'<div class="hero-sub">{subtitle}</div>'
        f'<div class="hero-tags"><span class="tag">{topic_count} topics</span>{src_tag}</div>'
        "</div></div>"
    )

    lede = ""
    if lesson.get("preamble"):
        lede = f'<div class="prose lede">{md_to_html(lesson["preamble"])}</div>'

    cards = ""
    for idx, sec in enumerate(sections):
        title = sec["title"]
        kind = classify(title, sec.get("kind"))
        body_html = md_to_html(sec.get("body", ""))
        if sec.get("quickcheck"):
            body_html += build_qc(sec["quickcheck"])

        mnum = re.match(r"^(\d+)\.\s+(.*)$", title)
        if mnum:
            num, disp = mnum.group(1), mnum.group(2)
        else:
            num, disp = KIND_GLYPH.get(kind, "▪"), title

        sec_id = f'{lec["view"]}-s{idx}'
        cards += (
            f'<section class="topic kind-{kind}" id="{sec_id}">'
            '<header class="topic-head">'
            '<div class="t-toggle" role="button" tabindex="0" aria-expanded="false">'
            f'<span class="t-num">{num}</span>'
            f'<span class="t-title">{inline_md(disp)}</span>'
            '<span class="chev" aria-hidden="true"></span>'
            "</div>"
            f'<label class="t-done" title="Mark this topic studied">'
            f'<input type="checkbox" data-pk="{lec["view"]}:{idx}">'
            '<span class="chk"></span><span class="chk-label">done</span></label>'
            "</header>"
            '<div class="topic-body-wrap"><div class="topic-body"><div class="prose">'
            f"{body_html}"
            "</div></div></div>"
            "</section>"
        )

    return (
        f'<article class="view" data-view="{lec["view"]}" style="--accent:{lec["accent"]}">'
        f"{hero}{lede}"
        f'<div class="topics">{cards}</div></article>'
    )


# --------------------------------------------------------------------------- #
# Study index (markdown file) + overview view.                                #
# --------------------------------------------------------------------------- #
def build_study_index_md(cfg: dict, lectures: list) -> str:
    ov = cfg.get("overview", {})
    n = len(lectures)
    rows = ""
    for i, lec in enumerate(lectures, start=1):
        wk = lec.get("walkthrough", "")
        link = f"[`{wk}`](./{wk})" if wk else lec["label"]
        about = lec.get("about", lec.get("label", ""))
        take = lec.get("takeaway", "")
        rows += f"| {i} | {link} | {about} | {take} |\n"

    parts = [f'# {cfg["module_title"]} — {cfg["exam"]} Study Index', ""]
    if ov.get("big_picture"):
        parts += [ov["big_picture"].strip(), ""]
    count_word = NUM_WORDS.get(n, str(n))
    plural = "walkthrough" if n == 1 else "walkthroughs"
    parts += [
        "---", "",
        f"## 📚 The {count_word} {plural} (recommended study order)", "",
        "| # | File | What it's about | One-line takeaway |",
        "|---|------|-----------------|-------------------|",
        rows.rstrip(), "",
    ]
    if ov.get("story_arc"):
        parts += ["---", "", "## 🧠 How the lectures connect (the story arc)", "",
                  ov["story_arc"].strip(), ""]
    if ov.get("cross_cutting"):
        parts += ["---", "", "## 🎯 Cross-cutting ideas the exam loves", "",
                  ov["cross_cutting"].strip(), ""]
    if ov.get("checklist"):
        parts += ["---", "", "## ✅ Exam-prep checklist", ""]
        parts += [f"- [ ] {item}" for item in ov["checklist"]]
        parts += [""]
    if ov.get("footer"):
        parts += ["---", "", ov["footer"].strip(), ""]
    return "\n".join(parts) + "\n"


def build_overview(cfg: dict, lectures: list, index_md: str, total_words: int) -> str:
    linkmap = {lec["walkthrough"]: lec["view"] for lec in lectures if lec.get("walkthrough")}
    body_md = re.sub(r"^#\s+.*\n", "", index_md, count=1)  # drop the H1
    html = md_to_html(body_md)
    for fn, view in linkmap.items():
        html = html.replace(f'href="./{fn}"', f'href="#" data-goto="{view}"')
        html = html.replace(f'href="{fn}"', f'href="#" data-goto="{view}"')

    ov = cfg.get("overview", {})
    n = len(lectures)
    word = cfg.get("lecture_word", cfg["subject"])
    tagline = ov.get("tagline",
                      f'Interactive {cfg["exam"]} study guide · {n} lectures · read these instead of the slides')
    hero = (
        '<div class="hero hero-overview">'
        f'<div class="hero-emoji">{cfg.get("overview_emoji", "⬡")}</div>'
        '<div class="hero-meta">'
        f'<div class="hero-kicker">{cfg["course"]}</div>'
        f'<h1 class="hero-title">{cfg["module_name"]} — {cfg["module_title"]}</h1>'
        f'<div class="hero-sub">{tagline}</div>'
        f'<div class="hero-tags"><span class="tag">~{total_words:,} words</span>'
        f'<span class="tag">{n} {word} lectures</span>'
        '<span class="tag">progress saved locally</span></div>'
        "</div></div>"
    )
    return (
        '<article class="view active" data-view="overview" style="--accent:#8aff5e">'
        f"{hero}<div class=\"prose overview-prose\">{html}</div></article>"
    )


# --------------------------------------------------------------------------- #
# Sidebar view buttons.                                                       #
# --------------------------------------------------------------------------- #
def build_view_buttons(cfg: dict, lectures: list, nq: int, nf: int) -> str:
    btns = (
        '<button class="vbtn active" data-goto="overview" style="--accent:#8aff5e">'
        '<span class="vdot"></span><span class="vk">00</span>'
        '<span class="vt"><b>Overview</b><i>Start here · study map</i></span></button>'
    )
    for k, lec in enumerate(lectures, start=1):
        btns += (
            f'<button class="vbtn" data-goto="{lec["view"]}" style="--accent:{lec["accent"]}">'
            f'<span class="vdot"></span><span class="vk">{k:02d}</span>'
            f'<span class="vt"><b>{lec["emoji"]} {lec["short"]}</b><i>{lec["label"]}</i></span></button>'
        )
    q_k, c_k = len(lectures) + 1, len(lectures) + 2
    btns += (
        f'<button class="vbtn" data-goto="quiz" style="--accent:{cfg["quiz_accent"]}">'
        f'<span class="vdot"></span><span class="vk">{q_k:02d}</span>'
        f'<span class="vt"><b>❓ Quiz</b><i>{nq} questions · instant feedback</i></span></button>'
        f'<button class="vbtn" data-goto="cards" style="--accent:{cfg["cards_accent"]}">'
        f'<span class="vdot"></span><span class="vk">{c_k:02d}</span>'
        f'<span class="vt"><b>🃏 Flashcards</b><i>{nf} cards · flip &amp; track</i></span></button>'
    )
    return btns


def quiz_and_cards_views(cfg: dict, nq: int, nf: int) -> str:
    quiz_view = (
        f'<article class="view" data-view="quiz" style="--accent:{cfg["quiz_accent"]}">'
        '<div class="hero"><div class="hero-emoji">❓</div><div class="hero-meta">'
        '<div class="hero-kicker">Active recall · all lectures</div>'
        '<h1 class="hero-title">Practice Quiz</h1>'
        '<div class="hero-sub">Multiple-choice questions with instant feedback and explanations. '
        'Filter by lecture or mix them all, then tap an answer to check yourself.</div>'
        f'<div class="hero-tags"><span class="tag">{nq} questions</span>'
        '<span class="tag">tap an answer to grade it</span></div>'
        '</div></div>'
        '<div class="qz-toolbar"><div class="scope" id="quizScope"></div><span class="tb-sp"></span>'
        '<span class="qz-score" id="qzScore">0 / 0</span>'
        '<button class="tbtn" id="qzShuffle">⤮ Shuffle</button>'
        '<button class="tbtn" id="qzRestart">↻ Restart</button></div>'
        '<div class="qz-list" id="qzList"></div></article>'
    )
    cards_view = (
        f'<article class="view" data-view="cards" style="--accent:{cfg["cards_accent"]}">'
        '<div class="hero"><div class="hero-emoji">🃏</div><div class="hero-meta">'
        '<div class="hero-kicker">Spaced recall · key terms &amp; concepts</div>'
        '<h1 class="hero-title">Flashcards</h1>'
        '<div class="hero-sub">Click a card to flip it. Mark each one “Got it” or “Review again” — '
        'your known pile is saved between sessions, and you can drill just the cards you still miss.</div>'
        f'<div class="hero-tags"><span class="tag">{nf} cards</span>'
        '<span class="tag">⌨ Space flips · ←/→ navigate · k / r</span></div>'
        '</div></div>'
        '<div class="fc-toolbar"><div class="scope" id="cardsScope"></div><span class="tb-sp"></span>'
        '<label class="toolbar-toggle"><input type="checkbox" id="fcReviewOnly"><span class="sw"></span>Review pile only</label>'
        '<button class="tbtn" id="fcShuffle">⤮ Shuffle</button>'
        '<button class="tbtn" id="fcReset">↻ Reset</button></div>'
        '<div class="fc-stage" id="fcStage">'
        '<button class="fc-nav prev" id="fcPrev" aria-label="Previous card">‹</button>'
        '<div class="fc-card" id="fcCard"><div class="fc-inner">'
        '<div class="fc-face fc-front"><span class="fc-lec" id="fcLec"></span><span class="fc-side">front</span>'
        '<div class="fc-text" id="fcFront"></div><div class="fc-hint">click to flip · Space</div></div>'
        '<div class="fc-face fc-back"><span class="fc-side" id="fcKnowMark">✓ known</span>'
        '<div class="fc-text" id="fcBack"></div></div>'
        '</div></div>'
        '<button class="fc-nav next" id="fcNext" aria-label="Next card">›</button>'
        '</div>'
        '<div class="fc-empty" id="fcEmpty" style="display:none">No cards in this pile — 🎉 turn off '
        '“Review pile only” or reset to bring them all back.</div>'
        '<div class="fc-actions"><button class="fc-know" id="fcKnow">✓ Got it (k)</button>'
        '<button class="fc-review" id="fcReview">↻ Review again (r)</button></div>'
        '<div class="fc-meta" id="fcStats"></div></article>'
    )
    return quiz_view + cards_view


# --------------------------------------------------------------------------- #
# Quiz + flashcard data (deterministic, seeded option shuffle).               #
# --------------------------------------------------------------------------- #
def build_quiz_data(cfg: dict, lectures: list, lessons_dir: pathlib.Path):
    lecmeta = {lec["view"]: {"short": lec["short"], "label": lec["label"],
                             "emoji": lec["emoji"], "accent": lec["accent"]} for lec in lectures}
    rng = random.Random(cfg.get("seed", 4610))
    qz, fc = [], []
    for lec in lectures:
        d = json.loads((lessons_dir / lec["quiz"]).read_text(encoding="utf-8"))
        for item in d.get("quiz", []):
            pairs = list(enumerate(item["options"]))
            rng.shuffle(pairs)
            newans = next(i for i, (orig, _t) in enumerate(pairs) if orig == item["answer"])
            qz.append({"id": f"q{len(qz)+1}", "lec": lec["view"], "q": fmt(item["q"]),
                       "options": [fmt(t) for _o, t in pairs], "answer": newans,
                       "explain": fmt(item["explain"])})
        for c in d.get("flashcards", []):
            fc.append({"id": f"f{len(fc)+1}", "lec": lec["view"],
                       "front": fmt(c["front"]), "back": fmt(c["back"])})
    data = {"lectures": lecmeta, "quiz": qz, "flashcards": fc}
    return data, len(qz), len(fc)


# --------------------------------------------------------------------------- #
# Optional: emit standalone walkthrough .md files from the lesson JSON.        #
# --------------------------------------------------------------------------- #
def emit_walkthrough(lec: dict, lesson: dict, cfg: dict, out_dir: pathlib.Path):
    if not lec.get("walkthrough"):
        return None
    sections = lesson.get("sections", [])
    lines = [f'# {cfg["module_name"]}-{lec["num"]}: {lec["label"]} — '
             f'Complete Walkthrough ({cfg["exam"]} Prep)', ""]

    header = lesson.get("walkthrough_header") or cfg.get("walkthrough_header")
    if header:
        lines += [header.strip().replace("{num}", str(lec["num"])), ""]

    if lesson.get("preamble"):
        lines += [lesson["preamble"].strip(), ""]

    lines += ["---", "", "## Table of Contents", ""]
    for i, sec in enumerate(sections, start=1):
        lines.append(f"{i}. [{sec['title']}](#{gh_slug(sec['title'])})")
    lines += ["", "---", ""]

    for sec in sections:
        lines += [f"## {sec['title']}", "", sec.get("body", "").strip(), ""]
        if sec.get("quickcheck"):
            lines += ["### ✅ Quick check", ""]
            for pair in sec["quickcheck"]:
                lines.append(f"- **Q:** {pair.get('q','').strip()}")
                lines.append(f"  **A:** {pair.get('a','').strip()}")
            lines.append("")
        lines += ["---", ""]

    path = out_dir / lec["walkthrough"]
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return path


# --------------------------------------------------------------------------- #
# Main.                                                                        #
# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description="Build an interactive study guide from a config JSON.")
    ap.add_argument("config", help="path to study_config.json")
    ap.add_argument("--no-walkthroughs", action="store_true",
                    help="skip emitting the per-lecture Walkthrough.md files")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    cfg_path = pathlib.Path(args.config).resolve()
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    base = cfg_path.parent  # inputs (lesson/quiz JSON) resolve relative to the config

    cfg.setdefault("quiz_accent", "#b58bff")
    cfg.setdefault("cards_accent", "#ff7ab6")
    cfg.setdefault("storage_key", re.sub(r"[^a-z0-9]", "", cfg["module_name"].lower()))

    out_dir = (base / cfg.get("output_dir", ".")).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    basename = cfg["output_basename"]

    lectures = cfg["lectures"]
    lessons = [json.loads((base / lec["lesson"]).read_text(encoding="utf-8")) for lec in lectures]

    # Total word count across all lesson prose (for the overview hero tag).
    total_words = 0
    for lesson in lessons:
        total_words += len(lesson.get("preamble", "").split())
        for sec in lesson.get("sections", []):
            total_words += len(sec.get("body", "").split())

    # Build all article/view fragments.
    articles = ""
    index_md = build_study_index_md(cfg, lectures)
    articles += build_overview(cfg, lectures, index_md, total_words)
    for lec, lesson in zip(lectures, lessons):
        articles += build_article(lec, lesson, cfg)

    quizdata, nq, nf = build_quiz_data(cfg, lectures, base)
    articles += quiz_and_cards_views(cfg, nq, nf)

    view_buttons = build_view_buttons(cfg, lectures, nq, nf)
    quizdata_json = json.dumps(quizdata, ensure_ascii=False).replace("</", "<\\/")
    view_order = ",".join(
        f'"{v}"' for v in ["overview"] + [l["view"] for l in lectures] + ["quiz", "cards"]
    )

    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    html = (template
            .replace("%%TITLE%%", f'{cfg["module_name"]} · {cfg["subject"]} — {cfg["exam"]} Study Console')
            .replace("%%BRAND%%", cfg.get("brand", cfg["subject"].upper()))
            .replace("%%BRAND_SUB%%", f'{cfg["module_name"].upper()} — {cfg["exam"].upper()}')
            .replace("%%STORAGE_KEY%%", cfg["storage_key"])
            .replace("%%VIEWS%%", view_buttons)
            .replace("%%ARTICLES%%", articles)
            .replace("%%QUIZDATA%%", quizdata_json)
            .replace("%%VIEWORDER%%", view_order))

    if "%%" in html:
        leftover = sorted(set(re.findall(r"%%[A-Z_]+%%", html)))
        sys.exit(f"ERROR: unresolved template placeholders: {leftover}")

    # Write outputs.
    html_path = out_dir / f"{basename}_Study_Guide.html"
    html_path.write_text(html, encoding="utf-8")
    index_path = out_dir / f"{basename}_STUDY_INDEX.md"
    index_path.write_text(index_md, encoding="utf-8")

    # index.html symlink -> study guide, so `serve <folder>` opens it directly.
    link = out_dir / "index.html"
    if link.is_symlink() or link.exists():
        link.unlink()
    link.symlink_to(html_path.name)

    walkthroughs = []
    if not args.no_walkthroughs:
        for lec, lesson in zip(lectures, lessons):
            p = emit_walkthrough(lec, lesson, cfg, out_dir)
            if p:
                walkthroughs.append(p)

    print(f"Wrote {html_path} ({len(html):,} bytes)")
    print(f"Wrote {index_path}")
    print(f"Symlink {link} -> {html_path.name}")
    for p in walkthroughs:
        print(f"Wrote {p}")
    print(f"Quiz: {nq} questions · Flashcards: {nf} cards · Words: ~{total_words:,}")
    if args.verbose:
        print(f"Lectures: {[l['view'] for l in lectures]}")


if __name__ == "__main__":
    main()
