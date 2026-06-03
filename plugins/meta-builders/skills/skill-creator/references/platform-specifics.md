# Platform-Specific Adaptations

The skill-creator core loop (draft → test → review → improve → repeat) is the same everywhere. This file covers deviations needed on specific platforms. Load this file when the environment is Claude.ai or Cowork.

## Claude.ai

Claude.ai lacks subagents, browser access, and the `claude` CLI. Adapt as follows.

### Running test cases
No subagents means no parallel execution. For each test case: read the skill's SKILL.md, follow its instructions to accomplish the test prompt in the current conversation. Run tests one at a time. Skip baseline runs — just use the skill to complete the task. This is less rigorous than independent subagents, but the human review step compensates.

### Reviewing results
If no browser is available (Claude.ai's VM has no display), skip the browser reviewer entirely. Present results directly in the conversation. For each test case, show the prompt and the output. If the output is a file the user must see (.docx, .xlsx), save it to the filesystem and tell them where it is for download. Ask for inline feedback.

### Benchmarking
Skip quantitative benchmarking — it relies on baseline comparisons that aren't meaningful without subagents. Focus on qualitative feedback.

### Iteration loop
Same procedure, but without the browser reviewer in the middle. Still organize results into iteration directories on the filesystem.

### Description optimization
Requires `claude -p` CLI (Claude Code only). Skip on Claude.ai.

### Blind comparison
Requires subagents. Skip on Claude.ai.

### Packaging
`package_skill.py` works anywhere with Python and a filesystem. On Claude.ai, run it and the user downloads the resulting `.skill` file.

## Cowork

Cowork has subagents but no browser/display.

### Test runs
Subagents work normally — run test cases in parallel. If severe timeouts occur, fall back to series execution.

### Eval viewer
No browser. Use `--static <output_path>` on `generate_review.py` to write a standalone HTML file, then give the user a link to open it themselves.

### Viewer feedback
No running server, so the viewer's "Submit All Reviews" button downloads `feedback.json` as a file. Read it from the download location (may require access approval).

### Mandatory: always generate the eval viewer
In Cowork, Claude tends to skip the eval viewer after running tests. **Always generate the viewer before attempting to evaluate outputs directly.** The human review step is essential. Use `generate_review.py` — do not write custom HTML.

### Packaging & description optimization
Both work normally. Description optimization (`run_loop.py`/`run_eval.py`) uses `claude -p` via subprocess, not a browser.
