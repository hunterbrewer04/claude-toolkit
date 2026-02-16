# Frontend Developer

> Senior frontend developer specializing in modern web applications with deep expertise in React 18+, Vue 3+, and Angular 15+.

## Overview

The Frontend Developer is a multi-framework sub-agent that builds performant, accessible, and maintainable user interfaces. It handles the complete frontend lifecycle from architecture to deployment, including component development, state management, responsive design, real-time features, and comprehensive testing across React, Vue, and Angular ecosystems.

## Agent Configuration

| Property | Value |
|----------|-------|
| **Type** | Sub-agent |
| **Model** | `sonnet` |
| **Max Turns** | Inherits from parent |

## Capabilities

### Tools

- `Read` -- Read source files, configs, and existing components
- `Write` -- Create new component files, tests, and configurations
- `Edit` -- Modify existing source code and configurations
- `Bash` -- Run build tools, test suites, and package managers
- `Glob` -- Find component files, styles, and test files
- `Grep` -- Search for patterns, imports, and usage across the codebase

### Strengths

- Multi-framework development (React 18+, Vue 3+, Angular 15+)
- TypeScript-first development with strict mode
- Component architecture and design system implementation
- State management (Redux, Zustand, Pinia, NgRx)
- Responsive design and accessibility (WCAG compliance)
- Real-time features (WebSocket, SSE, optimistic updates)
- Testing with 85%+ coverage targets
- Performance optimization and bundle analysis

## Invocation Pattern

```
Use the Task tool to invoke the frontend-developer sub-agent:

Task: "Build a React frontend for the product catalog with filtering, cart management, and checkout flow using TypeScript and Tailwind CSS"
```

## When to Use

- Building complete frontend applications with multiple pages and complex state
- Migrating legacy frontends to modern frameworks (e.g., jQuery to Vue 3)
- Creating shared component libraries across React, Vue, and Angular
- Implementing responsive layouts with accessibility compliance
- Integrating frontend with backend APIs and real-time features

## When NOT to Use

- You only need React-specific optimization or advanced hooks (use [react-specialist](../react-specialist/))
- You need backend API or database implementation (use [fullstack-developer](../fullstack-developer/))
- You only need visual design mockups without code (use [ui-designer](../ui-designer/))
- You need TypeScript type system architecture without UI work (use [typescript-pro](../typescript-pro/))

## How It Works

1. **Context Discovery** -- Queries the context-manager to map the existing frontend landscape: component architecture, design tokens, state management patterns, testing strategies, and build pipeline.
2. **Development Execution** -- Scaffolds components with TypeScript interfaces, implements responsive layouts, integrates with state management, writes tests alongside implementation, and ensures accessibility from the start.
3. **Handoff and Documentation** -- Notifies the context-manager of created/modified files, documents component APIs and usage patterns, highlights architectural decisions, and provides integration points for next steps.

## Input/Output

### Input

- Feature requirements and UI specifications
- Design mockups or wireframes
- API contracts and data schemas
- Existing codebase context

### Output

- Component files with TypeScript definitions
- Test files with >85% coverage
- Storybook documentation
- Performance metrics report
- Accessibility audit results
- Bundle analysis output
- Build configuration files

### Example Status Update

```json
{
  "agent": "frontend-developer",
  "update_type": "progress",
  "current_task": "Component implementation",
  "completed_items": ["Layout structure", "Base styling", "Event handlers"],
  "next_steps": ["State integration", "Test coverage"]
}
```

## Directory Structure

```
sub-agents/frontend-developer/
  frontend-developer.md   # Agent definition and system prompt
  README.md               # This file
```

## Setup & Installation

No additional setup required. The frontend-developer sub-agent is available within the claude-toolkit. It works with any existing frontend project structure and adapts to the project's framework, build tools, and conventions.

## Configuration Options

### TypeScript Configuration Targets

| Setting | Value |
|---------|-------|
| Strict mode | Enabled |
| No implicit any | Enabled |
| Strict null checks | Enabled |
| Target | ES2022 with polyfills |
| Path aliases | Enabled |
| Declaration files | Generated |

## Dependencies

- No external dependencies for the agent itself
- Targets projects using React 18+, Vue 3+, or Angular 15+
- Works with standard frontend tooling (Vite, webpack, esbuild, etc.)

## Examples

### Build a React E-Commerce Frontend

**User:** "Build a React frontend for product catalog with filtering, cart management, and checkout flow. Need TypeScript, responsive design, and 85% test coverage."

**Agent Response:**

"I'll create a scalable React frontend with component architecture, state management using Redux or Zustand, responsive Tailwind CSS styling, accessibility compliance, and comprehensive testing. First, let me query the context-manager for your existing infrastructure, design language, and API contracts."

**Delivery:**

"UI components delivered successfully. Created reusable Dashboard module with full TypeScript support in `/src/components/Dashboard/`. Includes responsive design, WCAG compliance, and 90% test coverage. Ready for integration with backend APIs."

### Migrate jQuery to Vue 3

**User:** "We need to modernize our PHP web app's frontend from jQuery to Vue 3."

**Agent Response:**

"I'll architect a Vue 3 migration strategy preserving backend contracts, gradually replace jQuery components with Vue Single File Components, implement TypeScript for type safety, add composition API patterns, ensure 90% test coverage, and maintain zero-downtime during rollout."

## Related Components

- [react-specialist](../react-specialist/) -- React-specific optimization and advanced patterns
- [ui-designer](../ui-designer/) -- Visual design specifications and design systems
- [typescript-pro](../typescript-pro/) -- Advanced TypeScript type patterns
- [fullstack-developer](../fullstack-developer/) -- End-to-end feature development
- [performance-engineer](../performance-engineer/) -- Frontend performance profiling
