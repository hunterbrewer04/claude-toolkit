#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
git init -q . 2>/dev/null || true
git add -A 2>/dev/null || true
git -c user.email=f@x -c user.name=f commit -qm "fixture" 2>/dev/null || true
echo "ready: $(pwd)"
