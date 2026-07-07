#!/usr/bin/env bash
# Scaffold a new BrewMint client static-site repo from template/.
#
# Usage: scaffold.sh <parent-dir> <client-name> <slug> [domain]
#
#   parent-dir   Directory the new <slug>/ repo is created inside.
#                This is normally the client's display-name folder
#                (~/Desktop/BrewMint/Clients/<Client Name>/) -- the slug
#                repo nests INSIDE it, it is never a sibling top-level
#                Clients/ entry. See SKILL.md Step 1 for why.
#   client-name  Display name, used for titles/meta ("Republic Roofing Co.")
#   slug         Kebab-case folder/site name ("republic-roofing")
#   domain       Optional. Site domain used in robots.txt/sitemap.xml/
#                llms.txt/manifest/worker "From" address. Defaults to
#                example.com -- fine as a placeholder, fix it once the
#                client's real domain is known.
#
# Copies template/ into <parent-dir>/<slug>/, substitutes {{CLIENT_NAME}},
# {{SLUG}}, {{DOMAIN}} tokens in every text file, and generates placeholder
# favicon files. Does not touch git and does not deploy anything -- those
# are separate, deliberate steps (see SKILL.md).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$(cd "$SCRIPT_DIR/../template" && pwd)"

if [ "$#" -lt 3 ]; then
  echo "usage: scaffold.sh <parent-dir> <client-name> <slug> [domain]" >&2
  exit 1
fi

PARENT_DIR="$1"
CLIENT_NAME="$2"
SLUG="$3"
DOMAIN="${4:-example.com}"

if [[ ! "$SLUG" =~ ^[a-z0-9-]+$ ]]; then
  echo "error: slug must be kebab-case (lowercase letters, digits, hyphens): '$SLUG'" >&2
  exit 1
fi

mkdir -p "$PARENT_DIR"
TARGET_DIR="$PARENT_DIR/$SLUG"

if [ -e "$TARGET_DIR" ]; then
  echo "error: $TARGET_DIR already exists -- refusing to overwrite" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
cp -R "$TEMPLATE_DIR"/. "$TARGET_DIR"/

python3 "$SCRIPT_DIR/substitute.py" "$TARGET_DIR" "$CLIENT_NAME" "$SLUG" "$DOMAIN"
python3 "$SCRIPT_DIR/gen_favicons.py" "$TARGET_DIR"

echo "Scaffolded '$SLUG' at $TARGET_DIR"
echo "Next: fill in the living docs (DESIGN_SPEC.md, CONTENT_INVENTORY.md, PROJECT_NOTES.md)"
echo "using business.md / client-intake.md / niche-research.md, then git init the repo."
