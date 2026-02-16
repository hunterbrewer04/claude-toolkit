# TypeScript Pro

> Senior TypeScript developer with mastery of TypeScript 5.0+, advanced type system features, and full-stack type safety.

## Overview

The TypeScript Pro is a sub-agent specializing in advanced TypeScript type system patterns, complex generics, type-level programming, and end-to-end type safety across full-stack applications. It handles everything from conditional types and mapped types to monorepo TypeScript architecture, large-scale JavaScript-to-TypeScript migrations, and code generation pipelines.

## Agent Configuration

| Property | Value |
|----------|-------|
| **Type** | Sub-agent |
| **Model** | `sonnet` |
| **Max Turns** | Inherits from parent |

## Capabilities

### Tools

- `Read` -- Read TypeScript source, tsconfig files, and type definitions
- `Write` -- Create type definitions, utility types, and configuration files
- `Edit` -- Modify existing TypeScript code and configurations
- `Bash` -- Run TypeScript compiler, build tools, and type checking commands
- `Glob` -- Find TypeScript files, declaration files, and config files
- `Grep` -- Search for type patterns, `any` usage, and type imports

### Strengths

- Advanced type patterns (conditional types, mapped types, template literal types, discriminated unions, branded types)
- Type system mastery (generic constraints, recursive types, type-level programming, infer keyword, distributive conditional types)
- Full-stack type safety (shared frontend/backend types, tRPC, GraphQL codegen, type-safe routing)
- Build and tooling (tsconfig optimization, project references, incremental compilation, path mapping)
- Testing with types (type-safe test utilities, mock type generation, property-based testing)
- Framework expertise (React, Vue 3, Angular, Next.js, Express/Fastify, NestJS, Svelte, Solid.js)
- Monorepo patterns (workspace configuration, shared type packages, build orchestration)
- Code generation (OpenAPI to TypeScript, GraphQL codegen, database schema types, route type generation)

## Invocation Pattern

```
Use the Task tool to invoke the typescript-pro sub-agent:

Task: "Create a type-safe API client library with generic request/response handling, conditional types based on method names, and discriminated unions for success/error responses"
```

## When to Use

- Building libraries or frameworks requiring advanced type patterns (conditional types, mapped types, type-level programming)
- Migrating large JavaScript codebases to TypeScript with graduated strict mode rollout
- Architecting end-to-end type safety across frontend and backend (tRPC, shared types, codegen)
- Optimizing TypeScript build performance in monorepos with project references
- Creating generic type utilities, branded types, or type-safe abstractions for team consumption

## When NOT to Use

- You need general frontend development with UI work (use [frontend-developer](../frontend-developer/))
- You need React-specific optimization (use [react-specialist](../react-specialist/))
- You need full-stack feature development (use [fullstack-developer](../fullstack-developer/))
- You need code quality review (use [code-reviewer](../code-reviewer/))

## How It Works

1. **Type Architecture Analysis** -- Queries the context-manager for existing TypeScript configuration and project setup. Reviews tsconfig.json, assesses type coverage, analyzes generic usage patterns, and identifies type safety gaps.
2. **Type-Driven Implementation** -- Designs type-first APIs, creates branded types for domains, builds generic utilities, implements type guards, uses discriminated unions, and documents type intentions.
3. **Type Quality Assurance** -- Verifies type coverage, strict mode compliance, build time optimization, bundle size, type complexity metrics, error message clarity, and IDE performance.

## Input/Output

### Input

- TypeScript project configuration and source code
- Type safety requirements and migration goals
- API contracts and database schemas for type generation
- Build performance metrics and bundle analysis

### Output

- Type definitions and utility type libraries
- tsconfig.json optimizations and project reference setup
- Type-safe API clients and data fetching layers
- Migration plans and graduated TypeScript adoption strategies
- Build performance improvements and bundle size reductions

### Example Progress Update

```json
{
  "agent": "typescript-pro",
  "status": "implementing",
  "progress": {
    "modules_typed": ["api", "models", "utils"],
    "type_coverage": "100%",
    "build_time": "3.2s",
    "bundle_size": "142kb"
  }
}
```

## Directory Structure

```
sub-agents/typescript-pro/
  typescript-pro.md   # Agent definition and system prompt
  README.md           # This file
```

## Setup & Installation

No additional setup required. The typescript-pro sub-agent is available within the claude-toolkit. It works with any TypeScript 5.0+ project and adapts to the project's existing build tools and framework.

## Configuration Options

### TypeScript Development Targets

| Metric | Target |
|--------|--------|
| Strict mode | All compiler flags enabled |
| Explicit `any` usage | Zero without justification |
| Public API type coverage | 100% |
| ESLint + Prettier | Configured |
| Test coverage | > 90% |
| Source maps | Properly configured |
| Declaration files | Generated |

## Dependencies

- No external dependencies for the agent itself
- Targets TypeScript 5.0+ projects
- Works with standard TypeScript tooling (tsc, tsconfig, project references, etc.)

## Examples

### Type-Safe API Client Library

**User:** "Create a type-safe API client library using TypeScript where callers get full type inference for requests and responses without casting."

**Agent Response:**

"I'll design a type-driven API client using advanced TypeScript features: generic constraints for request/response pairs, conditional types to infer response shapes based on endpoint, discriminated unions for Result<Success, Error> patterns, and type-safe builder for requests. This ensures zero-runtime type errors and full IDE autocomplete."

**Delivery:**

"TypeScript implementation completed. Delivered full-stack application with 100% type coverage, end-to-end type safety via tRPC, and optimized bundles (40% size reduction). Build time improved by 60% through project references. Zero runtime type errors possible."

### Large-Scale JS to TS Migration

**User:** "We need to gradually migrate our 500k LOC JavaScript monorepo to TypeScript."

**Agent Response:**

"I'll architect a multi-phase migration: set up tsconfig with project references for isolated compilation, establish type coverage metrics and CI checks, implement type-only exports to prevent dependency bloat, configure allowJs/checkJs for gradual enforcement, and create migration guides for team onboarding."

## Related Components

- [react-specialist](../react-specialist/) -- React-specific TypeScript patterns
- [frontend-developer](../frontend-developer/) -- Frontend TypeScript development
- [fullstack-developer](../fullstack-developer/) -- Full-stack type sharing
- [code-reviewer](../code-reviewer/) -- TypeScript code quality review
- [refactoring-specialist](../refactoring-specialist/) -- TypeScript refactoring patterns
