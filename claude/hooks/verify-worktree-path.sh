#!/bin/bash
# PreToolUse Edit|Write: block source edits outside the active worktree.

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

[ -z "$file_path" ] && exit 0

worktree_dir="$CLAUDE_PROJECT_DIR/.claude/worktrees"

# If no worktrees directory exists, worktree workflow is not active — allow all
if [ ! -d "$worktree_dir" ]; then
  exit 0
fi

# Check if any worktrees actually exist (directory could be empty)
worktree_count=$(find "$worktree_dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
if [ "$worktree_count" = "0" ]; then
  exit 0
fi

# Non-source files (docs, config, .claude/) are always allowed
case "$file_path" in
  */packages/*/src/*) ;;  # Source file — continue checking
  *) exit 0 ;;            # Not a source file — allow
esac

# Check if the file is inside any worktree
for wt in "$worktree_dir"/*/; do
  [ -d "$wt" ] || continue
  # Resolve to absolute path for comparison
  wt_abs=$(cd "$wt" 2>/dev/null && pwd)
  case "$file_path" in
    "$wt_abs"/*) exit 0 ;;  # Inside a worktree — allow
  esac
done

# Source file outside all worktrees while worktrees are active — deny
deny "Edit files in the worktree, not the main checkout. Source files under packages/*/src/ must be edited inside a worktree (.claude/worktrees/<name>/) when worktree workflow is active."
