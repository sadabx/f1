// ============================================================
// F1 Dash - Multi-Tab Engine (Weekend, Standings, Results, Live)
// ============================================================
const api = typeof browser !== 'undefined' ? browser : chrome;

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
  "Abu Dhabi": "🇦🇪", "United Arab Emirates": "🇦🇪", "UAE": "🇦🇪", "Yas Marina": "🇦🇪"
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
// STATE
// ============================================================
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

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupUIEventListeners();

  await loadSettings();
  await loadScheduleData();
});

// ============================================================
// SETTINGS
// ============================================================
async function loadSettings() {
  const defaults = {
    alarmEnabled: true,
    leadTime: 10,
    volume: 85,
    sessions: { fp: true, sq: true, sprint: true, quali: true, race: true }
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
  if (leadSelect) leadSelect.value = String(currentSettings.leadTime || 10);

  const volSlider = document.getElementById('volume-slider');
  const volVal = document.getElementById('volume-val');
  if (volSlider && volVal) {
    const v = currentSettings.volume !== undefined ? currentSettings.volume : 85;
    volSlider.value = v;
    volVal.textContent = `${v}%`;
  }

  const s = currentSettings.sessions || {};
  ['fp', 'sq', 'sprint', 'quali', 'race'].forEach(type => {
    const cb = document.getElementById(`cb-${type}`);
    if (cb) cb.checked = s[type] !== false;
  });
}

function saveSettings() {
  if (!currentSettings) return;
  api.storage.local.set({ f1_settings: currentSettings });
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
      if (targetId === 'tab-live') loadLiveTelemetry();
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
    });
  }

  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      viewSettings.classList.remove('active');
      viewMain.classList.add('active');
    });
  }
}

// ============================================================
// TAB 1: WEEKEND SCHEDULE & COUNTDOWN
// ============================================================
async function loadScheduleData() {
  try {
    const res = await fetch(`https://f1.trionine.com/api/current.json?_t=${Date.now()}`);
    if (!res.ok) throw new Error('Calendar fetch failed');
    const data = await res.json();
    allRaces = data?.MRData?.RaceTable?.Races || [];

    if (allRaces.length === 0) {
      document.getElementById('hero-race-name').textContent = 'No Races Scheduled';
      return;
    }

    findNextRaceIndex();
    renderRoundIndex(actualNextRaceIndex);

  } catch (err) {
    document.getElementById('hero-race-name').textContent = 'F1 Dash (Offline)';
    document.getElementById('hero-circuit').textContent = 'Unable to connect to calendar';
  }
}

function findNextRaceIndex() {
  const now = Date.now();
  let found = -1;

  for (let i = 0; i < allRaces.length; i++) {
    const sessions = extractRaceSessions(allRaces[i]);
    const lastSession = sessions[sessions.length - 1];
    const dur = SESSION_DURATIONS[lastSession.type] || (120 * 60 * 1000);
    if ((lastSession.t + dur) > now) {
      found = i;
      break;
    }
  }

  actualNextRaceIndex = found !== -1 ? found : allRaces.length - 1;
}

function extractRaceSessions(race) {
  const sessions = [];

  function add(type, code, name, d, t) {
    if (!d) return;
    const timeClean = t ? t.replace('Z', '') : '12:00:00';
    const dateObj = new Date(`${d}T${timeClean}Z`);
    if (!isNaN(dateObj.getTime())) {
      sessions.push({ type, code, name, t: dateObj.getTime() });
    }
  }

  add('fp', 'FP1', 'Practice 1', race.FirstPractice?.date, race.FirstPractice?.time);
  add('sq', 'SQ', 'Sprint Qualifying', race.SprintQualifying?.date, race.SprintQualifying?.time);
  add('fp', 'FP2', 'Practice 2', race.SecondPractice?.date, race.SecondPractice?.time);
  add('sprint', 'Sprint', 'Sprint Race', race.Sprint?.date, race.Sprint?.time);
  add('fp', 'FP3', 'Practice 3', race.ThirdPractice?.date, race.ThirdPractice?.time);
  add('quali', 'Quali', 'Qualifying', race.Qualifying?.date, race.Qualifying?.time);
  add('race', 'Race', 'Grand Prix', race.date, race.time);

  sessions.sort((a, b) => a.t - b.t);
  return sessions;
}

function renderRoundIndex(idx) {
  displayedRaceIndex = idx;
  const race = allRaces[idx];
  if (!race) return;

  const total = allRaces.length;
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

  let targetSess = sessions.find(s => {
    const dur = SESSION_DURATIONS[s.type] || (60 * 60 * 1000);
    return (s.t + dur) > now;
  }) || sessions[sessions.length - 1];

  currentTargetSession = targetSess;

  const cleanRaceName = `${race.raceName.replace(/grand prix/gi, '').trim()} Grand Prix`;
  document.getElementById('hero-flag').textContent = getFlag(cleanRaceName);
  document.getElementById('hero-race-name').textContent = cleanRaceName;
  document.getElementById('hero-circuit').textContent = `Round ${race.round} • ${race.Circuit?.circuitName || ''}`;

  const heroTime = document.getElementById('hero-time-info');
  if (heroTime) {
    if (liveSess) {
      heroTime.innerHTML = `<span style="color: var(--f1red); font-weight: 800;">● ${liveSess.name} IS LIVE NOW</span>`;
    } else {
      const dateStr = new Date(targetSess.t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = new Date(targetSess.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      heroTime.textContent = `${targetSess.name}: ${dateStr} at ${timeStr} (Local)`;
    }
  }

  startCountdown(targetSess);
  renderSessionList(sessions, targetSess, liveSess);
}

function renderSessionList(sessions, activeTarget, liveSess) {
  const container = document.getElementById('session-list');
  if (!container) return;

  const now = Date.now();

  container.innerHTML = sessions.map(s => {
    const dur = SESSION_DURATIONS[s.type] || (60 * 60 * 1000);
    const isLive = now >= s.t && now < s.t + dur;
    const isPast = s.t + dur < now;
    const isTarget = isLive || (activeTarget && s.code === activeTarget.code && s.t === activeTarget.t);

    const timeStr = new Date(s.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dayStr = new Date(s.t).toLocaleDateString([], { weekday: 'short' });

    let relText = '';
    if (isLive) {
      relText = '<span style="color: var(--f1red); font-weight: 800;">● LIVE NOW</span>';
    } else if (isPast) {
      relText = 'Finished';
    } else {
      const diffMs = s.t - now;
      const hours = Math.floor(diffMs / 3600000);
      const days = Math.floor(hours / 24);
      relText = days > 0 ? `in ${days}d ${hours % 24}h` : `in ${hours}h`;
    }

    const isEnabled = currentSettings?.sessions?.[s.type] ?? true;

    return `
      <div class="session-row ${isTarget ? 'current-target' : ''}">
        <div class="sess-meta-left">
          <span class="sess-timeline-dot"></span>
          <span class="sess-code">${s.code}</span>
          <span class="sess-name">${s.name}</span>
        </div>
        <div class="sess-meta-right">
          <div class="sess-times">
            <span class="sess-time-main">${dayStr} ${timeStr}</span>
            <span class="sess-time-rel">${relText}</span>
          </div>
          <button class="sess-alert-btn ${isEnabled && !isPast ? '' : 'muted'}" 
                  data-type="${s.type}" 
                  title="${isEnabled ? 'Alarm active (Click to toggle)' : 'Alarm disabled (Click to enable)'}">
            ${BELL_SVG}
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.sess-alert-btn').forEach(btn => {
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

function startCountdown(sess) {
  if (countdownTimer) clearInterval(countdownTimer);

  function update() {
    const diff = sess.t - Date.now();
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
  if (!standingsData) {
    try {
      const res = await fetch(`https://f1.trionine.com/api/standings.json?_t=${Date.now()}`);
      if (!res.ok) throw new Error('Standings fetch failed');
      standingsData = await res.json();
    } catch (e) {
      container.innerHTML = '<div class="loading-state">Failed to load championship standings.</div>';
      return;
    }
  }

  renderStandings();
}

function renderStandings() {
  const container = document.getElementById('standings-container');
  const list = standingsData?.MRData?.StandingsTable?.StandingsLists?.[0];
  if (!list) {
    container.innerHTML = '<div class="loading-state">No standings data available.</div>';
    return;
  }

  if (standingsSubTab === 'drivers') {
    const drivers = list.DriverStandings || [];
    const maxPts = Math.max(...drivers.map(d => parseFloat(d.points) || 1), 1);

    container.innerHTML = `
      <div class="standings-list">
        ${drivers.map(d => {
          const pos = d.position;
          const team = d.Constructors?.[0]?.name || '';
          const color = getTeamColor(team);
          const pts = parseFloat(d.points) || 0;
          const pct = Math.min(100, Math.max(8, (pts / maxPts) * 100));
          const code = d.Driver?.code || d.Driver?.familyName?.slice(0, 3)?.toUpperCase() || 'DRV';
          const fullName = `${d.Driver?.givenName || ''} ${d.Driver?.familyName || ''}`.trim();

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
        }).join('')}
      </div>
    `;
  } else {
    // Constructors Standings
    const drivers = list.DriverStandings || [];
    const teamMap = {};
    drivers.forEach(d => {
      const team = d.Constructors?.[0]?.name || 'Other';
      const pts = parseFloat(d.points) || 0;
      const code = d.Driver?.code || d.Driver?.familyName || '';
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

    container.innerHTML = `
      <div class="standings-list">
        ${sortedTeams.map((t, idx) => {
          const pos = idx + 1;
          const color = getTeamColor(t.name);
          const pct = Math.min(100, Math.max(8, (t.points / maxTeamPts) * 100));
          const driverPair = t.drivers.join(' / ');

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
        }).join('')}
      </div>
    `;
  }
}

// ============================================================
// TAB 3: RESULTS & INTERACTIVE PODIUMS (NO DROPDOWNS)
// ============================================================
function renderPodiumShowcase(race) {
  const latestGpTitle = document.getElementById('results-gp-name');
  const podiumShowcase = document.getElementById('results-podium-showcase');
  if (!race) return;

  latestGpTitle.textContent = `${race.raceName} (Round ${race.round})`;

  const results = race.Results || [];
  const p1 = results.find(r => r.position === '1');
  const p2 = results.find(r => r.position === '2');
  const p3 = results.find(r => r.position === '3');

  podiumShowcase.innerHTML = `
    <div class="podium-slot p2">
      <span class="podium-rank-badge">2</span>
      <span class="podium-driver-name">${p2?.Driver?.code || p2?.Driver?.familyName || '—'}</span>
      <span class="podium-team-name">${p2?.Driver?.givenName || ''}</span>
    </div>
    <div class="podium-slot p1">
      <span class="podium-rank-badge">1</span>
      <span class="podium-driver-name">${p1?.Driver?.code || p1?.Driver?.familyName || '—'}</span>
      <span class="podium-team-name">${p1?.Driver?.givenName || ''}</span>
    </div>
    <div class="podium-slot p3">
      <span class="podium-rank-badge">3</span>
      <span class="podium-driver-name">${p3?.Driver?.code || p3?.Driver?.familyName || '—'}</span>
      <span class="podium-team-name">${p3?.Driver?.givenName || ''}</span>
    </div>
  `;
}

async function loadResults() {
  const container = document.getElementById('results-season-list');

  try {
    const res = await fetch(`https://f1.trionine.com/api/results.json?_t=${Date.now()}`);
    if (!res.ok) throw new Error('Results fetch failed');
    const data = await res.json();
    const races = data?.MRData?.RaceTable?.Races || [];
    allResultsRaces = races;

    if (races.length === 0) {
      container.innerHTML = '<div class="loading-state">No race results recorded yet.</div>';
      return;
    }

    const latest = races[races.length - 1];
    renderPodiumShowcase(latest);

    // Clean Clickable Grand Prix list (no accordion drop down)
    container.innerHTML = races.slice().reverse().map((r, idx) => {
      const winner = r.Results?.[0];
      const flag = getFlag(r.raceName);
      const isLatest = idx === 0;

      return `
        <div class="result-row-card ${isLatest ? 'active-race' : ''}" data-round="${r.round}">
          <div class="result-row-left">
            <span class="result-flag">${flag}</span>
            <span class="result-gp-label">${r.raceName}</span>
          </div>
          <span class="result-winner-name">${winner?.Driver?.givenName || ''} ${winner?.Driver?.familyName || ''}</span>
        </div>
      `;
    }).join('');

    // Clicking updates the top podium showcase card
    container.querySelectorAll('.result-row-card').forEach(row => {
      row.addEventListener('click', () => {
        container.querySelectorAll('.result-row-card').forEach(r => r.classList.remove('active-race'));
        row.classList.add('active-race');

        const round = row.getAttribute('data-round');
        const targetRace = allResultsRaces.find(rc => String(rc.round) === String(round));
        if (targetRace) {
          renderPodiumShowcase(targetRace);
        }
      });
    });

  } catch (e) {
    container.innerHTML = '<div class="loading-state">Unable to load race results.</div>';
  }
}

// ============================================================
// TAB 4: LIVE TELEMETRY, NITROUS STATUS & TIMING TOWER (OpenF1)
// ============================================================
async function loadLiveTelemetry() {
  const tower = document.getElementById('timing-tower-list');
  const statusPill = document.getElementById('track-status-pill');
  const statusLabel = document.getElementById('track-status-label');
  const liveFlBanner = document.getElementById('live-fastest-lap-banner');
  const liveFlDriver = document.getElementById('live-fl-driver');
  const liveFlTime = document.getElementById('live-fl-time');

  try {
    // 1. Race Control status (Nitrous style: Clear, Yellow, Red Flag)
    try {
      const rcRes = await fetch('https://api.openf1.org/v1/race_control?session_key=latest');
      const rcData = await rcRes.json();
      if (rcData && rcData.length > 0 && statusPill && statusLabel) {
        const latestMsg = rcData[rcData.length - 1];
        if (latestMsg.flag === 'RED') {
          statusPill.className = 'nitrous-status-pill status-red';
          statusLabel.textContent = 'Red Flag';
        } else if (latestMsg.category === 'SafetyCar' || latestMsg.flag === 'YELLOW') {
          statusPill.className = 'nitrous-status-pill status-yellow';
          statusLabel.textContent = latestMsg.category === 'SafetyCar' ? 'Safety Car' : 'Yellow';
        } else {
          statusPill.className = 'nitrous-status-pill status-green';
          statusLabel.textContent = 'Clear';
        }
      }
    } catch (_) {}

    // 2. Fetch Drivers, Stints, Intervals, and Laps
    const [intRes, stintRes, drvRes, lapsRes] = await Promise.all([
      fetch('https://api.openf1.org/v1/intervals?session_key=latest').catch(() => null),
      fetch('https://api.openf1.org/v1/stints?session_key=latest').catch(() => null),
      fetch('https://api.openf1.org/v1/drivers?session_key=latest').catch(() => null),
      fetch('https://api.openf1.org/v1/laps?session_key=latest').catch(() => null)
    ]);

    const intData = intRes ? await intRes.json() : [];
    const stintData = stintRes ? await stintRes.json() : [];
    const drvData = drvRes ? await drvRes.json() : [];
    const lapsData = lapsRes ? await lapsRes.json() : [];

    const driverMap = {};
    if (Array.isArray(drvData)) {
      drvData.forEach(d => {
        const num = d.driver_number;
        driverMap[num] = {
          code: d.name_acronym || `#${num}`,
          name: d.full_name || `${d.first_name || ''} ${d.last_name || ''}`.trim(),
          color: d.team_colour ? `#${d.team_colour}` : getTeamColor(d.team_name)
        };
      });
    }

    // Process Fastest Lap during live session
    if (Array.isArray(lapsData) && lapsData.length > 0) {
      const validLaps = lapsData.filter(l => typeof l.lap_duration === 'number' && l.lap_duration > 50);
      if (validLaps.length > 0) {
        const best = validLaps.reduce((min, cur) => cur.lap_duration < min.lap_duration ? cur : min, validLaps[0]);
        const drv = getDriverMeta(best.driver_number, driverMap);
        const mins = Math.floor(best.lap_duration / 60);
        const secs = (best.lap_duration % 60).toFixed(3).padStart(6, '0');
        const formatted = `${mins}:${secs}`;
        if (liveFlBanner) {
          liveFlBanner.style.display = 'flex';
          if (liveFlDriver) liveFlDriver.textContent = drv.code;
          if (liveFlTime) liveFlTime.textContent = formatted;
        }
      }
    }

    const tyreMap = {};
    if (Array.isArray(stintData)) {
      stintData.forEach(s => {
        tyreMap[s.driver_number] = {
          compound: (s.compound || 'MEDIUM').toLowerCase(),
          age: s.tyre_age_at_start || 0
        };
      });
    }

    // Strictly latest interval per driver by date
    const latestIntervals = {};
    if (Array.isArray(intData)) {
      intData.forEach(item => {
        const num = item.driver_number;
        if (!latestIntervals[num] || item.date > latestIntervals[num].date) {
          latestIntervals[num] = item;
        }
      });
    }

    const sortedDrivers = Object.values(latestIntervals).sort((a, b) => {
      const gapA = typeof a.gap_to_leader === 'number' ? a.gap_to_leader : (a.gap_to_leader ? 9999 : 0);
      const gapB = typeof b.gap_to_leader === 'number' ? b.gap_to_leader : (b.gap_to_leader ? 9999 : 0);
      return gapA - gapB;
    });

    if (sortedDrivers.length === 0) {
      tower.innerHTML = '<div class="loading-state">No live session active currently. Telemetry streams live during race weekends.</div>';
      return;
    }

    // 4-Column Clean Tower: POS | DRIVER | GAP | TYRE (Official 3-letter driver codes)
    tower.innerHTML = sortedDrivers.slice(0, 10).map((item, idx) => {
      const pos = idx + 1;
      const drv = getDriverMeta(item.driver_number, driverMap);
      const tyre = tyreMap[item.driver_number] || { compound: 'medium', age: 0 };

      let gapStr = '—';
      if (idx === 0) {
        gapStr = 'LEADER';
      } else if (typeof item.gap_to_leader === 'number') {
        gapStr = `+${item.gap_to_leader.toFixed(3)}s`;
      } else if (typeof item.gap_to_leader === 'string') {
        gapStr = item.gap_to_leader.startsWith('+') ? item.gap_to_leader : `+${item.gap_to_leader}`;
      }

      const tyreLetter = tyre.compound.charAt(0).toUpperCase();

      return `
        <div class="timing-row">
          <span class="timing-pos">${String(pos).padStart(2, '0')}</span>
          <div class="timing-driver-box">
            <span class="timing-team-dot" style="background-color: ${drv.color};"></span>
            <span class="timing-driver-code">${drv.code}</span>
          </div>
          <span class="timing-gap">${gapStr}</span>
          <span class="tyre-pill ${tyre.compound}">${tyreLetter}</span>
        </div>
      `;
    }).join('');

  } catch (err) {
    tower.innerHTML = '<div class="loading-state">Telemetry will stream live during race sessions.</div>';
  }
}

// ============================================================
// UI EVENT LISTENERS
// ============================================================
function setupUIEventListeners() {
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
  if (masterToggle) {
    masterToggle.addEventListener('change', () => {
      if (currentSettings) {
        currentSettings.alarmEnabled = masterToggle.checked;
        saveSettings();
      }
    });
  }

  // Settings: Lead Time
  const leadSelect = document.getElementById('lead-time-select');
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
      if (currentSettings) {
        currentSettings.volume = v;
        saveSettings();
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
}

// ============================================================
// AUDIO TEST ENGINE
// ============================================================
let audioTestInstance = null;

function testThemeAudio() {
  const btnTest = document.getElementById('btn-test-alarm');
  const btnStop = document.getElementById('btn-stop-alarm');
  const txt = document.getElementById('test-btn-text');

  if (audioTestInstance) {
    stopThemeAudio();
  }

  const vol = (currentSettings?.volume !== undefined ? currentSettings.volume : 85) / 100;
  audioTestInstance = new Audio('assets/f1_theme.mp3');
  audioTestInstance.volume = vol;

  if (txt) txt.textContent = 'Playing Official Theme...';
  if (btnStop) btnStop.style.display = 'inline-flex';

  audioTestInstance.play().catch(() => {
    if (txt) txt.textContent = 'Audio blocked by browser';
    setTimeout(() => {
      stopThemeAudio();
    }, 2000);
  });

  audioTestInstance.onended = () => {
    stopThemeAudio();
  };
}

function stopThemeAudio() {
  const btnStop = document.getElementById('btn-stop-alarm');
  const txt = document.getElementById('test-btn-text');

  if (audioTestInstance) {
    audioTestInstance.pause();
    audioTestInstance.currentTime = 0;
    audioTestInstance = null;
  }

  if (txt) txt.textContent = 'Test Official Theme';
  if (btnStop) btnStop.style.display = 'none';
}
