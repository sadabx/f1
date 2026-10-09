#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Packaging F1 Dash Extension..."

# Clean old artifacts
rm -rf f1_dash.zip f1_dash.xpi f1_dash_chrome.zip dist_chrome f1_alert.zip f1_alert.xpi f1_alert_chrome.zip f1-dash-chrome.zip f1-dash-firefox.xpi

# 1. Package Firefox Extension (AMO & about:debugging)
cp manifest.firefox.json manifest.json
zip -r -FS f1_dash.zip \
  manifest.json \
  background.js \
  popup.html \
  popup.css \
  popup.js \
  offscreen.html \
  offscreen.js \
  assets/ \
  -x "*.git*" "*package.sh*" "*README.md*" "*manifest.chrome.json*" "*manifest.firefox.json*"

cp f1_dash.zip f1_dash.xpi
echo "Packaged Firefox build: f1_dash.zip and f1_dash.xpi"

# 2. Package Chromium Extension (Brave, Chrome, Edge, Opera)
mkdir -p dist_chrome
cp -r background.js popup.html popup.css popup.js offscreen.html offscreen.js assets dist_chrome/
cp manifest.chrome.json dist_chrome/manifest.json

cd dist_chrome
zip -r -FS ../f1_dash_chrome.zip . -x "*.git*"
cd "$DIR"
echo "Packaged Chromium build: f1_dash_chrome.zip and dist_chrome/ directory"

echo "All cross-browser packages built successfully!"
