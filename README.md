# F1 Live Dashboard & Extension

Formula 1 real-time schedule web dashboard, companion browser extension, and free open F1 API providing live countdowns, weekend schedules, standings, qualifying results, and pre-session alerts.

- **Live Dashboard:** [f1.trionine.com](https://f1.trionine.com)
- **Firefox Add-on:** [addons.mozilla.org/firefox/addon/f1-dash](https://addons.mozilla.org/firefox/addon/f1-dash/)
- **Microsoft Edge Add-on:** [microsoftedge.microsoft.com/addons/detail/f1-dash](https://microsoftedge.microsoft.com/addons/detail/f1-dash/bhjaiaenljechcgogkioimliaeagjklj)
- **Chromium Release (Chrome, Brave, Opera):** Available under [Releases](https://github.com/sadabx/f1/releases)

---

## Features

### Web Dashboard (`web/`)
- **Real-Time Schedule:** Complete 2026 & 2027 race calendars with automatic local timezone conversion and relative countdown timers.
- **Standings & Results:** Driver and constructor championship standings, race podium finishes, and qualifying starting grids.
- **Static API Pipeline:** Scraped data is served from `web/api/` as static JSON for sub-second page loads.

### Browser Extension (`extension/`)
- **Toolbar Countdown:** Live digital clock tracking the countdown to the next practice, sprint shootout, sprint, qualifying, or Grand Prix — plus optional **Formula 2 (F2)** calendar switching.
- **Live Timing Tower:** Real-time Formula 1 SignalR telemetry with lap/best times, intervals, leader gaps, pit indicators, tyre compounds, and post-session final classifications.
- **Standings & Results:** Full championship standings, race podium history, and starting grid classifications.
- **Pre-Session Audio Alarms & Notifications:** Plays the official F1 intro theme before green light (configurable 5–30 minutes ahead) plus desktop notifications and team radio chimes for Starting Grid and Session Underway events.
- **Cross-Browser Support:** Manifest V3 compatible across Firefox, Microsoft Edge, Chrome, Brave, and Opera.

---

## Installation (Browser Extension)

### Firefox
Install directly from the official Mozilla Add-ons store:
1. Visit the [F1 Dash Firefox Add-on page](https://addons.mozilla.org/firefox/addon/f1-dash/).
2. Click **Add to Firefox**.

### Microsoft Edge
Install directly from the Microsoft Edge Add-ons store:
1. Visit the [F1 Dash Edge Add-on page](https://microsoftedge.microsoft.com/addons/detail/f1-dash/bhjaiaenljechcgogkioimliaeagjklj).
2. Click **Get**.

### Chrome / Brave / Other Chromium Browsers
1. Download `f1_dash_chrome.zip` from the latest [GitHub Release](https://github.com/sadabx/f1/releases).
2. Extract the downloaded ZIP file to a folder.
3. Open your browser's extensions page (`chrome://extensions` or `brave://extensions`).
4. Enable **Developer mode** (toggle in the top-right corner).
5. Click **Load unpacked** (top-left) and select the extracted folder.

---

## Public API Endpoints

The project provides free, CORS-enabled static JSON endpoints updated automatically throughout race weekends:

| Endpoint | Description |
| :--- | :--- |
| `https://f1.trionine.com/api/current.json` | Active season race calendar and weekend session schedules |
| `https://f1.trionine.com/api/2027.json` | 2027 season race calendar preview |
| `https://f1.trionine.com/api/standings.json` | Driver and constructor championship standings |
| `https://f1.trionine.com/api/results.json` | Completed race results and podium finishes |
| `https://f1.trionine.com/api/qualifying.json` | Qualifying session results (Q1, Q2, Q3) |

---

## Project Structure

- `web/` — Static web dashboard (`index.html`, `css/`, `js/`, `assets/`, `api/`) deployed to `f1.trionine.com`
- `extension/` — Cross-browser Manifest V3 extension (`manifest.json`, `manifest.chrome.json`, `js/`, `assets/`, `package.sh`, `VERSION`)
- `scripts/` — Data pipeline (`update_api.py`) generating `web/api/*.json`

## Building from Source

To package the extension archives:
```bash
cd extension
./package.sh
```
Outputs `dist/f1_dash.zip` / `dist/f1_dash.xpi` (Firefox MV3) and `dist/f1_dash_chrome.zip` / `dist/chrome/` (Chromium MV3).

---

## Disclaimer

This is an unofficial fan project and is not affiliated, endorsed, or associated with Formula 1, Formula One Licensing B.V., the FIA, or any related entities. F1, FORMULA 1, and related marks are registered trademarks of Formula One Licensing B.V.
