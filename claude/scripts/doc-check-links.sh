#!/bin/bash
# Find broken cross-references in docs.
# Usage: doc-check-links.sh
# Exit 0 if no broken links, 1 if broken links found.

set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
DOCS="$ROOT/docs"
FOUND=0

while IFS= read -r -d '' FILE; do
  FILE_DIR=$(dirname "$FILE")
  REL="${FILE#"$ROOT"/}"

  # Extract all markdown link targets from this file in one pass.
  # Strip fenced code blocks (```...```) and inline code spans (`...`)
  # first — TypeScript/example snippets often contain `](` sequences that
  # look like links but aren't.
  LINKS=$(awk '
    /^[[:space:]]*```/ { in_fence = !in_fence; next }
    in_fence { next }
    { gsub(/`[^`]*`/, ""); print }
  ' "$FILE" 2>/dev/null | grep -oE '\]\([^)]+\)' | sed 's/^](\(.*\))$/\1/' || true)
  [[ -z "$LINKS" ]] && continue

  while IFS= read -r LINK; do
    case "$LINK" in
      http://*|https://*|mailto:*|javascript:*|vbscript:*|data:*|\#*) continue ;;
    esac

    PATH_PART="${LINK%%#*}"
    [[ -z "$PATH_PART" ]] && continue

    # Skip .repos/ references — optional research clones that may
    # not exist in every worktree or CI environment.
    # Skip obvious non-path targets (placeholders in tables/examples).
    case "$PATH_PART" in
      */.repos/*|*.repos/*) continue ;;
      url|url.*|link|...|u|/user_uploads/*) continue ;;
      tg://*|twist-mention://*|slack://*|msteams://*) continue ;;
    esac

    if [[ ! -e "$FILE_DIR/$PATH_PART" ]]; then
      echo "BROKEN $REL -> $LINK"
      FOUND=1
    fi
  done <<< "$LINKS"
done < <(find "$DOCS" -name '*.md' -print0 2>/dev/null)

if [[ $FOUND -eq 0 ]]; then
  echo "No broken links found"
  exit 0
else
  exit 1
fi
