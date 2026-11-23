#!/bin/bash
#
# Package Whorl extension as XPI
# Usage: ./scripts/package.sh
#

set -e

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$PROJECT_ROOT/src"

# Read version from manifest.json
VERSION=$(grep -o '"version":\s*"[^"]*"' "$SRC_DIR/manifest.json" | cut -d'"' -f4)
XPI_NAME="whorl-${VERSION}.xpi"

# Create dist directory
DIST_DIR="$PROJECT_ROOT/dist"
mkdir -p "$DIST_DIR"

# Remove old XPI if exists
rm -f "$DIST_DIR/$XPI_NAME"

# Create XPI (zip) from src directory
cd "$SRC_DIR"
zip "$DIST_DIR/$XPI_NAME" \
    manifest.json \
    background.js \
    compose-script.js \
    compose-styles.css \
    options.html \
    options.css \
    options.js \
    icon-16.png \
    icon-32.png \
    icon-48.png \
    icon-96.png

echo ""
echo "Created: $DIST_DIR/$XPI_NAME"
echo ""

# Show contents
echo "Package contents:"
unzip -l "$DIST_DIR/$XPI_NAME"
