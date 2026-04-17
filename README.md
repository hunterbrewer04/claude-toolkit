# Claude Toolkit

> A personal collection of Claude Code skills and sub-agents for structured development workflows, project management, and component authoring.

## Overview

Claude Toolkit is a curated repository of Claude Code extensions organized around three themes: **component authoring** (skills for building skills, agents, and hooks), **project management** (Linear integration), and **specialized development agents** (frontend, full-stack, TypeScript, performance, and more). Everything is designed to work independently or compose together — build a component with a builder skill, document it with claude-documentation, and publish it with claude-toolkit.

## Components

### Skills

| Skill | Description | Triggers |
|-------|-------------|----------|
| [canvas](./skills/canvas/) | Pull course data from Canvas LMS — assignments, grades, files, announcements, quizzes | `"what's due"`, `"canvas"`, `"my assignments"`, `"my grades"`, `"check my canvas"` |
| [agent-builder](./skills/agent-builder/) | Create Claude Code sub-agents following Anthropic patterns | `"create an agent"`, `"build a sub-agent"`, `"make a new agent"` |
| [claude-documentation](./skills/claude-documentation/) | Generate standardized README docs for Claude Code components | `"document this skill"`, `"generate a README"`, `"generate an index README"` |
| [claude-toolkit](./skills/claude-toolkit/) | Manage this GitHub repository of Claude Code components | `"add this to my toolkit"`, `"push to claude-toolkit"`, `"sync my claude-toolkit"` |
| [hook-builder](./skills/hook-builder/) | Build production-ready Claude Code hooks from scratch | `"create a hook"`, `"build a hook"`, `"make a PreToolUse hook"` |
| [linear-assistant](./skills/linear-assistant/) | Personal project management assistant for Linear | `"create a linear issue"`, `"what's on my plate"`, `"project progress"` |
| [skill-builder](./skills/skill-builder/) | Meta-skill for creating excellent Claude Code skills | `"create a skill"`, `"build a skill"`, `"improve a skill description"` |

### Sub-Agents

| Agent | Model | Description |
|-------|-------|-------------|
| [agent-installer](./sub-agents/agent-installer/) | `haiku` | Browse, search, and install community sub-agents from GitHub |
| [code-reviewer](./sub-agents/code-reviewer/) | `opus` | Expert code reviewer for quality, security, and best practices |
| [frontend-developer](./sub-agents/frontend-developer/) | `sonnet` | Multi-framework frontend development (React, Vue, Angular) |
| [fullstack-developer](./sub-agents/fullstack-developer/) | `sonnet` | End-to-end feature delivery from database to UI |
| [performance-engineer](./sub-agents/performance-engineer/) | `sonnet` | Bottleneck identification, profiling, and system optimization |
| [react-specialist](./sub-agents/react-specialist/) | `sonnet` | React 18+ advanced patterns, performance, and state management |
| [refactoring-specialist](./sub-agents/refactoring-specialist/) | `sonnet` | Safe code transformation with behavior preservation |
| [typescript-pro](./sub-agents/typescript-pro/) | `sonnet` | Advanced TypeScript type system and full-stack type safety |
| [ui-designer](./sub-agents/ui-designer/) | `sonnet` | Visual design, design systems, and accessibility compliance |

### Configuration

| Component | Description |
|-----------|-------------|
| [statusline](./statusline/) | Agnoster-inspired Claude Code status line (user@host, dir, git, model, ctx%, rate-limit%) |

## Quick Start

1. Clone this repo:
   ```bash
   git clone https://github.com/hunterbrewer04/claude-toolkit.git ~/claude-toolkit
   ```

2. Create symlinks for skills and agents:
   ```bash
   # Create directories if they don't exist
   mkdir -p ~/.claude/skills ~/.claude/agents

   # Skills
   for skill in ~/claude-toolkit/skills/*/; do
     name=$(basename "$skill")
     ln -sf "$skill" ~/.claude/skills/"$name"
   done

   # Sub-agents
   for agent in ~/claude-toolkit/sub-agents/*/; do
     name=$(basename "$agent")
     ln -sf "$agent/${name}.md" ~/.claude/agents/"${name}.md"
   done
   ```

3. Restart Claude Code and verify — say "create a skill" to test skill-builder, or "what's on my plate" to test linear-assistant.

## Directory Structure

```
claude-toolkit/
├── skills/
│   ├── agent-builder/
│   ├── canvas/
│   ├── claude-documentation/
│   ├── claude-toolkit/
│   ├── hook-builder/
│   ├── linear-assistant/
│   └── skill-builder/
├── sub-agents/
│   ├── agent-installer/
│   ├── code-reviewer/
│   ├── frontend-developer/
│   ├── fullstack-developer/
│   ├── performance-engineer/
│   ├── react-specialist/
│   ├── refactoring-specialist/
│   ├── typescript-pro/
│   └── ui-designer/
├── hooks/
├── statusline/
└── README.md
```

## Recommended Plugins

These plugins complement the toolkit. Install them on a new machine to replicate the full setup:

```bash
# Core workflow plugins
claude plugin add superpowers              # Planning, TDD, debugging, code review workflows
claude plugin add pr-review-toolkit        # PR review agents (test analyzer, silent-failure hunter, type analyzer)
claude plugin add commit-commands           # Git commit, push, and PR shortcuts
claude plugin add code-simplifier          # Post-implementation code cleanup agent
claude plugin add claude-md-management     # CLAUDE.md auditing and improvement

# Frontend & design
claude plugin add frontend-design          # High-quality frontend UI generation

# AI & integrations
claude plugin add vercel                   # Vercel platform skills (deploy, AI SDK, Next.js, etc.)
claude plugin add firecrawl               # Web scraping and research
claude plugin add context7                 # Library/framework docs fetching
claude plugin add stripe                   # Stripe integration best practices

# Productivity
claude plugin add obsidian                 # Obsidian vault management (notes, canvas, bases)
claude plugin add learning-output-style    # Educational explanations in responses

# Language tooling
claude plugin add swift-lsp               # Swift LSP integration
claude plugin add gopls-lsp               # Go LSP integration
claude plugin add clangd-lsp              # C/C++ LSP integration

# Other
claude plugin add greptile                # Codebase search integration
claude plugin add supabase                # Supabase integration
```

## Prerequisites

- Claude Code CLI installed
- Bash (for skill validation scripts and hook scripts)
- Linear MCP tools configured (for linear-assistant)

## How Components Interact

```
Component Authoring Flow:
  skill-builder / agent-builder / hook-builder
    → creates a component
    → claude-documentation generates its README
    → claude-toolkit publishes it to this repo

Development Flow:
  linear-assistant (plan work)
    → fullstack-developer / frontend-developer (implement)
    → code-reviewer (review changes)
    → refactoring-specialist (improve structure)
    → performance-engineer (optimize)

Specialized Agents:
  react-specialist ← React-specific work
  typescript-pro   ← Type system architecture
  ui-designer      ← Visual design & design systems
  agent-installer  ← Discover & install community agents
```

Skills define authoring workflows. Sub-agents handle specialized development tasks. They compose naturally — use any combination.
