# Claude Toolkit

> My personal Claude Code setup: the skills and sub-agents I use daily across coursework, client web projects, and homelab work.

This is a public snapshot of how I extend [Claude Code](https://docs.claude.com/en/docs/claude-code). It holds **17 skills**, **8 sub-agents**, and a custom status line. Most pieces are wired to my machine's paths and conventions, so treat them as reference patterns to borrow from rather than drop-in installs.

## Skills

A skill is a folder with a `SKILL.md` that Claude loads on demand when your request matches its triggers.

### Authoring and this repo

| Skill | What it does |
|-------|--------------|
| [skill-builder](./skills/skill-builder/) | Build a new skill through a structured, validated 7-step process |
| [claude-documentation](./skills/claude-documentation/) | Generate consistent README docs for skills and sub-agents |
| [claude-toolkit](./skills/claude-toolkit/) | Add, sync, and set up this repo's components across machines |

### Development and web

| Skill | What it does |
|-------|--------------|
| [branch-pr](./skills/branch-pr/) | Branch, implement, code-review, and open a PR in one pass; also triages PR review comments |
| [client-onboard](./skills/client-onboard/) | Stand up a new static-site client project end to end, from site scrape to scaffolded repo |
| [client-deploy](./skills/client-deploy/) | Deploy a static client site to Cloudflare Pages and run a live post-deploy check |

### School

| Skill | What it does |
|-------|--------------|
| [course-setup](./skills/course-setup/) | Scaffold a new course folder and clean Canvas file dumps; owns the school.json registry |
| [grade-calc](./skills/grade-calc/) | Exact grade math from syllabus weights: current grade, what-ifs, and target scores |
| [rubric-check](./skills/rubric-check/) | Grade a draft against its assignment spec before you submit |
| [study-guide](./skills/study-guide/) | Turn lecture PDFs into a self-contained interactive HTML study package |
| [notebooklm-course-sync](./skills/notebooklm-course-sync/) | Keep a course's NotebookLM notebook in sync with local files |
| [sapling-ai-detector](./skills/sapling-ai-detector/) | Scan text for AI-generated content with a per-sentence report |

### Everyday and system

| Skill | What it does |
|-------|--------------|
| [apple-calendar](./skills/apple-calendar/) | Read and edit Apple Calendar through the local `ical` CLI |
| [linear-assistant](./skills/linear-assistant/) | Manage Linear issues, projects, and cycles |
| [tailnet](./skills/tailnet/) | Move files to and from home tailnet servers, or serve a file to another device |
| [docx](./skills/docx/) | Create, read, and edit Word documents |
| [remotion-best-practices](./skills/remotion-best-practices/) | Guidance for building Remotion videos in React |

## Sub-Agents

A sub-agent is a specialized assistant Claude Code can hand focused work to, each with its own model and tools.

| Agent | Model | What it does |
|-------|-------|--------------|
| [code-reviewer](./sub-agents/code-reviewer/) | `opus` | Reviews changes for quality, security, and best practices |
| [frontend-developer](./sub-agents/frontend-developer/) | `sonnet` | Multi-framework frontend work across React, Vue, and Angular |
| [fullstack-developer](./sub-agents/fullstack-developer/) | `sonnet` | End-to-end feature delivery from database to UI |
| [performance-engineer](./sub-agents/performance-engineer/) | `sonnet` | Profiling, bottleneck hunting, and system optimization |
| [react-specialist](./sub-agents/react-specialist/) | `sonnet` | Advanced React patterns, performance, and state management |
| [refactoring-specialist](./sub-agents/refactoring-specialist/) | `sonnet` | Safe refactoring that preserves behavior |
| [typescript-pro](./sub-agents/typescript-pro/) | `sonnet` | Advanced TypeScript types and full-stack type safety |
| [ui-designer](./sub-agents/ui-designer/) | `sonnet` | Visual design, design systems, and accessibility |

## Status Line

[statusline/](./statusline/) is an Agnoster-inspired Claude Code status line showing user@host, directory, git branch, model, context use, and rate-limit percentage.

## Install

```bash
# 1. Clone
git clone https://github.com/hunterbrewer04/claude-toolkit.git ~/claude-toolkit

# 2. Symlink skills and sub-agents into Claude Code
mkdir -p ~/.claude/skills ~/.claude/agents

for skill in ~/claude-toolkit/skills/*/; do
  ln -sfn "${skill%/}" ~/.claude/skills/"$(basename "$skill")"
done

for agent in ~/claude-toolkit/sub-agents/*/; do
  name=$(basename "$agent")
  ln -sf "$agent$name.md" ~/.claude/agents/"$name.md"
done
```

Restart Claude Code, then try a trigger to confirm it loaded, for example "create a skill" (skill-builder) or "what's on my plate" (linear-assistant).

## Prerequisites

- Claude Code CLI
- Bash, for the skill and status-line scripts
- A few skills need extra tools: Linear MCP for linear-assistant, the `ical` CLI for apple-calendar, and `composio` for course-setup's Canvas lookups

## How it fits together

The pieces compose. A few examples:

- Build a skill with **skill-builder**, document it with **claude-documentation**, then publish it with **claude-toolkit**.
- Plan work in **linear-assistant**, implement with **fullstack-developer** or **frontend-developer**, have **code-reviewer** check the diff, then let **branch-pr** open the PR.
- For client sites, **client-onboard** scaffolds the repo and **client-deploy** ships it to Cloudflare.

## Recommended plugins

Plugins I run alongside the toolkit. Install these to match my full setup:

```bash
# Core workflow
claude plugin add superpowers            # planning, TDD, debugging, review workflows
claude plugin add pr-review-toolkit      # PR review agents (tests, silent failures, types)
claude plugin add commit-commands        # commit, push, and PR shortcuts
claude plugin add code-simplifier        # post-implementation cleanup agent
claude plugin add claude-md-management   # CLAUDE.md auditing

# Frontend and design
claude plugin add frontend-design        # high-quality UI generation
claude plugin marketplace add Leonxlnx/taste-skill && claude plugin install taste-skill@taste-skill  # 13 design-taste skills

# AI and integrations
claude plugin add vercel                 # Vercel platform skills
claude plugin add firecrawl              # web scraping and research
claude plugin add context7               # library and framework docs
claude plugin add stripe                 # Stripe integration guidance

# Productivity
claude plugin add obsidian               # Obsidian vault management
claude plugin add learning-output-style  # educational explanations in responses

# Language tooling
claude plugin add swift-lsp
claude plugin add gopls-lsp
claude plugin add clangd-lsp

# Other
claude plugin add greptile               # codebase search
claude plugin add supabase               # Supabase integration
```
