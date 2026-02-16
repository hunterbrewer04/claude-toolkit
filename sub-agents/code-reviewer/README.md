# Code Reviewer

> Expert code reviewer specializing in code quality, security vulnerabilities, and best practices across multiple languages.

## Overview

The Code Reviewer is a senior-level sub-agent that performs comprehensive code reviews covering correctness, performance, maintainability, and security. It provides constructive, actionable feedback with specific improvement suggestions, enforces best practices, and tracks quality metrics across JavaScript/TypeScript, Python, Java, Go, Rust, C++, SQL, and shell scripts.

## Agent Configuration

| Property | Value |
|----------|-------|
| **Type** | Sub-agent |
| **Model** | `opus` |
| **Max Turns** | Inherits from parent |

## Capabilities

### Tools

- `Read` -- Read source files and configuration for review
- `Write` -- Generate review reports and documentation
- `Edit` -- Apply suggested fixes directly
- `Bash` -- Run static analysis tools and linting commands
- `Glob` -- Find files matching patterns for batch review
- `Grep` -- Search for code patterns, anti-patterns, and vulnerabilities

### Strengths

- Code quality assessment (logic correctness, error handling, naming, complexity)
- Security review (input validation, injection vulnerabilities, auth checks, cryptographic practices)
- Performance analysis (algorithm efficiency, database queries, memory usage, resource leaks)
- Design pattern evaluation (SOLID principles, DRY compliance, coupling/cohesion)
- Test review (coverage, quality, edge cases, isolation)
- Documentation review (API docs, inline comments, README files)
- Dependency analysis (version management, license compliance, vulnerabilities)
- Technical debt identification (code smells, deprecated usage, refactoring needs)

## Invocation Pattern

```
Use the Task tool to invoke the code-reviewer sub-agent:

Task: "Review the authentication module for security vulnerabilities and code quality issues"
```

## When to Use

- You need a thorough code review before merging a pull request
- You want to identify security vulnerabilities in your codebase
- You need to assess code quality metrics (complexity, duplication, coverage)
- You want constructive feedback on design patterns and architecture
- You need to audit dependencies for security and license compliance

## When NOT to Use

- You need to write new code from scratch (use a developer agent instead)
- You need to run or deploy the application (use a DevOps agent)
- You only need simple formatting or linting (use an automated tool directly)

## How It Works

1. **Review Preparation** -- Queries the context manager for coding standards, security requirements, and review scope. Analyzes change scope and identifies focus areas.
2. **Systematic Review** -- Conducts a multi-pass review: security first, then correctness, performance, maintainability, tests, and documentation.
3. **Feedback Delivery** -- Provides prioritized, constructive feedback with specific examples, alternative solutions, and learning resources.

## Input/Output

### Input

- Source code files, pull requests, or directories to review
- Specific review focus areas (security, performance, etc.)
- Coding standards and team conventions

### Output

- Categorized findings (critical issues, warnings, suggestions)
- Code quality score and metrics
- Specific improvement recommendations with code examples
- Summary report with actionable items

### Example Output

```json
{
  "agent": "code-reviewer",
  "status": "reviewing",
  "progress": {
    "files_reviewed": 47,
    "issues_found": 23,
    "critical_issues": 2,
    "suggestions": 41
  }
}
```

## Directory Structure

```
sub-agents/code-reviewer/
  code-reviewer.md   # Agent definition and system prompt
  README.md          # This file
```

## Setup & Installation

No additional setup required. The code-reviewer sub-agent is available within the claude-toolkit. For best results, ensure your project has a linting configuration and test suite that the agent can reference.

## Configuration Options

The code review checklist targets:

| Metric | Target |
|--------|--------|
| Critical security issues | 0 |
| Code coverage | > 80% |
| Cyclomatic complexity | < 10 |
| High-priority vulnerabilities | 0 |

## Dependencies

- No external dependencies required
- Benefits from existing linting tools (ESLint, Pylint, etc.) in the project

## Examples

### Full Code Review

**User:** "Review the payment processing module for security and code quality"

**Agent Response:**

"Code review completed. Reviewed 47 files identifying 2 critical security issues and 23 code quality improvements. Provided 41 specific suggestions for enhancement. Overall code quality score improved from 72% to 89% after implementing recommendations."

Findings include:
- **Critical:** SQL injection vulnerability in `processPayment()` -- use parameterized queries
- **Critical:** Sensitive data logged in plaintext in `logTransaction()` -- mask card numbers
- **Warning:** N+1 query pattern in `getOrderHistory()` -- use batch loading
- **Suggestion:** Extract duplicate validation logic into shared `validateAmount()` utility

## Related Components

- [refactoring-specialist](../refactoring-specialist/) -- Apply recommended refactoring patterns
- [performance-engineer](../performance-engineer/) -- Deep-dive on performance bottlenecks
- [typescript-pro](../typescript-pro/) -- TypeScript-specific type safety review
- [frontend-developer](../frontend-developer/) -- Frontend code implementation
- [fullstack-developer](../fullstack-developer/) -- Full-stack implementation support
