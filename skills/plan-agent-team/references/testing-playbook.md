# Testing & Review Playbook

This is the standardized playbook every generated plan embeds. Copy it into the plan, then **tailor by removing layer sections that don't apply to the work**. Don't add layers that aren't relevant.

## Why this is non-negotiable

Agent-teams are powerful but expensive. Without a forced quality bar, teammates "claim success" based on their own implementation context — which is exactly the failure mode that makes agentic work feel unreliable. This playbook makes evidence-based completion a structural requirement, not a vibe.

The two pillars:

1. **Review & Iteration Loop** — applies to every task in every team
2. **Layer-specific testing** — tailored to what the work actually touches

## Review & Iteration Loop (Always)

After every meaningful implementation chunk (a teammate completes a task or wraps up a milestone), the lead enforces this cycle:

1. **Code review pass** — Dispatch the `code-reviewer` subagent on the diff. Block task completion until critical and major findings are resolved.
2. **Simplification pass** — Run the `simplify` skill on changed files when:
   - A teammate has added ≥150 lines of new code, OR
   - A teammate is about to mark a feature task complete, OR
   - Before merging any teammate's work back to the integration branch
3. **Layer-specific tests** — Run the relevant sections from the Layer Testing block below. Tests **must actually execute and pass** — pasting test output (or Playwright traces, or curl responses) into the plan's Test Results section is required. No claiming success without evidence.
4. **Iterate** — If tests fail, the implementing teammate fixes and re-runs. The lead does NOT mark the task complete until tests pass.
5. **Final review** — Before team cleanup, the lead runs a full-PR review using the `pr-review-toolkit:review-pr` skill (if installed) or a fresh `code-reviewer` pass on the entire diff.

**Iteration cap:** if a teammate hits 5 fix-test-iterate cycles on the same task without converging, escalate to the user. The agent-teams docs warn about thrashing at 8+ iterations; cap earlier to avoid token waste.

## Acceptance Gate

The team is NOT done until all of these pass:

- [ ] All layer-specific tests written and passing (with evidence pasted into Test Results)
- [ ] `code-reviewer` final pass returns no critical or major findings
- [ ] `simplify` has been run on touched files
- [ ] Manual verification steps in the plan have been executed (with evidence — screenshots, command output, log excerpts)
- [ ] No console errors, no failing tests, no skipped tests with TODOs
- [ ] All open dependencies in the Task Graph are resolved
- [ ] Frontmatter `status` set to `Complete` and `outcome` set to `success` / `partial` / `failed`
- [ ] Postmortem section drafted

## Layer Testing

Include only the sections matching the work's actual surface area.

### Web UI / Frontend

For any feature with a visible UI surface:

- **Playwright CLI walkthrough** — Write a Playwright script that exercises the golden path. Run it. Paste the trace output (pass/fail summary + any failed step names) into Test Results. The script lives alongside the feature's code or in the project's standard E2E test directory.
- **Edge cases** — Empty state, loading state, error state, network failure (offline simulation). Each gets its own Playwright assertion or a manual verification with screenshot.
- **Console check** — Open the page in a dev server, verify zero console errors and zero unhandled promise rejections during the golden path. Paste browser console output (or "clean" if empty) into Test Results.
- **Accessibility** — Keyboard navigation works for all interactive elements. Run `axe-core` (or equivalent) on changed pages — zero violations on new content. If the team can't run axe, do a manual keyboard pass and document.
- **Visual sanity** — Open the rendered page, confirm layout is correct on desktop AND mobile breakpoints. Paste a description (or screenshot if Playwright captured one) into Test Results.

### Backend / API

For any feature with new or changed HTTP endpoints:

- **curl / HTTPie probes** — For each new endpoint, write probes for: happy path, 401 (unauthorized), 403 (forbidden), 404 (not found), 422 (validation error), 500 (server error if reachable). Paste response codes and key headers into Test Results.
- **Integration tests** — Hit a real database (per project conventions), not mocks. Tests cover happy path + at least one error path per endpoint. Test runner output (jest / pytest / go test, etc.) goes into Test Results.
- **Schema validation** — Request and response bodies validate against the project's schema source of truth (OpenAPI, JSON Schema, Zod, Pydantic, etc.). Note any schema changes in the plan.
- **Auth & permissions** — For protected routes, verify each role's expected access boundary. Document the matrix in Test Results.

### Database

For any feature with schema changes or new queries:

- **Migration up + down** — Both run cleanly on a fresh dev database. Paste migration runner output into Test Results.
- **Query verification** — For each new query, run it against seed data and confirm expected rows return. Include the query and result snippet in Test Results.
- **Performance** — Run `EXPLAIN` (or equivalent) on every new query. Flag full table scans on tables > 1000 rows. Note any indexes added.
- **Constraints** — Verify FK, NOT NULL, and unique constraints are enforced — write a test that intentionally violates each.

### CLI / Scripts

For any feature exposing or modifying a CLI tool:

- **Smoke test** — Run the command with realistic flags. Verify expected stdout, stderr, and exit code. Paste captured output into Test Results.
- **--help output** — Run `<cmd> --help` and confirm it documents all flags and matches actual behavior.
- **Common flag combinations** — Test 2–3 representative combinations beyond the basic invocation.

### Background Jobs / Async Workers

For any feature involving queues, scheduled tasks, or async workers:

- **Idempotency** — Re-running with the same input produces no duplicate effects.
- **Failure retry** — Force a failure mid-job; verify the retry mechanism kicks in and the job eventually succeeds (or fails to dead-letter cleanly).
- **Concurrency safety** — If multiple workers can claim the same item, verify file-locking / row-locking / queue-locking prevents double processing.

### Realtime / WebSocket / Streaming

For features with persistent connections:

- **Connection lifecycle** — Connect, exchange a representative message, disconnect, reconnect. Verify each step.
- **Message ordering** — If order matters, verify it's preserved under load.
- **Reconnect semantics** — Verify behavior when connection drops mid-stream.

### Native Mobile

(Stub — extend when first used)

- **Build succeeds** on the project's target platforms (iOS / Android).
- **Smoke test** the changed screens via simulator or device.
- **Lint / static analysis** passes (e.g., SwiftLint, ESLint for React Native).

### ML / Inference

(Stub — extend when first used)

- **Model loads** without errors.
- **Inference output** for a fixed seed input matches expected baseline within tolerance.
- **Latency budget** met for representative input.

### Performance / Load

For features with explicit performance targets:

- **Benchmark before & after** — Run the project's benchmark suite (or write a one-off probe) and compare. Paste numbers into Test Results.
- **Load test** if the change is in a hot path. Document threshold and observed throughput.

### Security

For features touching auth, secrets, PII, or external surfaces:

- **No secrets in code** — Verify no API keys, passwords, or tokens committed.
- **Input validation** — All user input is validated at boundaries.
- **Auth boundaries** — Verified above under Backend / API. Re-emphasize for security-sensitive features.

### Cross-Layer Integration

When the work spans multiple layers, add an integration section:

- **End-to-end flow** — Walk the entire path (UI click → API call → DB write → response → UI update) at least once with Playwright + network capture. Paste evidence into Test Results.
- **Error propagation** — Verify errors at each layer surface correctly to the user.

## Evidence requirements

The lead inserts evidence inline in the plan's Test Results section. Acceptable evidence:

- **Test runner output** (last 20 lines including pass/fail summary)
- **Playwright trace** (test name + status; full trace path if saved)
- **curl / HTTPie response** (status code + key headers + first 10 lines of body)
- **Screenshot path** (if image evidence; written to `attachments/` in the vault if appropriate)
- **Query result snippet** (first 5 rows or count)
- **Command output** (stdout/stderr/exit code)

Vague evidence ("tests pass", "everything works") is rejected by the Acceptance Gate. Specifically.
