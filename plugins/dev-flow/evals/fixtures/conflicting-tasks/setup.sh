#!/usr/bin/env bash
# Build the graph and git state. Kept out of version control so the fixture
# stays small and claude-toolkit gains no nested git repo.
set -euo pipefail
cd "$(dirname "$0")"
command -v graphify >/dev/null || { echo "graphify not on PATH" >&2; exit 1; }
graphify update . --no-cluster
git init -q . 2>/dev/null || true
git add -A 2>/dev/null || true
git -c user.email=f@x -c user.name=f commit -qm "fixture" 2>/dev/null || true
echo "ready: $(pwd)"
