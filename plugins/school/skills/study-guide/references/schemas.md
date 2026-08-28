# Study-guide JSON schemas

Three JSON shapes drive `build_guide.py`: one **config**, one **lesson-content**
file per lecture, and one **quiz** file per lecture. All paths inside the config
resolve relative to the config file's own directory. A complete working set is in
`example/` (one lecture) — copy it and edit.

## Table of contents
1. [study_config.json](#1-study_configjson)
2. [lesson JSON (one per lecture)](#2-lesson-json-one-per-lecture)
3. [quiz JSON (one per lecture)](#3-quiz-json-one-per-lecture)
4. [What each field controls in the output](#4-what-each-field-controls-in-the-output)

---

## 1. study_config.json

The top-level build config. Names the module and lists the lectures.

```json
{
  "course": "CSCI-4610 · Concurrent & Parallel Programming",
  "module_name": "Module 6",
  "module_title": "Multithreading in C++",
  "exam": "Exam 4",
  "subject": "C++ Threads",
  "brand": "THREAD·LAB",
  "storage_key": "m6thread",
  "lecture_word": "threading",
  "overview_emoji": "⬡",
  "output_dir": ".",
  "output_basename": "Module6",
  "seed": 4610,
  "quiz_accent": "#b58bff",
  "cards_accent": "#ff7ab6",
  "walkthrough_header": "> **Course:** CSCI-4610/5610 Concurrent and Parallel Programming · **Module 6 (C++ Concurrency), Lecture {num}**\n> **Instructor:** Tae-Hyuk (Ted) Ahn, Saint Louis University",
  "overview": {
    "tagline": "Interactive Exam 4 study guide · 2 lectures · read these instead of the slides",
    "big_picture": "> **The big picture:** Module 6 takes you from *launching a thread* → ...",
    "story_arc": "1. **Threads 1 — creating and controlling a thread.** ...\n2. **Threads 2 — ...**",
    "cross_cutting": "- **Concurrency vs parallelism** — ...\n- **join = wait, detach = let it run** — ...",
    "checklist": [
      "Read both walkthroughs in order (1 → 2).",
      "From a blank page, launch a `std::thread` and `join()` it."
    ],
    "footer": "*Generated from your CSCI-4610 Module 6 lecture PDFs.*"
  },
  "lectures": [
    {
      "view": "thread1",
      "num": "1",
      "emoji": "🧵",
      "short": "Threads 1",
      "label": "std::thread Basics",
      "accent": "#5b9cff",
      "lesson": "lesson_thread1.json",
      "quiz": "data_quiz_thread1.json",
      "walkthrough": "Module6-1_CppThreading1_Walkthrough.md",
      "about": "**`std::thread` basics** — launching, join vs detach, RAII",
      "takeaway": "Every `std::thread` must be `join()`ed or `detach()`ed."
    }
  ]
}
```

### Fields

| Field | Required | Purpose |
|---|---|---|
| `course` | yes | Overview hero kicker line (e.g. course code + name). |
| `module_name` | yes | e.g. `"Module 6"`. Used in titles, hero kickers, badges. |
| `module_title` | yes | Human title, e.g. `"Multithreading in C++"`. |
| `exam` | yes | e.g. `"Exam 4"`. Shown in title/brand/index. |
| `subject` | yes | Short subject label in per-lecture kickers, e.g. `"C++ Threads"`. |
| `brand` | no | Top-bar wordmark (default: `subject.upper()`). |
| `storage_key` | no | localStorage namespace (default: slug of `module_name`). Keep it unique per module so progress does not collide across guides. |
| `lecture_word` | no | Middle word in the overview `"N ___ lectures"` tag (default: `subject`). |
| `overview_emoji` | no | Overview hero glyph (default `⬡`). |
| `output_dir` | no | Where to write outputs, relative to the config (default `.`). |
| `output_basename` | yes | Output file prefix, e.g. `"Module6"` → `Module6_Study_Guide.html`. |
| `seed` | no | RNG seed for the deterministic quiz-option shuffle (default `4610`). |
| `quiz_accent`, `cards_accent` | no | Accent colors for the quiz/flashcard views. |
| `walkthrough_header` | no | Markdown blockquote inserted after the walkthrough H1. `{num}` is replaced with the lecture number. A lesson file may override via its own `walkthrough_header`. |
| `overview` | yes | Content for the overview view + generated study index (see below). |
| `lectures` | yes | Ordered list of lecture entries (see below). |

### `overview` object
All values are markdown strings (or a list of strings for `checklist`). They are
assembled into `<basename>_STUDY_INDEX.md` and rendered into the overview view.

| Key | Purpose |
|---|---|
| `tagline` | Overview hero sub-line. |
| `big_picture` | Intro paragraph/blockquote under the index H1. |
| `story_arc` | "How the lectures connect" section. |
| `cross_cutting` | "Cross-cutting ideas the exam loves" section. |
| `checklist` | List of markdown strings → `- [ ]` exam-prep checklist. |
| `footer` | Closing line of the index. |

### `lectures[]` entries

| Key | Required | Purpose |
|---|---|---|
| `view` | yes | Stable id (e.g. `thread1`). Must match the quiz file's `lec`. Used for view routing and progress keys. |
| `num` | yes | Lecture number shown in the hero kicker and walkthrough H1. |
| `emoji`, `short`, `label` | yes | Sidebar/hero display: glyph, short name, full title. |
| `accent` | yes | Per-lecture accent color (hex). |
| `lesson` | yes | Path to this lecture's lesson JSON. |
| `quiz` | yes | Path to this lecture's quiz JSON. |
| `walkthrough` | no | Filename for the emitted walkthrough + the index-table link + hero "source" tag. Omit to skip that lecture's walkthrough. |
| `about` | no | Index-table "What it's about" cell (default: `label`). |
| `takeaway` | no | Index-table "One-line takeaway" cell. |

---

## 2. lesson JSON (one per lecture)

The teaching content. Section `body` and `preamble` are **markdown** (rendered
by pandoc → HTML, so code fences, tables, blockquotes, and inline formatting all
work). This same content is what the emitted walkthrough reuses, so write it in
full — do not abbreviate.

```json
{
  "view": "thread1",
  "subtitle": "why threads, launching, join vs detach, RAII",
  "preamble": "This walkthrough replaces the Module 6-1 slides. It answers: *how do you spawn and manage a thread safely?*",
  "walkthrough_header": "> **Course:** ... · **Module 6, Lecture 1**",
  "sections": [
    {
      "title": "Introduction — where this lecture fits",
      "kind": "intro",
      "body": "This is the **foundation lecture**. ..."
    },
    {
      "title": "1. Why Use Threads?",
      "body": "Two motivations: **performance** and **responsiveness**. ...\n\n### Worked example\n```cpp\nstd::thread t(work);\nt.join();\n```",
      "quickcheck": [
        {"q": "What must every std::thread do before destruction?", "a": "`join()` or `detach()`."}
      ]
    },
    {"title": "🎯 Most exam-likely points", "kind": "exam", "body": "- ..."},
    {"title": "🔑 Key terms glossary", "kind": "gloss", "body": "**Thread** — ..."}
  ]
}
```

| Field | Required | Purpose |
|---|---|---|
| `view` | no | For readability; the config's lecture entry is authoritative. |
| `subtitle` | no | Per-lecture hero sub-line (default: lecture `label`). |
| `preamble` | no | Lede block above the topics (markdown). |
| `walkthrough_header` | no | Overrides the config `walkthrough_header` for this lecture. |
| `sections[]` | yes | Ordered accordion topics. |

### `sections[]` entries

| Key | Required | Purpose |
|---|---|---|
| `title` | yes | Section heading. A leading `"N. "` becomes the numbered badge; otherwise a kind glyph is used. |
| `body` | yes | Markdown content. Code fences get copy buttons + language tags + syntax highlighting. |
| `kind` | no | One of `intro`, `topic`, `exam`, `gloss`. If omitted it is auto-classified from the title (title starting with `Introduction`/containing `where this lecture fits` → `intro`; containing `exam-likely` → `exam`; containing `glossary` → `gloss`; else `topic`). `exam` and `gloss` sections are excluded from the progress-ring denominator, matching the source behavior. |
| `quickcheck` | no | List of `{"q": "...", "a": "..."}` → reveal-answer widget. `q`/`a` are markdown. |

Recommended section arc per lecture (from the exam3/exam4 originals): an `intro`,
then numbered topic sections each covering *what the slides show → what it
actually means → why it matters for the exam → common pitfalls → quick check*,
then a `🎯 Most exam-likely points` (`exam`) and `🔑 Key terms glossary` (`gloss`).

---

## 3. quiz JSON (one per lecture)

Identical schema to the exam3/exam4 `data_quiz_*.json` files. One file per
lecture; its `lec` must equal the lecture's `view`.

```json
{
  "lec": "thread1",
  "quiz": [
    {
      "q": "What is the difference between concurrency and parallelism?",
      "options": ["...", "...", "...", "..."],
      "answer": 1,
      "explain": "Concurrency is dealing with many tasks at once; parallelism is running them simultaneously."
    }
  ],
  "flashcards": [
    {"front": "std::thread", "back": "A C++11 object representing one thread of execution."}
  ]
}
```

| Field | Required | Purpose |
|---|---|---|
| `lec` | yes | Must match the lecture `view`. |
| `quiz[].q` | yes | Question text (markdown: `` `code` `` and `**bold**` supported). |
| `quiz[].options` | yes | Answer choices (any count; typically 4). |
| `quiz[].answer` | yes | 0-based index of the correct option **in the authored order**. The build shuffles options deterministically and remaps this index. |
| `quiz[].explain` | yes | Shown after answering. |
| `flashcards[].front` / `.back` | yes | Card faces (markdown-lite: `` `code` `` and `**bold**`). |

---

## 4. What each field controls in the output

- **Title bar / tab:** `module_name · subject — exam Study Console`.
- **Brand wordmark:** `brand` + `MODULE_NAME — EXAM`.
- **Sidebar buttons:** Overview, one per lecture (`emoji short` / `label`), Quiz, Flashcards.
- **Per-lecture hero kicker:** `module_name · Lecture num · subject`.
- **Overview hero tags:** `~<computed> words` (from lesson prose) · `N <lecture_word> lectures` · `progress saved locally`.
- **Progress ring:** counts `intro`+`topic` sections only (not `exam`/`gloss`).
- **Quiz + flashcards:** built from all quiz files, filterable by lecture; scores and known-pile persist in localStorage under `storage_key`.
- **Keyboard:** `/` search, `e` expand-all, digits jump views, Space/←/→/k/r drive flashcards.
