#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "📦 Packaging F1 Live Alert Extension..."

# Clean old artifacts
rm -rf f1_alert.zip f1_alert.xpi f1_alert_chrome.zip dist_chrome

# 1. Package Firefox Extension (AMO & about:debugging)
cp manifest.firefox.json manifest.json
zip -r -FS f1_alert.zip \
  manifest.json \
  background.js \
  popup.html \
  popup.css \
  popup.js \
  offscreen.html \
  offscreen.js \
  assets/ \
  -x "*.git*" "*package.sh*" "*README.md*" "*manifest.chrome.json*" "*manifest.firefox.json*"

cp f1_alert.zip f1_alert.xpi
echo "✅ Packaged Firefox build: f1_alert.zip and f1_alert.xpi"

# 2. Package Chromium Extension (Chrome, Brave, Edge, Opera)
mkdir -p dist_chrome
cp -r background.js popup.html popup.css popup.js offscreen.html offscreen.js assets dist_chrome/
cp manifest.chrome.json dist_chrome/manifest.json

cd dist_chrome
zip -r -FS ../f1_alert_chrome.zip . -x "*.git*"
cd "$DIR"
echo "✅ Packaged Chromium build: f1_alert_chrome.zip and dist_chrome/ directory"

echo "🎉 All cross-browser packages built successfully!"
