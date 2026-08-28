#!/usr/bin/env bash
# Blocks `git add` / `git commit` commands that touch .env files.
# Receives Claude Code hook JSON on stdin; exits 2 to block with feedback.

input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')

# Only inspect git add / git commit invocations.
if ! echo "$cmd" | grep -qE '\bgit[[:space:]]+(add|commit)\b'; then
  exit 0
fi

# Block if .env (or .env.local, .env.production, etc.) appears on the command line
# but allow examples like .env.example / .env.sample / .env.template.
if echo "$cmd" | grep -qE '\.env(\.[a-zA-Z0-9._-]*)?' \
  && ! echo "$cmd" | grep -qE '\.env\.(example|sample|template)(\s|$)'; then
  echo "Blocked: refusing to git add/commit a .env file. Rename to .env.example or add to .gitignore first." >&2
  exit 2
fi

# Also block `git add .` / `git add -A` / `git add -a` when an unignored .env exists.
if echo "$cmd" | grep -qE '\bgit[[:space:]]+add[[:space:]]+(\.|-A|-a|--all)\b'; then
  if git ls-files --others --exclude-standard 2>/dev/null | grep -qE '(^|/)\.env($|\.)' \
    || git diff --cached --name-only 2>/dev/null | grep -qE '(^|/)\.env($|\.)'; then
    echo "Blocked: 'git add .' would include a .env file. Stage files explicitly or add .env* to .gitignore." >&2
    exit 2
  fi
fi

exit 0
