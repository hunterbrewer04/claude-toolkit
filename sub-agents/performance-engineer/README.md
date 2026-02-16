# Performance Engineer

> Senior performance engineer specializing in bottleneck identification, load testing, and system optimization.

## Overview

The Performance Engineer is a sub-agent that identifies and eliminates performance bottlenecks across applications, databases, and infrastructure. It conducts systematic profiling, designs and executes load tests, implements optimizations, and establishes monitoring for continuous performance improvement with measurable results.

## Agent Configuration

| Property | Value |
|----------|-------|
| **Type** | Sub-agent |
| **Model** | `sonnet` |
| **Max Turns** | Inherits from parent |

## Capabilities

### Tools

- `Read` -- Read source code, configuration files, and profiling output
- `Write` -- Create performance test scripts, reports, and configurations
- `Edit` -- Apply performance optimizations to existing code
- `Bash` -- Run profiling tools, load tests, and benchmarks
- `Glob` -- Find configuration files, logs, and test scripts
- `Grep` -- Search for performance anti-patterns and bottleneck indicators

### Strengths

- Performance testing (load, stress, spike, soak, volume, scalability)
- Bottleneck analysis (CPU profiling, memory analysis, I/O, network latency, thread contention)
- Application profiling (code hotspots, method timing, memory allocation, garbage collection)
- Database optimization (query analysis, index optimization, execution plans, connection pooling)
- Infrastructure tuning (OS kernel parameters, container limits, cloud instance sizing)
- Caching strategies (application, database, CDN, Redis, browser, API caching)
- Scalability engineering (horizontal/vertical scaling, auto-scaling, load balancing, sharding)
- Performance monitoring (real user monitoring, synthetic monitoring, APM, alerting)

## Invocation Pattern

```
Use the Task tool to invoke the performance-engineer sub-agent:

Task: "Profile our API endpoints to identify why response times are averaging 2.5 seconds and implement optimizations to get below 500ms"
```

## When to Use

- API response times or page load times exceed acceptable thresholds
- Database queries have degraded after a migration or data growth
- You need to validate that infrastructure can handle projected traffic growth
- You want to establish performance baselines and monitoring
- You need capacity planning for expected traffic increases

## When NOT to Use

- You need to build new features (use [fullstack-developer](../fullstack-developer/))
- You need a general code review (use [code-reviewer](../code-reviewer/))
- You need to refactor code structure without performance focus (use [refactoring-specialist](../refactoring-specialist/))

## How It Works

1. **Performance Analysis** -- Queries the context-manager for SLAs, current metrics, architecture, and load patterns. Establishes baselines, profiles applications, analyzes databases, and reviews infrastructure.
2. **Optimization Implementation** -- Designs test scenarios, executes load tests, profiles systems, identifies bottlenecks, implements optimizations, and validates improvements with data.
3. **Performance Excellence** -- Verifies SLAs are exceeded, sets up comprehensive monitoring, documents changes, establishes capacity planning, and enables continuous improvement.

## Input/Output

### Input

- Performance requirements and SLAs
- Current metrics and pain points
- System architecture details
- Load patterns and traffic projections

### Output

- Performance baseline reports
- Profiling results with bottleneck identification
- Optimization implementations with before/after metrics
- Load test results and capacity plans
- Monitoring dashboards and alert configurations

### Example Progress Update

```json
{
  "agent": "performance-engineer",
  "status": "optimizing",
  "progress": {
    "response_time_improvement": "68%",
    "throughput_increase": "245%",
    "resource_reduction": "40%",
    "cost_savings": "35%"
  }
}
```

## Directory Structure

```
sub-agents/performance-engineer/
  performance-engineer.md   # Agent definition and system prompt
  README.md                 # This file
```

## Setup & Installation

No additional setup required. The performance-engineer sub-agent is available within the claude-toolkit. For best results, ensure profiling tools and load testing frameworks are available in the project environment.

## Configuration Options

### Performance Targets

| Metric | Target |
|--------|--------|
| Performance baselines | Established |
| Bottlenecks | Identified and eliminated |
| Load tests | Comprehensive |
| Scalability | Verified |
| Monitoring | Implemented |

## Dependencies

- No external dependencies for the agent itself
- Benefits from profiling tools (e.g., `perf`, `flamegraph`, `clinic.js`) in the environment
- Benefits from load testing tools (e.g., `k6`, `Artillery`, `JMeter`) in the environment

## Examples

### API Performance Optimization

**User:** "We're seeing slow API response times averaging 2.5 seconds. Can you help identify what's causing the bottleneck?"

**Agent Response:**

"I'll profile the application, analyze database queries, check resource utilization, and run load tests to identify the root cause. Let me start by collecting performance baselines and examining CPU, memory, and I/O patterns."

**Delivery:**

"Performance optimization completed. Improved response time by 68% (2.1s to 0.67s), increased throughput by 245% (1.2k to 4.1k RPS), and reduced resource usage by 40%. System now handles 10x peak load with linear scaling. Implemented comprehensive monitoring and capacity planning."

### Database Query Regression

**User:** "Our main query got much slower after migrating data. How do we fix this?"

**Agent Response:**

"I'll analyze the execution plan, check index efficiency, review query optimization, and test different approaches. I can profile the database workload and implement targeted indexing and caching strategies."

## Related Components

- [code-reviewer](../code-reviewer/) -- Identify performance issues during code review
- [refactoring-specialist](../refactoring-specialist/) -- Refactor code for structural performance gains
- [fullstack-developer](../fullstack-developer/) -- Implement performance-optimized features
- [frontend-developer](../frontend-developer/) -- Frontend performance (bundle size, rendering)
- [react-specialist](../react-specialist/) -- React-specific rendering optimization
