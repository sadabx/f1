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

let lastFinalFetchAttempt = 0;
const FINAL_FETCH_COOLDOWN_MS = 60 * 1000;

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

function getMostRecentCompletedSession() {
  if (!Array.isArray(allRaces) || allRaces.length === 0) return { race: null, session: null };
  const now = Date.now();
  let latest = null;

  for (const race of allRaces) {
    if (!race || race.tbc) continue;
    for (const session of extractRaceSessions(race)) {
      const duration = SESSION_DURATIONS[session.type] || (60 * 60 * 1000);
      if (session.t + duration <= now && (!latest || session.t > latest.session.t)) {
        latest = { race, session };
      }
    }
  }

  return latest || { race: null, session: null };
}

function formatOpenF1Time(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds >= 3600) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = (seconds % 60).toFixed(3).padStart(6, "0");
    return `${hrs}:${String(mins).padStart(2, "0")}:${secs}`;
  }
  const mins = Math.floor(seconds / 60);
  return `${mins}:${(seconds % 60).toFixed(3).padStart(6, "0")}`;
}

function mapOpenF1SessionType(openF1Session) {
  const raw = String(openF1Session?.session_type || openF1Session?.session_name || "").toLowerCase();
  if (raw.includes("sprint quali") || raw.includes("shootout") || raw === "sq") return "sq";
  if (raw.includes("sprint")) return "sprint";
  if (raw.includes("quali")) return "quali";
  if (raw.includes("practice") || raw.includes("fp")) return "fp";
  if (raw.includes("race")) return "race";
  return "";
}

async function loadLatestFinishedSession(tower, statusPill, statusLabel) {
  const { race, session } = getMostRecentCompletedSession();
  if (!race || !session) return false;

  const finalSessionId = `${race.round}_${session.code}_${session.t}`;

  const applyFinalHeader = (circuitName = "") => {
    updateLiveTowerTitle(session, race, circuitName);
    if (statusPill && statusLabel) {
      statusPill.className = "nitrous-status-pill status-dim";
      statusLabel.textContent = "FINAL";
    }
    updateLiveBeaconState(false);
    updateSessionProgressBadge(null, null, null, null, false);
  };

  // Reuse cached telemetry (live or final) if it already matches this completed session.
  if (cachedLiveTelemetry?.sessionProgress?.sessionId === finalSessionId && cachedLiveTelemetry.sortedDrivers?.length > 0) {
    if (!cachedLiveTelemetry.sessionProgress.isFinal || cachedLiveTelemetry.sessionProgress.isLive) {
      cachedLiveTelemetry.sessionProgress.isLive = false;
      cachedLiveTelemetry.sessionProgress.isFinal = true;
      try { localStorage.setItem("f1_cached_telemetry", JSON.stringify(cachedLiveTelemetry)); } catch (_) {}
    }
    applyFinalHeader(cachedLiveTelemetry.circuitName || "");
    renderLiveTimingTower();
    return true;
  }

  if (Date.now() - lastFinalFetchAttempt < FINAL_FETCH_COOLDOWN_MS) return false;
  lastFinalFetchAttempt = Date.now();

  try {
    // Keep within OpenF1's 3 req/s free-tier limit (2 parallel calls here).
    const [sessRes, resRes] = await Promise.all([
      fetch("https://api.openf1.org/v1/sessions?session_key=latest").catch(() => null),
      fetch("https://api.openf1.org/v1/session_result?session_key=latest").catch(() => null)
    ]);

    const sessData = sessRes?.ok ? await sessRes.json().catch(() => []) : [];
    const openF1Session = Array.isArray(sessData) && sessData.length > 0 ? sessData[0] : null;
    const results = resRes?.ok ? await resRes.json().catch(() => []) : [];

    if (!openF1Session?.session_key || !Array.isArray(results) || results.length === 0) return false;

    const openF1Type = mapOpenF1SessionType(openF1Session);
    const openF1Start = openF1Session.date_start ? new Date(openF1Session.date_start).getTime() : NaN;
    const WEEKEND_WINDOW_MS = 4 * 24 * 60 * 60 * 1000;
    const sameWeekend = Number.isFinite(openF1Start) && Math.abs(openF1Start - session.t) <= WEEKEND_WINDOW_MS;
    if (!sameWeekend || openF1Type !== session.type) return false;

    // Brief pause before fetching stints so we never trip OpenF1's 3 req/s rate limit.
    await new Promise(resolve => setTimeout(resolve, 350));
    const stintRes = await fetch(`https://api.openf1.org/v1/stints?session_key=${encodeURIComponent(openF1Session.session_key)}`).catch(() => null);
    const stintData = stintRes?.ok ? await stintRes.json().catch(() => []) : [];

    const tyreMap = {};
    if (Array.isArray(stintData)) {
      const latestStints = {};
      for (const s of stintData) {
        const num = s?.driver_number;
        if (num == null) continue;
        if (!latestStints[num] || Number(s.stint_number || 0) > Number(latestStints[num].stint_number || 0)) {
          latestStints[num] = s;
        }
      }
      for (const [num, s] of Object.entries(latestStints)) {
        const lapStart = Number(s.lap_start || 1);
        const lapEnd = Number(s.lap_end || lapStart);
        const ageAtStart = Number(s.tyre_age_at_start || 0);
        tyreMap[num] = {
          compound: String(s.compound || "medium").toLowerCase(),
          laps: Math.max(1, (lapEnd - lapStart + 1) + ageAtStart)
        };
      }
    }

    const isTimed = session.type === "fp" || session.type === "sq" || session.type === "quali";
    const pickLastFinite = val => {
      if (Array.isArray(val)) {
        for (let i = val.length - 1; i >= 0; i--) {
          if (Number.isFinite(val[i]) && val[i] > 0) return val[i];
        }
        return null;
      }
      return Number.isFinite(val) && val > 0 ? val : null;
    };
    const pickGap = val => {
      if (Array.isArray(val)) {
        for (let i = val.length - 1; i >= 0; i--) {
          if (val[i] != null && val[i] !== "") return val[i];
        }
        return "";
      }
      return val != null ? val : "";
    };

    const latestLaps = {};
    let fastestLap = null;
    let fastestSec = Infinity;

    const sortedDrivers = results
      .filter(r => r && r.driver_number != null)
      .map(r => {
        const num = r.driver_number;
        const retired = Boolean(r.dnf || r.dns || r.dsq);
        const pos = Number.isFinite(r.position) ? Number(r.position) : null;
        const durSec = pickLastFinite(r.duration);
        const timeFormatted = durSec ? formatOpenF1Time(durSec) : "";
        const gapVal = pickGap(r.gap_to_leader);

        if (isTimed && durSec && !retired && durSec < fastestSec) {
          fastestSec = durSec;
          fastestLap = { driverNumber: num, formatted: timeFormatted };
        }
        if (durSec && !retired) {
          latestLaps[num] = { lap_duration: durSec, formatted: timeFormatted };
        }

        let finalTimeStr = timeFormatted;
        if (!isTimed && !retired && !finalTimeStr && Number.isFinite(r.number_of_laps)) {
          finalTimeStr = `${r.number_of_laps} LAPS`;
        }

        let finalGap = gapVal;
        if (retired && (finalGap === "" || finalGap == null)) {
          finalGap = r.dsq ? "DSQ" : r.dns ? "DNS" : (Number.isFinite(r.number_of_laps) ? `${r.number_of_laps}L` : "OUT");
        }

        return {
          driver_number: num,
          position: pos ?? 99,
          displayPos: retired ? null : pos,
          lapsCompleted: Number(r.number_of_laps || 0),
          gap_to_leader: finalGap,
          interval: null,
          bestLapStr: finalTimeStr,
          inPit: false,
          retired
        };
      })
      .sort((a, b) => {
        if (a.retired !== b.retired) return a.retired ? 1 : -1;
        if (a.position !== b.position) return a.position - b.position;
        return b.lapsCompleted - a.lapsCompleted;
      });

    if (sortedDrivers.length === 0) return false;

    const circuitName = openF1Session.circuit_short_name || "";
    cachedLiveTelemetry = {
      round: race.round,
      timestamp: Date.now(),
      sortedDrivers,
      driverMap: {},
      tyreMap,
      latestLaps,
      fastestLap,
      circuitName,
      sessionProgress: {
        sessionType: session.type,
        isLive: false,
        isFinal: true,
        isOpenF1Fallback: true,
        sessionId: finalSessionId
      }
    };
    try { localStorage.setItem("f1_cached_telemetry", JSON.stringify(cachedLiveTelemetry)); } catch (_) {}

    applyFinalHeader(circuitName);
    if (tower) renderLiveTimingTower();
    return true;
  } catch (_) {
    return false;
  }
}

function clearLiveTelemetryCache() {
  cachedLiveTelemetry = null;
  try { localStorage.removeItem("f1_cached_telemetry"); } catch (_) {}
}

function renderNoLiveSession(message = "No live session active currently. Telemetry starts automatically during race weekends.") {
  const tower = document.getElementById("timing-tower-list");
  const banner = document.getElementById("live-broadcast-banner");
  if (banner) banner.style.display = "none";
  updateLiveTowerTitle(null, null);
  updateSessionProgressBadge(null, null, null, null, false);
  if (tower) setSafeContent(tower, `<div class="loading-state">${message}</div>`);
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
      const liveCached = JSON.parse(localStorage.getItem("f1_cached_telemetry") || "null");
      if (liveCached?.sortedDrivers?.length > 0) cachedLiveTelemetry = liveCached;
    } catch (_) {}
  }
  if (cachedLiveTelemetry) renderLiveTimingTower();

  const { race, session } = getScheduledLiveContext();

  if (!race || !session) {
    activeLiveSessionId = null;
    stopLiveConnection();
    const renderedFinal = await loadLatestFinishedSession(tower, statusPill, statusLabel);
    if (!renderedFinal) {
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

  const hasActiveSignalR = liveWebSocket && liveWebSocket.readyState === WebSocket.OPEN && Object.keys(liveSignalRState.timingData?.Lines || {}).length > 0;
  if (hasActiveSignalR) return;

  if (statusPill && statusLabel) {
    statusPill.className = "nitrous-status-pill status-dim";
    statusLabel.textContent = "CONNECTING";
  }
  if (tower && !cachedLiveTelemetry) {
    setSafeContent(tower, '<div class="loading-state">Connecting to Formula 1 Live Timing…</div>');
  }

  await connectF1LiveTiming();
  if (Object.keys(liveSignalRState.timingData?.Lines || {}).length > 0) return;

  // OpenF1 fallback uses the latest session it knows about (v1.3.2 approach).
  const sessionKey = "latest";
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
    ? Math.max(15, Math.round(getTotalLapsForCircuit(race.raceName) / 3))
    : getTotalLapsForCircuit(race.raceName);
  const sessionProgress = {
    sessionType: session.type,
    currentLap,
    totalLaps,
    endTime: session.t + (SESSION_DURATIONS[session.type] || 60 * 60 * 1000),
    isLive: true,
    isOpenF1Fallback: true,
    sessionId
  };

  updateLiveTowerTitle(session, race);
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
    lapHeader.textContent = isTimed ? "BEST TIME" : (sessionProgress?.isFinal ? "TIME" : "LAP TIME");
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
  } else {
    if (banner) banner.style.display = "none";
    updateSessionProgressBadge(null, null, null, null, false);
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
        const g = item.gap_to_leader;
        gapStr = g.startsWith("+") || g === "LEADER" || g.endsWith("L") || /^(DNS|DSQ|DNF|OUT|—)$/i.test(g)
          ? g
          : `+${g}`;
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
  const isLive = Boolean(scheduledActiveSession || sessionInfo) && !isSessionFinished;

  if (isSessionFinished && statusPill && statusLabel) {
    statusPill.className = "nitrous-status-pill status-dim";
    statusLabel.textContent = "Final";
  }

  const fallbackSessionCode = scheduledActiveSession?.code || sessionInfo?.Name || sessionType;
  const fallbackSessionStart = scheduledActiveSession?.t || sessionInfo?.StartDate || "live";
  const displaySession = scheduledActiveSession || (sessionInfo
    ? { name: sessionInfo.Name || sessionInfo.Type || sessionType, type: sessionType }
    : null);

  const sessionProgress = {
    sessionType,
    currentLap,
    totalLaps,
    endTime: scheduledActiveSession ? (scheduledActiveSession.t + (SESSION_DURATIONS[scheduledActiveSession.type] || 3600000)) : null,
    isLive,
    isSignalR: true,
    sessionId: `${scheduledRace?.round || sessionInfo?.Meeting?.Number || "unknown"}_${fallbackSessionCode}_${fallbackSessionStart}`
  };

  updateLiveTowerTitle(
    displaySession,
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

function getTotalLapsForCircuit(name) {
  if (!name) return 55;
  const clean = name.toLowerCase();
  for (const [key, laps] of Object.entries(CIRCUIT_TOTAL_LAPS)) {
    if (clean.includes(key)) return laps;
  }
  return 55;
}
