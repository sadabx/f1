# F1 Dash - Browser Extension

A real-time Formula 1 & Formula 2 browser extension built to bring your [F1 Live Dashboard](https://f1.trionine.com) schedule directly into your browser toolbar, with live telemetry, standings, results, and pre-session F1 Theme audio alarms before green light!

- **Firefox Add-on:** [addons.mozilla.org/firefox/addon/f1-dash](https://addons.mozilla.org/firefox/addon/f1-dash/)
- **Microsoft Edge Add-on:** [microsoftedge.microsoft.com/addons/detail/f1-dash](https://microsoftedge.microsoft.com/addons/detail/f1-dash/bhjaiaenljechcgogkioimliaeagjklj)

---

## Features

- **Live Countdown & Weekend Sessions:** High-contrast live digital countdown to the next session, full weekend timetable in your local timezone, 2026/2027 season coverage, and an optional **Formula 2 (F2)** switcher.
- **Official Live Timing Tower:** Streams real-time F1 SignalR telemetry (lap/best times, intervals, leader gaps, pit indicators, tyre compounds) plus post-session final classifications.
- **Standings, Results & Starting Grids:** Driver and Constructor championship standings, completed race podiums, and qualifying grids.
- **Pre-Session Audio Alarm:** Plays the iconic F1 intro theme before every session start (configurable 5, 10, 15, or 30 minutes ahead) with volume and per-session filters (Practice, Sprint Shootout, Sprint, Qualifying, Grand Prix).
- **Desktop Notifications & Team Radio Chimes:** System alerts for Starting Grid confirmation and Session Underway events.
- **Cross-Browser Support:** Native background event page audio on Firefox, and Service Worker + Offscreen document audio on Chromium (Edge, Chrome, Brave, Opera).

---

## Structure

- `manifest.json` — Firefox / default Manifest V3 manifest
- `manifest.chrome.json` — Chromium Manifest V3 manifest (injected into `dist/chrome/manifest.json`)
- `js/` — Modular extension scripts (`background.js`, `offscreen.js`, `utils.js`, `live.js`, `schedule.js`, `popup.js`)
- `popup.html`, `popup.css`, `offscreen.html`, `assets/` — UI, fonts, icons, audio, and fallback calendars
- `VERSION` & `package.sh` — Single-source version injection and packaging into `dist/`

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
2. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`).
3. Enable **Developer mode** (top right toggle).
4. Click **"Load unpacked"** and select the `dist/chrome` folder.

---

## Building Packages

Run the packaging script (reads `VERSION` and updates both manifests) to generate production archives in `dist/`:
```bash
./package.sh
```
Outputs:
- `dist/f1_dash.zip` / `dist/f1_dash.xpi`: Ready for Mozilla Add-on Developer Hub.
- `dist/f1_dash_chrome.zip` / `dist/chrome/`: Ready for Edge Add-ons & Chrome Web Store.
