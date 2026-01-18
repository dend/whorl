#!/bin/bash
#
# Release script for Thunderbird @Mention
# Usage: ./scripts/release.sh 1.0.0
#

set -e

# Check if version argument is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 1.0.0"
  exit 1
fi

VERSION="$1"

# Validate version format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Version must be in format X.Y.Z (e.g., 1.0.0)"
  exit 1
fi

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --staged --quiet; then
  echo "Error: You have uncommitted changes. Please commit or stash them first."
  exit 1
fi

# Check if tag already exists
if git rev-parse "$VERSION" >/dev/null 2>&1; then
  echo "Error: Tag $VERSION already exists"
  exit 1
fi

# Update version in manifest.json
echo "Updating manifest.json to version $VERSION..."
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" manifest.json
rm -f manifest.json.bak

# Verify the change
NEW_VERSION=$(grep -o '"version":\s*"[^"]*"' manifest.json | cut -d'"' -f4)
if [ "$NEW_VERSION" != "$VERSION" ]; then
  echo "Error: Failed to update manifest.json"
  git checkout manifest.json
  exit 1
fi

echo "Updated manifest.json to version $VERSION"

# Commit the change
git add manifest.json
git commit -m "Bump version to $VERSION"

# Create and push tag
echo "Creating tag $VERSION..."
git tag "$VERSION"

echo "Pushing to origin..."
git push origin main
git push origin "$VERSION"

echo ""
echo "Release $VERSION created successfully!"
echo "GitHub Actions will now build and publish the release."
echo "View the release at: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/tag/$VERSION"
