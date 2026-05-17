#!/bin/bash
# PreToolUse Bash: block commits on main/master — use worktrees.

input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')

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

# Only intercept commit commands
if ! echo "$cmd" | grep -qE '^[[:space:]]*git[[:space:]]+commit\b|&&[[:space:]]*git[[:space:]]+commit\b|\|\|[[:space:]]*git[[:space:]]+commit\b|;[[:space:]]*git[[:space:]]+commit\b'; then
  exit 0
fi

# Determine where the commit is happening.
# If the command starts with "cd /path", use that. Otherwise resolve from
# git toplevel (respects worktrees), falling back to project dir.
work_dir=""
if echo "$cmd" | grep -qE '^[[:space:]]*cd[[:space:]]+'; then
  work_dir=$(echo "$cmd" | sed -nE 's/^[[:space:]]*cd[[:space:]]+"?([^"&;|]+)"?[[:space:]]*(&&.*)?$/\1/p' | sed -E 's/[[:space:]]+$//')
fi

if [ -z "$work_dir" ]; then
  work_dir=$(git rev-parse --show-toplevel 2>/dev/null)
fi
work_dir="${work_dir:-$CLAUDE_PROJECT_DIR}"

# Check branch from the resolved directory
branch=$(git -C "$work_dir" branch --show-current 2>/dev/null)

if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  deny "Cannot commit on $branch. Create a worktree first: git worktree add .claude/worktrees/<name> -b worktree-<name>"
fi
