# Agent Installer

> Install Claude Code agents from the awesome-claude-code-subagents community repository.

## Overview

The Agent Installer is a utility sub-agent that helps users browse, search, and install Claude Code agents from the [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) GitHub repository. It manages both global and local agent installations, providing a streamlined workflow for discovering and adding new agents to your toolkit.

## Agent Configuration

| Property | Value |
|----------|-------|
| **Type** | Sub-agent |
| **Model** | `haiku` |
| **Max Turns** | Inherits from parent |

## Capabilities

### Tools

- `Bash` -- Execute shell commands (curl for GitHub API, directory management)
- `WebFetch` -- Fetch content from GitHub API endpoints and raw file URLs
- `Read` -- Read local agent files and directory contents
- `Write` -- Save downloaded agent files to disk
- `Glob` -- Search for existing agent files in installation directories

### Strengths

- Browsing available agent categories from the community repository
- Searching for agents by name or description
- Installing agents to global (`~/.claude/agents/`) or local (`.claude/agents/`) directories
- Showing agent details and descriptions before installation
- Uninstalling previously installed agents

## Invocation Pattern

```
Use the Task tool to invoke the agent-installer sub-agent:

Task: "Browse available agent categories and install the python-pro agent globally"
```

## When to Use

- You want to discover what community agents are available
- You need to install a new sub-agent from the community repository
- You want to search for agents related to a specific technology or task
- You need to uninstall a previously installed agent

## When NOT to Use

- You need to create a custom agent from scratch (use manual file creation instead)
- You want to edit or modify an already-installed agent's configuration
- You need to manage agents that are not in the awesome-claude-code-subagents repository

## How It Works

1. **Category Browsing** -- Fetches the category listing from the GitHub API at `https://api.github.com/repos/VoltAgent/awesome-claude-code-subagents/contents/categories` and presents them in a numbered list.
2. **Agent Discovery** -- When a category is selected, fetches agents within that category and displays their names and descriptions.
3. **Search** -- Fetches the repository README containing all agent listings and searches for matching terms.
4. **Installation** -- Asks the user for global or local installation, downloads the raw `.md` file from GitHub, and saves it to the appropriate directory.
5. **Confirmation** -- Confirms successful installation and offers next steps.

## Input/Output

### Input

- Natural language requests to browse, search, install, or uninstall agents
- Category selections and agent names

### Output

- Formatted lists of categories and agents with descriptions
- Installation confirmations with file paths
- Search results matching user queries

## Directory Structure

```
sub-agents/agent-installer/
  agent-installer.md   # Agent definition and system prompt
  README.md            # This file
```

## Setup & Installation

No additional setup required. The agent-installer is available as a sub-agent within the claude-toolkit. It accesses the GitHub API without authentication (rate limited to 60 requests/hour).

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| Installation scope | Global (`~/.claude/agents/`) or local (`.claude/agents/`) | Prompted at install time |

## Dependencies

- GitHub API access (unauthenticated, 60 req/hour rate limit)
- `curl` available in the shell environment
- Write access to `~/.claude/agents/` or `.claude/agents/`

## Examples

### Browse and Install an Agent

**User:** "Use the agent installer to find out which PHP agents are available"

**Agent Response:**

Found 3 PHP-related agents in the repository:

| Agent | Description | Category |
|-------|-------------|----------|
| php-pro | PHP web development expert for core PHP | Language Specialists |
| laravel-specialist | Laravel 10+ framework expert (Eloquent, Blade, etc.) | Language Specialists |
| wordpress-master | WordPress development and optimization | Business & Product |

Would you like me to install any of these agents?

### Install a Specific Agent

**User:** "Install the python-pro agent"

**Agent:**
1. Asks: "Install globally (~/.claude/agents/) or locally (.claude/agents/)?"
2. Downloads from GitHub
3. Saves to chosen directory
4. Confirms: "Installed python-pro.md to ~/.claude/agents/"

## Related Components

- [frontend-developer](../frontend-developer/) -- Frontend development sub-agent
- [typescript-pro](../typescript-pro/) -- TypeScript development sub-agent
- [code-reviewer](../code-reviewer/) -- Code review sub-agent
