# UI Designer

> Expert visual designer specializing in intuitive, beautiful, and accessible user interfaces.

## Overview

The UI Designer is a sub-agent focused on visual design, interaction design, and design systems. It creates beautiful, functional interfaces that balance aesthetics with usability, maintaining consistency, accessibility (WCAG 2.1 AA), and brand alignment across all touchpoints including web, iOS, Android, and desktop platforms.

## Agent Configuration

| Property | Value |
|----------|-------|
| **Type** | Sub-agent |
| **Model** | `sonnet` |
| **Max Turns** | Inherits from parent |

## Capabilities

### Tools

- `Read` -- Read existing design files, style guides, and component specs
- `Write` -- Create design token files, style guides, and specification documents
- `Edit` -- Modify existing design configurations and component styles
- `Bash` -- Run design tooling commands and asset optimization
- `Glob` -- Find design files, style files, and component directories
- `Grep` -- Search for design tokens, color values, and style patterns

### Strengths

- Visual design and brand identity alignment
- Design system creation (component libraries, design tokens, style guides)
- Interaction design (state variations, transitions, micro-interactions)
- Accessibility compliance (WCAG 2.1 AA)
- Motion design (animation principles, timing functions, performance budgets)
- Dark mode design (color adaptation, contrast adjustment, system integration)
- Cross-platform consistency (web, iOS, Android, desktop)
- Developer handoff (specifications, annotations, implementation guidelines)

## Invocation Pattern

```
Use the Task tool to invoke the ui-designer sub-agent:

Task: "Design a comprehensive component system for our dashboard with responsive layouts, dark mode support, and WCAG 2.1 AA accessibility"
```

## When to Use

- Creating or extending a design system with consistent components and tokens
- Designing visual interfaces with proper hierarchy, spacing, and typography
- Implementing dark mode with proper color adaptation and contrast
- Ensuring accessibility compliance across all UI components
- Preparing developer handoff with specifications and implementation guidelines
- Designing cross-platform experiences (web, mobile, desktop)

## When NOT to Use

- You need to implement frontend code (use [frontend-developer](../frontend-developer/))
- You need React-specific component implementation (use [react-specialist](../react-specialist/))
- You need performance optimization (use [performance-engineer](../performance-engineer/))
- You need backend implementation (use [fullstack-developer](../fullstack-developer/))

## How It Works

1. **Context Discovery** -- Queries the context-manager for brand guidelines, existing design system, component libraries, visual patterns, accessibility requirements, and target user demographics.
2. **Design Execution** -- Creates visual concepts and variations, builds component systems, defines interaction patterns, documents design decisions, and prepares developer handoff materials.
3. **Handoff and Documentation** -- Delivers component specifications, implementation guidelines, accessibility annotations, design tokens, and asset packages with comprehensive documentation.

## Input/Output

### Input

- Brand guidelines and visual identity requirements
- Feature requirements and user stories
- Existing design system components and patterns
- Accessibility requirements and platform targets

### Output

- Design files with component libraries
- Style guide documentation
- Design token exports (CSS variables, JSON)
- Asset packages (icons, images, illustrations)
- Specification documents with annotations
- Implementation notes for developers
- Prototype links
- Accessibility audit results

### Example Status Update

```json
{
  "agent": "ui-designer",
  "update_type": "progress",
  "current_task": "Component design",
  "completed_items": ["Visual exploration", "Component structure", "State variations"],
  "next_steps": ["Motion design", "Documentation"]
}
```

## Directory Structure

```
sub-agents/ui-designer/
  ui-designer.md   # Agent definition and system prompt
  README.md        # This file
```

## Setup & Installation

No additional setup required. The ui-designer sub-agent is available within the claude-toolkit. It works with any design system approach and outputs in formats compatible with standard frontend frameworks.

## Configuration Options

### Design Quality Targets

| Area | Target |
|------|--------|
| Accessibility | WCAG 2.1 AA compliance |
| Dark mode | Full support with proper contrast |
| Responsive | All breakpoints covered |
| Cross-platform | Web, iOS, Android consistency |
| Documentation | Complete specs and handoff |

## Dependencies

- No external dependencies for the agent itself
- Benefits from existing brand guidelines and design system documentation

## Examples

### Comprehensive Design System

**User:** "Create a design system with 47 components, responsive layouts, and dark mode support"

**Agent Response:**

"UI design completed successfully. Delivered comprehensive design system with 47 components, full responsive layouts, and dark mode support. Includes Figma component library, design tokens, and developer handoff documentation. Accessibility validated at WCAG 2.1 AA level."

Deliverables include:
- Component specifications with state variations
- Design tokens (colors, spacing, typography, shadows)
- Dark mode color mappings and contrast validation
- Responsive breakpoint definitions
- Animation and motion specifications
- Accessibility annotations per component
- Developer implementation guidelines

### Design Critique Process

The agent follows a structured review cycle:

1. Self-review checklist
2. Peer feedback integration
3. Stakeholder review
4. User testing insights
5. Iteration cycles
6. Final approval and version control

## Related Components

- [frontend-developer](../frontend-developer/) -- Implements designs as frontend code
- [react-specialist](../react-specialist/) -- React-specific component implementation
- [fullstack-developer](../fullstack-developer/) -- End-to-end feature with UI
- [performance-engineer](../performance-engineer/) -- Asset optimization and rendering performance
- [code-reviewer](../code-reviewer/) -- Review of design system code implementation
