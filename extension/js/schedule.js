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
