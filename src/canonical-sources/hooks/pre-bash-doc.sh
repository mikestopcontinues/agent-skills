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

# This hook ships alongside doc-check-links.sh — `hooks/` and `scripts/` are
# siblings in every install layout. Resolve the script relative to ourselves.
hook_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
check_links="$hook_dir/../scripts/doc-check-links.sh"

# Git commit gate: check links (doc-check-links.sh finds the repo on its own).
if echo "$cmd" | grep -q 'git commit'; then
  if [ -x "$check_links" ] && git rev-parse --show-toplevel >/dev/null 2>&1; then
    if ! links_out=$("$check_links" 2>&1); then
      deny "$(printf 'doc-check-links.sh found broken references — this BLOCKING check must be green before you commit, even if your change did not cause it. Fix the dangling reference; if it is unrelated to your change, dispatch a subagent to fix it (it edits and reports back; you fold the fix into your commit) rather than --no-verify. See docs/conventions/code-blocking-checks.md.\n\n%s' "$links_out")"
    fi
  fi
fi
