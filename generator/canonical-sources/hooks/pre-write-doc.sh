#!/bin/bash
# PreToolUse Write: enforce yolo new for new spike/plan/note files.

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Skip if no file path or file already exists (overwrite is fine)
if [ -z "$file_path" ] || [ -f "$file_path" ]; then
  exit 0
fi

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

case "$file_path" in
  */docs/spikes/*/README.md) deny 'Use "yolo new spike <project> <name>" to scaffold spike files.' ;;
  */docs/plans/*/README.md)  deny 'Use "yolo new plan <project> <name>" to scaffold plan files.' ;;
  */docs/notes/*.md)         deny 'Use "yolo new note <project|--global> <name>" to scaffold note files.' ;;
esac
