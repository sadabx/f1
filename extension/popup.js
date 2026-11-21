function setSafeContent(el, htmlString) {
  if (!el) return;
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  el.replaceChildren(...doc.body.childNodes);
}

// ============================================================
// F1 Dash - Multi-Tab Engine (Weekend, Standings, Results, Live)
// ============================================================
const api = (typeof browser !== 'undefined') ? browser : (typeof chrome !== 'undefined' ? chrome : {
  storage: { local: { get: async () => ({}), set: async () => {} } },
  runtime: { getURL: (p) => p, sendMessage: async () => {} },
  tabs: { create: ({ url }) => window.open(url, '_blank') }
});

// Complete Country & Circuit Flags Map
const FLAGS = {
  // Australia
  "Australia": "🇦🇺", "Australian": "🇦🇺", "Melbourne": "🇦🇺", "Albert Park": "🇦🇺",
  // China
  "China": "🇨🇳", "Chinese": "🇨🇳", "Shanghai": "🇨🇳",
  // Japan
  "Japan": "🇯🇵", "Japanese": "🇯🇵", "Suzuka": "🇯🇵",
  // USA & Circuits
  "Miami": "🇺🇸", "United States": "🇺🇸", "USA": "🇺🇸", "Las Vegas": "🇺🇸", "Austin": "🇺🇸", "Americas": "🇺🇸",
  // Canada
  "Canada": "🇨🇦", "Canadian": "🇨🇦", "Montreal": "🇨🇦", "Gilles Villeneuve": "🇨🇦",
  // Monaco
  "Monaco": "🇲🇨", "Monte Carlo": "🇲🇨",
  // Spain & Catalunya & Madrid
  "Barcelona Catalunya": "🇪🇸", "Barcelona-Catalunya": "🇪🇸", "Catalunya": "🇪🇸", "Spain": "🇪🇸", "Spanish": "🇪🇸", "Madrid": "🇪🇸", "Barcelona": "🇪🇸",
  // Austria
  "Austria": "🇦🇹", "Austrian": "🇦🇹", "Spielberg": "🇦🇹", "Red Bull Ring": "🇦🇹",
  // Great Britain / UK
  "Great Britain": "🇬🇧", "British": "🇬🇧", "United Kingdom": "🇬🇧", "UK": "🇬🇧", "Silverstone": "🇬🇧",
  // Belgium
  "Belgium": "🇧🇪", "Belgian": "🇧🇪", "Spa": "🇧🇪", "Spa-Francorchamps": "🇧🇪",
  // Hungary
  "Hungary": "🇭🇺", "Hungarian": "🇭🇺", "Hungaroring": "🇭🇺", "Budapest": "🇭🇺",
  // Netherlands
  "Netherlands": "🇳🇱", "Dutch": "🇳🇱", "Zandvoort": "🇳🇱",
  // Italy & Imola
  "Italy": "🇮🇹", "Italian": "🇮🇹", "Monza": "🇮🇹", "Imola": "🇮🇹", "Emilia Romagna": "🇮🇹", "Emilia-Romagna": "🇮🇹",
  // Azerbaijan
  "Azerbaijan": "🇦🇿", "Baku": "🇦🇿",
  // Bahrain & Saudi
  "Bahrain": "🇧🇭", "Sakhir": "🇧🇭", "Saudi Arabia": "🇸🇦", "Saudi Arabian": "🇸🇦", "Saudi": "🇸🇦", "Jeddah": "🇸🇦",
  // Singapore & Malaysia
  "Singapore": "🇸🇬", "Marina Bay": "🇸🇬", "Malaysia": "🇲🇾", "Malaysian": "🇲🇾", "Sepang": "🇲🇾",
  // Mexico & Brazil
  "Mexico": "🇲🇽", "Mexican": "🇲🇽", "Mexico City": "🇲🇽", "Hermanos Rodriguez": "🇲🇽",
  "Brazil": "🇧🇷", "Brazilian": "🇧🇷", "São Paulo": "🇧🇷", "Sao Paulo": "🇧🇷", "Interlagos": "🇧🇷",
  // Middle East
  "Qatar": "🇶🇦", "Losail": "🇶🇦", "Lusail": "🇶🇦",
  "Abu Dhabi": "🇦🇪", "United Arab Emirates": "🇦🇪", "UAE": "🇦🇪", "Yas Marina": "🇦🇪",
  // Portugal & Turkey
  "Portugal": "🇵🇹", "Portuguese": "🇵🇹", "Portimão": "🇵🇹", "Portimao": "🇵🇹", "Algarve": "🇵🇹",
  "Turkey": "🇹🇷", "Turkish": "🇹🇷", "Türkiye": "🇹🇷", "Istanbul": "🇹🇷", "Istanbul Park": "🇹🇷"
};

const TEAM_COLORS = {
  'Red Bull': '#3671C6',
  'Red Bull Racing': '#3671C6',
  'Ferrari': '#E80020',
  'Mercedes': '#27F4D2',
  'McLaren': '#FF8000',
  'Aston Martin': '#229971',
  'Alpine': '#0093CC',
  'Williams': '#64C4FF',
  'RB': '#6692FF',
  'VCARB': '#6692FF',
  'Kick Sauber': '#52E252',
  'Sauber': '#52E252',
  'Haas': '#B6BABD',
  'Haas F1 Team': '#B6BABD'
};

// Permanent Driver Database Fallback (Prevents #number display)
const STATIC_DRIVERS = {
  1: { code: 'NOR', name: 'Lando Norris', color: '#FF8000' },
  3: { code: 'VER', name: 'Max Verstappen', color: '#3671C6' },
  4: { code: 'NOR', name: 'Lando Norris', color: '#FF8000' },
  5: { code: 'BOR', name: 'Gabriel Bortoleto', color: '#52E252' },
  6: { code: 'HAD', name: 'Isack Hadjar', color: '#3671C6' },
  10: { code: 'GAS', name: 'Pierre Gasly', color: '#0093CC' },
  11: { code: 'PER', name: 'Sergio Perez', color: '#3671C6' },
  12: { code: 'ANT', name: 'Kimi Antonelli', color: '#27F4D2' },
  14: { code: 'ALO', name: 'Fernando Alonso', color: '#229971' },
  16: { code: 'LEC', name: 'Charles Leclerc', color: '#E80020' },
  18: { code: 'STR', name: 'Lance Stroll', color: '#229971' },
  23: { code: 'ALB', name: 'Alexander Albon', color: '#64C4FF' },
  27: { code: 'HUL', name: 'Nico Hulkenberg', color: '#52E252' },
  30: { code: 'LAW', name: 'Liam Lawson', color: '#6692FF' },
  31: { code: 'OCO', name: 'Esteban Ocon', color: '#B6BABD' },
  41: { code: 'LIN', name: 'Arvid Lindblad', color: '#6692FF' },
  43: { code: 'COL', name: 'Franco Colapinto', color: '#0093CC' },
  44: { code: 'HAM', name: 'Lewis Hamilton', color: '#E80020' },
  55: { code: 'SAI', name: 'Carlos Sainz', color: '#64C4FF' },
  63: { code: 'RUS', name: 'George Russell', color: '#27F4D2' },
  77: { code: 'BOT', name: 'Valtteri Bottas', color: '#52E252' },
  81: { code: 'PIA', name: 'Oscar Piastri', color: '#FF8000' },
  87: { code: 'BEA', name: 'Oliver Bearman', color: '#B6BABD' }
};

function getDriverNumberFromCode(code) {
  if (!code) return null;
  const clean = String(code).toUpperCase().trim();
  for (const [num, d] of Object.entries(STATIC_DRIVERS)) {
    if (d.code === clean) return parseInt(num, 10);
  }
  return null;
}

const SESSION_DURATIONS = {
  fp: 60 * 60 * 1000,
  sq: 45 * 60 * 1000,
  sprint: 60 * 60 * 1000,
  quali: 60 * 60 * 1000,
  race: 120 * 60 * 1000
};

const BELL_SVG = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
</svg>`;

const PLAY_SVG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
const CIRCLE_SVG = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/></svg>`;

const FASTEST_LAP_SVG = `
<svg class="fastest-lap-clock" viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="8" cy="9.2" r="5.2"/>
  <polyline points="8 6.8 8 9.2 9.8 10.3"/>
  <line x1="8" y1="1.4" x2="8" y2="3.8"/>
  <line x1="5.6" y1="1.4" x2="10.4" y2="1.4"/>
  <line x1="12.2" y1="5" x2="13.4" y2="3.8"/>
</svg>`;

const SPEAKER_SVG = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
</svg>`;

function getFlag(raceName) {
  if (!raceName) return "🏁";
  const clean = raceName.toLowerCase();
  for (const [key, flag] of Object.entries(FLAGS)) {
    if (clean.includes(key.toLowerCase())) return flag;
  }
  return "🏁";
}

function getTeamColor(teamName) {
  if (!teamName) return '#888';
  for (const [key, color] of Object.entries(TEAM_COLORS)) {
    if (teamName.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#888';
}

function getDriverMeta(driverNumber, apiMap = {}) {
  const num = parseInt(driverNumber, 10);
  const fromApi = apiMap[num] || apiMap[String(driverNumber)];
  const fallback = STATIC_DRIVERS[num] || {};
  return {
    code: fromApi?.code || fallback.code || `#${num}`,
    name: fromApi?.name || fallback.name || `Driver ${num}`,
    color: fromApi?.color || fallback.color || '#888'
  };
}

// ============================================================
// STATE & SEASONS
// ============================================================
const ACTIVE_SEASON_YEAR = 2026;
const SUPPORTED_SEASONS = [2026, 2027];
let currentSeasonYear = ACTIVE_SEASON_YEAR;

let currentSeries = 'f1'; // 'f1' | 'f2'
let allF1Races = [];
let allF2Races = [];
let actualNextF1RaceIndex = 0;
let actualNextF2RaceIndex = 0;

let currentSettings = null;
let allRaces = [];
let actualNextRaceIndex = 0;
let displayedRaceIndex = 0;
let countdownTimer = null;
let activeTab = 'tab-weekend';
let standingsSubTab = 'drivers';
let standingsData = null;
let allResultsRaces = [];
let currentTargetSession = null;
let resultsSubTab = "race";
let latestQualifyingData = null;

// ============================================================
// SEASON DISPLAY & DATE UTILITIES
// ============================================================
function updateSeasonUI() {
  const el = document.getElementById("season-display");
  if (!el) return;
  const newYear = String(currentSeasonYear);
  if (el.textContent !== newYear) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-2px)';
    setTimeout(() => {
      el.textContent = newYear;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 90);
  }
}

function formatConfirmedDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDaysUntil(dateStr) {
  if (!dateStr) return 0;
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = targetDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

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

  applySettingsToUI();
}

function applySettingsToUI() {
  if (!currentSettings) return;

  const masterToggle = document.getElementById('master-switch');
  if (masterToggle) masterToggle.checked = !!currentSettings.alarmEnabled;

  const leadSelect = document.getElementById('lead-time-select');
  const leadDisplay = document.getElementById('lead-display');
  const leadVal = currentSettings.leadTime || 10;
  if (leadSelect) leadSelect.value = String(leadVal);
  if (leadDisplay) leadDisplay.textContent = `${leadVal}m before`;

  const volSlider = document.getElementById('volume-slider');
  const volVal = document.getElementById('volume-val');
  if (volSlider && volVal) {
    const v = currentSettings.volume !== undefined ? currentSettings.volume : 65;
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

// Tracked new settings features. If any feature is unseen or the version is new,
// the dot notification will appear on the settings icon until the user opens settings.
const LATEST_SETTINGS_FEATURES = ['f2_support_v13', 'preferences_redesign_v13'];

async function checkSettingsBadgeDot() {
  const dot = document.getElementById('settings-badge-dot');
  const f2NewPill = document.getElementById('f2-new-pill');
  if (!dot) return;

  try {
    const res = await api.storage.local.get(['f1_seen_settings_ver', 'f1_seen_settings_features']);
    const seenVer = res?.f1_seen_settings_ver || localStorage.getItem('f1_seen_settings_ver');
    const seenFeatures = res?.f1_seen_settings_features || [];

    const hasUnseenFeature = LATEST_SETTINGS_FEATURES.some(f => !seenFeatures.includes(f));
    const isNewVersion = seenVer !== CURRENT_SETTINGS_VERSION;

    if (isNewVersion || hasUnseenFeature) {
      dot.style.display = 'block';
      if (f2NewPill) f2NewPill.style.display = 'inline-block';
    } else {
      dot.style.display = 'none';
      if (f2NewPill) f2NewPill.style.display = 'none';
    }
  } catch (_) {
    const seenVer = localStorage.getItem('f1_seen_settings_ver');
    if (seenVer !== CURRENT_SETTINGS_VERSION) {
      dot.style.display = 'block';
      if (f2NewPill) f2NewPill.style.display = 'inline-block';
    }
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
// TAB 1: WEEKEND SCHEDULE & COUNTDOWN
// ============================================================
async function loadScheduleData() {
  let loadedFromCache = false;
  const cacheKey = "f1_cached_schedule_combined";

  // 1. Try to load and render from local cache first for instant offline/startup display
  try {
    const cached = await api.storage.local.get([cacheKey, "f1_cached_schedule"]);
    const cacheData = cached[cacheKey]?.data || cached.f1_cached_schedule?.data;
    if (cacheData && Array.isArray(cacheData) && cacheData.length > 0) {
      allRaces = cacheData;
      allF1Races = cacheData;
      findNextRaceIndex();
      actualNextF1RaceIndex = actualNextRaceIndex;
      renderRoundIndex(actualNextRaceIndex);
      loadedFromCache = true;
    }
  } catch (_) {}

  // 2. Fetch fresh data for both seasons
  try {
    const [res2026, res2027] = await Promise.all([
      fetch(`https://f1.trionine.com/api/current.json?_t=${Date.now()}`).catch(() => null),
      fetch(`https://f1.trionine.com/api/2027.json?_t=${Date.now()}`).catch(() => null)
    ]);

    let races2026 = [];
    if (res2026 && res2026.ok) {
      const data2026 = await res2026.json();
      races2026 = data2026?.MRData?.RaceTable?.Races || [];
    }

    let races2027 = [];
    if (res2027 && res2027.ok) {
      const data2027 = await res2027.json();
      races2027 = data2027?.MRData?.RaceTable?.Races || [];
    }

    // Bundled fallback for 2027 if network fetch failed or returned empty
    if (!races2027 || races2027.length === 0) {
      try {
        const bundledAssetUrl = (typeof api !== 'undefined' && api?.runtime?.getURL)
          ? api.runtime.getURL('assets/2027.json')
          : 'assets/2027.json';
        const assetRes = await fetch(bundledAssetUrl);
        if (assetRes.ok) {
          const assetData = await assetRes.json();
          races2027 = assetData?.MRData?.RaceTable?.Races || [];
        }
      } catch (_) {}
    }

    // Fallback for 2026 from existing cache if 2026 fetch failed
    if ((!races2026 || races2026.length === 0) && allRaces && allRaces.length > 0) {
      races2026 = allRaces.filter(r => r.season === "2026");
    }

    // Tag seasons & totals
    const total2026 = races2026.length || 24;
    races2026.forEach(r => {
      r.season = "2026";
      r.seasonTotal = total2026;
    });

    const total2027 = races2027.length || 24;
    races2027.forEach(r => {
      r.season = "2027";
      r.seasonTotal = total2027;
      r.tbc = true;
    });

    const combined = [...races2026, ...races2027];

    if (combined.length > 0) {
      allRaces = combined;
      allF1Races = combined;
      await api.storage.local.set({
        [cacheKey]: { timestamp: Date.now(), data: combined },
        f1_cached_schedule: { timestamp: Date.now(), data: combined }
      });
      findNextRaceIndex();
      actualNextF1RaceIndex = actualNextRaceIndex;
      renderRoundIndex(actualNextRaceIndex);
      return;
    }
  } catch (err) {
    if (!loadedFromCache) {
      document.getElementById('hero-race-name').textContent = 'F1 Dash';
      document.getElementById('hero-circuit').textContent = 'Connect to internet to load calendar';
    }
  }
}

function findNextRaceIndex() {
  const now = Date.now();
  let found = -1;

  for (let i = 0; i < allRaces.length; i++) {
    const sessions = extractRaceSessions(allRaces[i]);
    const lastSession = sessions[sessions.length - 1];
    if (!lastSession) continue;
    const dur = SESSION_DURATIONS[lastSession.type] || (120 * 60 * 1000);
    if ((lastSession.t + dur) > now) {
      found = i;
      break;
    }
  }

  actualNextRaceIndex = found !== -1 ? found : allRaces.length - 1;
}

function parseRawF2Data(rawData) {
  const races = rawData?.races || rawData?.Races || [];
  if (!Array.isArray(races)) return [];

  if (races.length > 0 && races[0].Feature) {
    return races;
  }

  function parseTime(iso) {
    if (!iso) return null;
    if (iso.includes('T')) {
      const [d, t] = iso.split('T');
      return { date: d, time: t };
    }
    return { date: iso, time: '00:00:00Z' };
  }

  return races.map((r, idx) => {
    const sess = r.sessions || {};
    const featIso = sess.feature || sess.race;
    const featParsed = parseTime(featIso);
    const raceName = r.name || 'Round';
    const circuit = r.location || 'Official Circuit';

    return {
      round: String(r.round || (idx + 1)),
      raceName,
      circuit,
      country: r.country || raceName,
      locality: circuit,
      flag: (typeof getFlag === 'function' ? getFlag(raceName) : null) || r.flag || '🏁',
      date: featParsed ? featParsed.date : (r.date || '2026-01-01'),
      time: featParsed ? featParsed.time : '10:00:00Z',
      Practice: parseTime(sess.practice || sess.fp || sess.fp1),
      Qualifying: parseTime(sess.qualifying || sess.quali),
      Sprint: parseTime(sess.sprint),
      Feature: featParsed
    };
  });
}

async function loadF2ScheduleData() {
  if (allF2Races && allF2Races.length > 0) return allF2Races;

  let loadedF2 = [];

  // 1. Try local cache in extension storage first (0ms load)
  try {
    const cached = await api.storage.local.get('f2_cached_schedule');
    const cachedEntry = cached?.f2_cached_schedule;
    if (cachedEntry?.data && Array.isArray(cachedEntry.data) && cachedEntry.data.length > 0) {
      loadedF2 = cachedEntry.data;
    }
  } catch (_) {}

  // 2. Try bundled offline asset if cache is empty (0ms instant fallback)
  if (!loadedF2 || loadedF2.length === 0) {
    try {
      const assetUrl = (typeof api !== 'undefined' && api?.runtime?.getURL)
        ? api.runtime.getURL('assets/f2_2026.json')
        : 'assets/f2_2026.json';
      const res = await fetch(assetUrl);
      if (res.ok) {
        const data = await res.json();
        loadedF2 = parseRawF2Data(data);
      }
    } catch (_) {}
  }

  // 3. Direct fetch from upstream source (sportstimes/f1)
  // Fetches directly from the open community source without touching user's website/repo
  const fetchDirectFromSource = async () => {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/sportstimes/f1/main/_db/f2/2026.json?_t=${Date.now()}`);
      if (res.ok) {
        const raw = await res.json();
        const parsed = parseRawF2Data(raw);
        if (parsed && parsed.length > 0) {
          const total = parsed.length || 14;
          parsed.forEach(r => {
            r.season = '2026';
            r.seasonTotal = total;
          });
          allF2Races = parsed;
          await api.storage.local.set({
            f2_cached_schedule: { timestamp: Date.now(), data: parsed }
          });
          if (currentSeries === 'f2') {
            allRaces = allF2Races;
            findNextRaceIndex();
            renderRoundIndex(actualNextRaceIndex);
          }
        }
      }
    } catch (_) {}
  };

  if (loadedF2 && loadedF2.length > 0) {
    const total = loadedF2.length || 14;
    loadedF2.forEach(r => {
      r.season = '2026';
      r.seasonTotal = total;
    });
    allF2Races = loadedF2;
    // Asynchronously refresh in background from upstream source
    fetchDirectFromSource();
    return allF2Races;
  }

  await fetchDirectFromSource();
  return allF2Races;
}

async function switchSeries(series) {
  if (currentSeries === series) return;
  currentSeries = series;

  if (currentSettings) {
    currentSettings.activeSeries = series;
    api.storage.local.set({ f1_settings: currentSettings });
  }

  const btnF1 = document.getElementById('btn-series-f1');
  const btnF2 = document.getElementById('btn-series-f2');
  const logoF1 = document.getElementById('brand-logo-f1');
  const logoF2 = document.getElementById('brand-logo-f2');
  const sessionTitle = document.getElementById('sessions-section-title');

  if (series === 'f2') {
    if (btnF1) btnF1.classList.remove('active');
    if (btnF2) btnF2.classList.add('active');
    if (logoF1) logoF1.style.display = 'none';
    if (logoF2) logoF2.style.display = 'block';

    document.body.classList.add('f2-mode');

    // Ensure on weekend tab
    if (activeTab !== 'tab-weekend') {
      switchTabFromCode('tab-weekend');
    }

    if (sessionTitle) {
      sessionTitle.textContent = 'F2 WEEKEND SESSIONS';
    }

    allF1Races = allRaces;
    actualNextF1RaceIndex = actualNextRaceIndex;

    await loadF2ScheduleData();
    allRaces = allF2Races;
    findNextRaceIndex();
    actualNextF2RaceIndex = actualNextRaceIndex;
    renderRoundIndex(actualNextRaceIndex);

  } else {
    if (btnF2) btnF2.classList.remove('active');
    if (btnF1) btnF1.classList.add('active');
    if (logoF2) logoF2.style.display = 'none';
    if (logoF1) logoF1.style.display = 'block';

    document.body.classList.remove('f2-mode');

    if (sessionTitle) {
      sessionTitle.textContent = 'RACE WEEKEND SESSIONS';
    }

    if (allF1Races && allF1Races.length > 0) {
      allRaces = allF1Races;
      actualNextRaceIndex = actualNextF1RaceIndex;
      renderRoundIndex(actualNextRaceIndex);
    } else {
      await loadScheduleData();
    }
  }
}

function extractRaceSessions(race) {
  const sessions = [];

  function add(type, code, name, sessOrDate, time, isTbc) {
    if (!sessOrDate) return;
    let d, t, tbcFlag;
    if (typeof sessOrDate === 'object') {
      d = sessOrDate.date;
      t = sessOrDate.time;
      tbcFlag = Boolean(sessOrDate.tbc || race.tbc);
    } else {
      d = sessOrDate;
      t = time;
      tbcFlag = Boolean(isTbc || race.tbc);
    }
    if (!d) return;
    const timeClean = t ? t.replace('Z', '') : '12:00:00';
    const dateObj = new Date(`${d}T${timeClean}Z`);
    if (!isNaN(dateObj.getTime())) {
      sessions.push({
        type,
        code,
        name,
        dateStr: d,
        t: dateObj.getTime(),
        tbc: tbcFlag
      });
    }
  }

  // F2 sessions
  if (race.Practice) {
    add('fp', 'FP', 'Practice', race.Practice);
  }
  // Standard F1 sessions
  add('fp', 'FP1', 'Practice 1', race.FirstPractice);
  add('sq', 'SQ', 'Sprint Qualifying', race.SprintQualifying);
  add('fp', 'FP2', 'Practice 2', race.SecondPractice);
  add('sprint', 'Sprint', 'Sprint Race', race.Sprint);
  add('fp', 'FP3', 'Practice 3', race.ThirdPractice);
  add('quali', 'Quali', 'Qualifying', race.Qualifying);
  if (race.Feature) {
    add('race', 'Feature', 'Feature Race', race.Feature);
  } else {
    add('race', 'Race', 'Grand Prix', race.date, race.time, race.tbc);
  }

  sessions.sort((a, b) => a.t - b.t);
  return sessions;
}

function updateLiveBeaconState(isLive) {
  const liveIcon = document.querySelector('.live-nav-icon');
  const liveBtn = document.querySelector('button[data-tab="tab-live"]');
  if (liveIcon) {
    liveIcon.classList.toggle('is-live', Boolean(isLive));
  }
  if (liveBtn) {
    liveBtn.classList.toggle('has-live-session', Boolean(isLive));
  }
}

function renderRoundIndex(idx) {
  displayedRaceIndex = idx;
  const race = allRaces[idx];
  if (!race) return;

  const raceSeason = race.season || (idx >= 23 ? "2027" : "2026");
  currentSeasonYear = Number(raceSeason);
  updateSeasonUI();

  const total = race.seasonTotal || (currentSeries === 'f2' ? 14 : 24);
  const badge = document.getElementById('hero-round-badge');
  if (badge) badge.textContent = `ROUND ${race.round} OF ${total}`;

  const returnBtn = document.getElementById('btn-return-next');
  if (returnBtn) {
    returnBtn.style.display = idx === actualNextRaceIndex ? 'none' : 'inline-flex';
  }

  const sessions = extractRaceSessions(race);
  const now = Date.now();

  const liveSess = sessions.find(s => {
    const dur = SESSION_DURATIONS[s.type] || (60 * 60 * 1000);
    return now >= s.t && now < (s.t + dur);
  });

  if (idx === actualNextRaceIndex) {
    updateLiveBeaconState(Boolean(liveSess));
  }

  let targetSess = sessions.find(s => {
    const dur = SESSION_DURATIONS[s.type] || (60 * 60 * 1000);
    return (s.t + dur) > now;
  }) || sessions[sessions.length - 1];

  currentTargetSession = targetSess;

  const cleanRaceName = (currentSeries === 'f2')
    ? `${race.raceName.replace(/grand prix/gi, '').trim()} F2 Round`
    : `${race.raceName.replace(/grand prix/gi, '').trim()} Grand Prix`;
  const flagEl = document.getElementById('hero-flag');
  if (flagEl) flagEl.textContent = race.flag || getFlag(cleanRaceName);
  const raceNameEl = document.getElementById('hero-race-name');
  if (raceNameEl) raceNameEl.textContent = cleanRaceName;
  const circuitEl = document.getElementById('hero-circuit');
  if (circuitEl) {
    const circuitDisplay = race.circuit || race.Circuit?.circuitName || '';
    circuitEl.textContent = `Round ${race.round} • ${circuitDisplay}`;
  }

  const heroTime = document.getElementById('hero-time-info');
  if (heroTime) {
    if (liveSess) {
      const liveColor = currentSeries === 'f2' ? '#009CDE' : 'var(--f1red)';
      setSafeContent(heroTime, `<span style="color: ${liveColor}; font-weight: 800;">● ${liveSess.name} IS LIVE NOW</span>`);
    } else if (targetSess.tbc) {
      const dateFormatted = formatConfirmedDate(targetSess.dateStr);
      heroTime.textContent = `${targetSess.name} • ${dateFormatted} (Times TBC)`;
    } else {
      const dateStr = new Date(targetSess.t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = new Date(targetSess.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      heroTime.textContent = `${targetSess.name}: ${dateStr} at ${timeStr} (Local)`;
    }
  }

  const previousRaceSessions = idx > 0 ? extractRaceSessions(allRaces[idx - 1]) : [];
  const previousRaceFinalSession = previousRaceSessions[previousRaceSessions.length - 1] || null;
  startCountdown(targetSess, sessions, previousRaceFinalSession);
  renderSessionList(sessions, targetSess, liveSess);
}

function renderSessionList(sessions, activeTarget, liveSess) {
  const container = document.getElementById('session-list');
  if (!container) return;

  const now = Date.now();

  setSafeContent(container, sessions.map(s => {
    const dur = SESSION_DURATIONS[s.type] || (60 * 60 * 1000);
    const isLive = now >= s.t && now < s.t + dur;
    const isPast = !s.tbc && (s.t + dur < now);
    const isTarget = isLive || (activeTarget && s.code === activeTarget.code && s.t === activeTarget.t);

    let mainTimeLine = '';
    let subTimeLine = '';

    if (s.tbc) {
      mainTimeLine = formatConfirmedDate(s.dateStr);
      subTimeLine = 'Time TBC';
    } else {
      const timeStr = new Date(s.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dayStr = new Date(s.t).toLocaleDateString([], { weekday: 'short' });
      mainTimeLine = `${dayStr} ${timeStr}`;

      if (isLive) {
        const liveColor = currentSeries === 'f2' ? '#009CDE' : 'var(--f1red)';
        subTimeLine = `<span style="color: ${liveColor}; font-weight: 800;">● LIVE NOW</span>`;
      } else if (isPast) {
        subTimeLine = 'Finished';
      } else {
        const diffMs = s.t - now;
        const hours = Math.floor(diffMs / 3600000);
        const days = Math.floor(hours / 24);
        subTimeLine = days > 0 ? `in ${days}d ${hours % 24}h` : `in ${hours}h`;
      }
    }

    const isEnabled = currentSettings?.sessions?.[s.type] ?? true;
    const isAlertDisabled = s.tbc || isPast;

    return `
      <div class="session-row ${isTarget ? 'current-target' : ''}">
        <div class="sess-meta-left">
          <span class="sess-timeline-dot"></span>
          <span class="sess-code">${s.code}</span>
          <span class="sess-name">${s.name}</span>
        </div>
        <div class="sess-meta-right">
          <div class="sess-times">
            <span class="sess-time-main">${mainTimeLine}</span>
            <span class="sess-time-rel">${subTimeLine}</span>
          </div>
          <button class="sess-alert-btn ${isEnabled && !isAlertDisabled ? '' : 'muted'}" 
                  data-type="${s.type}" 
                  ${s.tbc ? 'disabled' : ''}
                  title="${s.tbc ? 'Alerts available once start times are confirmed' : (isEnabled && !isPast ? 'Alarm active (Click to toggle)' : 'Alarm disabled')}">
            ${BELL_SVG}
          </button>
        </div>
      </div>
    `;
  }).join(''));

  container.querySelectorAll('.sess-alert-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = btn.getAttribute('data-type');
      if (currentSettings && type) {
        currentSettings.sessions[type] = !currentSettings.sessions[type];
        const cb = document.getElementById(`cb-${type}`);
        if (cb) cb.checked = currentSettings.sessions[type];
        saveSettings();
        renderSessionList(sessions, activeTarget, liveSess);
      }
    });
  });
}

function startCountdown(sess, sessions = [], previousRaceFinalSession = null) {
  if (countdownTimer) clearInterval(countdownTimer);

  const countdownGrid = document.getElementById('countdown-grid');
  const dateOnlyBox = document.getElementById('countdown-date-only');
  const progress = document.getElementById('countdown-progress');
  const progressFill = document.getElementById('countdown-progress-fill');

  // If session time is TBC (date-only), show Days to Go banner and hide ticking clock/progress
  if (sess.tbc) {
    if (countdownGrid) countdownGrid.style.display = 'none';
    if (dateOnlyBox) dateOnlyBox.style.display = 'flex';
    if (progress) progress.style.display = 'none';

    const daysLeft = getDaysUntil(sess.dateStr);
    const [y, m, d] = (sess.dateStr || '').split('-').map(Number);
    const dateFormatted = (!isNaN(y) && !isNaN(m) && !isNaN(d))
      ? new Date(y, m - 1, d).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
      : '';

    const tbcDaysEl = document.getElementById('cd-tbc-days');
    const tbcLabel = document.getElementById('cd-tbc-label');
    const tbcDateEl = document.getElementById('cd-tbc-date');
    if (tbcDaysEl) tbcDaysEl.textContent = String(daysLeft);
    if (tbcLabel) tbcLabel.textContent = daysLeft === 1 ? 'DAY TO GO' : 'DAYS TO GO';
    if (tbcDateEl) tbcDateEl.textContent = dateFormatted;
    return;
  }

  // Confirmed time: show live digital clock numerals and progress bar
  if (countdownGrid) countdownGrid.style.display = 'flex';
  if (dateOnlyBox) dateOnlyBox.style.display = 'none';
  if (progress) progress.style.display = 'block';

  const targetIndex = sessions.findIndex(s => s.code === sess.code && s.t === sess.t);
  const previousSession = targetIndex > 0
    ? sessions[targetIndex - 1]
    : previousRaceFinalSession;
  const previousDuration = previousSession ? (SESSION_DURATIONS[previousSession.type] || 60 * 60 * 1000) : 0;
  const progressStart = previousSession
    ? previousSession.t + previousDuration
    : sess.t - (7 * 24 * 60 * 60 * 1000);
  const progressRange = Math.max(sess.t - progressStart, 1);

  function update() {
    const now = Date.now();
    const diff = sess.t - now;
    const remainingPercent = Math.max(0, Math.min(100, (diff / progressRange) * 100));

    if (progressFill) progressFill.style.width = `${remainingPercent}%`;
    if (progress) {
      progress.setAttribute('aria-valuenow', String(Math.round(remainingPercent)));
      progress.setAttribute('aria-valuetext', `${Math.round(remainingPercent)}% of the countdown remaining`);
    }

    if (diff <= 0) {
      document.getElementById('cd-days').textContent = '00';
      document.getElementById('cd-hours').textContent = '00';
      document.getElementById('cd-mins').textContent = '00';
      document.getElementById('cd-secs').textContent = '00';
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    document.getElementById('cd-days').textContent = String(d).padStart(2, '0');
    document.getElementById('cd-hours').textContent = String(h).padStart(2, '0');
    document.getElementById('cd-mins').textContent = String(m).padStart(2, '0');
    document.getElementById('cd-secs').textContent = String(s).padStart(2, '0');
  }

  update();
  countdownTimer = setInterval(update, 1000);
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

// ============================================================
// TAB 3: RESULTS & INTERACTIVE PODIUMS (NO DROPDOWNS)
// ============================================================
function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(255, 255, 255, ${alpha})`;
  let c = hex.slice(1);
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(255, 255, 255, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getDriverTeamInfo(driver) {
  if (!driver) return { team: '', color: '#888' };
  const code = (driver.code || '').toUpperCase();
  const family = (driver.familyName || '').toLowerCase();

  const codeMap = {
    'VER': { team: 'Red Bull Racing', color: '#3671C6' },
    'HAD': { team: 'Red Bull Racing', color: '#3671C6' },
    'PER': { team: 'Red Bull Racing', color: '#3671C6' },
    'LEC': { team: 'Ferrari', color: '#E80020' },
    'HAM': { team: 'Ferrari', color: '#E80020' },
    'RUS': { team: 'Mercedes', color: '#27F4D2' },
    'ANT': { team: 'Mercedes', color: '#27F4D2' },
    'NOR': { team: 'McLaren', color: '#FF8000' },
    'PIA': { team: 'McLaren', color: '#FF8000' },
    'ALO': { team: 'Aston Martin', color: '#229971' },
    'STR': { team: 'Aston Martin', color: '#229971' },
    'GAS': { team: 'Alpine', color: '#0093CC' },
    'COL': { team: 'Alpine', color: '#0093CC' },
    'ALB': { team: 'Williams', color: '#64C4FF' },
    'SAI': { team: 'Williams', color: '#64C4FF' },
    'LAW': { team: 'VCARB', color: '#6692FF' },
    'LIN': { team: 'VCARB', color: '#6692FF' },
    'HUL': { team: 'Kick Sauber', color: '#52E252' },
    'BOR': { team: 'Kick Sauber', color: '#52E252' },
    'BOT': { team: 'Kick Sauber', color: '#52E252' },
    'OCO': { team: 'Haas', color: '#B6BABD' },
    'BEA': { team: 'Haas', color: '#B6BABD' }
  };

  if (code && codeMap[code]) {
    return codeMap[code];
  }

  for (const d of Object.values(STATIC_DRIVERS)) {
    if (d.code === code || d.name.toLowerCase().includes(family)) {
      return { team: d.name, color: d.color };
    }
  }

  return { team: driver.givenName || '', color: '#e10600' };
}

function normalizeResultsRace(race) {
  if (!race || !Array.isArray(race.Results)) return race;
  const results = race.Results
    .slice()
    .sort((a, b) => (parseInt(a?.position, 10) || 99) - (parseInt(b?.position, 10) || 99))
    .map((result, index) => ({
      ...result,
      position: String(result?.position != null && result.position !== "" ? result.position : index + 1)
    }));
  return { ...race, Results: results };
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
// ============================================================
const CIRCUIT_TOTAL_LAPS = {
  australia: 58, melbourne: 58, china: 56, shanghai: 56,
  japan: 53, suzuka: 53, miami: 57, canada: 70, montreal: 70,
  monaco: 78, catalunya: 66, barcelona: 66, spain: 66,
  austria: 71, spielberg: 71, britain: 52, british: 52, silverstone: 52,
  belgium: 44, belgian: 44, spa: 44, hungary: 70, hungarian: 70, budapest: 70,
  dutch: 72, netherlands: 72, zandvoort: 72, italy: 53, italian: 53, monza: 53,
  azerbaijan: 51, baku: 51, bahrain: 57, singapore: 62, marina: 62,
  united: 56, states: 56, austin: 56, cota: 56, mexico: 71, mexican: 71,
  brazil: 71, brazilian: 71, interlagos: 71, vegas: 50, qatar: 57, lusail: 57,
  abu: 58, dhabi: 58, yas: 58
};

function getTotalLapsForCircuit(name) {
  if (!name) return 55;
  const clean = name.toLowerCase();
  for (const [key, laps] of Object.entries(CIRCUIT_TOTAL_LAPS)) {
    if (clean.includes(key)) return laps;
  }
  return 55;
}

let sessionCountdownInterval = null;

function updateSessionProgressBadge(sessionType, currentLap, totalLaps, endTime, isVisible = true, isEstimated = false) {
  const badge = document.getElementById('session-progress-badge');
  const typeEl = document.getElementById('progress-type');
  const valEl = document.getElementById('progress-val');
  if (!badge || !typeEl || !valEl) return;

  if (sessionCountdownInterval) {
    clearInterval(sessionCountdownInterval);
    sessionCountdownInterval = null;
  }

  if (!isVisible) {
    badge.style.display = 'none';
    return;
  }

  const sType = (sessionType || 'race').toLowerCase();
  const isTimedSession = sType.includes('quali') || sType.includes('practice') || sType.includes('fp') || sType.includes('sq');

  if (isTimedSession) {
    badge.classList.add('is-time');
    badge.style.display = 'inline-flex';
    typeEl.style.display = 'none';
    typeEl.textContent = '';

    const targetEnd = endTime || (Date.now() + 45 * 60 * 1000);
    const updateTime = () => {
      const now = Date.now();
      const diff = Math.max(0, targetEnd - now);
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      valEl.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (diff <= 0) {
        if (sessionCountdownInterval) {
          clearInterval(sessionCountdownInterval);
          sessionCountdownInterval = null;
        }
        badge.style.display = 'none';
      }
    };

    updateTime();
    sessionCountdownInterval = setInterval(updateTime, 1000);
  } else {
    if (!currentLap || currentLap <= 0) {
      badge.style.display = 'none';
      return;
    }
    badge.classList.remove('is-time');
    badge.style.display = 'inline-flex';
    typeEl.style.display = 'inline';
    typeEl.textContent = 'LAP';
    valEl.textContent = `${isEstimated ? "~" : ""}${currentLap}/${totalLaps || 55}`;
    if (isEstimated) {
      badge.title = `Estimated Live Lap ~${currentLap} of ${totalLaps || 55} (OpenF1 free stream is locked during live sessions)`;
    } else {
      badge.title = "Session Progress";
    }
  }
}

let currentTimingMode = "interval"; // "interval" | "leader"
let cachedLiveTelemetry = null;
let liveWebSocket = null;
let isConnectingSignalR = false;
let signalRHeartbeatTimer = null;
let liveTabRefreshInterval = null;
let activeLiveSessionId = null;
let liveLoadPromise = null;
let lastFinalFetchAttempt = 0;
const FINAL_FETCH_COOLDOWN_MS = 60 * 1000;
let lastFinalStintsRefreshAttempt = 0;
let finalStintsRefreshInFlight = false;
const FINAL_STINTS_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
let liveSignalRState = {
  driverList: {},
  timingData: { Lines: {} },
  timingAppData: { Lines: {} },
  trackStatus: { Status: "1", Message: "AllClear" },
  sessionInfo: null
};

function getScheduledLiveContext() {
  const race = allRaces?.[actualNextRaceIndex];
  if (!race) return { race: null, session: null };

  const now = Date.now();
  const session = extractRaceSessions(race).find(item => {
    const duration = SESSION_DURATIONS[item.type] || (60 * 60 * 1000);
    return now >= item.t && now < item.t + duration + (35 * 60 * 1000);
  }) || null;

  return { race, session };
}

function getMostRecentSessionContext() {
  const now = Date.now();
  let latest = null;

  for (const race of allRaces || []) {
    for (const session of extractRaceSessions(race)) {
      if (session.t <= now && (!latest || session.t > latest.session.t)) {
        latest = { race, session };
      }
    }
  }

  return latest || { race: null, session: null };
}

function updateLiveTowerTitle(session, race, circuitName = "") {
  const title = document.getElementById("live-tower-title");
  if (!title) return;

  if (!session) {
    title.textContent = "LIVE TIMING TOWER";
    return;
  }

  const sessionName = String(session.name || session.type || "Live Timing").toUpperCase();
  const location = String(circuitName || race?.raceName || "")
    .replace(/grand prix/gi, "")
    .trim()
    .toUpperCase();
  title.textContent = location ? `${sessionName} • ${location}` : sessionName;
}

function getOpenF1SessionName(session) {
  if (!session) return "";
  if (session.code === "FP1") return "Practice 1";
  if (session.code === "FP2") return "Practice 2";
  if (session.code === "FP3") return "Practice 3";
  if (session.type === "sq") return "Sprint Qualifying";
  if (session.type === "sprint") return "Sprint";
  if (session.type === "quali") return "Qualifying";
  if (session.type === "race") return "Race";
  return session.name || "";
}

async function findMatchingOpenF1Session(session) {
  const expectedName = getOpenF1SessionName(session).toLowerCase();
  const windowMs = 4 * 60 * 60 * 1000;
  const query = new URL("https://api.openf1.org/v1/sessions");
  // The API's comparison-style query parameters are inconsistently handled by
  // extension fetches. Fetch the small season list and match it locally.
  query.searchParams.set("year", String(new Date(session.t).getUTCFullYear()));

  const response = await fetch(query.toString()).catch(() => null);
  const sessions = response?.ok ? await response.json().catch(() => []) : [];
  if (!Array.isArray(sessions)) return null;

  return sessions
    .filter(candidate => {
      const candidateStart = new Date(candidate?.date_start || "").getTime();
      const candidateName = String(candidate?.session_name || candidate?.session_type || "").toLowerCase();
      return Number.isFinite(candidateStart) &&
        Math.abs(candidateStart - session.t) <= windowMs &&
        candidateName === expectedName;
    })
    .sort((a, b) => Math.abs(new Date(a.date_start).getTime() - session.t) - Math.abs(new Date(b.date_start).getTime() - session.t))[0] || null;
}

function getSessionResultTime(result) {
  const durations = Array.isArray(result?.duration) ? result.duration : [result?.duration];
  const duration = durations.filter(Number.isFinite).at(-1);
  if (!Number.isFinite(duration) || duration <= 0 || duration >= 300) return "";
  const mins = Math.floor(duration / 60);
  return `${mins}:${(duration % 60).toFixed(3).padStart(6, "0")}`;
}

function getSessionResultBestLap(result) {
  const durations = (Array.isArray(result?.duration) ? result.duration : [result?.duration])
    .filter(value => Number.isFinite(value) && value > 50 && value < 300);
  if (durations.length === 0) return null;
  const seconds = Math.min(...durations);
  const mins = Math.floor(seconds / 60);
  return { seconds, formatted: `${mins}:${(seconds % 60).toFixed(3).padStart(6, "0")}` };
}

function getSessionResultGap(result) {
  const gaps = Array.isArray(result?.gap_to_leader) ? result.gap_to_leader : [result?.gap_to_leader];
  const gap = gaps.filter(value => value != null).at(-1);
  if (typeof gap === "number") return gap;
  return typeof gap === "string" ? gap : null;
}

function buildTyreMap(stints) {
  const latestStints = {};
  for (const stint of Array.isArray(stints) ? stints : []) {
    const number = stint?.driver_number;
    if (number != null && (!latestStints[number] || Number(stint.stint_number || 0) > Number(latestStints[number].stint_number || 0))) {
      latestStints[number] = stint;
    }
  }

  const tyreMap = {};
  for (const [number, stint] of Object.entries(latestStints)) {
    tyreMap[number] = {
      compound: String(stint.compound || "medium").toLowerCase(),
      laps: Math.max(1, Number(stint.lap_end || stint.lap_start || 0) - Number(stint.lap_start || 1) + 1 + Number(stint.tyre_age_at_start || 0))
    };
  }
  return tyreMap;
}

async function maybeRefreshFinalStints(session, finalData) {
  const progress = finalData?.sessionProgress;
  if (!progress || !["restricted", "unmatched"].includes(progress.stintsStatus)) return;
  if (finalStintsRefreshInFlight || Date.now() - lastFinalStintsRefreshAttempt < FINAL_STINTS_REFRESH_COOLDOWN_MS) return;

  finalStintsRefreshInFlight = true;
  lastFinalStintsRefreshAttempt = Date.now();
  try {
    let sessionKey = progress.openF1SessionKey;
    if (!sessionKey) {
      const matched = await findMatchingOpenF1Session(session);
      if (!matched?.session_key) {
        progress.stintsStatus = "unmatched";
        localStorage.setItem("f1_cached_final_session", JSON.stringify(finalData));
        return;
      }
      sessionKey = matched.session_key;
      progress.openF1SessionKey = sessionKey;
    }

    const response = await fetch(`https://api.openf1.org/v1/stints?session_key=${encodeURIComponent(sessionKey)}`).catch(() => null);
    if (response?.ok) {
      const stints = await response.json().catch(() => []);
      const tyreMap = buildTyreMap(stints);
      progress.stintsStatus = Object.keys(tyreMap).length > 0 ? "complete" : "sparse";
      if (progress.stintsStatus === "complete") finalData.tyreMap = tyreMap;
    } else {
      progress.stintsStatus = "restricted";
    }
    localStorage.setItem("f1_cached_final_session", JSON.stringify(finalData));
    if (cachedLiveTelemetry?.sessionProgress?.sessionId === progress.sessionId) {
      cachedLiveTelemetry = finalData;
      renderLiveTimingTower();
    }
  } catch (_) {
    progress.stintsStatus = "restricted";
  } finally {
    finalStintsRefreshInFlight = false;
  }
}

async function loadLatestFinishedSession() {
  const tower = document.getElementById("timing-tower-list");
  const statusPill = document.getElementById("track-status-pill");
  const statusLabel = document.getElementById("track-status-label");
  const { race, session } = getMostRecentSessionContext();
  if (!race || !session) return false;
  const finalSessionId = `${race.round}_${session.code}_${session.t}`;

  // Avoid hammering OpenF1 (rate limits) on repeated opens/refreshes.
  if (Date.now() - lastFinalFetchAttempt < FINAL_FETCH_COOLDOWN_MS) return false;
  lastFinalFetchAttempt = Date.now();

  try {
    const cached = JSON.parse(localStorage.getItem("f1_cached_final_session") || "null");
    if (cached?.source === "final-v4" && cached?.sessionProgress?.sessionId === finalSessionId && Array.isArray(cached.sortedDrivers) && cached.sortedDrivers.length > 0) {
      cachedLiveTelemetry = cached;
      updateLiveTowerTitle(session, race, cached.circuitName);
      if (statusPill && statusLabel) {
        statusPill.className = "nitrous-status-pill status-dim";
        statusLabel.textContent = "FINAL";
      }
      updateLiveBeaconState(false);
      updateSessionProgressBadge(null, null, null, null, false);
      renderLiveTimingTower();
      void maybeRefreshFinalStints(session, cachedLiveTelemetry);
      return true;
    }
  } catch (_) {}

  let openF1Session = null;
  try {
    const cachedOpenF1 = JSON.parse(localStorage.getItem("f1_openf1_session") || "null");
    if (cachedOpenF1?.sessionId === finalSessionId && cachedOpenF1?.session?.session_key) {
      openF1Session = cachedOpenF1.session;
    }
  } catch (_) {}
  if (!openF1Session) {
    openF1Session = await findMatchingOpenF1Session(session);
    if (openF1Session?.session_key) {
      try { localStorage.setItem("f1_openf1_session", JSON.stringify({ sessionId: finalSessionId, session: openF1Session })); } catch (_) {}
    }
  }
  if (!openF1Session?.session_key) return false;

  const sessionKey = encodeURIComponent(openF1Session.session_key);
  const endpoint = path => `https://api.openf1.org/v1/${path}?session_key=${sessionKey}`;
  const [driversResponse, resultsResponse, lapsResponse, stintsResponse] = await Promise.all([
    fetch(endpoint("drivers")).catch(() => null),
    fetch(endpoint("session_result")).catch(() => null),
    fetch(endpoint("laps")).catch(() => null),
    fetch(endpoint("stints")).catch(() => null)
  ]);
  const readArray = async response => response?.ok ? response.json().catch(() => []) : [];
  const [drivers, results, laps, stints] = await Promise.all([
    readArray(driversResponse), readArray(resultsResponse), readArray(lapsResponse), readArray(stintsResponse)
  ]);
  if (!Array.isArray(results) || results.length === 0) return false;

  const driverMap = {};
  for (const driver of Array.isArray(drivers) ? drivers : []) {
    driverMap[driver.driver_number] = {
      code: driver.name_acronym || `#${driver.driver_number}`,
      name: driver.full_name || `${driver.first_name || ""} ${driver.last_name || ""}`.trim(),
      color: driver.team_colour ? `#${driver.team_colour}` : getTeamColor(driver.team_name)
    };
  }
  const formatLap = seconds => {
    const mins = Math.floor(seconds / 60);
    return `${mins}:${(seconds % 60).toFixed(3).padStart(6, "0")}`;
  };
  const latestLaps = {};
  const bestLaps = {};
  for (const lap of Array.isArray(laps) ? laps : []) {
    if (!Number.isFinite(lap?.lap_duration) || lap.lap_duration <= 50) continue;
    const number = lap.driver_number;
    if (!latestLaps[number] || String(lap.date_start || lap.date || "") > String(latestLaps[number].date || "")) {
      latestLaps[number] = { lap_duration: lap.lap_duration, formatted: formatLap(lap.lap_duration), date: lap.date_start || lap.date || "" };
    }
    if (!bestLaps[number] || lap.lap_duration < bestLaps[number].lap_duration) {
      bestLaps[number] = { lap_duration: lap.lap_duration, formatted: formatLap(lap.lap_duration) };
    }
  }
  let fastestLap = null;
  for (const [number, lap] of Object.entries(bestLaps)) {
    if (!fastestLap || lap.lap_duration < fastestLap.seconds) {
      fastestLap = { driverNumber: Number(number), formatted: lap.formatted, seconds: lap.lap_duration };
    }
  }
  // Qualifying session_result contains the official Q1/Q2/Q3 times, which is
  // reliable even when OpenF1's detailed laps endpoint is delayed or blocked.
  for (const result of results) {
    const lap = getSessionResultBestLap(result);
    if (lap && (!fastestLap || lap.seconds < fastestLap.seconds)) {
      fastestLap = { driverNumber: Number(result.driver_number), formatted: lap.formatted, seconds: lap.seconds };
    }
  }
  if (fastestLap) delete fastestLap.seconds;

  const tyreMap = buildTyreMap(stints);
  const stintsStatus = stintsResponse?.ok
    ? (Object.keys(tyreMap).length > 0 ? "complete" : "sparse")
    : "restricted";
  if (stintsStatus === "restricted") lastFinalStintsRefreshAttempt = Date.now();

  const sortedDrivers = results
    .filter(result => Number.isFinite(result?.position) && result.driver_number != null)
    .map(result => ({
      driver_number: result.driver_number,
      position: Number(result.position),
      displayPos: Number(result.position),
      interval: null,
      gap_to_leader: getSessionResultGap(result),
      bestLapStr: bestLaps[result.driver_number]?.formatted || getSessionResultTime(result),
      inPit: false,
      retired: Boolean(result.dnf || result.dns || result.dsq)
    }))
    .sort((a, b) => a.position - b.position);
  if (sortedDrivers.length === 0) return false;

  updateLiveTowerTitle(session, race, openF1Session.circuit_short_name);
  if (statusPill && statusLabel) {
    statusPill.className = "nitrous-status-pill status-dim";
    statusLabel.textContent = "FINAL";
  }
  updateLiveBeaconState(false);
  updateSessionProgressBadge(null, null, null, null, false);
  cachedLiveTelemetry = {
    source: "final-v4",
    round: race.round,
    timestamp: Date.now(),
    sortedDrivers,
    driverMap,
    tyreMap,
    latestLaps,
    fastestLap,
    circuitName: openF1Session.circuit_short_name || "",
    sessionProgress: {
      sessionType: session.type,
      isLive: false,
      isFinal: true,
      isOpenF1Fallback: true,
      stintsStatus,
      openF1SessionKey: openF1Session.session_key,
      sessionId: finalSessionId
    }
  };
  try { localStorage.setItem("f1_cached_final_session", JSON.stringify(cachedLiveTelemetry)); } catch (_) {}
  if (tower) renderLiveTimingTower();
  return true;
}

function clearLiveTelemetryCache() {
  cachedLiveTelemetry = null;
  try { localStorage.removeItem("f1_cached_telemetry"); } catch (_) {}
}

function resetLiveSignalRState() {
  liveSignalRState = {
    driverList: {},
    timingData: { Lines: {} },
    timingAppData: { Lines: {} },
    trackStatus: { Status: "1", Message: "AllClear" },
    sessionInfo: null
  };
}

function stopLiveConnection() {
  if (signalRHeartbeatTimer) {
    clearInterval(signalRHeartbeatTimer);
    signalRHeartbeatTimer = null;
  }
  if (liveWebSocket) {
    try { liveWebSocket.close(); } catch (_) {}
    liveWebSocket = null;
  }
}

function renderNoLiveSession(message = "No live session active currently. Telemetry starts automatically during race weekends.") {
  const tower = document.getElementById("timing-tower-list");
  const banner = document.getElementById("live-broadcast-banner");
  if (banner) banner.style.display = "none";
  updateLiveTowerTitle(null, null);
  updateSessionProgressBadge(null, null, null, null, false);
  if (tower) setSafeContent(tower, `<div class="loading-state">${message}</div>`);
}

function deepMerge(target, source) {
  if (!source || typeof source !== "object") return target;
  for (const key of Object.keys(source)) {
    const sVal = source[key];
    if (sVal && typeof sVal === "object" && !Array.isArray(sVal)) {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      deepMerge(target[key], sVal);
    } else {
      target[key] = sVal;
    }
  }
  return target;
}

function renderLiveTimingTower() {
  if (!cachedLiveTelemetry) return;
  const { sortedDrivers, driverMap, tyreMap, latestLaps, fastestLap, sessionProgress } = cachedLiveTelemetry;
  const tower = document.getElementById("timing-tower-list");
  const banner = document.getElementById("live-broadcast-banner");
  const bannerTitle = document.getElementById("live-banner-title");
  const bannerStatus = document.getElementById("live-banner-status");

  if (!sessionProgress?.isLive && !sessionProgress?.isFinal) {
    if (!cachedLiveTelemetry) renderNoLiveSession();
    return;
  }

  const sType = String(sessionProgress?.sessionType || "race").toLowerCase();
  const isTimed = sType === "fp" || sType === "sq" || sType === "quali" || sType.includes("practice") || sType.includes("quali") || sType.includes("shootout");

  const gapHeader = document.getElementById("col-gap-header");
  if (gapHeader) {
    gapHeader.textContent = sessionProgress?.isFinal
      ? "GAP"
      : (currentTimingMode === "interval" ? "INTERVAL" : "LEADER");
  }

  const lapHeader = document.getElementById("col-lap-header");
  if (lapHeader) {
    lapHeader.textContent = isTimed ? "BEST TIME" : "LAP TIME";
  }

  // Update live broadcast banner
  if (sessionProgress && sessionProgress.isLive) {
    if (banner) {
      banner.style.display = "flex";
      const race = (allRaces && allRaces.length > 0) ? allRaces[actualNextRaceIndex] : null;
      const cleanName = race ? `${race.raceName.replace(/grand prix/gi, "").trim()} Grand Prix` : "Grand Prix";
      if (bannerTitle) bannerTitle.textContent = cleanName;
      if (bannerStatus) {
        if (sessionProgress.sessionType === "race") {
          const estTag = sessionProgress.isOpenF1Restricted ? " (Est.)" : "";
          const lapPart = (sessionProgress.currentLap && sessionProgress.totalLaps)
            ? ` • Lap ~${sessionProgress.currentLap} of ${sessionProgress.totalLaps}${estTag}`
            : "";
          bannerStatus.textContent = `Race Underway${lapPart} • Live Stream`;
        } else {
          let typeLabel = "Practice";
          if (sessionProgress.sessionType === "fp") typeLabel = "Practice";
          else if (sessionProgress.sessionType === "quali") typeLabel = "Qualifying";
          else if (sessionProgress.sessionType === "sq") typeLabel = "Sprint Shootout";
          else if (sessionProgress.sessionType === "sprint") typeLabel = "Sprint";
          bannerStatus.textContent = `${typeLabel} Underway • Live Stream`;
        }
      }
    }
    updateSessionProgressBadge(
      sessionProgress.sessionType,
      sessionProgress.currentLap,
      sessionProgress.totalLaps,
      sessionProgress.endTime,
      true,
      sessionProgress.isOpenF1Restricted
    );
  }

  if (!sortedDrivers || sortedDrivers.length === 0) {
    if (sessionProgress && sessionProgress.isLive) {
      const sName = (sessionProgress.sessionType || "Practice").toUpperCase();
      setSafeContent(tower, `<div class="loading-state">${sName} session is underway. Telemetry streams live as cars complete timed laps.</div>`);
    } else {
      setSafeContent(tower, '<div class="loading-state">No live session active currently. Telemetry streams live during race weekends.</div>');
    }
    return;
  }

  const rowsHtml = sortedDrivers.slice(0, 22).map((item, idx) => {
    const num = item.driver_number;
    const drv = getDriverMeta(num, driverMap);
    const tyre = tyreMap[num] || tyreMap[String(num)] || { compound: "", laps: 0 };
    const lastLap = latestLaps[num] || latestLaps[String(num)];
    const activeFastestLap = fastestLap;
    const isFastestLap = activeFastestLap && String(activeFastestLap.driverNumber) === String(num);

    // Position label
    let posStr = "—";
    if (item.retired) {
      posStr = "OUT";
    } else if (item.displayPos) {
      posStr = String(item.displayPos).padStart(2, "0");
    } else if (!isTimed && item.position && item.position < 90) {
      posStr = String(item.position).padStart(2, "0");
    } else if (!isTimed) {
      posStr = String(idx + 1).padStart(2, "0");
    } else {
      posStr = "—";
    }

    // Time column label
    let timeStr = "—";
    if (item.retired) {
      timeStr = "OUT";
    } else if (isTimed) {
      // In practice & qualifying, display ONLY the driver's official best lap time
      const bStr = (item.bestLapStr || "").trim();
      if (bStr && bStr !== "" && !bStr.includes("--")) {
        timeStr = bStr;
      } else {
        timeStr = "NO TIME";
      }
    } else {
      // In race, display the last lap time (if under 5 minutes) or best lap
      if (lastLap?.formatted && (!lastLap?.lap_duration || lastLap.lap_duration < 300)) {
        timeStr = lastLap.formatted;
      } else if (item.bestLapStr && item.bestLapStr !== "" && !item.bestLapStr.includes("--")) {
        timeStr = item.bestLapStr;
      } else {
        timeStr = "NO TIME";
      }
    }

    // Gap column label
    let gapStr = "—";
    if (idx === 0 || item.displayPos === 1) {
      gapStr = "LEADER";
    } else if (currentTimingMode === "interval" && !sessionProgress?.isFinal) {
      // Interval to car directly ahead
      const prev = sortedDrivers[idx - 1];
      if (typeof item.interval === "number") {
        gapStr = `+${item.interval.toFixed(3)}s`;
      } else if (typeof item.gap_to_leader === "number" && typeof prev?.gap_to_leader === "number") {
        const delta = item.gap_to_leader - prev.gap_to_leader;
        gapStr = delta > 0 ? `+${delta.toFixed(3)}s` : "—";
      } else if (typeof item.interval === "string" && item.interval !== "") {
        gapStr = item.interval.startsWith("+") || item.interval === "LEADER" || item.interval.endsWith("L")
          ? item.interval
          : `+${item.interval}`;
      } else if (typeof item.gap_to_leader === "string" && item.gap_to_leader !== "") {
        gapStr = item.gap_to_leader;
      }
    } else {
      // Cumulative gap to leader
      if (typeof item.gap_to_leader === "number") {
        gapStr = `+${item.gap_to_leader.toFixed(3)}s`;
      } else if (typeof item.gap_to_leader === "string" && item.gap_to_leader !== "") {
        gapStr = item.gap_to_leader.startsWith("+") || item.gap_to_leader === "LEADER" || item.gap_to_leader.endsWith("L")
          ? item.gap_to_leader
          : `+${item.gap_to_leader}`;
      }
    }

    const tyreLetter = (tyre.compound || "—").charAt(0).toUpperCase();
    const tyreLapsStr = tyre.laps ? `${tyre.laps}L` : "—";
    const showPitTag = item.inPit && !item.retired;

    return `
      <div class="timing-row ${item.retired ? "is-retired" : ""}" ${isFastestLap ? 'title="Fastest lap of the session"' : ""}>
        <span class="timing-pos ${item.retired ? "pos-out" : ""}">${posStr}</span>
        <div class="timing-driver-box">
          <span class="timing-team-dot" style="background-color: ${drv.color};"></span>
          <span class="timing-driver-code">${drv.code}</span>
          ${showPitTag ? '<span class="timing-pit-tag" title="In Pit Lane">PIT</span>' : ""}
          ${isFastestLap ? `<span class="fastest-lap-badge" title="Fastest Lap (${activeFastestLap.formatted})">${FASTEST_LAP_SVG}</span>` : ""}
        </div>
        <span class="timing-last-lap ${isFastestLap ? "is-fastest" : ""} ${timeStr === "NO TIME" ? "is-no-time" : ""}"${isFastestLap ? ' style="color:#cf54ff;text-shadow:0 0 8px rgba(207,84,255,.45);"' : ""}>${isFastestLap ? activeFastestLap.formatted : timeStr}</span>
        <span class="timing-gap">${gapStr}</span>
        <div class="timing-tyre">
          <span class="tyre-compound ${tyre.compound || "unknown"}">${tyreLetter}</span>
          <span class="tyre-laps">${tyreLapsStr}</span>
        </div>
      </div>
    `;
  }).join("");

  const noteHtml = sessionProgress?.isFinal
    ? '<div class="timing-provider-note">Final classification from the most recent session.</div>'
    : sessionProgress?.isOpenF1Fallback
    ? '<div class="timing-provider-note">Delayed OpenF1 fallback data. Reconnecting to official live timing.</div>'
    : sessionProgress?.isOpenF1Restricted
    ? '<div class="timing-provider-note">Telemetry is reconnecting to live stream. Displaying session roster &amp; progress.</div>'
    : (sessionProgress?.isSignalR
        ? '<div class="timing-provider-note" style="color: #27F4D2;">⚡ Connected to Formula 1 Official Live Timing Stream</div>'
        : "");

  setSafeContent(tower, rowsHtml + noteHtml);
}

function processF1SignalRState() {
  const { driverList, timingData, timingAppData, trackStatus, sessionInfo } = liveSignalRState;
  const lines = timingData?.Lines || {};
  const appLines = timingAppData?.Lines || {};

  if (Object.keys(lines).length === 0 && Object.keys(driverList || {}).length === 0) return;

  const now = Date.now();
  const { race: scheduledRace, session: scheduledActiveSession } = getScheduledLiveContext();

  // If the local calendar has no active session but SignalR is streaming a
  // live/finished session, keep using the official feed instead of clearing
  // the tower to "NO SESSION".
  const signalRStatus = String(sessionInfo?.SessionStatus || "").toLowerCase();
  const signalRFinished = signalRStatus === "finalised" || signalRStatus === "finished";
  if (!scheduledActiveSession && !(sessionInfo && !signalRFinished)) {
    if (!cachedLiveTelemetry) {
      clearLiveTelemetryCache();
      renderNoLiveSession();
      updateLiveBeaconState(false);
    }
    return;
  }

  // Determine session type & timed flag
  let sessionType = "race";
  if (scheduledActiveSession) {
    sessionType = scheduledActiveSession.type;
  } else if (sessionInfo?.Type || sessionInfo?.Name) {
    const rawType = `${sessionInfo.Type || ""} ${sessionInfo.Name || ""}`.toLowerCase();
    if (rawType.includes("sprint quali") || rawType.includes("sq") || rawType.includes("shootout")) sessionType = "sq";
    else if (rawType.includes("sprint")) sessionType = "sprint";
    else if (rawType.includes("quali")) sessionType = "quali";
    else if (rawType.includes("practice") || rawType.includes("fp")) sessionType = "fp";
    else sessionType = "race";
  }
  const isTimedSession = sessionType === "fp" || sessionType === "sq" || sessionType === "quali" || sessionType.includes("practice") || sessionType.includes("quali") || sessionType.includes("shootout");

  const driverMap = {};
  Object.entries(driverList || {}).forEach(([numStr, d]) => {
    const num = parseInt(numStr, 10);
    driverMap[num] = {
      code: d.Tla || `#${num}`,
      name: d.BroadcastName || d.FullName || `${d.FirstName || ""} ${d.LastName || ""}`.trim() || `Driver ${num}`,
      color: d.TeamColour ? (d.TeamColour.startsWith("#") ? d.TeamColour : `#${d.TeamColour}`) : (getTeamColor(d.TeamName) || "#888")
    };
  });

  const tyreMap = {};
  Object.entries(appLines).forEach(([numStr, d]) => {
    const num = parseInt(numStr, 10);
    let stintList = [];
    if (Array.isArray(d.Stints)) {
      stintList = d.Stints;
    } else if (d.Stints && typeof d.Stints === "object") {
      stintList = Object.values(d.Stints);
    }
    const latest = stintList.length > 0 ? stintList[stintList.length - 1] : null;
    if (latest) {
      tyreMap[num] = {
        compound: (latest.Compound || "medium").toLowerCase(),
        laps: latest.TotalLaps || 1
      };
    }
  });

  const latestLaps = {};
  let fastestLap = null;
  let bestTimeSec = 9999;

  Object.entries(lines).forEach(([numStr, line]) => {
    const num = parseInt(numStr, 10);

    let bestFormatted = line.BestLapTime?.Value || "";
    let bestSec = null;
    if (bestFormatted && typeof bestFormatted === "string" && bestFormatted.includes(":")) {
      const [bm, bs] = bestFormatted.split(":");
      bestSec = parseFloat(bm) * 60 + parseFloat(bs);
    }

    let lastFormatted = line.LastLapTime?.Value || "";
    let lastSec = null;
    if (lastFormatted && typeof lastFormatted === "string" && lastFormatted.includes(":")) {
      const [lm, ls] = lastFormatted.split(":");
      lastSec = parseFloat(lm) * 60 + parseFloat(ls);
    }

    if (isTimedSession) {
      if (bestSec && !isNaN(bestSec)) {
        latestLaps[num] = { lap_duration: bestSec, formatted: bestFormatted };
      }
    } else {
      if (lastSec && !isNaN(lastSec) && lastSec < 300) {
        latestLaps[num] = { lap_duration: lastSec, formatted: lastFormatted };
      } else if (bestSec && !isNaN(bestSec)) {
        latestLaps[num] = { lap_duration: bestSec, formatted: bestFormatted };
      }
    }

    if (bestSec && !isNaN(bestSec) && bestSec < bestTimeSec) {
      bestTimeSec = bestSec;
      fastestLap = { driverNumber: num, formatted: bestFormatted };
    } else if (!isTimedSession && line.LastLapTime?.OverallFastest && lastFormatted && lastSec < 300) {
      fastestLap = { driverNumber: num, formatted: lastFormatted };
    }
  });

  // Ensure all known drivers are included without dropping cars lacking lap times
  const allDriverNums = new Set([
    ...Object.keys(lines).map(n => parseInt(n, 10)),
    ...Object.keys(driverList || {}).map(n => parseInt(n, 10))
  ]);

  const mappedDrivers = Array.from(allDriverNums).map(num => {
    const line = lines[String(num)] || lines[num] || {};
    const pos = parseInt(line.Position, 10);
    const lineOrder = parseInt(line.Line, 10) || 99;
    const isRetired = Boolean(line.Retired || line.Stopped);
    const isInPit = Boolean(line.InPit);

    let gapLeader = line.GapToLeader;
    if (gapLeader === "" || pos === 1) gapLeader = "LEADER";
    else if (!gapLeader) gapLeader = "—";

    let intervalVal = line.IntervalToPositionAhead?.Value;
    if (intervalVal === "" || pos === 1) intervalVal = "LEADER";
    else if (!intervalVal) intervalVal = "—";

    const bestLapStr = line.BestLapTime?.Value || "";
    const lastLapStr = line.LastLapTime?.Value || "";

    return {
      driver_number: num,
      position: !isNaN(pos) ? pos : (isRetired ? 99 : lineOrder),
      displayPos: !isNaN(pos) ? pos : null,
      lineOrder,
      gap_to_leader: gapLeader,
      interval: intervalVal,
      bestLapStr,
      lastLapStr,
      inPit: isInPit,
      retired: isRetired
    };
  });

  // Sort: Active drivers with valid position -> active drivers without position -> retired drivers
  mappedDrivers.sort((a, b) => {
    if (a.retired !== b.retired) return a.retired ? 1 : -1;
    if (a.displayPos !== null && b.displayPos !== null) return a.displayPos - b.displayPos;
    if (a.displayPos !== null) return -1;
    if (b.displayPos !== null) return 1;
    return a.lineOrder - b.lineOrder;
  });

  const sortedDrivers = mappedDrivers;

  // Update track status indicator
  const statusPill = document.getElementById("track-status-pill");
  const statusLabel = document.getElementById("track-status-label");
  if (statusPill && statusLabel) {
    const st = String(trackStatus?.Status || "1");
    if (st === "5") {
      statusPill.className = "nitrous-status-pill status-red";
      statusLabel.textContent = "Red Flag";
    } else if (st === "4") {
      statusPill.className = "nitrous-status-pill status-yellow";
      statusLabel.textContent = "Safety Car";
    } else if (st === "6") {
      statusPill.className = "nitrous-status-pill status-yellow";
      statusLabel.textContent = "VSC";
    } else if (st === "7") {
      statusPill.className = "nitrous-status-pill status-yellow";
      statusLabel.textContent = "VSC Ending";
    } else if (st === "2") {
      statusPill.className = "nitrous-status-pill status-yellow";
      statusLabel.textContent = "Yellow Flag";
    } else {
      statusPill.className = "nitrous-status-pill status-green";
      statusLabel.textContent = "Clear";
    }
  }

  // Lap progress
  let currentLap = 0;
  Object.values(lines).forEach(l => {
    if (typeof l.NumberOfLaps === "number" && l.NumberOfLaps > currentLap) {
      currentLap = l.NumberOfLaps;
    }
  });

  const circuitName = sessionInfo?.Meeting?.Circuit?.ShortName || sessionInfo?.Meeting?.Name || "singapore";
  let totalLaps = getTotalLapsForCircuit(circuitName);
  if (sessionType.includes("sprint")) {
    totalLaps = Math.max(15, Math.round(totalLaps / 3));
  }

  const statusStr = String(sessionInfo?.SessionStatus || "").toLowerCase();
  const isSessionFinished = statusStr === "finalised" || statusStr === "finished";
  const isLive = Boolean(scheduledActiveSession) && !isSessionFinished;

  if (isSessionFinished && statusPill && statusLabel) {
    statusPill.className = "nitrous-status-pill status-dim";
    statusLabel.textContent = "Final";
  }

  const sessionProgress = {
    sessionType,
    currentLap,
    totalLaps,
    endTime: scheduledActiveSession ? (scheduledActiveSession.t + (SESSION_DURATIONS[scheduledActiveSession.type] || 3600000)) : null,
    isLive,
    isSignalR: true,
    sessionId: `${scheduledRace?.round || "unknown"}_${scheduledActiveSession.code}_${scheduledActiveSession.t}`
  };

  updateLiveTowerTitle(
    scheduledActiveSession,
    scheduledRace,
    sessionInfo?.Meeting?.Circuit?.ShortName || sessionInfo?.Meeting?.Name
  );
  updateLiveBeaconState(isLive);
  updateSessionProgressBadge(sessionType, currentLap, totalLaps, sessionProgress.endTime, isLive, false);

  const round = scheduledRace?.round || sessionInfo?.Meeting?.Number;
  cachedLiveTelemetry = {
    round,
    timestamp: Date.now(),
    sortedDrivers,
    driverMap,
    tyreMap,
    latestLaps,
    fastestLap,
    sessionProgress
  };

  try {
    localStorage.setItem("f1_cached_telemetry", JSON.stringify(cachedLiveTelemetry));
  } catch (_) {}

  renderLiveTimingTower();
}

function connectF1LiveTiming() {
  if (liveWebSocket && liveWebSocket.readyState === WebSocket.OPEN && Object.keys(liveSignalRState.timingData?.Lines || {}).length > 0) {
    return Promise.resolve(true);
  }
  // The official feed can take several seconds to return its snapshot when a
  // session starts. Wait on the existing socket instead of opening a second
  // connection that overwrites it.
  if (isConnectingSignalR || (liveWebSocket && (liveWebSocket.readyState === WebSocket.OPEN || liveWebSocket.readyState === WebSocket.CONNECTING))) {
    return new Promise(resolve => {
      let waited = 0;
      const chk = setInterval(() => {
        waited += 250;
        if (liveWebSocket && liveWebSocket.readyState === WebSocket.OPEN && Object.keys(liveSignalRState.timingData?.Lines || {}).length > 0) {
          clearInterval(chk);
          resolve(true);
        } else if (waited >= 12000) {
          clearInterval(chk);
          resolve(false);
        }
      }, 250);
    });
  }

  isConnectingSignalR = true;

  return new Promise(async (resolve) => {
    let resolved = false;
    const finish = (result) => {
      if (!resolved) {
        resolved = true;
        isConnectingSignalR = false;
        resolve(result);
      }
    };

    // F1 can delay the initial timing snapshot while a session is starting.
    // Keep the one socket alive and allow enough time for its first payload.
    const timer = setTimeout(() => {
      finish(Boolean(liveWebSocket && Object.keys(liveSignalRState.timingData?.Lines || {}).length > 0));
    }, 12000);

    try {
      const negRes = await fetch("https://livetiming.formula1.com/signalrcore/negotiate?negotiateVersion=1", {
        method: "POST"
      });
      if (!negRes.ok) throw new Error(`Negotiate failed: ${negRes.status}`);
      const negData = await negRes.json();
      if (!negData.connectionToken) throw new Error("Missing connectionToken");

      const wsUrl = `wss://livetiming.formula1.com/signalrcore?id=${encodeURIComponent(negData.connectionToken)}`;
      const ws = new WebSocket(wsUrl);
      liveWebSocket = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ protocol: "json", version: 1 }) + "\x1e");

        // Keepalive heartbeat ping every 15 seconds
        if (signalRHeartbeatTimer) clearInterval(signalRHeartbeatTimer);
        signalRHeartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try { ws.send(JSON.stringify({ type: 6 }) + "\x1e"); } catch (_) {}
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        const raw = String(event.data);
        const records = raw.split("\x1e").filter(Boolean);

        for (const r of records) {
          const trimmed = r.trim();

          // Keepalive Heartbeat response
          if (trimmed === '{"type":6}' || trimmed.includes('"type":6')) {
            if (ws.readyState === WebSocket.OPEN) {
              try { ws.send(JSON.stringify({ type: 6 }) + "\x1e"); } catch (_) {}
            }
            continue;
          }

          // Handshake acknowledged -> Subscribe to live streams
          if (trimmed === "{}" || trimmed.includes('"protocol"')) {
            const subMsg = {
              type: 1,
              invocationId: "0",
              target: "Subscribe",
              arguments: [["Heartbeat", "SessionInfo", "SessionData", "DriverList", "TimingData", "TimingAppData", "TrackStatus"]]
            };
            if (ws.readyState === WebSocket.OPEN) {
              try { ws.send(JSON.stringify(subMsg) + "\x1e"); } catch (_) {}
            }
            continue;
          }

          try {
            const msg = JSON.parse(r);

            // Initial Snapshot
            if (msg.type === 3 && msg.result) {
              const res = msg.result;
              if (res.DriverList) liveSignalRState.driverList = res.DriverList;
              if (res.TimingData?.Lines) {
                liveSignalRState.timingData = liveSignalRState.timingData || { Lines: {} };
                liveSignalRState.timingData.Lines = { ...res.TimingData.Lines };
              }
              if (res.TimingAppData?.Lines) {
                liveSignalRState.timingAppData = liveSignalRState.timingAppData || { Lines: {} };
                liveSignalRState.timingAppData.Lines = { ...res.TimingAppData.Lines };
              }
              if (res.TrackStatus) liveSignalRState.trackStatus = res.TrackStatus;
              if (res.SessionInfo) liveSignalRState.sessionInfo = res.SessionInfo;
              processF1SignalRState();
              clearTimeout(timer);
              finish(true);
            }
            // Stream Feed Deltas
            else if (msg.type === 1 && msg.target === "feed" && Array.isArray(msg.arguments)) {
              const [topic, delta] = msg.arguments;
              if (topic === "TimingData" && delta?.Lines) {
                for (const [k, v] of Object.entries(delta.Lines)) {
                  if (!liveSignalRState.timingData.Lines[k]) {
                    liveSignalRState.timingData.Lines[k] = v;
                  } else {
                    deepMerge(liveSignalRState.timingData.Lines[k], v);
                  }
                }
                processF1SignalRState();
                if (Object.keys(liveSignalRState.timingData.Lines).length > 0) {
                  clearTimeout(timer);
                  finish(true);
                }
              } else if (topic === "TimingAppData" && delta?.Lines) {
                for (const [k, v] of Object.entries(delta.Lines)) {
                  if (!liveSignalRState.timingAppData.Lines[k]) {
                    liveSignalRState.timingAppData.Lines[k] = v;
                  } else {
                    deepMerge(liveSignalRState.timingAppData.Lines[k], v);
                  }
                }
                processF1SignalRState();
              } else if (topic === "TrackStatus" && delta) {
                liveSignalRState.trackStatus = delta;
                processF1SignalRState();
              } else if (topic === "SessionInfo" && delta) {
                deepMerge(liveSignalRState.sessionInfo, delta);
                processF1SignalRState();
              } else if (topic === "DriverList" && delta) {
                deepMerge(liveSignalRState.driverList, delta);
                processF1SignalRState();
              }
            }
          } catch (_) {}
        }
      };

      ws.onerror = (e) => {
        console.warn("[F1 Live] SignalR WebSocket error:", e);
        clearTimeout(timer);
        finish(false);
      };

      ws.onclose = () => {
        if (signalRHeartbeatTimer) {
          clearInterval(signalRHeartbeatTimer);
          signalRHeartbeatTimer = null;
        }
        if (liveWebSocket === ws) liveWebSocket = null;
        if (activeTab === "tab-live" && getScheduledLiveContext().session) {
          setTimeout(() => {
            if (activeTab === "tab-live" && !liveWebSocket) {
              connectF1LiveTiming();
            }
          }, 3000);
        }
      };

    } catch (err) {
      console.warn("[F1 Live] SignalR connection error:", err);
      clearTimeout(timer);
      finish(false);
    }
  });
}

async function loadLiveTelemetryInner() {
  const tower = document.getElementById("timing-tower-list");
  const statusPill = document.getElementById("track-status-pill");
  const statusLabel = document.getElementById("track-status-label");

  if (currentSeries !== "f1" || currentSeasonYear !== ACTIVE_SEASON_YEAR) {
    clearLiveTelemetryCache();
    stopLiveConnection();
    if (statusPill && statusLabel) {
      statusPill.className = "nitrous-status-pill status-dim";
      statusLabel.textContent = "UPCOMING";
    }
    renderNoLiveSession(`Live timing is available for active ${ACTIVE_SEASON_YEAR} Formula 1 sessions.`);
    return;
  }

  if (!navigator.onLine) {
    if (statusPill && statusLabel) {
      statusPill.className = "nitrous-status-pill status-red";
      statusLabel.textContent = "OFFLINE";
    }
    if (tower) setSafeContent(tower, '<div class="loading-state">Live timing requires an internet connection.</div>');
    return;
  }

  if (!allRaces?.length) await loadScheduleData();

  // Instant render from cache so the tower doesn't blank/flicker on open.
  if (!cachedLiveTelemetry) {
    try {
      const finalCached = JSON.parse(localStorage.getItem("f1_cached_final_session") || "null");
      if (finalCached?.source === "final-v4" && Array.isArray(finalCached.sortedDrivers) && finalCached.sortedDrivers.length > 0) {
        cachedLiveTelemetry = finalCached;
      } else {
        const liveCached = JSON.parse(localStorage.getItem("f1_cached_telemetry") || "null");
        if (liveCached?.sortedDrivers?.length > 0) cachedLiveTelemetry = liveCached;
      }
    } catch (_) {}
  }
  if (cachedLiveTelemetry) renderLiveTimingTower();

  const { race, session } = getScheduledLiveContext();

  if (!race || !session) {
    activeLiveSessionId = null;
    stopLiveConnection();
    const renderedFinal = await loadLatestFinishedSession();
    if (!renderedFinal && !cachedLiveTelemetry) {
      clearLiveTelemetryCache();
      updateLiveBeaconState(false);
      if (statusPill && statusLabel) {
        statusPill.className = "nitrous-status-pill status-dim";
        statusLabel.textContent = "NO SESSION";
      }
      renderNoLiveSession();
    }
    return;
  }

  updateLiveTowerTitle(session, race);
  const sessionId = `${race.round}_${session.code}_${session.t}`;
  if (activeLiveSessionId !== sessionId) {
    activeLiveSessionId = sessionId;
    clearLiveTelemetryCache();
    resetLiveSignalRState();
    stopLiveConnection();
  }

  if (!liveTabRefreshInterval) {
    liveTabRefreshInterval = setInterval(() => {
      if (activeTab === "tab-live" && !liveLoadPromise) loadLiveTelemetry();
    }, 30000);
  }

  if (statusPill && statusLabel) {
    statusPill.className = "nitrous-status-pill status-dim";
    statusLabel.textContent = "CONNECTING";
  }
  if (tower && !cachedLiveTelemetry) {
    setSafeContent(tower, '<div class="loading-state">Connecting to Formula 1 Live Timing…</div>');
  }

  await connectF1LiveTiming();
  if (Object.keys(liveSignalRState.timingData?.Lines || {}).length > 0) return;

  const openF1Session = await findMatchingOpenF1Session(session);
  if (!openF1Session?.session_key) {
    if (statusPill && statusLabel) {
      statusPill.className = "nitrous-status-pill status-dim";
      statusLabel.textContent = "RETRYING";
    }
    if (tower) setSafeContent(tower, '<div class="loading-state">Official live timing is unavailable. Waiting for verified fallback data…</div>');
    return;
  }

  const sessionKey = encodeURIComponent(openF1Session.session_key);
  const endpoint = path => `https://api.openf1.org/v1/${path}?session_key=${sessionKey}`;
  const [driversResponse, positionsResponse, intervalsResponse, stintsResponse, lapsResponse, resultsResponse] = await Promise.all([
    fetch(endpoint("drivers")).catch(() => null),
    fetch(endpoint("position")).catch(() => null),
    fetch(endpoint("intervals")).catch(() => null),
    fetch(endpoint("stints")).catch(() => null),
    fetch(endpoint("laps")).catch(() => null),
    fetch(endpoint("session_result")).catch(() => null)
  ]);

  const readArray = async response => response?.ok ? response.json().catch(() => []) : [];
  const [drivers, positions, intervals, stints, laps, results] = await Promise.all([
    readArray(driversResponse), readArray(positionsResponse), readArray(intervalsResponse),
    readArray(stintsResponse), readArray(lapsResponse), readArray(resultsResponse)
  ]);

  const driverMap = {};
  for (const driver of Array.isArray(drivers) ? drivers : []) {
    driverMap[driver.driver_number] = {
      code: driver.name_acronym || `#${driver.driver_number}`,
      name: driver.full_name || `${driver.first_name || ""} ${driver.last_name || ""}`.trim(),
      color: driver.team_colour ? `#${driver.team_colour}` : getTeamColor(driver.team_name)
    };
  }

  const latestByDriver = (data, compare = item => item.date || "") => {
    const latest = {};
    for (const item of Array.isArray(data) ? data : []) {
      const number = item?.driver_number;
      if (number == null || !latest[number] || compare(item) > compare(latest[number])) latest[number] = item;
    }
    return latest;
  };
  const latestPositions = latestByDriver(positions);
  const latestIntervals = latestByDriver(intervals);
  const latestStints = latestByDriver(stints, item => Number(item.stint_number || 0));
  const latestLapRows = latestByDriver(
    (Array.isArray(laps) ? laps : []).filter(lap => Number.isFinite(lap?.lap_duration) && lap.lap_duration > 50),
    item => item.date_start || item.date || ""
  );

  const tyreMap = {};
  for (const [number, stint] of Object.entries(latestStints)) {
    tyreMap[number] = {
      compound: String(stint.compound || "medium").toLowerCase(),
      laps: Math.max(1, Number(stint.lap_end || stint.lap_start || 0) - Number(stint.lap_start || 1) + 1 + Number(stint.tyre_age_at_start || 0))
    };
  }

  const formatLap = seconds => {
    const mins = Math.floor(seconds / 60);
    return `${mins}:${(seconds % 60).toFixed(3).padStart(6, "0")}`;
  };
  const latestLaps = {};
  let fastestLap = null;
  for (const [number, lap] of Object.entries(latestLapRows)) {
    latestLaps[number] = { lap_duration: lap.lap_duration, formatted: formatLap(lap.lap_duration) };
    if (!fastestLap || lap.lap_duration < fastestLap.seconds) {
      fastestLap = { driverNumber: Number(number), formatted: formatLap(lap.lap_duration), seconds: lap.lap_duration };
    }
  }
  if (fastestLap) delete fastestLap.seconds;

  let sortedDrivers = Object.values(latestPositions).map(position => ({
    driver_number: position.driver_number,
    position: Number(position.position),
    displayPos: Number(position.position),
    gap_to_leader: latestIntervals[position.driver_number]?.gap_to_leader,
    interval: latestIntervals[position.driver_number]?.interval,
    bestLapStr: latestLaps[position.driver_number]?.formatted || "",
    inPit: false,
    retired: false
  }));

  // Session results are only used after OpenF1 has verified this exact session.
  // They are useful for a session that has just finished while the official feed reconnects.
  if (sortedDrivers.length === 0 && Array.isArray(results) && results.length > 0) {
    sortedDrivers = results
      .filter(result => Number.isFinite(result?.position) && result.driver_number != null)
      .map(result => ({
        driver_number: result.driver_number,
        position: Number(result.position),
        displayPos: Number(result.position),
        gap_to_leader: result.gap_to_leader,
        interval: null,
        bestLapStr: latestLaps[result.driver_number]?.formatted || "",
        inPit: false,
        retired: Boolean(result.dnf || result.dns || result.dsq)
      }));
  }
  sortedDrivers.sort((a, b) => a.position - b.position);

  if (sortedDrivers.length === 0) {
    if (statusPill && statusLabel) {
      statusPill.className = "nitrous-status-pill status-dim";
      statusLabel.textContent = "WAITING";
    }
    if (tower) setSafeContent(tower, '<div class="loading-state">Verified fallback is connected. Timing data has not arrived yet.</div>');
    return;
  }

  const currentLap = Math.max(0, ...Object.values(latestLapRows).map(lap => Number(lap.lap_number || 0)));
  const totalLaps = session.type === "sprint"
    ? Math.max(15, Math.round(getTotalLapsForCircuit(openF1Session.circuit_short_name || race.raceName) / 3))
    : getTotalLapsForCircuit(openF1Session.circuit_short_name || race.raceName);
  const sessionProgress = {
    sessionType: session.type,
    currentLap,
    totalLaps,
    endTime: session.t + (SESSION_DURATIONS[session.type] || 60 * 60 * 1000),
    isLive: true,
    isOpenF1Fallback: true,
    sessionId
  };

  updateLiveTowerTitle(session, race, openF1Session.circuit_short_name);
  if (statusPill && statusLabel) {
    statusPill.className = "nitrous-status-pill status-dim";
    statusLabel.textContent = "DELAYED";
  }
  updateLiveBeaconState(true);
  cachedLiveTelemetry = {
    round: race.round,
    timestamp: Date.now(),
    sortedDrivers,
    driverMap,
    tyreMap,
    latestLaps,
    fastestLap,
    sessionProgress
  };
  try { localStorage.setItem("f1_cached_telemetry", JSON.stringify(cachedLiveTelemetry)); } catch (_) {}
  renderLiveTimingTower();
}

function loadLiveTelemetry() {
  if (liveLoadPromise) return liveLoadPromise;
  liveLoadPromise = loadLiveTelemetryInner().finally(() => {
    liveLoadPromise = null;
  });
  return liveLoadPromise;
}

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

  const vol = (currentSettings?.volume !== undefined ? currentSettings.volume : 85) / 100;
  const leadMin = currentSettings?.leadTime || 10;
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

  const vol = (currentSettings?.volume !== undefined ? currentSettings.volume : 65) / 100;
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
