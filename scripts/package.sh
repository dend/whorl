#!/bin/bash
#
# Package Thunderbird @Mention extension as XPI
# Usage: ./scripts/package.sh
#

set -e

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Read version from manifest.json
VERSION=$(grep -o '"version":\s*"[^"]*"' "$PROJECT_ROOT/manifest.json" | cut -d'"' -f4)
XPI_NAME="thunderbird-at-mention-${VERSION}.xpi"

# Create dist directory
DIST_DIR="$PROJECT_ROOT/dist"
mkdir -p "$DIST_DIR"

# Remove old XPI if exists
rm -f "$DIST_DIR/$XPI_NAME"

# Create XPI (zip) from project root
cd "$PROJECT_ROOT"
zip -r "$DIST_DIR/$XPI_NAME" \
    manifest.json \
    background/ \
    compose/ \
    icons/ \
    -x "*.DS_Store" \
    -x "*/.git/*" \
    -x "*/.*"

echo ""
echo "Created: $DIST_DIR/$XPI_NAME"
echo ""

# Show contents
echo "Package contents:"
unzip -l "$DIST_DIR/$XPI_NAME"
