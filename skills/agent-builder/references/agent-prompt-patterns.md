# Agent Prompt Patterns

Detailed patterns and anti-patterns for writing effective sub-agent system prompts.

## Table of Contents

1. [Effective Role Statements](#effective-role-statements)
2. [Structuring the Process Section](#structuring-the-process-section)
3. [Output Format Patterns](#output-format-patterns)
4. [Description Anti-Patterns](#description-anti-patterns)
5. [Prompt Anti-Patterns](#prompt-anti-patterns)
6. [Advanced Patterns](#advanced-patterns)

## Effective Role Statements

The role statement is the first line of the body. It anchors the agent's behavior.

**Strong role statements:**

```
You are an expert code quality reviewer specializing in security, performance, and maintainability.
```

```
You are a backend system architect specializing in scalable API design and microservices.
```

```
You are a senior test engineer focused on comprehensive test coverage and edge case identification.
```

**Weak role statements (avoid):**

```
You are a helpful assistant.  <!-- Too vague -->
You are the best coder ever.  <!-- No specificity -->
You help with things.  <!-- Meaningless -->
```

**Pattern:** `You are a [seniority] [role] specializing in [domain 1], [domain 2], and [domain 3].`

## Structuring the Process Section

The process section defines HOW the agent works. Use numbered steps for sequential workflows and bullet points for parallel considerations.

### Sequential workflow pattern

```markdown
**When invoked:**
1. Read the relevant files to understand context
2. Analyze requirements and define clear boundaries
3. Design the solution with a contract-first approach
4. Implement with comprehensive error handling
5. Validate output meets acceptance criteria
```

### Consideration-based pattern

```markdown
**Process:**
- Start with clear service boundaries and domain-driven design
- Design APIs contract-first with proper versioning and error handling
- Consider data consistency requirements across services
- Plan for horizontal scaling from day one
- Keep solutions simple and avoid premature optimization
- Focus on practical implementation over theoretical perfection
```

### Conditional workflow pattern

```markdown
**Process:**
1. Analyze the input to determine the task type:
   - If bug report: follow the debugging workflow
   - If feature request: follow the implementation workflow
   - If refactor: follow the restructuring workflow
2. Execute the appropriate workflow
3. Validate results against acceptance criteria
```

## Output Format Patterns

Define exactly what the agent should return. Structured output is easier for users to act on.

### Categorized findings

```markdown
**Output Format:**
Provide findings categorized by severity:
- **Critical**: Must fix before merge (security, data loss, crashes)
- **Warning**: Should fix (performance, maintainability)
- **Info**: Optional improvements (style, naming)

For each finding include:
- File path and line number
- Description of the issue
- Suggested fix with code example
```

### Deliverables list

```markdown
**Provide:**
- API endpoint definitions with example requests/responses
- Database schema with key relationships and indexes
- Technology recommendations with brief rationale
- Potential bottlenecks and scaling considerations
```

### Structured report

```markdown
**Return a report with these sections:**
1. **Summary**: One-paragraph overview of findings
2. **Issues Found**: Table of issues with severity, location, description
3. **Recommendations**: Prioritized list of suggested changes
4. **Risk Assessment**: Impact analysis of identified issues
```

## Description Anti-Patterns

Descriptions that cause problems:

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Too vague: "Helps with code" | Never triggers specifically | Add concrete trigger phrases |
| Too broad: "Use for everything" | Triggers when it shouldn't | Narrow to specific use cases |
| Workflow summary: "Reads files, then analyzes..." | Claude shortcuts the body | Only describe WHEN, not HOW |
| No examples | Unclear triggering conditions | Add `<example>` blocks |
| Missing synonyms | Misses valid trigger phrases | Cover alternative phrasings |

## Prompt Anti-Patterns

Common mistakes in system prompts:

### Over-constraining

```markdown
<!-- BAD: Too rigid, can't adapt -->
You MUST always respond with exactly 5 bullet points.
You MUST always start with "Based on my analysis..."
Never use more than 100 words per section.
```

### Under-specifying

```markdown
<!-- BAD: No actionable guidance -->
You are a code reviewer.
Review the code.
Tell the user what you find.
```

### Contradicting tool access

```markdown
<!-- BAD: Instructions reference tools not in the tools list -->
tools: ["Read", "Grep"]
---
Always run the test suite using Bash before reporting.  <!-- Can't use Bash! -->
```

### Ignoring context limitations

```markdown
<!-- BAD: Agent can't access things outside its scope -->
Check the user's previous conversation for context.  <!-- Agents start fresh -->
Look at the deployment dashboard for metrics.  <!-- No web access by default -->
```

## Advanced Patterns

### Proactive agents

Agents that trigger automatically without user request:

```markdown
description: Use this agent PROACTIVELY after code is written or modified to check for security vulnerabilities. Also use when the user explicitly asks for security review.
```

### Multi-phase agents

Agents that handle complex workflows in phases:

```markdown
**Phase 1: Discovery**
- Read all modified files
- Identify the scope of changes
- Map dependencies

**Phase 2: Analysis**
- Check each change against quality standards
- Identify patterns and anti-patterns
- Cross-reference with project conventions

**Phase 3: Reporting**
- Compile findings into structured report
- Prioritize by severity and impact
- Suggest concrete fixes with code examples
```

### Domain-expert agents

Agents with deep knowledge in a specific area:

```markdown
You are a PostgreSQL performance specialist with expertise in:
- Query optimization and EXPLAIN analysis
- Index strategy design (B-tree, GIN, GiST, BRIN)
- Connection pooling (PgBouncer, pgpool-II)
- Partitioning strategies for large tables
- Vacuum and autovacuum tuning
- Replication and high availability patterns

**When analyzing a query:**
1. Run EXPLAIN ANALYZE to get the execution plan
2. Identify sequential scans on large tables
3. Check for missing or unused indexes
4. Look for implicit type casts preventing index use
5. Suggest query rewrites and index additions
```
