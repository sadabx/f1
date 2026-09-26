// ============================================================
// F1 Dash Alert - Popup Engine (SVG Icons + View Navigation)
// ============================================================
const api = typeof browser !== 'undefined' ? browser : chrome;

const FLAGS = {
  "Bahrain": "🇧🇭",
  "Saudi Arabian": "🇸🇦",
  "Australian": "🇦🇺",
  "Japanese": "🇯🇵",
  "Chinese": "🇨🇳",
  "Miami": "🇺🇸",
  "Emilia Romagna": "🇮🇹",
  "Monaco": "🇲🇨",
  "Canadian": "🇨🇦",
  "Spanish": "🇪🇸",
  "Austrian": "🇦🇹",
  "British": "🇬🇧",
  "Hungarian": "🇭🇺",
  "Belgian": "🇧🇪",
  "Dutch": "🇳🇱",
  "Italian": "🇮🇹",
  "Azerbaijan": "🇦🇿",
  "Singapore": "🇸🇬",
  "United States": "🇺🇸",
  "Mexico City": "🇲🇽",
  "Brazilian": "🇧🇷",
  "São Paulo": "🇧🇷",
  "Las Vegas": "🇺🇸",
  "Qatar": "🇶🇦",
  "Abu Dhabi": "🇦🇪",
  "Madrid": "🇪🇸",
  "Malaysia": "🇲🇾"
};

const SESSION_DURATIONS = {
  fp: 60 * 60 * 1000,        // 1 hour
  sq: 45 * 60 * 1000,        // 45 mins
  sprint: 60 * 60 * 1000,    // 1 hour
  quali: 60 * 60 * 1000,     // 1 hour
  race: 120 * 60 * 1000      // 2 hours
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

// Crisp SVG Bell Icon
const BELL_SVG = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
</svg>`;

const SPEAKER_SVG = `
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
</svg>`;

function getFlag(raceName) {
  for (const [key, flag] of Object.entries(FLAGS)) {
    if (raceName.toLowerCase().includes(key.toLowerCase())) {
      return flag;
    }
  }
  return "🏁";
}

let allRaces = [];
let actualNextRaceIndex = 0;
let displayedRaceIndex = 0;
let countdownInterval = null;
let currentTargetSession = null;
let testTimeout = null;
let currentSettings = null;

document.addEventListener('DOMContentLoaded', async () => {
  await setupSettings();
  await loadAndRenderSchedule();
  setupUIEventListeners();
  setupAudioStatusListener();
});

// ============================================================
// SETTINGS HANDLER
// ============================================================
async function setupSettings() {
  const data = (api?.storage?.local) ? await api.storage.local.get('f1_settings') : {};
  currentSettings = data.f1_settings || {
    masterEnabled: true,
    leadMinutes: 5,
    soundEnabled: true,
    volume: 0.85,
    sessions: { fp: true, sq: true, sprint: true, quali: true, race: true }
  };

  const masterSwitch = document.getElementById('master-switch');
  masterSwitch.checked = currentSettings.masterEnabled;
  updateMasterStatusUI(currentSettings.masterEnabled);

  document.getElementById('lead-time-select').value = String(currentSettings.leadMinutes || 5);
  document.getElementById('cb-race').checked = currentSettings.sessions?.race ?? true;
  document.getElementById('cb-quali').checked = currentSettings.sessions?.quali ?? true;
  document.getElementById('cb-sq').checked = currentSettings.sessions?.sq ?? true;
  document.getElementById('cb-sprint').checked = currentSettings.sessions?.sprint ?? true;
  document.getElementById('cb-fp').checked = currentSettings.sessions?.fp ?? true;

  const vol = Math.round((currentSettings.volume ?? 0.85) * 100);
  document.getElementById('volume-slider').value = vol;
  document.getElementById('volume-val').textContent = `${vol}%`;

  const saveAndSync = async () => {
    currentSettings = {
      masterEnabled: masterSwitch.checked,
      leadMinutes: parseInt(document.getElementById('lead-time-select').value, 10),
      soundEnabled: true,
      volume: parseInt(document.getElementById('volume-slider').value, 10) / 100,
      sessions: {
        race: document.getElementById('cb-race').checked,
        quali: document.getElementById('cb-quali').checked,
        sq: document.getElementById('cb-sq').checked,
        sprint: document.getElementById('cb-sprint').checked,
        fp: document.getElementById('cb-fp').checked
      }
    };
    updateMasterStatusUI(currentSettings.masterEnabled);
    if (api?.storage?.local) await api.storage.local.set({ f1_settings: currentSettings });
    if (api?.runtime?.sendMessage) api.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: currentSettings }).catch(() => {});

    // Refresh current view to update bell icon states
    if (allRaces.length > 0) renderRoundIndex(displayedRaceIndex);
  };

  masterSwitch.addEventListener('change', saveAndSync);
  document.getElementById('lead-time-select').addEventListener('change', saveAndSync);
  document.getElementById('cb-race').addEventListener('change', saveAndSync);
  document.getElementById('cb-quali').addEventListener('change', saveAndSync);
  document.getElementById('cb-sq').addEventListener('change', saveAndSync);
  document.getElementById('cb-sprint').addEventListener('change', saveAndSync);
  document.getElementById('cb-fp').addEventListener('change', saveAndSync);

  const volSlider = document.getElementById('volume-slider');
  volSlider.addEventListener('input', () => {
    document.getElementById('volume-val').textContent = `${volSlider.value}%`;
  });
  volSlider.addEventListener('change', saveAndSync);
}

function updateMasterStatusUI(enabled) {
  const masterSwitch = document.getElementById('master-switch');
  if (masterSwitch) masterSwitch.checked = enabled;
}

// ============================================================
// SCHEDULE & COUNTDOWN ENGINE
// ============================================================
function parseTs(d, t) {
  try { return new Date(`${d}T${t || '00:00:00Z'}`).getTime(); }
  catch { return null; }
}

function extractRaceSessions(r) {
  const sessions = [];
  const add = (name, code, type, obj) => {
    if (obj?.date) {
      const t = parseTs(obj.date, obj.time);
      if (t) sessions.push({ name, code, type, t, round: r.round, raceName: r.raceName, circuit: r.Circuit?.circuitName });
    }
  };
  add('Practice 1', 'FP1', 'fp', r.FirstPractice);
  add('Practice 2', 'FP2', 'fp', r.SecondPractice);
  add('Practice 3', 'FP3', 'fp', r.ThirdPractice);
  add('Sprint Qualifying', 'SQ', 'sq', r.SprintQualifying);
  add('Sprint Race', 'Sprint', 'sprint', r.Sprint);
  add('Qualifying', 'Quali', 'quali', r.Qualifying);
  add('Grand Prix', 'Race', 'race', { date: r.date, time: r.time });
  return sessions.sort((a, b) => a.t - b.t);
}

async function fetchFreshRaces() {
  try {
    const res = await fetch(`https://f1.trionine.com/api/current.json?_t=${Date.now()}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const races = data?.MRData?.RaceTable?.Races || [];
    if (races.length > 0) {
      if (api?.storage?.local) await api.storage.local.set({ f1_races: races, f1_last_fetch: Date.now() });
      if (api?.runtime?.sendMessage) api.runtime.sendMessage({ action: 'FORCE_SYNC' }).catch(() => {});
      return races;
    }
  } catch (err) {
    console.warn('[F1 Dash] Fresh fetch failed:', err);
  }
  return null;
}

async function loadAndRenderSchedule() {
  const stored = (api?.storage?.local) ? await api.storage.local.get(['f1_races', 'f1_last_fetch']) : {};
  allRaces = stored.f1_races || [];
  const lastFetch = stored.f1_last_fetch || 0;
  const isStale = (Date.now() - lastFetch) > CACHE_TTL_MS;

  if (allRaces.length > 0) {
    calculateInitialIndex();
    renderRoundIndex(displayedRaceIndex);
  }

  if (allRaces.length === 0 || isStale) {
    const freshRaces = await fetchFreshRaces();
    if (freshRaces && freshRaces.length > 0) {
      allRaces = freshRaces;
      calculateInitialIndex();
      renderRoundIndex(displayedRaceIndex);
    } else if (allRaces.length === 0) {
      document.getElementById('hero-race-name').textContent = 'Season Schedule Unavailable';
    }
  }
}

function calculateInitialIndex() {
  const now = Date.now();
  let nextIdx = allRaces.findIndex(r => {
    const raceTime = parseTs(r.date, r.time);
    return raceTime && (raceTime + (120 * 60 * 1000) > now);
  });

  if (nextIdx === -1) nextIdx = allRaces.length - 1;
  actualNextRaceIndex = nextIdx;
  displayedRaceIndex = nextIdx;
}

function renderRoundIndex(idx) {
  if (!allRaces || allRaces.length === 0) return;
  idx = Math.max(0, Math.min(allRaces.length - 1, idx));
  displayedRaceIndex = idx;

  const race = allRaces[idx];
  const now = Date.now();
  const sessions = extractRaceSessions(race);

  // Carousel navigation labels
  const roundIndicator = document.getElementById('round-indicator');
  const badgeStatus = document.getElementById('badge-current-status');
  const btnReturn = document.getElementById('btn-return-next');

  roundIndicator.textContent = `ROUND ${race.round} OF ${allRaces.length}`;

  const isActualNext = (idx === actualNextRaceIndex);
  const raceTime = parseTs(race.date, race.time);
  const isPast = raceTime && (raceTime + (120 * 60 * 1000) < now);

  if (isActualNext) {
    badgeStatus.textContent = 'NEXT RACE';
    badgeStatus.className = 'next-pill-badge';
    btnReturn.style.display = 'none';
  } else if (isPast) {
    badgeStatus.textContent = 'FINISHED';
    badgeStatus.className = 'next-pill-badge past';
    btnReturn.style.display = 'inline-flex';
  } else {
    badgeStatus.textContent = 'UPCOMING';
    badgeStatus.className = 'next-pill-badge';
    btnReturn.style.display = 'inline-flex';
  }

  // Find target session for this weekend
  let targetSess = sessions.find(s => {
    const dur = SESSION_DURATIONS[s.type] || (60 * 60 * 1000);
    return s.t + dur > now;
  });

  if (!targetSess) {
    targetSess = sessions[sessions.length - 1]; // Main race if past
  }

  currentTargetSession = targetSess;

  // Render Hero
  const cleanRaceName = `${race.raceName.replace(/grand prix/gi, '').trim()} Grand Prix`;
  document.getElementById('hero-flag').textContent = getFlag(cleanRaceName);
  document.getElementById('hero-race-name').textContent = cleanRaceName;
  document.getElementById('hero-circuit').textContent = `Round ${race.round} • ${race.Circuit?.circuitName || ''}`;

  const dateStr = new Date(targetSess.t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = new Date(targetSess.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('hero-time-info').textContent = `${targetSess.name}: ${dateStr} at ${timeStr} (Local)`;

  startCountdown(targetSess);
  renderSessionList(sessions, targetSess);
}

function renderSessionList(sessions, activeTarget) {
  const container = document.getElementById('session-list');
  if (!sessions || sessions.length === 0) {
    container.innerHTML = '<div class="loading-state">No sessions found.</div>';
    return;
  }

  const now = Date.now();
  const html = sessions.map(s => {
    const dur = SESSION_DURATIONS[s.type] || (60 * 60 * 1000);
    const isTarget = activeTarget && s.code === activeTarget.code && s.t === activeTarget.t;
    const isPast = s.t + dur < now;
    const isLive = now >= s.t && now < s.t + dur;

    const timeStr = new Date(s.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dayStr = new Date(s.t).toLocaleDateString([], { weekday: 'short' });

    let relText = '';
    if (isLive) {
      relText = '<span style="color: var(--f1red); font-weight:800;">● LIVE NOW</span>';
    } else if (isPast) {
      relText = 'Finished';
    } else {
      const diffMs = s.t - now;
      const hours = Math.floor(diffMs / 3600000);
      const days = Math.floor(hours / 24);
      relText = days > 0 ? `in ${days}d ${hours % 24}h` : `in ${hours}h`;
    }

    const isTypeAlertEnabled = currentSettings ? (currentSettings.sessions?.[s.type] ?? true) : true;

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
          <button class="sess-alert-btn ${isTypeAlertEnabled && !isPast ? '' : 'muted'}" 
                  data-type="${s.type}" 
                  title="${isTypeAlertEnabled ? 'Alarm Active (Click to toggle)' : 'Alarm Disabled (Click to enable)'}">
            ${BELL_SVG}
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;

  // Add click handler on SVG bell buttons
  container.querySelectorAll('.sess-alert-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const sessType = btn.getAttribute('data-type');
      if (!sessType || !currentSettings) return;

      const checkboxId = `cb-${sessType}`;
      const cb = document.getElementById(checkboxId);
      if (cb) {
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
      }
    });
  });
}

function startCountdown(targetSession) {
  if (countdownInterval) clearInterval(countdownInterval);

  const dur = SESSION_DURATIONS[targetSession.type] || (60 * 60 * 1000);

  const update = () => {
    const now = Date.now();
    const diff = targetSession.t - now;

    if (diff <= 0 && now < targetSession.t + dur) {
      document.getElementById('cd-days').textContent = '00';
      document.getElementById('cd-hours').textContent = '00';
      document.getElementById('cd-mins').textContent = '00';
      document.getElementById('cd-secs').textContent = '00';
      const timeInfo = document.getElementById('hero-time-info');
      if (timeInfo) {
        timeInfo.innerHTML = `<span style="color: var(--f1red); font-weight:800;">● ${targetSession.name} IS LIVE NOW</span>`;
      }
      return;
    }

    if (diff <= 0 && now >= targetSession.t + dur) {
      clearInterval(countdownInterval);
      loadAndRenderSchedule();
      return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('cd-days').textContent = String(d).padStart(2, '0');
    document.getElementById('cd-hours').textContent = String(h).padStart(2, '0');
    document.getElementById('cd-mins').textContent = String(m).padStart(2, '0');
    document.getElementById('cd-secs').textContent = String(s).padStart(2, '0');
  };

  update();
  countdownInterval = setInterval(update, 1000);
}

// ============================================================
// UI EVENT LISTENERS
// ============================================================
function setupUIEventListeners() {
  // Navigation between Views (Dashboard <-> Settings)
  const viewMain = document.getElementById('view-main');
  const viewSettings = document.getElementById('view-settings');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');

  btnOpenSettings.addEventListener('click', () => {
    viewMain.classList.remove('active');
    viewSettings.classList.add('active');
  });

  btnCloseSettings.addEventListener('click', () => {
    viewSettings.classList.remove('active');
    viewMain.classList.add('active');
  });

  // Carousel Round Navigation (Previous & Next Round)
  document.getElementById('btn-prev-round').addEventListener('click', () => {
    if (displayedRaceIndex > 0) {
      renderRoundIndex(displayedRaceIndex - 1);
    }
  });

  document.getElementById('btn-next-round').addEventListener('click', () => {
    if (displayedRaceIndex < allRaces.length - 1) {
      renderRoundIndex(displayedRaceIndex + 1);
    }
  });

  document.getElementById('btn-return-next').addEventListener('click', () => {
    renderRoundIndex(actualNextRaceIndex);
  });

  // Alarm Testing
  const btnTest = document.getElementById('btn-test-alarm');
  const btnStop = document.getElementById('btn-stop-alarm');

  btnTest.addEventListener('click', () => {
    const vol = parseInt(document.getElementById('volume-slider').value, 10) / 100;
    btnTest.innerHTML = `${SPEAKER_SVG}<span>Playing Theme...</span>`;
    btnStop.style.display = 'inline-flex';

    api.runtime.sendMessage({ action: 'TEST_ALARM', volume: vol });

    if (testTimeout) clearTimeout(testTimeout);
    testTimeout = setTimeout(() => {
      resetTestBtn();
    }, 31000);
  });

  btnStop.addEventListener('click', () => {
    api.runtime.sendMessage({ action: 'STOP_ALARM' });
    resetTestBtn();
  });
}

function resetTestBtn() {
  const btnTest = document.getElementById('btn-test-alarm');
  const btnStop = document.getElementById('btn-stop-alarm');
  if (btnTest) {
    btnTest.innerHTML = `${SPEAKER_SVG}<span>Test Official Theme</span>`;
  }
  if (btnStop) btnStop.style.display = 'none';
  if (testTimeout) clearTimeout(testTimeout);
}

function setupAudioStatusListener() {
  if (api?.runtime?.onMessage) api.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'AUDIO_ENDED') {
      resetTestBtn();
    }
  });
}
