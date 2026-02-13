#!/bin/bash
# Run all ZION tests — JS and Python
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

PASS=0
FAIL=0
FAILED_TESTS=""

run_js_test() {
  local test_file="$1"
  local name=$(basename "$test_file")
  if node "$test_file"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    FAILED_TESTS="$FAILED_TESTS  $name\n"
  fi
}

run_py_test() {
  local test_file="$1"
  local name=$(basename "$test_file")
  if python3 "$test_file"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    FAILED_TESTS="$FAILED_TESTS  $name\n"
  fi
}

echo "========================================"
echo "  ZION Test Suite"
echo "========================================"

echo ""
echo "--- JavaScript Tests ---"
for f in tests/test_*.js; do
  [ -f "$f" ] && run_js_test "$f"
done

echo ""
echo "--- Python Tests ---"
for f in tests/test_*.py; do
  [ -f "$f" ] && run_py_test "$f"
done

echo ""
echo "========================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "Failed tests:"
  echo -e "$FAILED_TESTS"
  exit 1
else
  echo ""
  echo "All tests passed!"
  exit 0
fi
