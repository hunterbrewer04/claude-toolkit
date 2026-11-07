#!/usr/bin/env bash
# add-component.sh: copy a skill or mod into the toolkit repo
#
# Usage:
#   bash add-component.sh skill <source-path> <toolkit-repo-path> <plugin>
#   bash add-component.sh mod   <source-path> <toolkit-repo-path>
#
# Hooks and sub-agents are added by hand. See SKILL.md.
#
# Exits with code 1 on error, 2 if the name is already taken.

set -euo pipefail

TYPE="${1:-}"
SOURCE="${2:-}"
REPO="${3:-}"
PLUGIN="${4:-}"

usage() {
  echo "Usage: bash add-component.sh skill <source-path> <toolkit-repo-path> <plugin>" >&2
  echo "       bash add-component.sh mod   <source-path> <toolkit-repo-path>" >&2
  exit 1
}

if [[ -z "$TYPE" || -z "$SOURCE" || -z "$REPO" ]]; then
  usage
fi

# Validate source exists
if [[ ! -d "$SOURCE" ]]; then
  echo "Error: Source path '$SOURCE' is not a directory" >&2
  exit 1
fi

# Validate repo exists and is a git repo
if [[ ! -e "$REPO/.git" ]]; then
  echo "Error: '$REPO' is not a git repository" >&2
  exit 1
fi

# Strip a trailing slash so basename gives the component's name
COMPONENT_NAME="$(basename "${SOURCE%/}")"

# Validate component type and determine the destination
case "$TYPE" in
  skill)
    [[ -n "$PLUGIN" ]] || usage
    if [[ ! -d "$REPO/plugins/$PLUGIN" ]]; then
      echo "Error: Plugin '$PLUGIN' does not exist in '$REPO/plugins'" >&2
      exit 1
    fi
    DEST="$REPO/plugins/$PLUGIN/skills/$COMPONENT_NAME"
    ;;
  mod)
    DEST="$REPO/plugins/$COMPONENT_NAME"
    ;;
  *)
    echo "Error: Unknown component type '$TYPE'. Expected: skill, mod" >&2
    exit 1
    ;;
esac

# Check for name collision
if [[ -e "$DEST" ]]; then
  echo "COLLISION:$DEST"
  exit 2
fi

# Copy files, leaving out what Claude Code and macOS write into a mod's folder
mkdir -p "$(dirname "$DEST")"
cp -R "$SOURCE" "$DEST"
rm -rf "$DEST/.claude-plugin/types"
find "$DEST" -name .DS_Store -delete

echo "OK:$DEST"
