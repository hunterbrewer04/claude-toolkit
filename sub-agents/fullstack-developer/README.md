# Fullstack Developer

> End-to-end feature owner with expertise across the entire stack, from database to UI.

## Overview

The Fullstack Developer is a sub-agent that delivers complete, production-ready features spanning database, API, and frontend layers. It focuses on seamless integration across the stack with type-safe data flow, cross-layer authentication, real-time capabilities, and comprehensive end-to-end testing.

## Agent Configuration

| Property | Value |
|----------|-------|
| **Type** | Sub-agent |
| **Model** | `sonnet` |
| **Max Turns** | Inherits from parent |

## Capabilities

### Tools

- `Read` -- Read source files, schemas, and configurations across the stack
- `Write` -- Create new files for backend, frontend, and shared code
- `Edit` -- Modify existing code across all layers
- `Bash` -- Run build tools, migrations, test suites, and deployment scripts
- `Glob` -- Find files across backend, frontend, and shared directories
- `Grep` -- Search for patterns, types, and usage across the full codebase

### Strengths

- Data flow architecture (database through API to frontend)
- Type-safe API implementation with shared TypeScript types
- Cross-stack authentication (JWT, SSO, RBAC, row-level security)
- Real-time features (WebSocket, event-driven architecture, pub/sub)
- End-to-end testing covering complete user journeys
- Deployment pipeline setup (CI/CD, Docker, monitoring)
- Shared code management (validation schemas, utility libraries)
- Architecture decisions (monorepo vs polyrepo, microservices vs monolith)

## Invocation Pattern

```
Use the Task tool to invoke the fullstack-developer sub-agent:

Task: "Build a complete user management system with PostgreSQL database, Node.js API, and React frontend including JWT authentication and real-time notifications"
```

## When to Use

- Building a complete feature that spans database, API, and frontend
- Implementing cross-stack authentication and authorization flows
- Setting up real-time features requiring coordination between server and client
- Creating shared type definitions and validation between layers
- Designing and implementing deployment pipelines for full features

## When NOT to Use

- You only need frontend work (use [frontend-developer](../frontend-developer/))
- You only need React-specific work (use [react-specialist](../react-specialist/))
- You need a focused code review (use [code-reviewer](../code-reviewer/))
- You need performance profiling only (use [performance-engineer](../performance-engineer/))

## How It Works

1. **Architecture Planning** -- Queries the context-manager for the full technology landscape (database schemas, API architecture, frontend framework, auth system, deployment setup). Designs data models, API contracts, component architecture, and security boundaries.
2. **Integrated Development** -- Builds features with stack-wide consistency: database schema implementation, API endpoint creation, frontend component building, authentication integration, state management, and comprehensive testing.
3. **Stack-Wide Delivery** -- Delivers with database migrations ready, API documentation complete, frontend build optimized, tests passing at all levels, deployment scripts prepared, and monitoring configured.

## Input/Output

### Input

- Feature requirements spanning multiple layers
- Existing technology stack details
- API contracts and database schemas
- Authentication and authorization requirements

### Output

- Database migrations and schema files
- API endpoints with documentation
- Frontend components and pages
- Shared type definitions and validation schemas
- Test suites (unit, integration, E2E)
- Deployment configurations (Docker, CI/CD)
- Monitoring and observability setup

### Example Progress Update

```json
{
  "agent": "fullstack-developer",
  "status": "implementing",
  "stack_progress": {
    "backend": ["Database schema", "API endpoints", "Auth middleware"],
    "frontend": ["Components", "State management", "Route setup"],
    "integration": ["Type sharing", "API client", "E2E tests"]
  }
}
```

## Directory Structure

```
sub-agents/fullstack-developer/
  fullstack-developer.md   # Agent definition and system prompt
  README.md                # This file
```

## Setup & Installation

No additional setup required. The fullstack-developer sub-agent is available within the claude-toolkit. It adapts to any existing stack and works with common backend frameworks (Express, Fastify, NestJS), frontend frameworks (React, Vue, Angular), and databases (PostgreSQL, MongoDB, etc.).

## Configuration Options

### Development Checklist Targets

| Area | Target |
|------|--------|
| Database schema | Aligned with API contracts |
| API types | Shared with frontend via TypeScript |
| Auth flow | Spanning all layers |
| Error handling | Consistent throughout stack |
| E2E tests | Covering complete user journeys |
| Performance | Optimized at each layer |

## Dependencies

- No external dependencies for the agent itself
- Works with standard full-stack tooling and frameworks

## Examples

### Complete User Management System

**User:** "Build a complete user management system with PostgreSQL, Node.js API, and React frontend"

**Agent Response:**

"Full-stack feature delivered successfully. Implemented complete user management system with PostgreSQL database, Node.js/Express API, and React frontend. Includes JWT authentication, real-time notifications via WebSockets, and comprehensive test coverage. Deployed with Docker containers and monitored via Prometheus/Grafana."

### Feature Specification Approach

The agent follows a structured approach for each feature:

1. User story definition
2. Technical requirements gathering
3. API contract design
4. Database schema planning
5. Frontend component architecture
6. Test scenario creation
7. Performance target setting
8. Security consideration review

## Related Components

- [frontend-developer](../frontend-developer/) -- Dedicated frontend implementation
- [react-specialist](../react-specialist/) -- React-specific patterns and optimization
- [typescript-pro](../typescript-pro/) -- Advanced TypeScript type sharing across stack
- [performance-engineer](../performance-engineer/) -- Performance optimization across layers
- [code-reviewer](../code-reviewer/) -- Code quality review for full-stack features
- [ui-designer](../ui-designer/) -- UI design specifications
