#!/bin/bash
# PreToolUse Bash: run full check suite before any commit.

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
if ! echo "$cmd" | grep -qE '^\s*git\s+commit\b|&&\s*git\s+commit\b|\|\|\s*git\s+commit\b|;\s*git\s+commit\b'; then
  exit 0
fi

# Determine where the commit is happening.
# If the command starts with "cd /path", extract that path.
# Otherwise use the session's CWD (which may be a worktree).
# Fall back to $CLAUDE_PROJECT_DIR only as a last resort.
work_dir=""
if echo "$cmd" | grep -qE '^\s*cd\s+'; then
  extracted=$(echo "$cmd" | sed -nE 's/^\s*cd\s+"?([^"&;|]+)"?\s*(&&.*)?$/\1/p' | sed -E 's/[[:space:]]+$//')
  [ -n "$extracted" ] && work_dir="$extracted"
fi

# If no cd prefix, resolve the git toplevel from the session's working directory.
# This correctly targets the worktree root when committing inside a worktree.
if [ -z "$work_dir" ]; then
  work_dir=$(git rev-parse --show-toplevel 2>/dev/null)
fi
work_dir="${work_dir:-$CLAUDE_PROJECT_DIR}"

# Run the full check suite from the correct directory
check_output=$(cd "$work_dir" && pnpm run check 2>&1)
check_exit=$?

if [ $check_exit -ne 0 ]; then
  # Truncate output to avoid oversized deny messages
  trimmed=$(echo "$check_output" | tail -80)
  deny "pnpm run check failed (exit $check_exit) — this BLOCKING check must be green before you commit, even if your change did not cause the failure. Fix the root cause and retry; if a failure is unrelated to your change, dispatch a subagent to fix it (it edits and reports back; you fold the fix into your commit) rather than --no-verify. See docs/conventions/code-blocking-checks.md.

$trimmed"
fi
