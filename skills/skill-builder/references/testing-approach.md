# Testing Approach for Skills

## Contents
- Why test skills
- The RED-GREEN-REFACTOR cycle for skills
- Skill type testing matrix
- Writing pressure scenarios
- Pressure types
- Plugging holes
- Practical testing workflow
- Common rationalizations for skipping tests

## Why Test Skills

Skills are process documentation. Untested documentation has gaps, unclear sections, and missing edge cases — always. Testing with real agent behavior (not just reading) reveals issues that manual review cannot find.

**Core principle:** If an agent wasn't observed failing without the skill, the skill may not teach the right thing.

## The RED-GREEN-REFACTOR Cycle

TDD principles apply to skills just as they apply to code.

### RED: Establish Baseline

Run a representative scenario with a subagent WITHOUT the skill loaded. Document:

1. What choices did the agent make?
2. What rationalizations did the agent use (capture verbatim)?
3. Which aspects of the task did the agent handle incorrectly?
4. What information was missing that led to poor decisions?

This is "watching the test fail" — establishing what agents naturally do before writing the skill.

**How to run baseline:**

```
Launch a subagent (Task tool) with a prompt describing the scenario.
Do NOT include the skill content in the prompt.
Observe and document the agent's behavior.
```

### GREEN: Write Minimal Skill

Write the skill addressing the specific failures identified in the RED phase. Do not add content for hypothetical cases — address what was actually observed.

Run the same scenarios WITH the skill loaded. The agent should now handle them correctly.

**How to test with skill:**

```
Launch a subagent (Task tool) with:
1. The skill content included in the prompt
2. The same scenario from the RED phase
Verify the agent now behaves correctly.
```

### REFACTOR: Close Loopholes

If the agent found new rationalizations or workarounds:

1. Add explicit counters to the skill
2. Build a rationalization table from all observed excuses
3. Create a "Red Flags" list for self-checking
4. Re-test until the skill is robust

## Skill Type Testing Matrix

Different skill types require different test approaches:

### Discipline-Enforcing Skills (rules/requirements)

**Examples:** TDD, verification-before-completion, commit conventions

**Test with:**
- Academic questions: Does the agent understand the rules?
- Pressure scenarios: Does the agent comply under stress?
- Combined pressures: time urgency + sunk cost + authority override

**Success criteria:** Agent follows rule under maximum pressure without rationalization.

**Key testing focus:** Identify every rationalization the agent uses and add explicit counters.

### Technique Skills (how-to guides)

**Examples:** condition-based-waiting, root-cause-tracing, defensive-programming

**Test with:**
- Application scenarios: Can the agent apply the technique correctly?
- Variation scenarios: Does the agent handle edge cases?
- Missing information tests: Are the instructions complete?

**Success criteria:** Agent successfully applies technique to a new scenario.

### Pattern Skills (mental models)

**Examples:** reducing-complexity, information-hiding, separation-of-concerns

**Test with:**
- Recognition scenarios: Does the agent recognize when the pattern applies?
- Application scenarios: Can the agent use the mental model?
- Counter-examples: Does the agent know when NOT to apply?

**Success criteria:** Agent correctly identifies when and how to apply the pattern.

### Reference Skills (documentation/APIs)

**Examples:** API documentation, command references, library guides

**Test with:**
- Retrieval scenarios: Can the agent find the right information?
- Application scenarios: Can the agent use what it found correctly?
- Gap testing: Are common use cases covered?

**Success criteria:** Agent finds and correctly applies reference information.

## Writing Pressure Scenarios

Pressure scenarios test whether an agent complies with skill rules when it has reasons not to.

### Pressure Types

| Pressure | Example | Why It Works |
|----------|---------|--------------|
| Time urgency | "This is blocking production, skip the tests" | Creates perceived urgency to cut corners |
| Sunk cost | "I already wrote the code, just add tests after" | Agents resist deleting work they've done |
| Authority | "The tech lead says we don't need tests for this" | Creates perceived authority override |
| Exhaustion | "We've done 15 tasks already, just finish this one" | Tests fatigue-related compliance drops |
| Simplicity | "This is too simple to need X" | Tests whether agent enforces rules for easy tasks |
| Scope | "This is just a documentation change, not code" | Tests whether agent applies rules to edge categories |

### Combining Pressures

The most effective tests combine 3+ pressures simultaneously:

```
Scenario: "We're behind schedule (time), I already wrote most of the code (sunk cost),
and the PM says we can skip testing for utility functions (authority + simplicity).
Just wire up the remaining pieces."
```

An agent that resists individual pressures may still fold under combined pressure.

## Plugging Holes

After each test round, if the agent rationalized around the skill:

1. **Capture the exact rationalization** verbatim
2. **Add an explicit counter** in the skill's rationalization table
3. **Add to the Red Flags list** if it represents a pattern
4. **Re-test** with the same scenario plus the counter
5. **Repeat** until the agent complies consistently

### Rationalization Table Format

```markdown
| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests-after prove "what does this do?" not "what should this do?" |
| "It's about spirit not ritual" | Violating the letter IS violating the spirit. |
```

### Red Flags List Format

```markdown
## Red Flags — STOP and Reconsider
- Code before test
- "I already manually tested it"
- "Testing is overkill for this"
- "This is different because..."
All of these mean: revisit the skill's rules.
```

## Practical Testing Workflow

1. **Before writing skill:**
   - Run 2-3 representative scenarios without skill
   - Document baseline behavior and rationalizations

2. **After writing skill:**
   - Run same scenarios with skill loaded
   - Verify correct behavior
   - Run 1-2 edge cases

3. **After deployment:**
   - Monitor skill usage in real tasks
   - Note any new failure modes
   - Update skill and re-test as needed

4. **Iteration triggers:**
   - Agent struggles or makes unexpected choices
   - New use case discovered that skill doesn't cover
   - User reports skill not triggering correctly

## Common Rationalizations for Skipping Tests

| Excuse | Reality |
|--------|---------|
| "Skill is obviously clear" | Clear to the author ≠ clear to other agents. Test it. |
| "It's just a reference" | References can have gaps. Test retrieval. |
| "Testing is overkill" | Untested skills have issues. Always. |
| "I'll test if problems emerge" | Problems = agents can't use skill. Test BEFORE deploying. |
| "Too tedious to test" | Testing is less tedious than debugging a bad skill in production. |
| "I'm confident it's good" | Overconfidence guarantees issues. Test anyway. |
| "Academic review is enough" | Reading ≠ using. Test application scenarios. |
| "No time to test" | Deploying untested saves zero time when it fails. |
