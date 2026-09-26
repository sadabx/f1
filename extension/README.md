# F1 Dash - Browser Extension

A real-time Formula 1 browser extension built to bring your [F1 Live Dashboard](https://f1.trionine.com) schedule directly into your browser toolbar, notify you before every session (FP1, FP2, FP3, SQ, Sprint, Quali, Race), and blare the **official F1 Intro Theme 5 minutes before green light**!

---

## Features

- **Pre-Session Audio Alarm**: Automatically plays the iconic F1 intro theme before every session start (configurable from 5 to 30 mins).
- **Session Selectors**: Enable or disable alerts for specific session types:
  - Practice (FP1, FP2, FP3)
  - Sprint Qualifying (SQ)
  - Sprint Race
  - Qualifying
  - Grand Prix Race
- **Configurable Lead Time**: Choose whether to be reminded 5 min (default), 10 min, 15 min, or 30 min before green light.
- **Native Desktop Notifications**: Shows system notifications with the Grand Prix name, flag, session type, and exact start time.
- **Live Countdown & Weekend Sessions**: Pop-up window with high-contrast live digital countdown to the next session and a schedule of the entire race weekend in your local timezone.
- **Official F1 Design**: Styled with official Formula 1 vector branding and self-hosted Titillium Web & JetBrains Mono typography.
- **Cross-Browser Support**: Native background page audio on Firefox, and Service Worker + Offscreen document audio on Chromium (Chrome, Brave, Edge, Opera).

---

## How to Install in Firefox (Development)

1. Open **Firefox**.
2. Go to:
   ```text
   about:debugging#/runtime/this-firefox
   ```
3. Click **"Load Temporary Add-on..."**.
4. Select `manifest.json` in this directory.

---

## How to Install in Chrome / Brave / Edge (Development)

1. Run the build script to generate the Chromium package:
   ```bash
   ./package.sh
   ```
2. Open `chrome://extensions` (or `brave://extensions`).
3. Enable **Developer mode** (top right toggle).
4. Click **"Load unpacked"** and select the `dist_chrome` folder.

---

## Building Packages

Run the packaging script to generate production zip and xpi files:
```bash
./package.sh
```
Outputs:
- `f1_alert.zip` / `f1_alert.xpi`: Ready for Mozilla Add-on Developer Hub.
- `f1_alert_chrome.zip` / `dist_chrome/`: Ready for Chrome Web Store.
