#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Packaging F1 Dash Extension..."

# Read version from VERSION file (single source of truth)
VERSION="1.3.4"
if [ -f "./VERSION" ]; then
  VERSION=$(tr -d '[:space:]' < ./VERSION)
fi
echo "Version: $VERSION"

# Inject version into all manifests before packaging
for f in manifest.json manifest.chrome.json; do
  if [ -f "$f" ]; then
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$f"
  fi
done
echo "Manifests updated to $VERSION"

# Clean old artifacts
rm -rf dist f1_dash.zip f1_dash.xpi f1_dash_chrome.zip dist_chrome f1_alert.zip f1_alert.xpi f1_alert_chrome.zip f1-dash-chrome.zip f1-dash-firefox.xpi
mkdir -p dist

# 1. Package Firefox Extension (AMO & about:debugging)
zip -r -FS dist/f1_dash.zip \
  manifest.json \
  popup.html \
  popup.css \
  offscreen.html \
  js/ \
  assets/ \
  -x "*.git*" "*package.sh*" "*README.md*" "*manifest.chrome.json*"

cp dist/f1_dash.zip dist/f1_dash.xpi
echo "Packaged Firefox build: dist/f1_dash.zip and dist/f1_dash.xpi"

# 2. Package Chromium Extension (Brave, Chrome, Edge, Opera)
mkdir -p dist/chrome
cp -r popup.html popup.css offscreen.html js assets dist/chrome/
cp manifest.chrome.json dist/chrome/manifest.json

cd dist/chrome
zip -r -FS ../f1_dash_chrome.zip . -x "*.git*"
cd "$DIR"
echo "Packaged Chromium build: dist/f1_dash_chrome.zip and dist/chrome/ directory"

echo "All cross-browser packages built successfully!"
