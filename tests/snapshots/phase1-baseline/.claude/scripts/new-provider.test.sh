#!/bin/bash
# Tests for new-provider.sh scaffold generator.
# Run: .claude/scripts/new-provider.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$SCRIPT_DIR/new-provider.sh"
ROOT=$(git rev-parse --show-toplevel)
TEST_NAME="scaffoldtest"
PKG_DIR="$ROOT/packages/provider-${TEST_NAME}"

# Cleanup function
cleanup() {
  if [ -d "$PKG_DIR" ]; then
    find "$PKG_DIR" -type f -delete 2>/dev/null
    find "$PKG_DIR" -depth -type d -delete 2>/dev/null
  fi
}

# Always clean up, even on failure
trap cleanup EXIT

PASS=0
FAIL=0

assert() {
  local desc="$1"
  local result="$2"
  if [ "$result" = "0" ]; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== new-provider.sh tests ==="
echo ""

# --- Test 1: Rejects invalid names ---
echo "Test: input validation"

output=$("$SCRIPT" "Bad Name" 2>&1 || true)
echo "$output" | grep -q "Error: name must be lowercase" && result=0 || result=1
assert "rejects uppercase/spaces" "$result"

output=$("$SCRIPT" "123bad" 2>&1 || true)
echo "$output" | grep -q "Error: name must be lowercase" && result=0 || result=1
assert "rejects leading digits" "$result"

# --- Test 2: Creates expected directory structure ---
echo ""
echo "Test: directory structure"

cleanup
"$SCRIPT" "$TEST_NAME" > /dev/null 2>&1

[ -d "$PKG_DIR" ] && result=0 || result=1
assert "creates package directory" "$result"

[ -d "$PKG_DIR/src/__fixtures__" ] && result=0 || result=1
assert "creates __fixtures__ directory" "$result"

[ -f "$PKG_DIR/src/__fixtures__/.gitkeep" ] && result=0 || result=1
assert "creates .gitkeep in fixtures" "$result"

# --- Test 3: Creates all expected files ---
echo ""
echo "Test: file generation"

for f in package.json tsconfig.json tsdown.config.ts vitest.config.ts eslint.config.ts; do
  [ -f "$PKG_DIR/$f" ] && result=0 || result=1
  assert "creates $f" "$result"
done

for f in index.ts ScaffoldtestModel.ts createProvider.ts messages.ts response.ts streaming.ts errors.ts; do
  [ -f "$PKG_DIR/src/$f" ] && result=0 || result=1
  assert "creates src/$f" "$result"
done

# --- Test 4: Correct package name in package.json ---
echo ""
echo "Test: package.json content"

grep -q '"name": "@os/provider-scaffoldtest"' "$PKG_DIR/package.json" && result=0 || result=1
assert "correct package name" "$result"

grep -q '"@os/provider": "workspace:\*"' "$PKG_DIR/package.json" && result=0 || result=1
assert "depends on @os/provider" "$result"

# --- Test 5: JS template literals preserved in Model ---
echo ""
echo "Test: template literal preservation"

grep -q '`${this.#config.baseUrl}/v1/chat`' "$PKG_DIR/src/ScaffoldtestModel.ts" && result=0 || result=1
assert "template literal in Model URL" "$result"

grep -q '`Bearer ${apiKey}`' "$PKG_DIR/src/ScaffoldtestModel.ts" && result=0 || result=1
assert "template literal in auth header" "$result"

# --- Test 6: Placeholder replacement worked ---
echo ""
echo "Test: placeholder replacement"

grep -q '__NAME__\|__PASCAL__' "$PKG_DIR/src/ScaffoldtestModel.ts" && result=1 || result=0
assert "no leftover __NAME__/__PASCAL__ in Model" "$result"

grep -q '__NAME__\|__PASCAL__' "$PKG_DIR/src/index.ts" && result=1 || result=0
assert "no leftover __NAME__/__PASCAL__ in index" "$result"

grep -q 'ScaffoldtestModel' "$PKG_DIR/src/index.ts" && result=0 || result=1
assert "PascalCase class name in barrel" "$result"

grep -q "providerName: 'scaffoldtest'" "$PKG_DIR/src/createProvider.ts" && result=0 || result=1
assert "kebab-case provider name in factory" "$result"

# --- Test 7: Exhaustive content part switch ---
echo ""
echo "Test: exhaustive content part switch"

for case_type in "'text'" "'reasoning'" "'media:file'" "'media:image'" "'media:audio'" "'media:video'" "'tool:call'" "'tool:exec'" "'source'" "'unknown'"; do
  grep -q "case ${case_type}" "$PKG_DIR/src/messages.ts" && result=0 || result=1
  assert "messages.ts has case ${case_type}" "$result"
done

grep -q "const _exhaustive: never = part" "$PKG_DIR/src/messages.ts" && result=0 || result=1
assert "messages.ts has exhaustive default" "$result"

# --- Test 8: Idempotency check ---
echo ""
echo "Test: idempotency guard"

output=$("$SCRIPT" "$TEST_NAME" 2>&1 || true)
echo "$output" | grep -q "already exists" && result=0 || result=1
assert "errors when directory exists" "$result"

# --- Summary ---
echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
