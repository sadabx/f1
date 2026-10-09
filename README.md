# F1 Live Dashboard & Extension

A real-time Formula 1 dashboard and companion browser extension providing live countdowns, weekend schedules, standings, qualifying results, and pre-session alerts.

- **Live Dashboard:** [f1.trionine.com](https://f1.trionine.com)
- **Firefox Add-on:** [addons.mozilla.org/firefox/addon/f1-dash](https://addons.mozilla.org/firefox/addon/f1-dash/)
- **Chromium Build (Brave, Chrome, Edge):** Available under [Releases](https://github.com/sadabx/f1/releases)

---

## Features

### Web Dashboard
- **Real-Time Schedule:** Complete race calendar with automatic local timezone conversion and relative countdown timers.
- **Standings & Results:** Driver championship standings and race podium finishes.
- **Qualifying Grids:** Detailed session results across Q1, Q2, and Q3.
- **Static API Pipeline:** Scraped data is cached and served as static JSON for sub-second page loads.

### Browser Extension
- **Toolbar Countdown:** Live digital clock tracking the exact countdown to the next practice, qualifying, sprint, or race.
- **Pre-Session Audio Alarms:** Plays the official F1 intro theme 5 minutes before green light (configurable from 5 to 30 minutes).
- **Session Filters:** Toggle alerts individually for Practice (FP1-3), Sprint Shootout, Sprint Race, Qualifying, or Grand Prix.
- **Local Timezones:** Converts all track session start times directly to your system's timezone.
- **Cross-Browser Support:** Manifest V3 compatible across Firefox, Brave, Chrome, and Edge.

---

## Installation (Browser Extension)

### Firefox
Install directly from the official Mozilla Add-ons store:
1. Visit the [F1 Dash Firefox Add-on page](https://addons.mozilla.org/firefox/addon/f1-dash/).
2. Click **Add to Firefox**.

### Brave / Chrome / Edge
1. Download `f1-dash-chrome.zip` from the latest [GitHub Release](https://github.com/sadabx/f1/releases).
2. Extract the downloaded ZIP file to a folder.
3. Open the extensions page in your browser:
   - **Brave:** `brave://extensions`
   - **Chrome:** `chrome://extensions`
   - **Edge:** `edge://extensions`
4. Enable **Developer mode** (toggle in the top-right corner).
5. Click **Load unpacked** (top-left) and select the extracted folder.

---

## Public API Endpoints

The project provides free, CORS-enabled static JSON endpoints updated automatically throughout race weekends:

| Endpoint | Description |
| :--- | :--- |
| `https://f1.trionine.com/api/current.json` | Race calendar and weekend session schedules |
| `https://f1.trionine.com/api/standings.json` | Driver championship standings |
| `https://f1.trionine.com/api/results.json` | Completed race results and podium finishes |
| `https://f1.trionine.com/api/qualifying.json` | Qualifying session results (Q1, Q2, Q3) |

---

## Local Development

### Running the Web Dashboard
```bash
python3 -m http.server 5000
```
Open `http://localhost:5000` in your browser.

### Building the Browser Extension
```bash
cd extension
./package.sh
```
This builds both distribution packages:
- `f1_alert.zip` (Firefox Manifest V3)
- `f1_alert_chrome.zip` / `dist_chrome/` (Chromium Manifest V3)

---

## Disclaimer

This is an unofficial fan project and is not affiliated, endorsed, or associated with Formula 1, Formula One Licensing B.V., the FIA, or any related entities. F1, FORMULA 1, and related marks are registered trademarks of Formula One Licensing B.V.
