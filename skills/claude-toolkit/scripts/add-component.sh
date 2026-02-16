#!/usr/bin/env bash
# add-component.sh — Copy a Claude Code component into the toolkit repo
#
# Usage: bash add-component.sh <type> <source-path> <toolkit-repo-path>
#   type:             skill | hook | sub-agent
#   source-path:      path to the component directory
#   toolkit-repo-path: path to the toolkit git repository
#
# Exits with code 1 on error, 2 if user cancelled (name collision).

set -euo pipefail

TYPE="$1"
SOURCE="$2"
REPO="$3"

# Validate arguments
if [[ -z "$TYPE" || -z "$SOURCE" || -z "$REPO" ]]; then
  echo "Usage: bash add-component.sh <type> <source-path> <toolkit-repo-path>" >&2
  exit 1
fi

# Validate component type and determine target folder
case "$TYPE" in
  skill)    TARGET_DIR="$REPO/skills" ;;
  hook)     TARGET_DIR="$REPO/hooks" ;;
  sub-agent) TARGET_DIR="$REPO/sub-agents" ;;
  *)
    echo "Error: Unknown component type '$TYPE'. Expected: skill, hook, sub-agent" >&2
    exit 1
    ;;
esac

# Validate source exists
if [[ ! -d "$SOURCE" ]]; then
  echo "Error: Source path '$SOURCE' is not a directory" >&2
  exit 1
fi

# Validate repo exists and is a git repo
if [[ ! -d "$REPO/.git" ]]; then
  echo "Error: '$REPO' is not a git repository" >&2
  exit 1
fi

# Get the component name from the directory name
COMPONENT_NAME="$(basename "$SOURCE")"
DEST="$TARGET_DIR/$COMPONENT_NAME"

# Create target directory if needed
mkdir -p "$TARGET_DIR"

# Check for name collision
if [[ -d "$DEST" ]]; then
  echo "COLLISION:$DEST"
  exit 2
fi

# Copy files
cp -R "$SOURCE" "$DEST"

# Make hook scripts executable
if [[ "$TYPE" == "hook" ]]; then
  find "$DEST" -name "*.sh" -exec chmod +x {} \;
fi

echo "OK:$DEST"
