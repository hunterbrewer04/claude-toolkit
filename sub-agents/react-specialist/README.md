# React Specialist

> Senior React specialist with expertise in React 18+, advanced patterns, performance optimization, and production architectures.

## Overview

The React Specialist is a sub-agent focused exclusively on the React ecosystem. It handles advanced React 18+ features, performance optimization, complex state management, server components, concurrent rendering, and strategic migrations. It is the go-to agent for React-specific challenges that require deep framework knowledge beyond general frontend development.

## Agent Configuration

| Property | Value |
|----------|-------|
| **Type** | Sub-agent |
| **Model** | `sonnet` |
| **Max Turns** | Inherits from parent |

## Capabilities

### Tools

- `Read` -- Read React components, hooks, configs, and test files
- `Write` -- Create new components, hooks, tests, and configurations
- `Edit` -- Modify existing React code and configurations
- `Bash` -- Run React build tools, test suites, and profiling commands
- `Glob` -- Find component files, hook files, and test files
- `Grep` -- Search for React patterns, hook usage, and anti-patterns

### Strengths

- Advanced React patterns (compound components, render props, HOCs, custom hooks, context optimization)
- State management (Redux Toolkit, Zustand, Jotai, Recoil, Context API)
- Performance optimization (React.memo, useMemo, useCallback, code splitting, virtual scrolling, concurrent features)
- Server-side rendering (Next.js, Remix, server components, streaming SSR, selective hydration)
- Testing (React Testing Library, Jest, Cypress E2E, component/hook/integration testing)
- React ecosystem integration (TanStack Query, React Hook Form, Framer Motion, Tailwind, Styled Components)
- Hooks mastery (useState, useEffect, useContext, useReducer, useMemo, useCallback, useRef, custom hooks)
- Concurrent features (useTransition, useDeferredValue, Suspense, streaming HTML, priority scheduling)

## Invocation Pattern

```
Use the Task tool to invoke the react-specialist sub-agent:

Task: "Optimize our React dashboard that has 8 custom hooks per component, 850KB bundle, and memory leak issues"
```

## When to Use

- Existing React app has performance degradation (unnecessary re-renders, large bundles, memory leaks)
- Migrating React 16 class components to React 18 with concurrent features and server components
- Building shared hook libraries and component composition systems for multi-team React monorepos
- Implementing advanced React patterns that require deep framework expertise
- Optimizing React-specific rendering, hydration, or state management

## When NOT to Use

- You need multi-framework frontend work across React, Vue, and Angular (use [frontend-developer](../frontend-developer/))
- You need full-stack feature development (use [fullstack-developer](../fullstack-developer/))
- You need general TypeScript architecture without React focus (use [typescript-pro](../typescript-pro/))
- You need visual design specifications (use [ui-designer](../ui-designer/))

## How It Works

1. **Architecture Planning** -- Queries the context-manager for React project requirements, component structure, state management approach, and performance goals. Designs component hierarchy and state flow.
2. **Implementation** -- Creates components, implements state management, adds routing, optimizes performance, writes tests, handles errors, adds accessibility, and prepares for deployment.
3. **React Excellence** -- Delivers with performance optimized, tests comprehensive (90%+ coverage), accessibility complete, bundle minimized, SEO optimized, and documentation clear.

## Input/Output

### Input

- React component code needing optimization or migration
- Performance profiling data and metrics
- Feature requirements for React-specific implementation
- Existing hook and component architecture

### Output

- Optimized React components with TypeScript
- Custom hook libraries with full test coverage
- Performance reports (bundle size, Lighthouse scores, Core Web Vitals)
- Migration plans and implementation for version upgrades
- Component documentation and Storybook stories

### Example Progress Update

```json
{
  "agent": "react-specialist",
  "status": "implementing",
  "progress": {
    "components_created": 47,
    "test_coverage": "92%",
    "performance_score": 98,
    "bundle_size": "142KB"
  }
}
```

## Directory Structure

```
sub-agents/react-specialist/
  react-specialist.md   # Agent definition and system prompt
  README.md             # This file
```

## Setup & Installation

No additional setup required. The react-specialist sub-agent is available within the claude-toolkit. It works with any React 18+ project and adapts to the project's existing tooling (Next.js, Remix, Vite, webpack, etc.).

## Configuration Options

### Performance Targets

| Metric | Target |
|--------|--------|
| Component reusability | > 80% |
| Performance score | > 95 |
| Test coverage | > 90% |
| Load time | < 2s |
| Time to interactive | < 3s |
| First contentful paint | < 1s |
| Core Web Vitals | Passed |

## Dependencies

- No external dependencies for the agent itself
- Targets React 18+ projects
- Works with standard React tooling (Next.js, Remix, Vite, Jest, React Testing Library, etc.)

## Examples

### Performance Optimization

**User:** "Our React dashboard is slow. Components re-render constantly, bundle is 850KB, and we have memory issues."

**Agent Response:**

"I'll analyze your component architecture and profiling data to identify unnecessary re-renders, implement useMemo/useCallback strategically, refactor hook composition to reduce overhead, implement code splitting for lazy loading, optimize state management, and set up Performance Observer for continuous monitoring."

**Delivery:**

"React application completed. Created 47 components with 92% test coverage. Achieved 98 performance score with 142KB bundle size. Implemented advanced patterns including server components, concurrent features, and optimized state management."

### React 16 to 18 Migration

**User:** "Need to upgrade our React 16 codebase to React 18 and leverage Server Components. We have 200+ class components and currently use Redux."

**Agent Response:**

"I'll create a migration strategy that gradually converts class components to functional components with hooks, implements useTransition for non-blocking updates, sets up Server Components with streaming SSR, migrates Redux to a more modern state solution like Zustand or React Context with useReducer, and establishes performance benchmarks to validate improvements at each step."

## Related Components

- [frontend-developer](../frontend-developer/) -- Multi-framework frontend development
- [typescript-pro](../typescript-pro/) -- Advanced TypeScript patterns for React
- [fullstack-developer](../fullstack-developer/) -- Full-stack React integration
- [performance-engineer](../performance-engineer/) -- System-wide performance optimization
- [ui-designer](../ui-designer/) -- Visual design for React components
- [code-reviewer](../code-reviewer/) -- React code quality review
