# Refactoring Specialist

> Senior refactoring specialist transforming complex, poorly structured code into clean, maintainable systems.

## Overview

The Refactoring Specialist is a sub-agent that safely transforms code to improve quality without changing behavior. It detects code smells, applies systematic refactoring patterns, and guarantees safety through comprehensive testing. It excels at reducing complexity, eliminating duplication, and applying design patterns while preserving 100% backward compatibility.

## Agent Configuration

| Property | Value |
|----------|-------|
| **Type** | Sub-agent |
| **Model** | `sonnet` |
| **Max Turns** | Inherits from parent |

## Capabilities

### Tools

- `Read` -- Read source files, tests, and configuration for analysis
- `Write` -- Create characterization tests, refactored files, and reports
- `Edit` -- Apply incremental refactoring changes to existing code
- `Bash` -- Run test suites, static analysis tools, and complexity metrics
- `Glob` -- Find files with code smells, duplicated patterns, and test files
- `Grep` -- Search for anti-patterns, duplicated code, and refactoring targets

### Strengths

- Code smell detection (long methods, large classes, feature envy, data clumps, primitive obsession)
- Refactoring catalog (extract method, inline variable, encapsulate variable, introduce parameter object)
- Advanced refactoring (replace conditional with polymorphism, extract superclass, form template method)
- Safety practices (characterization tests, small incremental changes, continuous integration)
- Automated refactoring (AST transformations, pattern matching, batch refactoring, cross-file changes)
- Test-driven refactoring (golden master testing, approval testing, mutation testing, coverage analysis)
- Performance refactoring (algorithm optimization, caching strategies, database query tuning)
- Architecture refactoring (layer extraction, dependency inversion, service extraction, API improvement)

## Invocation Pattern

```
Use the Task tool to invoke the refactoring-specialist sub-agent:

Task: "Refactor the payment processing module -- methods exceed 200 lines, 15% code duplication, and deeply nested conditionals"
```

## When to Use

- Code quality metrics show high complexity, duplication, or large method sizes
- You need to consolidate multiple similar classes using design patterns
- Performance issues stem from structural inefficiencies (N+1 queries, inefficient data access patterns)
- Legacy code needs modernization while preserving existing behavior
- Technical debt has accumulated and needs systematic reduction

## When NOT to Use

- You need to add new features (use [fullstack-developer](../fullstack-developer/) or [frontend-developer](../frontend-developer/))
- You need a code review without changes (use [code-reviewer](../code-reviewer/))
- You need performance profiling and load testing (use [performance-engineer](../performance-engineer/))

## How It Works

1. **Code Analysis** -- Queries the context-manager for code quality issues and goals. Runs static analysis, calculates complexity metrics, identifies code smells, checks test coverage, and analyzes dependencies.
2. **Incremental Refactoring** -- Ensures test coverage first, then makes small, verified changes: one refactoring at a time, tests after each step, commits frequently, preserves behavior, and documents decisions.
3. **Code Excellence** -- Delivers with code smells eliminated, complexity minimized, tests comprehensive, performance maintained, documentation current, and metrics improved.

## Input/Output

### Input

- Source code with identified quality issues
- Complexity metrics and static analysis results
- Test coverage reports
- Specific refactoring goals and constraints

### Output

- Refactored code with preserved behavior
- Updated or new test suites (characterization tests, regression tests)
- Code metrics before/after comparison
- Documentation of applied patterns and decisions
- Refactoring summary report

### Example Progress Update

```json
{
  "agent": "refactoring-specialist",
  "status": "refactoring",
  "progress": {
    "methods_refactored": 156,
    "complexity_reduction": "43%",
    "code_duplication": "-67%",
    "test_coverage": "94%"
  }
}
```

## Directory Structure

```
sub-agents/refactoring-specialist/
  refactoring-specialist.md   # Agent definition and system prompt
  README.md                   # This file
```

## Setup & Installation

No additional setup required. The refactoring-specialist sub-agent is available within the claude-toolkit. For best results, ensure the project has an existing test suite and static analysis tooling.

## Configuration Options

### Refactoring Safety Targets

| Metric | Target |
|--------|--------|
| Behavior changes | Zero |
| Test coverage | Maintained or increased |
| Cyclomatic complexity | Reduced |
| Code duplication | Eliminated |
| Performance | Maintained or improved |

## Dependencies

- No external dependencies for the agent itself
- Benefits from existing test suites in the project
- Benefits from static analysis tools (ESLint, SonarQube, etc.)

## Examples

### Legacy Payment Module Refactoring

**User:** "Help me refactor this legacy payment processing module. The methods are too long and the logic is hard to follow."

**Agent Response:**

"I'll analyze the code for smells like long methods and duplicated logic, create comprehensive characterization tests to verify behavior, then systematically apply extract method, inline temporary variables, and consolidate duplicate code while tracking complexity metrics."

**Delivery:**

"Refactoring completed. Transformed 156 methods reducing cyclomatic complexity by 43%. Eliminated 67% of code duplication through extract method and DRY principles. Maintained 100% backward compatibility with comprehensive test suite at 94% coverage."

### Design Pattern Consolidation

**User:** "We have three similar service classes that do almost the same thing. Can you refactor them to use a single abstract base class and strategy pattern?"

**Agent Response:**

"I'll extract the common interface, create a template method for shared behavior, break dependencies, apply the strategy pattern to the divergent parts, then run the full test suite to ensure zero behavior changes while dramatically reducing duplication."

## Related Components

- [code-reviewer](../code-reviewer/) -- Identify code quality issues before refactoring
- [performance-engineer](../performance-engineer/) -- Performance-focused optimization
- [typescript-pro](../typescript-pro/) -- TypeScript-specific type refactoring
- [fullstack-developer](../fullstack-developer/) -- Full-stack feature refactoring
- [frontend-developer](../frontend-developer/) -- Frontend component refactoring
