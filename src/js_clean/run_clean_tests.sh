#!/bin/bash
# Run original test suite against clean-room implementations
# by temporarily symlinking clean modules in place of originals

ZION_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
CLEAN_DIR="$ZION_DIR/src/js_clean"
ORIG_DIR="$ZION_DIR/src/js"

MODULES="protocol zones economy state intentions social creation competition exploration physical"
TESTS="test_protocol test_zones test_economy test_state test_intentions test_social test_creation test_competition test_exploration test_physical"

echo "========================================"
echo "  CLEAN-ROOM IMPLEMENTATION TEST SUITE"
echo "  (Specs only — no peeking at originals)"
echo "========================================"
echo ""

# Backup originals and swap in clean-room versions
for mod in $MODULES; do
  if [ -f "$ORIG_DIR/${mod}.js" ]; then
    cp "$ORIG_DIR/${mod}.js" "$ORIG_DIR/${mod}.js.orig"
    cp "$CLEAN_DIR/${mod}.js" "$ORIG_DIR/${mod}.js"
  fi
done

echo "Swapped in clean-room modules. Running tests..."
echo ""

TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_ERROR=0
RESULTS=""

for tname in $TESTS; do
  tfile="$ZION_DIR/tests/${tname}.js"
  if [ ! -f "$tfile" ]; then
    echo "SKIP: $tname (file not found)"
    continue
  fi

  echo "--- $tname ---"
  OUTPUT=$(node "$tfile" 2>&1)
  EXIT_CODE=$?

  # Extract pass/fail counts
  PASS=$(echo "$OUTPUT" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo "0")
  FAIL=$(echo "$OUTPUT" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo "0")

  if [ $EXIT_CODE -ne 0 ]; then
    # Check if it crashed vs had test failures
    if echo "$OUTPUT" | grep -q "passed"; then
      echo "$OUTPUT" | tail -20
      RESULTS="$RESULTS\n❌ $tname: ${PASS} passed, ${FAIL} failed"
      TOTAL_PASS=$((TOTAL_PASS + PASS))
      TOTAL_FAIL=$((TOTAL_FAIL + FAIL))
    else
      echo "  💥 CRASH: $(echo "$OUTPUT" | tail -3)"
      RESULTS="$RESULTS\n💥 $tname: CRASHED"
      TOTAL_ERROR=$((TOTAL_ERROR + 1))
    fi
  else
    echo "$OUTPUT" | grep -E '(passed|failed|✓|✗)' | tail -5
    RESULTS="$RESULTS\n✅ $tname: ${PASS} passed, ${FAIL} failed"
    TOTAL_PASS=$((TOTAL_PASS + PASS))
    TOTAL_FAIL=$((TOTAL_FAIL + FAIL))
  fi
  echo ""
done

# Restore originals
for mod in $MODULES; do
  if [ -f "$ORIG_DIR/${mod}.js.orig" ]; then
    mv "$ORIG_DIR/${mod}.js.orig" "$ORIG_DIR/${mod}.js"
  fi
done

echo "Restored original modules."
echo ""
echo "========================================"
echo "  CLEAN-ROOM RESULTS SUMMARY"
echo "========================================"
echo -e "$RESULTS"
echo ""
echo "TOTAL: ${TOTAL_PASS} passed, ${TOTAL_FAIL} failed, ${TOTAL_ERROR} crashed"
echo "========================================"
