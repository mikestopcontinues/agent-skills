#!/bin/bash
# PreToolUse Bash: commit gates (check-links).

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

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")

# Git commit gate: check links
if echo "$cmd" | grep -q 'git commit'; then
  if [ -n "$ROOT" ]; then
    if ! links_out=$("$ROOT/.claude/scripts/doc-check-links.sh" 2>&1); then
      deny "$(printf 'doc-check-links.sh found broken references — this BLOCKING check must be green before you commit, even if your change did not cause it. Fix the dangling reference; if it is unrelated to your change, dispatch a subagent to fix it (it edits and reports back; you fold the fix into your commit) rather than --no-verify. See docs/conventions/code-blocking-checks.md.\n\n%s' "$links_out")"
    fi
  fi
fi
