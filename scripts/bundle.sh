#!/bin/bash
# Bundle all source files into a single HTML file at docs/index.html
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$PROJECT_DIR/src"
OUT="$PROJECT_DIR/docs/index.html"

mkdir -p "$PROJECT_DIR/docs"

python3 "$PROJECT_DIR/scripts/bundle_helper.py" "$SRC" "$OUT"

if [ -f "$OUT" ]; then
    echo "Bundled to $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
else
    echo "Error: Bundle failed"
    exit 1
fi
