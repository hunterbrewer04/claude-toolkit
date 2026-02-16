#!/usr/bin/env bash
# validate-skill.sh — Validates a skill's structure, frontmatter, and content guidelines
# Usage: bash scripts/validate-skill.sh /path/to/skill-directory/

set -euo pipefail

SKILL_DIR="${1:?Usage: bash scripts/validate-skill.sh <skill-directory>}"
SKILL_DIR="${SKILL_DIR%/}"  # Remove trailing slash
SKILL_FILE="$SKILL_DIR/SKILL.md"
ERRORS=0
WARNINGS=0

error() { echo "  ERROR: $1"; ((ERRORS++)); }
warn()  { echo "  WARN:  $1"; ((WARNINGS++)); }
pass()  { echo "  PASS:  $1"; }

echo "=== Skill Validation: $SKILL_DIR ==="
echo ""

# --- Check SKILL.md exists ---
echo "--- Structure ---"
if [[ ! -f "$SKILL_FILE" ]]; then
    error "SKILL.md not found in $SKILL_DIR"
    echo ""
    echo "=== Result: $ERRORS error(s), $WARNINGS warning(s) ==="
    exit 1
else
    pass "SKILL.md exists"
fi

# --- Extract frontmatter ---
# Frontmatter is between first and second '---' lines
FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$SKILL_FILE" | sed '1d;$d')

if [[ -z "$FRONTMATTER" ]]; then
    error "No YAML frontmatter found (must be between --- delimiters)"
    echo ""
    echo "=== Result: $ERRORS error(s), $WARNINGS warning(s) ==="
    exit 1
else
    pass "YAML frontmatter present"
fi

# --- Check name field ---
echo ""
echo "--- Frontmatter ---"
NAME=$(echo "$FRONTMATTER" | grep -E '^name:' | sed 's/^name:[[:space:]]*//' | head -1)

if [[ -z "$NAME" ]]; then
    error "'name' field missing from frontmatter"
else
    NAME_LEN=${#NAME}
    if (( NAME_LEN > 64 )); then
        error "'name' is $NAME_LEN characters (max 64): $NAME"
    else
        pass "'name' is $NAME_LEN characters (≤64): $NAME"
    fi

    if echo "$NAME" | grep -qE '[^a-zA-Z0-9 -]'; then
        error "'name' contains disallowed characters (only letters, numbers, hyphens, spaces): $NAME"
    else
        pass "'name' uses allowed characters"
    fi
fi

# --- Check description field ---
# Description may span multiple lines or be very long, so extract carefully
DESC=$(sed -n '/^---$/,/^---$/p' "$SKILL_FILE" | sed '1d;$d' | \
    sed -n '/^description:/,/^[a-zA-Z]*:/{ /^description:/p; /^[^a-zA-Z]/p; }' | \
    sed 's/^description:[[:space:]]*//' | tr '\n' ' ' | sed 's/[[:space:]]*$//')

# Simpler extraction as fallback
if [[ -z "$DESC" ]]; then
    DESC=$(echo "$FRONTMATTER" | grep -E '^description:' | sed 's/^description:[[:space:]]*//' | head -1)
fi

if [[ -z "$DESC" ]]; then
    error "'description' field missing from frontmatter"
else
    DESC_LEN=${#DESC}
    if (( DESC_LEN > 1024 )); then
        error "'description' is $DESC_LEN characters (max 1024)"
    else
        pass "'description' is $DESC_LEN characters (≤1024)"
    fi

    # Check third-person voice
    if echo "$DESC" | grep -qiE '^(use this|load this|i can|i help|you can|you should)'; then
        error "'description' does not use third person (should start with 'This skill should be used when...' or 'Use when...')"
    else
        pass "'description' appears to use appropriate voice"
    fi
fi

# --- Check body ---
echo ""
echo "--- Body ---"

# Count lines (excluding frontmatter)
BODY_START=$(grep -n '^---$' "$SKILL_FILE" | sed -n '2p' | cut -d: -f1)
if [[ -n "$BODY_START" ]]; then
    TOTAL_LINES=$(wc -l < "$SKILL_FILE" | tr -d ' ')
    BODY_LINES=$((TOTAL_LINES - BODY_START))

    if (( BODY_LINES > 500 )); then
        error "SKILL.md body is $BODY_LINES lines (max 500)"
    elif (( BODY_LINES > 400 )); then
        warn "SKILL.md body is $BODY_LINES lines (approaching 500 limit)"
    else
        pass "SKILL.md body is $BODY_LINES lines (<500)"
    fi
fi

# Count words
WORD_COUNT=$(sed -n "${BODY_START},\$p" "$SKILL_FILE" | wc -w | tr -d ' ')
if (( WORD_COUNT > 3000 )); then
    warn "SKILL.md body is $WORD_COUNT words (target: 1,500-2,000)"
elif (( WORD_COUNT < 500 )); then
    warn "SKILL.md body is $WORD_COUNT words (may be too brief; target: 1,500-2,000)"
else
    pass "SKILL.md body is $WORD_COUNT words"
fi

# Check for second-person language
SECOND_PERSON=$(sed -n "${BODY_START},\$p" "$SKILL_FILE" | grep -niE '\byou (should|need|can|must|will)\b' | head -5)
if [[ -n "$SECOND_PERSON" ]]; then
    warn "Possible second-person language found:"
    echo "$SECOND_PERSON" | while IFS= read -r line; do
        echo "    $line"
    done
else
    pass "No second-person language detected"
fi

# --- Check referenced files ---
echo ""
echo "--- Referenced Files ---"

# Find file references in SKILL.md (patterns like references/file.md, examples/file.sh, scripts/file.sh)
REFS=$(grep -oE '(references|examples|scripts|assets)/[a-zA-Z0-9._-]+(\.[a-zA-Z]+)?' "$SKILL_FILE" | sort -u)

if [[ -z "$REFS" ]]; then
    pass "No file references found in SKILL.md"
else
    while IFS= read -r ref; do
        if [[ -f "$SKILL_DIR/$ref" ]]; then
            pass "Referenced file exists: $ref"
        else
            error "Referenced file missing: $ref"
        fi
    done <<< "$REFS"
fi

# --- Check for backslash paths ---
echo ""
echo "--- Path Format ---"
BACKSLASH_PATHS=$(grep -n '\\' "$SKILL_FILE" | grep -vE '(\\b|\\n|\\t|\\s|\\w|\\d|\\[|\\]|\\(|\\)|\\{|\\}|\\||\\*|\\+|\\?|\\.)' | head -5)
if [[ -n "$BACKSLASH_PATHS" ]]; then
    warn "Possible backslash paths found (use forward slashes):"
    echo "$BACKSLASH_PATHS" | while IFS= read -r line; do
        echo "    $line"
    done
else
    pass "No backslash paths detected"
fi

# --- Check for empty directories ---
echo ""
echo "--- Directories ---"
for dir in references examples scripts assets; do
    if [[ -d "$SKILL_DIR/$dir" ]]; then
        FILE_COUNT=$(find "$SKILL_DIR/$dir" -type f | wc -l | tr -d ' ')
        if (( FILE_COUNT == 0 )); then
            warn "Empty directory: $dir/ (remove if unused)"
        else
            pass "$dir/ contains $FILE_COUNT file(s)"
        fi
    fi
done

# --- Summary ---
echo ""
echo "=== Result: $ERRORS error(s), $WARNINGS warning(s) ==="

if (( ERRORS > 0 )); then
    exit 1
else
    exit 0
fi
