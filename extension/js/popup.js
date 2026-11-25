// Permanent Driver Database Fallback (Prevents #number display)
// (moved to utils.js)

var currentSeasonYear = ACTIVE_SEASON_YEAR;

var currentSeries = 'f1'; // 'f1' | 'f2'
var allF1Races = [];
var allF2Races = [];
var actualNextF1RaceIndex = 0;
var actualNextF2RaceIndex = 0;

var currentSettings = null;
var allRaces = [];
var actualNextRaceIndex = 0;
var displayedRaceIndex = 0;
var countdownTimer = null;
var activeTab = 'tab-weekend';
var standingsSubTab = 'drivers';
var standingsData = null;
var allResultsRaces = [];
var currentTargetSession = null;
var resultsSubTab = "race";
var latestQualifyingData = null;

// ============================================================
// SEASON DISPLAY & DATE UTILITIES
// ============================================================




// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupUIEventListeners();
  initOnlineOfflineListeners();

  await loadSettings();
  await loadDismissedNotifs();

  try {
    const storedSeason = await api.storage.local.get("selectedSeason");
    if (storedSeason?.selectedSeason && SUPPORTED_SEASONS.includes(Number(storedSeason.selectedSeason))) {
      currentSeasonYear = Number(storedSeason.selectedSeason);
    }
  } catch (_) {}
  updateSeasonUI();

  await loadScheduleData();
  await updateNotificationsBadge();
  await checkSettingsBadgeDot();

  if (currentSettings?.f2SwitcherEnabled && currentSettings?.activeSeries === 'f2') {
    await switchSeries('f2');
  }
});

function initOnlineOfflineListeners() {
  const banner = document.getElementById("offline-banner");
  const updateStatus = () => {
    const isOffline = !navigator.onLine;
    if (banner) {
      banner.style.display = isOffline ? "flex" : "none";
    }
  };

  window.addEventListener("online", () => {
    updateStatus();
    // Re-sync active tab when network connection is restored
    if (activeTab === "tab-weekend") loadScheduleData();
    else if (activeTab === "tab-standings") loadStandings();
    else if (activeTab === "tab-results") loadResults();
    else if (activeTab === "tab-live") loadLiveTelemetry();
  });

  window.addEventListener("offline", updateStatus);
  updateStatus();
}

// ============================================================
// SETTINGS
// ============================================================
async function loadSettings() {
  const defaults = {
    alarmEnabled: true,
    masterEnabled: true,
    leadTime: 5,
    leadMinutes: 5,
    soundEnabled: true,
    volume: 85,
    sessions: { fp: true, sq: true, sprint: true, quali: true, race: true },
    pushEnabled: true,
    pushGrid: true,
    pushLive: true,
    f2SwitcherEnabled: false,
    activeSeries: 'f1'
  };

  try {
    const res = await api.storage.local.get('f1_settings');
    currentSettings = res.f1_settings ? { ...defaults, ...res.f1_settings } : defaults;
  } catch (e) {
    currentSettings = defaults;
  }

  // Migrate legacy 0..1 float volume (e.g. 0.85 written by background.js) to 0..100%
  if (typeof currentSettings.volume === 'number' && currentSettings.volume > 0 && currentSettings.volume < 1) {
    currentSettings.volume = Math.round(currentSettings.volume * 100);
    try { api.storage.local.set({ f1_settings: currentSettings }); } catch (_) {}
  }
  if (currentSettings.leadTime === undefined && currentSettings.leadMinutes !== undefined) {
    currentSettings.leadTime = Number(currentSettings.leadMinutes) || 5;
  }

  applySettingsToUI();
}

function applySettingsToUI() {
  if (!currentSettings) return;

  const masterToggle = document.getElementById('master-switch');
  if (masterToggle) masterToggle.checked = !!currentSettings.alarmEnabled;

  const leadSelect = document.getElementById('lead-time-select');
  const leadDisplay = document.getElementById('lead-display');
  const leadVal = currentSettings.leadTime || currentSettings.leadMinutes || 5;
  if (leadSelect) leadSelect.value = String(leadVal);
  if (leadDisplay) leadDisplay.textContent = `${leadVal}m before`;

  const volSlider = document.getElementById('volume-slider');
  const volVal = document.getElementById('volume-val');
  if (volSlider && volVal) {
    let v = currentSettings.volume !== undefined ? Number(currentSettings.volume) : 85;
    if (v > 0 && v < 1) v = Math.round(v * 100);
    v = Math.max(0, Math.min(100, Math.round(v)));
    volSlider.value = v;
    volVal.textContent = `${v}%`;
    volSlider.style.setProperty('--range-progress', `${v}%`);
  }

  const s = currentSettings.sessions || {};
  ['fp', 'sq', 'sprint', 'quali', 'race'].forEach(type => {
    const cb = document.getElementById(`cb-${type}`);
    if (cb) cb.checked = s[type] !== false;
  });

  const pushToggle = document.getElementById('push-switch');
  if (pushToggle) pushToggle.checked = currentSettings.pushEnabled !== false;

  const pushGridCb = document.getElementById('cb-push-grid');
  if (pushGridCb) pushGridCb.checked = currentSettings.pushGrid !== false;

  const pushLiveCb = document.getElementById('cb-push-live');
  if (pushLiveCb) pushLiveCb.checked = currentSettings.pushLive !== false;

  const f2Toggle = document.getElementById('toggle-f2-switcher');
  if (f2Toggle) f2Toggle.checked = !!currentSettings.f2SwitcherEnabled;

  const pillToggle = document.getElementById('series-pill-toggle');
  if (pillToggle) pillToggle.style.display = currentSettings.f2SwitcherEnabled ? 'inline-flex' : 'none';

  // State Dimming for child controls
  const alarmBox = document.getElementById('alarm-controls-box');
  if (alarmBox && masterToggle) {
    alarmBox.classList.toggle('dimmed', !masterToggle.checked);
  }
  const pushBox = document.getElementById('push-controls-box');
  if (pushBox && pushToggle) {
    pushBox.classList.toggle('dimmed', !pushToggle.checked);
  }
}

function saveSettings() {
  if (!currentSettings) return;
  currentSettings.masterEnabled = !!currentSettings.alarmEnabled;
  currentSettings.soundEnabled = !!currentSettings.alarmEnabled;
  currentSettings.leadMinutes = currentSettings.leadTime || 5;

  const f2Toggle = document.getElementById('toggle-f2-switcher');
  if (f2Toggle) currentSettings.f2SwitcherEnabled = f2Toggle.checked;

  api.storage.local.set({ f1_settings: currentSettings });

  if (typeof api !== "undefined" && api?.runtime?.sendMessage) {
    api.runtime.sendMessage({ action: "UPDATE_SETTINGS", settings: currentSettings }).catch(() => {});
  }
}

// ============================================================
// SETTINGS UPDATE BADGE & "WHAT'S NEW" TRACKING
// ============================================================
const CURRENT_SETTINGS_VERSION = (typeof api !== 'undefined' && api?.runtime?.getManifest)
  ? (api.runtime.getManifest()?.version || '1.3.2')
  : '1.3.2';

// Tracked new settings features. Add a feature key here only when introducing
// a brand-new setting so existing users aren't nagged on routine bugfix updates.
const LATEST_SETTINGS_FEATURES = [];

async function checkSettingsBadgeDot() {
  const dot = document.getElementById('settings-badge-dot');
  const f2NewPill = document.getElementById('f2-new-pill');
  if (!dot) return;

  try {
    const res = await api.storage.local.get(['f1_seen_settings_features']);
    const seenFeatures = Array.isArray(res?.f1_seen_settings_features) ? res.f1_seen_settings_features : [];
    const hasUnseenFeature = LATEST_SETTINGS_FEATURES.some(f => !seenFeatures.includes(f));
    const showF2New = LATEST_SETTINGS_FEATURES.includes('f2_support_v13') && !seenFeatures.includes('f2_support_v13');

    dot.style.display = hasUnseenFeature ? 'block' : 'none';
    if (f2NewPill) f2NewPill.style.display = showF2New ? 'inline-block' : 'none';
  } catch (_) {
    dot.style.display = 'none';
    if (f2NewPill) f2NewPill.style.display = 'none';
  }
}

async function markSettingsAsSeen() {
  const dot = document.getElementById('settings-badge-dot');
  if (dot) dot.style.display = 'none';

  try {
    await api.storage.local.set({
      f1_seen_settings_ver: CURRENT_SETTINGS_VERSION,
      f1_seen_settings_features: LATEST_SETTINGS_FEATURES
    });
    localStorage.setItem('f1_seen_settings_ver', CURRENT_SETTINGS_VERSION);
  } catch (_) {}
}

// ============================================================
// TAB NAVIGATION
// ============================================================
function setupNavigation() {
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      if (activeTab === targetId) return;

      activeTab = targetId;
      tabButtons.forEach(b => b.classList.toggle('active', b === btn));
      tabPanes.forEach(p => p.classList.toggle('active', p.id === targetId));

      // Lazy load tab data
      if (targetId === 'tab-standings') loadStandings();
      if (targetId === 'tab-results') loadResults();
      if (targetId === 'tab-live') {
        loadLiveTelemetry();
      } else {
        if (sessionCountdownInterval) {
          clearInterval(sessionCountdownInterval);
          sessionCountdownInterval = null;
        }
        if (liveTabRefreshInterval) {
          clearInterval(liveTabRefreshInterval);
          liveTabRefreshInterval = null;
        }
        if (signalRHeartbeatTimer) {
          clearInterval(signalRHeartbeatTimer);
          signalRHeartbeatTimer = null;
        }
        if (liveWebSocket) {
          try { liveWebSocket.close(); } catch (_) {}
          liveWebSocket = null;
        }
      }
    });
  });

  // Settings Panel Overlay
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const viewMain = document.getElementById('view-main');
  const viewSettings = document.getElementById('view-settings');

  if (btnOpenSettings) {
    btnOpenSettings.addEventListener('click', () => {
      viewMain.classList.remove('active');
      viewSettings.classList.add('active');
      markSettingsAsSeen();
    });
  }

  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      viewSettings.classList.remove('active');
      viewMain.classList.add('active');
      const f2Pill = document.getElementById('f2-new-pill');
      if (f2Pill) f2Pill.style.display = 'none';
      stopThemeAudio();
    });
  }
}

// ============================================================
// TAB 2: STANDINGS (FULL FIRST & LAST NAME + PROGRESS BARS)
// ============================================================
async function loadStandings() {
  const container = document.getElementById('standings-container');
  if (currentSeasonYear !== ACTIVE_SEASON_YEAR) {
    if (container) {
      setSafeContent(container, `
        <div class="empty-standings-notice" style="text-align: center; padding: 48px 24px; color: var(--text-sub);">
          <div style="font-size: 28px; margin-bottom: 12px;">🏆</div>
          <div style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px;">${currentSeasonYear} Season Standings</div>
          <div style="font-size: 12px; line-height: 1.5;">Championship standings will be available once the ${currentSeasonYear} season gets underway. Switch back to 2026 to view current standings.</div>
        </div>
      `);
    }
    return;
  }
  let loadedFromCache = false;

  if (!standingsData) {
    try {
      const cached = await api.storage.local.get("f1_cached_standings");
      if (cached.f1_cached_standings?.data) {
        standingsData = cached.f1_cached_standings.data;
        renderStandings();
        loadedFromCache = true;
      }
    } catch (_) {}

    try {
      const res = await fetch(`https://f1.trionine.com/api/standings.json?_t=${Date.now()}`);
      if (!res.ok) throw new Error('Standings fetch failed');
      standingsData = await res.json();
      await api.storage.local.set({
        f1_cached_standings: { timestamp: Date.now(), data: standingsData }
      });
      renderStandings();
      return;
    } catch (e) {
      if (!loadedFromCache) {
        setSafeContent(container, '<div class="loading-state">Offline. Connect to the internet to load championship standings.</div>');
        return;
      }
    }
  }

  renderStandings();
}

function renderStandings() {
  const container = document.getElementById("standings-container");
  const list = standingsData?.MRData?.StandingsTable?.StandingsLists?.[0];
  if (!list) {
    setSafeContent(container, '<div class="loading-state">No standings data available.</div>');
    return;
  }

  if (standingsSubTab === "drivers") {
    const drivers = list.DriverStandings || [];
    const maxPts = Math.max(...drivers.map(d => parseFloat(d.points) || 1), 1);

    const driversHtml = drivers.map(d => {
      const pos = d.position;
      const team = d.Constructors?.[0]?.name || "";
      const color = getTeamColor(team);
      const pts = parseFloat(d.points) || 0;
      const pct = Math.min(100, Math.max(8, (pts / maxPts) * 100));
      const code = d.Driver?.code || d.Driver?.familyName?.slice(0, 3)?.toUpperCase() || "DRV";
      const fullName = `${d.Driver?.givenName || ""} ${d.Driver?.familyName || ""}`.trim();

      return `
        <div class="standing-bar-row">
          <span class="standing-row-pos">${pos}</span>
          <div class="standing-row-body">
            <div class="standing-row-top">
              <div class="standing-name-box">
                <span class="standing-driver-fullname">${fullName}</span>
                <span class="standing-driver-code">${code}</span>
              </div>
              <span class="standing-row-points">${pts}</span>
            </div>
            <div class="standing-progress-track">
              <div class="standing-progress-fill" style="width: ${pct}%; background-color: ${color};"></div>
            </div>
            <span class="standing-row-team">${team}</span>
          </div>
        </div>
      `;
    }).join("");

    setSafeContent(container, `<div class="standings-list">${driversHtml}</div>`);
  } else {
    // Constructors Standings
    const drivers = list.DriverStandings || [];
    const teamMap = {};
    drivers.forEach(d => {
      const team = d.Constructors?.[0]?.name || "Other";
      const pts = parseFloat(d.points) || 0;
      const code = d.Driver?.code || d.Driver?.familyName || "";
      if (!teamMap[team]) {
        teamMap[team] = { name: team, points: 0, drivers: [] };
      }
      teamMap[team].points += pts;
      if (code && !teamMap[team].drivers.includes(code)) {
        teamMap[team].drivers.push(code);
      }
    });

    const sortedTeams = Object.values(teamMap).sort((a, b) => b.points - a.points);
    const maxTeamPts = Math.max(...sortedTeams.map(t => t.points), 1);

    const teamsHtml = sortedTeams.map((t, idx) => {
      const pos = idx + 1;
      const color = getTeamColor(t.name);
      const pct = Math.min(100, Math.max(8, (t.points / maxTeamPts) * 100));
      const driverPair = t.drivers.join(" / ");

      return `
        <div class="standing-bar-row">
          <span class="standing-row-pos">${pos}</span>
          <div class="standing-row-body">
            <div class="standing-row-top">
              <span class="standing-row-code">${t.name}</span>
              <span class="standing-row-points">${t.points}</span>
            </div>
            <div class="standing-progress-track">
              <div class="standing-progress-fill" style="width: ${pct}%; background-color: ${color};"></div>
            </div>
            <span class="standing-row-team">${driverPair}</span>
          </div>
        </div>
      `;
    }).join("");

    setSafeContent(container, `<div class="standings-list">${teamsHtml}</div>`);
  }
}

function renderPodiumShowcase(race) {
  const latestGpTitle = document.getElementById('results-gp-name');
  const podiumShowcase = document.getElementById('results-podium-showcase');
  if (!race) return;

  const isLatest = allResultsRaces.length > 0 && String(race.round) === String(allResultsRaces[allResultsRaces.length - 1]?.round);
  if (latestGpTitle) {
    latestGpTitle.classList.toggle('historical', !isLatest);
    latestGpTitle.textContent = `${race.raceName} (Round ${race.round})`;
  }

  const results = normalizeResultsRace(race)?.Results || [];
  const p1 = results[0];
  const p2 = results[1];
  const p3 = results[2];

  const t1 = getDriverTeamInfo(p1?.Driver);
  const t2 = getDriverTeamInfo(p2?.Driver);
  const t3 = getDriverTeamInfo(p3?.Driver);

  const styleFor = (color, isP1) => {
    const bg = `linear-gradient(180deg, ${hexToRgba(color, isP1 ? 0.28 : 0.22)} 0%, rgba(18, 18, 22, 0.9) 100%)`;
    const borderTop = `${isP1 ? 3.5 : 3}px solid ${color}`;
    const border = `1px solid ${hexToRgba(color, isP1 ? 0.38 : 0.28)}`;
    const shadow = isP1
      ? `0 6px 20px -2px ${hexToRgba(color, 0.42)}, 0 0 12px ${hexToRgba(color, 0.16)}`
      : `0 4px 14px -3px ${hexToRgba(color, 0.3)}`;
    return `background: ${bg}; border: ${border}; border-top: ${borderTop}; box-shadow: ${shadow}; --team-color: ${color};`;
  };

  setSafeContent(podiumShowcase, `
      <div class="podium-slot p2" style="${styleFor(t2.color, false)}">
      <span class="podium-rank-badge" style="border-color: ${t2.color};">2</span>
      <span class="podium-driver-name">${p2?.Driver?.code || p2?.Driver?.familyName || '—'}</span>
      <span class="podium-team-name">${p2?.Driver?.givenName || t2.team || ''}</span>
    </div>
    <div class="podium-slot p1" style="${styleFor(t1.color, true)}">
      <span class="podium-rank-badge" style="border-color: ${t1.color};">1</span>
      <span class="podium-driver-name">${p1?.Driver?.code || p1?.Driver?.familyName || '—'}</span>
      <span class="podium-team-name">${p1?.Driver?.givenName || t1.team || ''}</span>
    </div>
    <div class="podium-slot p3" style="${styleFor(t3.color, false)}">
      <span class="podium-rank-badge" style="border-color: ${t3.color};">3</span>
      <span class="podium-driver-name">${p3?.Driver?.code || p3?.Driver?.familyName || '—'}</span>
      <span class="podium-team-name">${p3?.Driver?.givenName || t3.team || ''}</span>
    </div>
    `);
}

function renderStartingGrid(quali) {
  const gridContainer = document.getElementById("results-grid-list");
  const gridTitle = document.getElementById("results-grid-title");

  if (!quali || !quali.QualifyingResults || quali.QualifyingResults.length === 0) {
    if (gridContainer) setSafeContent(gridContainer, '<div class="loading-state">Starting grid unavailable.</div>');
    return;
  }

  if (gridTitle) {
    const gpShort = (quali.raceName || "").replace(/ Grand Prix$/i, " GP").replace(/ Grand Prix/i, " GP");
    gridTitle.textContent = `${gpShort.toUpperCase()} - QUALIFYING`;
  }

  const results = quali.QualifyingResults;

  // Render clean starting grid list matching f1.trionine.com layout
  let poleTimeSec = null;
  const gridHtml = results.map((res, index) => {
    const team = res.Constructor?.name || "";
    const col = getTeamColor(team || res.Constructor?.constructorId);

    const timeStr = res.Q3 || res.Q2 || res.Q1;
    let displayTime = "No Time";

    if (timeStr) {
      const parts = timeStr.split(":");
      let currentSec = Infinity;
      if (parts.length === 2) currentSec = (parseInt(parts[0], 10) * 60) + parseFloat(parts[1]);
      else currentSec = parseFloat(timeStr);

      if (index === 0) {
        poleTimeSec = currentSec;
        displayTime = timeStr;
      } else if (poleTimeSec !== null && currentSec !== Infinity) {
        const delta = currentSec - poleTimeSec;
        displayTime = "+" + delta.toFixed(3);
      } else {
        displayTime = timeStr;
      }
    }

    const driverFullName = res.Driver ? `${res.Driver.givenName || ""} ${res.Driver.familyName || ""}`.trim() : (res.Driver?.code || "Driver");
    const isPole = index === 0;

    return `
      <div class="grid-row ${isPole ? "pos-pole" : ""}">
        <span class="g-pos">${res.position}</span>
        <div class="g-bar" style="background: ${col};"></div>
        <div class="g-info">
          <div>
            <div class="s-name">${driverFullName}</div>
            <div class="s-team">${team}</div>
          </div>
          <div class="g-time ${isPole ? "time-pole" : ""}">${displayTime}</div>
        </div>
      </div>
    `;
  }).join("");

  if (gridContainer) setSafeContent(gridContainer, gridHtml);
}

async function loadResults() {
  const container = document.getElementById("results-season-list");
  const segControl = document.getElementById("results-segmented-control");
  const btnRace = document.getElementById("btn-results-race");
  const btnGrid = document.getElementById("btn-results-grid");
  const raceSection = document.getElementById("results-race-section");
  const gridSection = document.getElementById("results-grid-section");
  const heroCard = document.getElementById("results-hero-card");

  if (currentSeasonYear !== ACTIVE_SEASON_YEAR) {
    if (heroCard) heroCard.style.display = "none";
    if (segControl) segControl.style.display = "none";
    if (gridSection) gridSection.style.display = "none";
    if (raceSection) raceSection.style.display = "flex";
    if (container) {
      setSafeContent(container, `
        <div class="empty-results-notice" style="text-align: center; padding: 48px 24px; color: var(--text-sub);">
          <div style="font-size: 28px; margin-bottom: 12px;">🏁</div>
          <div style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px;">${currentSeasonYear} Race Results</div>
          <div style="font-size: 12px; line-height: 1.5;">Official Grand Prix and Sprint results will appear here after each round in ${currentSeasonYear}. Switch to 2026 to view completed races.</div>
        </div>
      `);
    }
    return;
  }

  let loadedFromCache = false;

  // 1. Instant offline/startup render from local storage cache
  try {
    const cached = await api.storage.local.get("f1_cached_results");
    if (cached.f1_cached_results?.source === "verified-api" &&
        Array.isArray(cached.f1_cached_results.data) &&
        cached.f1_cached_results.data.length > 0) {
      allResultsRaces = cached.f1_cached_results.data;
      if (cached.f1_cached_results.qualifyingData) {
        latestQualifyingData = cached.f1_cached_results.qualifyingData;
      }
      loadedFromCache = true;
    } else if (cached.f1_cached_results) {
      // Do not resurrect Results-tab data saved before the verified API-only policy.
      await api.storage.local.remove("f1_cached_results");
    }
  } catch (_) {}

  try {
    // Ensure schedule is loaded for next race round comparison
    if (!allRaces || allRaces.length === 0) {
      try {
        const sRes = await fetch(`https://f1.trionine.com/api/current.json?_t=${Date.now()}`);
        if (sRes.ok) {
          const sData = await sRes.json();
          allRaces = sData?.MRData?.RaceTable?.Races || [];
          findNextRaceIndex();
        }
      } catch (_) {}
    }

    const [resResults, resQuali] = await Promise.all([
      fetch(`https://f1.trionine.com/api/results.json?_t=${Date.now()}`),
      fetch(`https://f1.trionine.com/api/qualifying.json?_t=${Date.now()}`).catch(() => null)
    ]);

    if (!resResults.ok) throw new Error("Results fetch failed");
    const data = await resResults.json();
    const races = data?.MRData?.RaceTable?.Races || [];
    allResultsRaces = races;

    // Resilient Fallback: If a scheduled race has concluded but is not yet in results.json, fetch latest classification from OpenF1
    const now = Date.now();
    const completedRaces = (allRaces || []).filter(rc => {
      const raceTime = new Date(`${rc.date}T${rc.time || "12:00:00Z"}`).getTime();
      return (raceTime + (2 * 3600 * 1000)) < now;
    });
    const latestCompletedScheduled = completedRaces.length > 0 ? completedRaces[completedRaces.length - 1] : null;

    if (latestCompletedScheduled && (!races.length || !races.some(r => String(r.round) === String(latestCompletedScheduled.round)))) {
      try {
        const [resRes, drvRes, sessRes] = await Promise.all([
          fetch("https://api.openf1.org/v1/session_result?session_key=latest").catch(() => null),
          fetch("https://api.openf1.org/v1/drivers?session_key=latest").catch(() => null),
          fetch("https://api.openf1.org/v1/sessions?session_key=latest").catch(() => null)
        ]);

        // Phantom-podium gate: OpenF1's `latest` session may be a Practice,
        // Qualifying or Sprint session. Only a completed Race from the same
        // weekend as the scheduled round may be injected as a race result.
        const sessData = (sessRes && sessRes.ok) ? await sessRes.json().catch(() => []) : [];
        const openF1Session = Array.isArray(sessData) && sessData.length > 0 ? sessData[0] : null;
        const isRaceSession = String(openF1Session?.session_type || "").toLowerCase() === "race";

        const OPENF1_RESULT_WINDOW_MS = 48 * 60 * 60 * 1000;
        const OPENF1_WEEKEND_WINDOW_MS = 4 * 24 * 60 * 60 * 1000;
        const scheduledRaceTime = new Date(`${latestCompletedScheduled.date}T${latestCompletedScheduled.time || "12:00:00Z"}`).getTime();
        const openF1Start = openF1Session?.date_start ? new Date(openF1Session.date_start).getTime() : NaN;
        const openF1End = openF1Session?.date_end ? new Date(openF1Session.date_end).getTime() : NaN;
        const withinDateWindow = Number.isFinite(openF1Start) &&
          Number.isFinite(openF1End) &&
          Math.abs(openF1Start - scheduledRaceTime) <= OPENF1_WEEKEND_WINDOW_MS &&
          now >= openF1End &&
          now <= openF1End + OPENF1_RESULT_WINDOW_MS;

        if (isRaceSession && withinDateWindow && resRes && resRes.ok) {
          const resData = await resRes.json();
          const drvData = (drvRes && drvRes.ok) ? await drvRes.json() : [];
          const drvMap = {};
          if (Array.isArray(drvData)) {
            drvData.forEach(d => {
              drvMap[d.driver_number] = {
                code: d.name_acronym || `#${d.driver_number}`,
                givenName: d.first_name || "",
                familyName: d.last_name || ""
              };
            });
          }

          if (Array.isArray(resData) && resData.length > 0) {
            const sorted = resData.slice().sort((a, b) => (a.position || 99) - (b.position || 99));
            const podiumResults = sorted.slice(0, 3).map(item => {
              const meta = drvMap[item.driver_number] || STATIC_DRIVERS[item.driver_number] || {};
              return {
                position: String(item.position),
                Driver: {
                  givenName: meta.givenName || meta.name?.split(" ")?.[0] || "",
                  familyName: meta.familyName || meta.name?.split(" ")?.slice(1)?.join(" ") || "",
                  code: meta.code || `#${item.driver_number}`
                }
              };
            });

            if (podiumResults.length > 0) {
              const liveRaceResult = normalizeResultsRace({
                round: String(latestCompletedScheduled.round),
                raceName: latestCompletedScheduled.raceName,
                Results: podiumResults
              });
              races.push(liveRaceResult);
              allResultsRaces = races;
            }
          }
        }
      } catch (_) {}
    }

    // Check qualifying data
    if (resQuali && resQuali.ok) {
      const qData = await resQuali.json().catch(() => null);
      const qualis = qData?.MRData?.RaceTable?.Races || [];
      latestQualifyingData = qualis.length > 0 ? qualis[qualis.length - 1] : null;
    }

    // Starting grid visibility condition: strictly matching website logic (next.round === latestQuali.round)
    const nextRace = allRaces[actualNextRaceIndex];
    const hasGridForUpcoming = Boolean(
      nextRace &&
      latestQualifyingData &&
      String(nextRace.round) === String(latestQualifyingData.round)
    );

    if (segControl) {
      segControl.style.display = hasGridForUpcoming ? "flex" : "none";
    }

    // Default to race view if grid is not available
    if (!hasGridForUpcoming) {
      resultsSubTab = "race";
    }

    // Setup sub-tab toggle listeners once
    if (btnRace && btnGrid && !btnRace.dataset.bound) {
      btnRace.dataset.bound = "true";
      btnRace.addEventListener("click", () => {
        resultsSubTab = "race";
        btnRace.classList.add("active");
        btnGrid.classList.remove("active");
        if (heroCard) heroCard.style.display = "block";
        if (raceSection) raceSection.style.display = "flex";
        if (gridSection) gridSection.style.display = "none";

        const activeCard = container?.querySelector(".result-row-card.active-race");
        const activeRound = activeCard ? activeCard.getAttribute("data-round") : null;
        const targetRace = (activeRound && allResultsRaces.find(rc => String(rc.round) === String(activeRound))) || allResultsRaces[allResultsRaces.length - 1];
        if (targetRace) renderPodiumShowcase(targetRace);
      });

      btnGrid.addEventListener("click", () => {
        resultsSubTab = "grid";
        btnGrid.classList.add("active");
        btnRace.classList.remove("active");
        if (heroCard) heroCard.style.display = "none";
        if (raceSection) raceSection.style.display = "none";
        if (gridSection) gridSection.style.display = "flex";
        if (latestQualifyingData) renderStartingGrid(latestQualifyingData);
      });
    }

    // Delegate wheel events on #tab-results to the active list so scrolling works everywhere
    const tabResults = document.getElementById("tab-results");
    if (tabResults && !tabResults.dataset.wheelBound) {
      tabResults.dataset.wheelBound = "true";
      tabResults.addEventListener("wheel", (e) => {
        const activeList = resultsSubTab === "grid"
          ? document.getElementById("results-grid-list")
          : document.getElementById("results-season-list");
        if (activeList && !activeList.contains(e.target)) {
          activeList.scrollTop += e.deltaY;
        }
      }, { passive: true });
    }

    // Render active sub-tab view
    if (resultsSubTab === "grid" && hasGridForUpcoming && latestQualifyingData) {
      if (btnGrid) btnGrid.classList.add("active");
      if (btnRace) btnRace.classList.remove("active");
      if (heroCard) heroCard.style.display = "none";
      if (raceSection) raceSection.style.display = "none";
      if (gridSection) gridSection.style.display = "flex";
      renderStartingGrid(latestQualifyingData);
    } else {
      if (btnRace) btnRace.classList.add("active");
      if (btnGrid) btnGrid.classList.remove("active");
      if (heroCard) heroCard.style.display = "block";
      if (raceSection) raceSection.style.display = "flex";
      if (gridSection) gridSection.style.display = "none";

      if (races.length === 0) {
        if (container) setSafeContent(container, '<div class="loading-state">No race results recorded yet.</div>');
        return;
      }

      const latest = races[races.length - 1];
      renderPodiumShowcase(latest);

      // Clean Clickable Grand Prix list
      if (container) {
        setSafeContent(container, races.slice().reverse().map((r, idx) => {
          const winner = r.Results?.[0];
          const flag = getFlag(r.raceName);
          const isLatest = idx === 0;

          return `
            <div class="result-row-card ${isLatest ? "active-race" : ""}" data-round="${r.round}">
              <div class="result-row-left">
                <span class="result-round">R${String(r.round).padStart(2, "0")}</span>
                <span class="result-flag">${flag}</span>
                <span class="result-gp-label">${r.raceName}</span>
              </div>
              <div class="result-winner">
                <span class="result-winner-label">P1</span>
                <span class="result-winner-name">${winner?.Driver?.familyName || winner?.Driver?.givenName || "—"}</span>
              </div>
            </div>
          `;
        }).join(""));

        // Clicking a row updates the pinned top podium showcase immediately
        container.querySelectorAll(".result-row-card").forEach(row => {
          row.addEventListener("click", () => {
            container.querySelectorAll(".result-row-card").forEach(r => r.classList.remove("active-race"));
            row.classList.add("active-race");

            const round = row.getAttribute("data-round");
            const targetRace = allResultsRaces.find(rc => String(rc.round) === String(round));
            if (targetRace) {
              renderPodiumShowcase(targetRace);
            }
          });
        });
      }
    }

    // Save fresh data to local cache for offline access
    try {
      api.storage.local.set({
        f1_cached_results: {
          timestamp: Date.now(),
          source: "verified-api",
          data: allResultsRaces,
          qualifyingData: latestQualifyingData
        }
      });
    } catch (_) {}

  } catch (e) {
    if (!loadedFromCache) {
      if (container) setSafeContent(container, '<div class="loading-state">Offline. Connect to the internet to load race results.</div>');
    }
  }
}

// ============================================================
// TAB 4: LIVE TELEMETRY & TIMING TOWER (Official F1 SignalR)
let sessionCountdownInterval = null;

var currentTimingMode = "interval"; // "interval" | "leader"
var cachedLiveTelemetry = null;
var liveWebSocket = null;
var isConnectingSignalR = false;
var signalRHeartbeatTimer = null;
var liveTabRefreshInterval = null;
var activeLiveSessionId = null;
var liveLoadPromise = null;
var liveSignalRState = {
  driverList: {},
  timingData: { Lines: {} },
  timingAppData: { Lines: {} },
  trackStatus: { Status: "1", Message: "AllClear" },
  sessionInfo: null
};

// ============================================================
// UI EVENT LISTENERS
// ============================================================
function setupUIEventListeners() {
  // External links opener (f1.trionine.com, trionine.com, etc.)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="http"]');
    if (link) {
      e.preventDefault();
      const url = link.getAttribute('href');
      if (typeof api !== 'undefined' && api?.tabs?.create) {
        api.tabs.create({ url });
      } else {
        window.open(url, '_blank');
      }
    }
  });

  // Round Carousel Buttons
  const btnPrev = document.getElementById('btn-prev-round');
  const btnNext = document.getElementById('btn-next-round');
  const btnReturn = document.getElementById('btn-return-next');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (displayedRaceIndex > 0) renderRoundIndex(displayedRaceIndex - 1);
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (displayedRaceIndex < allRaces.length - 1) renderRoundIndex(displayedRaceIndex + 1);
    });
  }
  if (btnReturn) {
    btnReturn.addEventListener('click', () => {
      renderRoundIndex(actualNextRaceIndex);
    });
  }

  // Standings Sub-Tabs
  const btnDrivers = document.getElementById('btn-standings-drivers');
  const btnTeams = document.getElementById('btn-standings-teams');

  if (btnDrivers) {
    btnDrivers.addEventListener('click', () => {
      standingsSubTab = 'drivers';
      btnDrivers.classList.add('active');
      btnTeams.classList.remove('active');
      renderStandings();
    });
  }

  if (btnTeams) {
    btnTeams.addEventListener('click', () => {
      standingsSubTab = 'teams';
      btnTeams.classList.add('active');
      btnDrivers.classList.remove('active');
      renderStandings();
    });
  }

  // Settings: Master Alarm Toggle
  const masterToggle = document.getElementById('master-switch');
  const alarmBox = document.getElementById('alarm-controls-box');
  if (masterToggle) {
    masterToggle.addEventListener('change', () => {
      if (currentSettings) {
        currentSettings.alarmEnabled = masterToggle.checked;
        saveSettings();
      }
      if (alarmBox) {
        alarmBox.classList.toggle('dimmed', !masterToggle.checked);
      }
      if (!masterToggle.checked) {
        stopThemeAudio();
      }
    });
  }

  // Settings: Lead Time & Custom Stepper
  const leadOptions = [5, 10, 15, 30];
  const leadSelect = document.getElementById('lead-time-select');
  const leadDisplay = document.getElementById('lead-display');
  const btnLeadPrev = document.getElementById('btn-lead-prev');
  const btnLeadNext = document.getElementById('btn-lead-next');

  function cycleLeadTime(direction) {
    const curVal = currentSettings?.leadTime || 10;
    let idx = leadOptions.indexOf(curVal);
    if (idx === -1) idx = 1;
    idx = (idx + direction + leadOptions.length) % leadOptions.length;
    const nextVal = leadOptions[idx];
    if (leadDisplay) leadDisplay.textContent = `${nextVal}m before`;
    if (leadSelect) {
      leadSelect.value = String(nextVal);
      leadSelect.dispatchEvent(new Event('change'));
    }
  }

  if (btnLeadPrev) btnLeadPrev.addEventListener('click', () => cycleLeadTime(-1));
  if (btnLeadNext) btnLeadNext.addEventListener('click', () => cycleLeadTime(1));
  if (leadDisplay) leadDisplay.addEventListener('click', () => cycleLeadTime(1));

  if (leadSelect) {
    leadSelect.addEventListener('change', () => {
      if (currentSettings) {
        currentSettings.leadTime = parseInt(leadSelect.value, 10);
        saveSettings();
      }
    });
  }

  // Settings: Volume Slider
  const volSlider = document.getElementById('volume-slider');
  const volVal = document.getElementById('volume-val');
  if (volSlider && volVal) {
    volSlider.addEventListener('input', () => {
      const v = parseInt(volSlider.value, 10);
      volVal.textContent = `${v}%`;
      volSlider.style.setProperty('--range-progress', `${v}%`);
      if (currentSettings) {
        currentSettings.volume = v;
        saveSettings();
      }
    });
  }

  // Push Notifications Settings
  const pushSwitch = document.getElementById('push-switch');
  const pushBox = document.getElementById('push-controls-box');
  if (pushSwitch) {
    pushSwitch.addEventListener('change', () => {
      if (currentSettings) {
        currentSettings.pushEnabled = pushSwitch.checked;
        saveSettings();
      }
      if (pushBox) {
        pushBox.classList.toggle('dimmed', !pushSwitch.checked);
      }
    });
  }

  const pushGridCb = document.getElementById('cb-push-grid');
  if (pushGridCb) {
    pushGridCb.addEventListener('change', () => {
      if (currentSettings) {
        currentSettings.pushGrid = pushGridCb.checked;
        saveSettings();
      }
    });
  }

  const pushLiveCb = document.getElementById('cb-push-live');
  if (pushLiveCb) {
    pushLiveCb.addEventListener('change', () => {
      if (currentSettings) {
        currentSettings.pushLive = pushLiveCb.checked;
        saveSettings();
      }
    });
  }

  // Feeder & Support Series (F1 <-> F2)
  const f2Toggle = document.getElementById('toggle-f2-switcher');
  const pillToggle = document.getElementById('series-pill-toggle');
  if (f2Toggle) {
    f2Toggle.addEventListener('change', () => {
      if (currentSettings) {
        currentSettings.f2SwitcherEnabled = f2Toggle.checked;
        saveSettings();
      }
      if (pillToggle) {
        pillToggle.style.display = f2Toggle.checked ? 'inline-flex' : 'none';
      }
      if (!f2Toggle.checked && currentSeries === 'f2') {
        switchSeries('f1');
      }
    });
  }

  const btnSeriesF1 = document.getElementById('btn-series-f1');
  const btnSeriesF2 = document.getElementById('btn-series-f2');
  if (btnSeriesF1) {
    btnSeriesF1.addEventListener('click', () => {
      switchSeries('f1');
    });
  }
  if (btnSeriesF2) {
    btnSeriesF2.addEventListener('click', () => {
      switchSeries('f2');
    });
  }

  const btnTestRadio = document.getElementById('btn-test-radio');
  if (btnTestRadio) {
    btnTestRadio.addEventListener('click', () => {
      testRadioAudio();
    });
  }

  // Notification Bell Button & Popover Toggle
  const btnNotif = document.getElementById('btn-open-notifications');
  const popover = document.getElementById('notifications-popover');

  if (btnNotif && popover) {
    btnNotif.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = popover.style.display === 'none' || !popover.style.display;
      if (isHidden) {
        popover.style.display = 'flex';
        renderNotificationsPopover();
      } else {
        popover.style.display = 'none';
      }
    });
  }

  // Click outside to dismiss popover
  document.addEventListener('click', (e) => {
    const p = document.getElementById('notifications-popover');
    const b = document.getElementById('btn-open-notifications');
    if (p && p.style.display === 'flex') {
      if (!p.contains(e.target) && (!b || !b.contains(e.target))) {
        p.style.display = 'none';
      }
    }
  });

  // Clear All Notifications button
  const btnClearNotifs = document.getElementById('btn-clear-notifications');
  if (btnClearNotifs) {
    btnClearNotifs.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissAllNotifications();
    });
  }

  // Settings: Clear Cache & Force Re-sync
  const btnClearCache = document.getElementById('btn-clear-cache');
  const btnClearCacheText = document.getElementById('btn-clear-cache-text');
  if (btnClearCache) {
    btnClearCache.addEventListener('click', async () => {
      if (btnClearCacheText) btnClearCacheText.textContent = 'Clearing Cache...';
      btnClearCache.disabled = true;

      try {
        // 1. Preserve settings while wiping cached data
        let savedSettings = null;
        if (typeof api !== 'undefined' && api?.storage?.local) {
          const stored = await api.storage.local.get('f1_settings');
          savedSettings = stored?.f1_settings;
          await api.storage.local.clear();
          if (savedSettings) {
            await api.storage.local.set({ f1_settings: savedSettings });
          }
        }

        // 2. Clear localStorage caches while preserving settings
        const lsSettings = localStorage.getItem('f1_settings');
        localStorage.clear();
        if (lsSettings) {
          localStorage.setItem('f1_settings', lsSettings);
        }

        // 3. Reset in-memory cached state
        allRaces = [];
        actualNextRaceIndex = 0;
        standingsData = null;
        allResultsRaces = [];
        latestQualifyingData = null;
        dismissedNotifIds.clear();

        // 4. Signal background worker to re-sync calendar
        try {
          if (typeof api !== 'undefined' && api?.runtime?.sendMessage) {
            api.runtime.sendMessage({ action: 'FORCE_SYNC' });
          }
        } catch (_) {}

        // 5. Reload dashboard data fresh from APIs
        await Promise.allSettled([
          loadDashboard(),
          loadStandings(),
          loadResults()
        ]);

        if (btnClearCacheText) btnClearCacheText.textContent = '✓ Cache Cleared & Refreshed!';
        btnClearCache.style.borderColor = '#27F4D2';
        btnClearCache.style.color = '#27F4D2';
      } catch (err) {
        if (btnClearCacheText) btnClearCacheText.textContent = 'Cache Cleared!';
      } finally {
        setTimeout(() => {
          if (btnClearCacheText) btnClearCacheText.textContent = 'Clear Cache & Refresh';
          btnClearCache.disabled = false;
          btnClearCache.style.borderColor = 'rgba(225, 6, 0, 0.4)';
          btnClearCache.style.color = '#fff';
        }, 2000);
      }
    });
  }

  // Settings: Audio Alarm Testing
  const btnTest = document.getElementById('btn-test-alarm');
  const btnStop = document.getElementById('btn-stop-alarm');

  if (btnTest) {
    btnTest.addEventListener('click', () => {
      testThemeAudio();
    });
  }
  if (btnStop) {
    btnStop.addEventListener('click', () => {
      stopThemeAudio();
    });
  }

  // Settings: Session Checkboxes
  ['fp', 'sq', 'sprint', 'quali', 'race'].forEach(type => {
    const cb = document.getElementById(`cb-${type}`);
    if (cb) {
      cb.addEventListener('change', () => {
        if (currentSettings) {
          currentSettings.sessions[type] = cb.checked;
          saveSettings();
        }
      });
    }
  });

  // Live Timing Tower Header Toggle (Interval <-> Leader Gap)
  const gapHeader = document.getElementById('col-gap-header');
  if (gapHeader) {
    gapHeader.addEventListener('click', () => {
      currentTimingMode = currentTimingMode === 'interval' ? 'leader' : 'interval';
      renderLiveTimingTower();
    });
  }
}

// ============================================================
// AUDIO TEST ENGINE
// ============================================================
let audioTestInstance = null;

function testThemeAudio() {
  const btnTest = document.getElementById("btn-test-alarm");
  const btnStop = document.getElementById("btn-stop-alarm");
  const txt = document.getElementById("test-btn-text");

  if (audioTestInstance) {
    stopThemeAudio();
    return;
  }

  const rawVol = currentSettings?.volume !== undefined ? Number(currentSettings.volume) : 85;
  const vol = (rawVol > 0 && rawVol < 1) ? rawVol : (isNaN(rawVol) ? 0.85 : rawVol / 100);
  const leadMin = currentSettings?.leadTime || 5;
  const audioSrc = (typeof api !== "undefined" && api?.runtime?.getURL)
    ? api.runtime.getURL("assets/f1_theme.mp3")
    : "assets/f1_theme.mp3";

  audioTestInstance = new Audio(audioSrc);
  audioTestInstance.volume = Math.max(0, Math.min(1, vol));

  if (txt) txt.textContent = "Playing Sound...";
  if (btnTest) btnTest.style.display = "none";
  if (btnStop) btnStop.style.display = "inline-flex";

  audioTestInstance.onended = () => {
    stopThemeAudio();
  };

  audioTestInstance.play().then(() => {
    if (typeof api !== "undefined" && api?.notifications?.create) {
      api.notifications.create("f1_test_notification", {
        type: "basic",
        iconUrl: api.runtime.getURL("assets/icon128.png"),
        title: "🏎️ F1 Live Alert: Alarm Test Active!",
        message: `Lights out in ${leadMin} minutes! Playing official F1 Theme.`,
        priority: 2
      });
    }
  }).catch((err) => {
    console.warn("Popup theme audio blocked, delegating to background:", err);
    if (typeof api !== "undefined" && api?.runtime?.sendMessage) {
      api.runtime.sendMessage({ action: "TEST_ALARM", volume: vol }).catch(() => {});
    }
  });
}

function stopThemeAudio() {
  const btnTest = document.getElementById("btn-test-alarm");
  const btnStop = document.getElementById("btn-stop-alarm");
  const txt = document.getElementById("test-btn-text");

  if (audioTestInstance) {
    audioTestInstance.pause();
    audioTestInstance.currentTime = 0;
    audioTestInstance = null;
  }

  if (typeof api !== "undefined" && api?.runtime?.sendMessage) {
    api.runtime.sendMessage({ action: "STOP_ALARM" }).catch(() => {});
  }

  if (txt) txt.textContent = "Test Alarm";
  if (btnTest) btnTest.style.display = "inline-flex";
  if (btnStop) btnStop.style.display = "none";
}

// ============================================================
// NOTIFICATIONS & RACE ALERTS ENGINE (Option A Popover)
// ============================================================
let dismissedNotifIds = new Set();

async function loadDismissedNotifs() {
  try {
    if (typeof api !== "undefined" && api?.storage?.local) {
      const res = await api.storage.local.get("f1_dismissed_notifs");
      if (Array.isArray(res.f1_dismissed_notifs)) {
        dismissedNotifIds = new Set(res.f1_dismissed_notifs);
        return;
      }
    }
    const local = localStorage.getItem("f1_dismissed_notifs");
    if (local) dismissedNotifIds = new Set(JSON.parse(local));
  } catch (_) {}
}

async function saveDismissedNotifs() {
  const arr = [...dismissedNotifIds];
  try {
    if (typeof api !== "undefined" && api?.storage?.local) {
      await api.storage.local.set({ f1_dismissed_notifs: arr });
    }
  } catch (_) {}
  try {
    localStorage.setItem("f1_dismissed_notifs", JSON.stringify(arr));
  } catch (_) {}
}

async function dismissAllNotifications() {
  const badge = document.getElementById("notification-badge-dot");
  const countEl = document.getElementById("notif-count-badge");

  const notifs = getActiveNotificationsList();
  notifs.forEach(n => dismissedNotifIds.add(n.id));
  await saveDismissedNotifs();

  if (badge) badge.style.display = "none";
  if (countEl) countEl.textContent = "0";
  renderNotificationsPopover();
}

async function updateNotificationsBadge() {
  const badge = document.getElementById('notification-badge-dot');
  const countBadge = document.getElementById('notif-count-badge');

  const nextRace = (allRaces && allRaces.length > 0) ? allRaces[actualNextRaceIndex] : null;

  if (!latestQualifyingData) {
    try {
      const qRes = await fetch(`https://f1.trionine.com/api/qualifying.json?_t=${Date.now()}`);
      if (qRes.ok) {
        const qData = await qRes.json();
        const qualis = qData?.MRData?.RaceTable?.Races || [];
        latestQualifyingData = qualis.length > 0 ? qualis[qualis.length - 1] : null;
      }
    } catch (_) {}
  }

  const notifs = getActiveNotificationsList();
  const unreadNotifs = notifs.filter(n => !dismissedNotifIds.has(n.id));

  if (badge) {
    badge.style.display = unreadNotifs.length > 0 ? 'block' : 'none';
  }
  if (countBadge) {
    countBadge.textContent = String(unreadNotifs.length);
  }
}

function getActiveNotificationsList() {
  const list = [];
  const nextRace = (allRaces && allRaces.length > 0) ? allRaces[actualNextRaceIndex] : null;

  // 1. Starting Grid Notification (Only if nextRace.round === latestQualifyingData.round)
  if (nextRace && latestQualifyingData && String(nextRace.round) === String(latestQualifyingData.round)) {
    const pole = latestQualifyingData.QualifyingResults?.[0];
    const poleDriver = pole?.Driver?.code || pole?.Driver?.familyName || 'Pole';
    const poleTime = pole?.Q3 || pole?.Q2 || pole?.Q1 || '';
    list.push({
      id: `grid_${latestQualifyingData.round}`,
      type: 'grid',
      title: `${latestQualifyingData.raceName} • Qualifying Results`,
      desc: `Pole Position: ${poleDriver} (${poleTime})`,
      actionTag: 'View Grid →',
      target: 'grid'
    });
  }

  // 2. Live Session Notification (If session is currently active)
  if (cachedLiveTelemetry?.sessionProgress?.isLive) {
    const sessName = (cachedLiveTelemetry.sessionProgress.sessionType || 'Session').toUpperCase();
    list.push({
      id: `live_${nextRace?.round || 'active'}`,
      type: 'live',
      title: `${sessName} • Session Underway`,
      desc: 'Live timing tower and telemetry active',
      actionTag: 'Live Timing →',
      target: 'live'
    });
  }

  // 3. Recent Grand Prix Result
  if (allResultsRaces && allResultsRaces.length > 0) {
    const latestResult = allResultsRaces[allResultsRaces.length - 1];
    const winner = latestResult.Results?.[0];
    const winnerName = winner?.Driver?.familyName || winner?.Driver?.code || 'Winner';
    list.push({
      id: `result_${latestResult.round}`,
      type: 'result',
      title: `${latestResult.raceName} • Race Results`,
      desc: `Winner: ${winnerName}`,
      actionTag: 'View Results →',
      target: 'result',
      round: latestResult.round
    });
  }

  return list;
}

function renderNotificationsPopover() {
  const container = document.getElementById('notif-popover-list');
  const countBadge = document.getElementById('notif-count-badge');
  const popover = document.getElementById('notifications-popover');
  if (!container) return;

  const notifs = getActiveNotificationsList();
  const unreadNotifs = notifs.filter(n => !dismissedNotifIds.has(n.id));

  if (countBadge) countBadge.textContent = String(unreadNotifs.length);

  if (unreadNotifs.length === 0) {
    setSafeContent(container, `
      <div class="notif-empty-state">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.4;">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <span>No active notifications. You are up to date.</span>
      </div>
    `);
    return;
  }

  setSafeContent(container, unreadNotifs.map(n => {
    let iconClass = 'grid-icon';
    let iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;

    if (n.type === 'live') {
      iconClass = 'live-icon';
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.93 19.07a10 10 0 0 1 0-14.14"></path><path d="M7.76 16.24a6 6 0 0 1 0-8.48"></path><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.48"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
    } else if (n.type === 'result') {
      iconClass = 'result-icon';
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`;
    }

    return `
      <div class="notif-card" data-notif-id="${n.id}" data-target="${n.target}">
        <div class="notif-icon-box ${iconClass}">${iconSvg}</div>
        <div class="notif-content">
          <span class="notif-title">${n.title}</span>
          <span class="notif-desc">${n.desc}</span>
          <span class="notif-action-tag">${n.actionTag}</span>
        </div>
      </div>
    `;
  }).join(''));

  // Wire click on notification cards to navigate to target tabs
  container.querySelectorAll('.notif-card').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.getAttribute('data-target');
      const id = card.getAttribute('data-notif-id');
      if (id) {
        dismissedNotifIds.add(id);
        saveDismissedNotifs();
      }
      renderNotificationsPopover();

      if (popover) popover.style.display = 'none';
      updateNotificationsBadge();

      if (target === 'grid') {
        switchTabFromCode('tab-results');
        resultsSubTab = 'grid';
        loadResults();
      } else if (target === 'live') {
        switchTabFromCode('tab-live');
      } else if (target === 'result') {
        switchTabFromCode('tab-results');
        resultsSubTab = 'race';
        loadResults();
      }
    });
  });
}

function switchTabFromCode(targetId) {
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  activeTab = targetId;
  tabButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === targetId));
  tabPanes.forEach(p => p.classList.toggle('active', p.id === targetId));

  if (targetId !== 'tab-live') {
    if (liveTabRefreshInterval) {
      clearInterval(liveTabRefreshInterval);
      liveTabRefreshInterval = null;
    }
    if (signalRHeartbeatTimer) {
      clearInterval(signalRHeartbeatTimer);
      signalRHeartbeatTimer = null;
    }
    if (liveWebSocket) {
      try { liveWebSocket.close(); } catch (_) {}
      liveWebSocket = null;
    }
  }

  if (targetId === 'tab-standings') loadStandings();
  if (targetId === 'tab-results') loadResults();
  if (targetId === 'tab-live') loadLiveTelemetry();
}

let radioAudioInstance = null;

function testRadioAudio() {
  const txt = document.getElementById('test-radio-text');
  const btn = document.getElementById('btn-test-radio');

  if (radioAudioInstance) {
    radioAudioInstance.pause();
    radioAudioInstance.currentTime = 0;
    radioAudioInstance = null;
    if (btn) btn.classList.remove('active-stop');
    if (txt) txt.textContent = 'Test Radio';
    return;
  }

  const rawVol = currentSettings?.volume !== undefined ? Number(currentSettings.volume) : 85;
  const vol = (rawVol > 0 && rawVol < 1) ? rawVol : (isNaN(rawVol) ? 0.85 : rawVol / 100);
  const audioSrc = (typeof api !== 'undefined' && api?.runtime?.getURL)
    ? api.runtime.getURL('assets/f1_radio.mp3')
    : 'assets/f1_radio.mp3';

  radioAudioInstance = new Audio(audioSrc);
  radioAudioInstance.volume = Math.max(0, Math.min(1, vol));

  if (txt) txt.textContent = 'Playing Radio Beep...';
  if (btn) btn.classList.add('active-stop');

  radioAudioInstance.addEventListener('ended', () => {
    if (btn) btn.classList.remove('active-stop');
    if (txt) txt.textContent = 'Test Radio';
  });

  radioAudioInstance.play().then(() => {
    if (typeof api !== 'undefined' && api?.notifications?.create) {
      api.notifications.create('f1_test_radio_notification', {
        type: 'basic',
        iconUrl: api.runtime.getURL('assets/icon128.png'),
        title: 'Team Radio Alert',
        message: 'Qualifying results confirmed. Testing team radio notification sound.',
        priority: 2
      });
    }
  }).catch((err) => {
    console.warn('Popup audio play error, delegating to background:', err);
    if (typeof api !== 'undefined' && api?.runtime?.sendMessage) {
      api.runtime.sendMessage({ action: 'TEST_RADIO', volume: vol }).catch(() => {});
    }
  });

  radioAudioInstance.onended = () => {
    if (txt) txt.textContent = 'Test Team Radio Beep';
    radioAudioInstance = null;
  };

  setTimeout(() => {
    if (txt) txt.textContent = 'Test Team Radio Beep';
  }, 2000);
}
