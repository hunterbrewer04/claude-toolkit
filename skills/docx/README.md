# DOCX

> Create, read, edit, and manipulate Microsoft Word `.docx` files — including tracked changes, comments, tables, images, and TOCs.

## Overview

The `docx` skill provides a complete workflow for working with Word documents: generating new `.docx` files via `docx-js`, editing existing ones by unpacking and patching their raw XML, and extracting content with `pandoc`. It encodes Anthropic's hard-won rules for producing documents that render correctly in both Microsoft Word and Google Docs (page sizing, table widths, shading types, bullet formatting, and more).

## Trigger Phrases

This skill activates when you say:

- "Word doc" / "word document" / ".docx"
- "Create a report" / "memo" / "letter" / "template" as a Word file
- "Edit this Word document"
- "Add tracked changes"
- "Find and replace in this .docx"
- "Insert an image into this Word file"
- "Extract content from a Word document"
- "Convert .doc to .docx"
- "Build a Word template with a table of contents / letterhead / page numbers"

## Description Field

```
Use this skill whenever the user wants to create, read, edit, or manipulate Word documents (.docx files). Triggers include: any mention of 'Word doc', 'word document', '.docx', or requests to produce professional documents with formatting like tables of contents, headings, page numbers, or letterheads. Also use when extracting or reorganizing content from .docx files, inserting or replacing images in documents, performing find-and-replace in Word files, working with tracked changes or comments, or converting content into a polished Word document. If the user asks for a 'report', 'memo', 'letter', 'template', or similar deliverable as a Word or .docx file, use this skill. Do NOT use for PDFs, spreadsheets, Google Docs, or general coding tasks unrelated to document generation.
```

## How It Works

The skill branches by task:

1. **Read / analyze content** — Use `pandoc --track-changes=all` for clean text extraction, or `scripts/office/unpack.py` for raw XML access.
2. **Create a new document** — Generate with `docx-js` in JavaScript (`Document`, `Paragraph`, `Table`, `ImageRun`, etc.), then validate via `scripts/office/validate.py`.
3. **Edit an existing document** — Follow the three-step Unpack → Edit XML → Pack workflow:
   - `scripts/office/unpack.py` pretty-prints XML, merges adjacent runs, and converts smart quotes to entities
   - Edit XML in `unpacked/word/` with the Edit tool (no Python scripts)
   - `scripts/office/pack.py` validates with auto-repair, condenses XML, and rebuilds the `.docx`
4. **Tracked changes / comments** — Use `<w:ins>` / `<w:del>` wrappers; use `scripts/comment.py` to handle comment boilerplate across XML files.
5. **Convert legacy `.doc`** — Run `scripts/office/soffice.py --headless --convert-to docx` before editing.
6. **Convert to images** — Pipe through LibreOffice → PDF → `pdftoppm`.

## When to Use

- Drafting reports, memos, letters, contracts, or other formal documents as `.docx`
- Editing a Word file with tracked changes (e.g., proposing revisions to a contract)
- Inserting comments or replies into a Word document
- Programmatic find-and-replace across a `.docx`
- Building Word templates with TOCs, headers/footers, page numbers, or multi-column layouts
- Extracting text or structure from a Word file for further processing

## When NOT to Use

- PDFs — use a PDF-specific skill or tooling
- Google Docs — use the Google Docs / Drive integration
- Excel `.xlsx` — wrong format; needs a spreadsheet skill
- Generic coding or text-file manipulation that has nothing to do with Word

## Directory Structure

```
docx/
├── SKILL.md
├── LICENSE.txt
└── scripts/
    ├── __init__.py
    ├── accept_changes.py        # Accept all tracked changes (requires LibreOffice)
    ├── comment.py               # Add comments / replies to a .docx
    ├── office/
    │   ├── unpack.py            # Unzip + pretty-print + merge runs
    │   ├── pack.py              # Repack + validate + auto-repair
    │   ├── validate.py          # Schema validation
    │   └── soffice.py           # LibreOffice wrapper (.doc → .docx, .docx → .pdf)
    └── templates/               # XML templates used by the scripts
```

- **`scripts/office/`** — Low-level docx packing/unpacking utilities
- **`scripts/comment.py` / `accept_changes.py`** — Higher-level operations for review workflows
- **`scripts/templates/`** — XML stubs used during pack/unpack

## Setup & Installation

**Location:** `~/.claude/skills/docx/`

If you symlink from the toolkit (recommended):

```bash
ln -s ~/claude-toolkit/skills/docx ~/.claude/skills/docx
```

**Prerequisites:**

- **`pandoc`** — text extraction (`brew install pandoc`)
- **`docx` npm package** — new document generation (`npm install -g docx`)
- **LibreOffice** — required for `accept_changes.py` and PDF conversion (`brew install --cask libreoffice`)
- **Poppler** — `pdftoppm` for image rendering (`brew install poppler`)
- **Python 3** — for the bundled scripts

## Configuration

This skill requires no additional configuration. Default author for tracked changes / comments is `"Claude"`; override per-invocation with `--author` on `comment.py`.

## Dependencies

- `pandoc` (CLI)
- `docx` (npm package, global install)
- LibreOffice (`soffice`)
- `pdftoppm` (Poppler)
- Python 3 standard library
- No other Claude Code skills

## Examples

### Example 1: Generate a polished one-page memo

**Input:** "Create a Word memo to the team about the Q3 launch, with letterhead, headings, and page numbers."

**Result:** Writes a Node script that builds a `Document` with US Letter page size, an Arial default font, a `Header` containing the letterhead, paragraphs for each section using `HeadingLevel.HEADING_1`/`HEADING_2`, and a `Footer` containing `PageNumber.CURRENT`. Validates with `scripts/office/validate.py`.

### Example 2: Propose tracked changes to a contract

**Input:** "In this NDA, change '30 days' to '60 days' as a tracked change."

**Result:** Unpacks the `.docx`, locates the relevant `<w:r>` in `document.xml`, replaces it with sibling `<w:del>` and `<w:ins>` blocks authored by `"Claude"`, then repacks via `scripts/office/pack.py`.

### Example 3: Add a comment on a paragraph

**Input:** "Add a comment to the third paragraph saying the figure should be sourced."

**Result:** Runs `scripts/comment.py unpacked/ 0 "Figure needs a source citation."`, then inserts `<w:commentRangeStart/>` and `<w:commentRangeEnd/>` markers as siblings of the run inside the paragraph, plus a `<w:commentReference>` after the range.

## Limitations

- Document generation via `docx-js` defaults to **A4** — you must set US Letter (`12240 × 15840` DXA) explicitly for US documents.
- `accept_changes.py` requires a working LibreOffice install — it shells out to `soffice`.
- Table widths must use `WidthType.DXA`; `PERCENTAGE` widths render incorrectly in Google Docs.
- The skill ships under a proprietary license (see `LICENSE.txt`) — review terms before redistribution.

## Related Components

- [claude-documentation](../claude-documentation/) — Generates READMEs for skills like this one
- [tolaria](../tolaria/) — For working with Markdown notes (use that instead of docx when the deliverable is a note, not a Word file)
