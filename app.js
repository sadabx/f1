// ============================================================
// FLAGS & TEAM COLORS
// ============================================================
const FLAGS = {
  "Bahrain Grand Prix": "🇧🇭", 
  "Saudi Arabian Grand Prix": "🇸🇦", 
  "Australian Grand Prix": "🇦🇺",
  "Japanese Grand Prix": "🇯🇵", 
  "Chinese Grand Prix": "🇨🇳", 
  "Miami Grand Prix": "🇺🇸",
  "Emilia Romagna Grand Prix": "🇮🇹", 
  "Monaco Grand Prix": "🇲🇨", 
  "Canadian Grand Prix": "🇨🇦",
  "Spanish Grand Prix": "🇪🇸", 
  "Austrian Grand Prix": "🇦🇹", 
  "British Grand Prix": "🇬🇧",
  "Hungarian Grand Prix": "🇭🇺", 
  "Belgian Grand Prix": "🇧🇪", 
  "Dutch Grand Prix": "🇳🇱",
  "Italian Grand Prix": "🇮🇹", 
  "Azerbaijan Grand Prix": "🇦🇿", 
  "Singapore Grand Prix": "🇸🇬",
  "United States Grand Prix": "🇺🇸", 
  "Mexico City Grand Prix": "🇲🇽", 
  "São Paulo Grand Prix": "🇧🇷",
  "Brazilian Grand Prix": "🇧🇷",
  "Las Vegas Grand Prix": "🇺🇸", 
  "Qatar Grand Prix": "🇶🇦", 
  "Abu Dhabi Grand Prix": "🇦🇪",
  "Barcelona Grand Prix": "🇪🇸",
};

const TEAM_COLORS = {
  red_bull: "#3671c6", 
  "Red Bull": "#3671c6", 
  Ferrari: "#e8002d", 
  Mercedes: "#27f4d2",
  McLaren: "#ff8000", 
  "Aston Martin": "#358c75", 
  Alpine: "#ff87bc", 
  Williams: "#64c4ff",
  "Haas F1 Team": "#b6babd", 
  rb: "#6692ff", 
  "Racing Bulls": "#6692ff", 
  "Kick Sauber": "#52e252",
  cadillac: "#9aa0a6", 
  "Cadillac F1 Team": "#9aa0a6", 
  audi: "#b9b9b9", 
  Audi: "#b9b9b9",
};

// Session name mapping: OpenF1 → internal short names
const SESSION_MAP = {
  "Practice 1": "FP1",
  "Practice 2": "FP2",
  "Practice 3": "FP3",
  "Qualifying": "Qualifying",
  "Sprint Qualifying": "Sprint Quali",
  "Sprint": "Sprint",
  "Race": "Race"
};

// ============================================================
// GLOBAL STATE
// ============================================================
let showPast = false,
  showRel = localStorage.getItem('showRel') === 'true', 
  races = [],
  completed = [],
  standings = [],
  latestQuali = null,
  collapsed = {},
  mobileSections = { upcoming: true, past: false },
  cdInt,
  isFirstLoad = true,
  wasMobile = window.innerWidth <= 800,
  currentSeasonYear = new Date().getFullYear();

document.getElementById("btn-rel").classList.toggle("on", showRel);

// ============================================================
// GLOBAL FUNCTIONS (called from HTML onclick)
// ============================================================
window.toggleRel = toggleRel;
window.togglePast = togglePast;
window.switchTab = switchTab;
window.toggleCard = toggleCard;
window.toggleSection = toggleSection;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function shortNamePlain(driver) {
  const first = driver.givenName.split(' ').pop();
  return `${first} ${driver.familyName}`;
}

function ts(d, t) {
  try { return new Date(`${d}T${t || "00:00:00Z"}`).getTime(); } 
  catch { return Infinity; }
}

function fmt(unix) {
  const absStr = new Date(unix).toLocaleString([], {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  
  const absHtml = `<span class="abs-time">${absStr}</span>`;

  if (showRel) {
    const diff = unix - Date.now(), a = Math.abs(diff), p = diff < 0;
    const m = Math.floor(a / 6e4), h = Math.floor(m / 60), d = Math.floor(h / 24), mo = Math.floor(d / 30);
    const s = mo > 0 ? mo + "mo" : d > 0 ? d + "d" : h > 0 ? h + "h" : m > 0 ? m + "m" : "now";
    const relStr = p ? s + " ago" : "in " + s;
    
    return `${absHtml}<span class="rel-time">${relStr}</span>`;
  }
  
  return absHtml;
}

// ============================================================
// API: OpenF1 - Session Data
// ============================================================
async function fetchOpenF1Sessions(year) {
  try {
    const res = await fetch(`https://api.openf1.org/v1/sessions?year=${year}`);
    if (!res.ok) throw new Error(`OpenF1 HTTP ${res.status}`);
    const sessions = await res.json();
    return sessions;
  } catch (e) {
    console.warn("⚠️ OpenF1 fetch failed, falling back to Jolpica:", e);
    return null;
  }
}

// ============================================================
// API: Jolpica - Race Schedule
// ============================================================
async function fetchJolpicaSchedule() {
  try {
    const res = await fetch("https://api.jolpi.ca/ergast/f1/current.json");
    if (!res.ok) throw new Error(`Jolpica HTTP ${res.status}`);
    const data = await res.json();
    return data.MRData.RaceTable.Races || [];
  } catch (e) {
    console.error("❌ Jolpica schedule fetch failed:", e);
    return [];
  }
}

// ============================================================
// API: Jolpica - Results, Standings, Qualifying
// ============================================================
async function fetchJolpicaData() {
  try {
    const [r, d, q] = await Promise.all([
      fetch("https://api.jolpi.ca/ergast/f1/current/results.json?limit=1000"),
      fetch("https://api.jolpi.ca/ergast/f1/current/driverStandings.json"),
      fetch("https://api.jolpi.ca/ergast/f1/current/qualifying.json?limit=1000")
    ]);
    
    const [rd, dd, qd] = await Promise.all([
      r.json(), d.json(), q.json()
    ]);
    
    return {
      completed: rd.MRData?.RaceTable?.Races || [],
      standings: dd.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [],
      qualis: qd.MRData?.RaceTable?.Races || []
    };
  } catch (e) {
    console.error("❌ Jolpica data fetch failed:", e);
    return { completed: [], standings: [], qualis: [] };
  }
}

// ============================================================
// BUILD RACE CALENDAR FROM OPENF1 SESSIONS
// ============================================================
function buildCalendarFromSessions(sessions) {
  const meetings = {};
  
  sessions.forEach(session => {
    const key = session.meeting_key;
    const countryName = session.country_name || '';
    const circuitName = session.circuit_short_name || '';
    
    if (!meetings[key]) {
      meetings[key] = {
        meetingName: session.meeting_name,
        countryName: countryName,
        circuitName: circuitName,
        round: null, // We'll get this from Jolpica later
        sessions: {}
      };
    }
    
    const sessionName = session.session_name;
    const mappedName = SESSION_MAP[sessionName];
    
    if (mappedName) {
      // Append 'Z' to ensure the time is parsed as UTC, since OpenF1 provides UTC times
      meetings[key].sessions[mappedName] = {
        date: session.date_start.substring(0, 10),
        time: session.date_start.substring(11, 19) + "Z"
      };
    }
  });
  
  // Return meetings sorted chronologically by the earliest session
  return Object.values(meetings).sort((a, b) => {
    const aDate = a.sessions["Race"]?.date || Object.values(a.sessions)[0]?.date || "9999";
    const bDate = b.sessions["Race"]?.date || Object.values(b.sessions)[0]?.date || "9999";
    return aDate.localeCompare(bDate);
  });
}

// ============================================================
// MERGE OPENF1 + JOLPICA DATA
// ============================================================
function mergeCalendars(openF1Meetings, jolpicaRaces) {
  if (jolpicaRaces.length === 0) {
    // If Jolpica failed, construct basic races from OpenF1
    return openF1Meetings.map((meeting, idx) => ({
      raceName: meeting.meetingName || (meeting.countryName + " Grand Prix"),
      round: String(idx + 1),
      Circuit: { circuitName: meeting.circuitName },
      ...meeting.sessions
    }));
  }
  
  if (openF1Meetings.length === 0) {
    return jolpicaRaces;
  }
  
  // Jolpica is the source of truth for raceName and round
  // Map OpenF1 sessions to Jolpica races by closest race date
  return jolpicaRaces.map(jolpicaRace => {
    const jTime = new Date(`${jolpicaRace.date}T${jolpicaRace.time || "00:00:00Z"}`).getTime();
    
    let closestMeeting = null;
    let minDiff = Infinity;
    
    openF1Meetings.forEach(meeting => {
      const raceSession = meeting.sessions["Race"];
      if (raceSession) {
        const oTime = new Date(`${raceSession.date}T${raceSession.time}`).getTime();
        const diff = Math.abs(jTime - oTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestMeeting = meeting;
        }
      }
    });
    
    let merged = { ...jolpicaRace };

    // If the closest OpenF1 meeting is within a reasonable threshold (e.g. 5 days), merge its sessions
    if (closestMeeting && minDiff < 5 * 24 * 60 * 60 * 1000) {
      merged = {
        ...merged,
        ...closestMeeting.sessions
      };
      // Override root date and time with OpenF1's Race time so the countdown UI uses it
      if (closestMeeting.sessions["Race"]) {
        merged.date = closestMeeting.sessions["Race"].date;
        merged.time = closestMeeting.sessions["Race"].time;
      }
    }
    
    return merged;
  });
}

// ============================================================
// TOGGLE FUNCTIONS
// ============================================================
function togglePast() {
  showPast = !showPast;
  document.getElementById("btn-past").classList.toggle("on", showPast);
  render();
}

function toggleRel() {
  showRel = !showRel;
  localStorage.setItem('showRel', showRel);
  document.getElementById("btn-rel").classList.toggle("on", showRel);
  render();
}

function switchTab(t) {
  ["grd", "std", "res"].forEach((x) => {
    const tab = document.getElementById("t-" + x);
    const content = document.getElementById("tc-" + x);
    if (tab && content) {
      tab.classList.toggle("on", x === t);
      content.classList.toggle("on", x === t);
    }
  });
}

function toggleCard(id) {
  collapsed[id] = !collapsed[id];
  const sessionEl = document.getElementById("sess-" + id);
  const chevEl = document.getElementById("chev-" + id);
  if (sessionEl) sessionEl.classList.toggle("open", !collapsed[id]);
  if (chevEl) chevEl.classList.toggle("open", !collapsed[id]);
}

function toggleSection(id) {
  mobileSections[id] = !mobileSections[id];
  const content = document.getElementById(id + "-content");
  const chev = document.getElementById("chev-" + id);
  if (content) content.classList.toggle("open");
  if (chev) chev.classList.toggle("open");
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================
function render() {
  const now = Date.now();
  const isMobile = window.innerWidth <= 800;
  
  // Hide standard "Show past races" pill on mobile view
  const btnPast = document.getElementById("btn-past");
  if (btnPast) btnPast.style.display = isMobile ? "none" : "block";
  
  const titleEl = document.getElementById("title-container");
  if (titleEl) titleEl.style.display = isMobile ? "none" : "block";

  const upcoming = races.filter((r) => ts(r.date, r.time) > now);
  const next = upcoming.length
    ? upcoming.reduce((a, b) => ts(a.date, a.time) < ts(b.date, b.time) ? a : b)
    : null;
    
  if (next) {
    document.getElementById("countdown").classList.add("show");
    document.getElementById("cd-name").textContent = (FLAGS[next.raceName] || "🏁") + " " + next.raceName;
    document.getElementById("s-next").textContent = next.raceName.replace(" Grand Prix", " GP");
    document.getElementById("s-next-r").textContent = "Round " + next.round;
    clearInterval(cdInt);
    cdInt = setInterval(() => {
      const d = ts(next.date, next.time) - Date.now();
      if (d < 0) {
        document.getElementById("cd-timer").textContent = "Race day!";
        clearInterval(cdInt);
        return;
      }
      const dy = Math.floor(d / 864e5), 
            h = Math.floor((d % 864e5) / 36e5), 
            m = Math.floor((d % 36e5) / 6e4), 
            s = Math.floor((d % 6e4) / 1e3);
      document.getElementById("cd-timer").textContent = 
        `${dy}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
    }, 1000);
  }

  const gridTabBtn = document.getElementById('t-grd');
  const gridTabContent = document.getElementById('tc-grd');

  if (next && latestQuali && next.round === latestQuali.round) {
    gridTabBtn.style.display = 'block';

    let gh = ``; 
    let poleTimeSec = null;

    latestQuali.QualifyingResults.forEach((res, index) => {
        const team = res.Constructor.name;
        const col = TEAM_COLORS[res.Constructor.constructorId] || TEAM_COLORS[team] || '#888';
        
        const timeStr = res.Q3 || res.Q2 || res.Q1;
        let displayTime = "No Time";

        if (timeStr) {
            const parts = timeStr.split(':');
            let currentSec = Infinity;
            if (parts.length === 2) currentSec = (parseInt(parts[0]) * 60) + parseFloat(parts[1]);
            else currentSec = parseFloat(timeStr);

            if (index === 0) {
                poleTimeSec = currentSec;
                displayTime = timeStr;
            } else if (poleTimeSec !== null && currentSec !== Infinity) {
                const delta = currentSec - poleTimeSec;
                displayTime = "+" + delta.toFixed(3);
            } else displayTime = timeStr;
        }

        gh += `<div class="grid-row">
            <span class="g-pos">${res.position}</span>
            <div class="g-bar" style="background: ${col}"></div>
            <div class="g-info">
                <div>
                    <div class="s-name">${shortNamePlain(res.Driver)}</div>
                    <div class="s-team" style="font-size: 11px;">${team}</div>
                </div>
                <div class="g-time">${displayTime}</div>
            </div>
        </div>`;
    });
    gridTabContent.innerHTML = gh;
    
    if (isFirstLoad) switchTab('grd');
  } else {
    gridTabBtn.style.display = 'none';
    if (isFirstLoad || gridTabBtn.classList.contains('on')) switchTab('std');
  }
  isFirstLoad = false;

  document.getElementById("s-done").textContent = races.filter((r) => ts(r.date, r.time) < now).length;
  document.getElementById("s-left").textContent = races.filter((r) => ts(r.date, r.time) > now).length;
  
  let htmlNext = "", htmlUpcoming = "", htmlPast = "";
  
  races.forEach((r) => {
    const past = ts(r.date, r.time) < now;
    const isNext = next && r.raceName === next.raceName;
    const id = r.round;
    
    if (collapsed[id] === undefined) collapsed[id] = !isNext;
    
    const bdg = past 
      ? '<span class="badge b-done">Finished</span>' 
      : isNext 
        ? '<span class="badge b-next">Next race</span>' 
        : '<span class="badge b-soon">Upcoming</span>';
    
    const sess = [];
    if (r.FirstPractice) sess.push({ n: "FP1", t: ts(r.FirstPractice.date, r.FirstPractice.time) });
    if (r.SprintQualifying) sess.push({ n: "Sprint Quali", t: ts(r.SprintQualifying.date, r.SprintQualifying.time) });
    else if (r.SecondPractice) sess.push({ n: "FP2", t: ts(r.SecondPractice.date, r.SecondPractice.time) });
    if (r.Sprint) sess.push({ n: "Sprint", t: ts(r.Sprint.date, r.Sprint.time) });
    else if (r.ThirdPractice) sess.push({ n: "FP3", t: ts(r.ThirdPractice.date, r.ThirdPractice.time) });
    if (r.Qualifying) sess.push({ n: "Qualifying", t: ts(r.Qualifying.date, r.Qualifying.time) });
    sess.push({ n: "Race", t: ts(r.date, r.time) });
    
    const sHtml = sess.map((s) => 
      `<div class="srow ${s.t < now ? "past" : ""}">
        <span class="sname">${s.n}</span>
        <span class="stime">${fmt(s.t)}</span>
      </div>`
    ).join("");
    
    const cardHTML = `<div class="card ${isNext ? "next" : ""}">
      <div class="card-head" onclick="toggleCard('${id}')">
        <div class="card-title">
          <span class="race-flag">${FLAGS[r.raceName] || "🏁"}</span>
          <div>
            <div class="race-name">${r.raceName}</div>
            <div class="race-sub">Round ${r.round} · ${r.Circuit?.circuitName || ""}</div>
          </div>
        </div>
        <div class="card-right">
          ${bdg}
          <span class="chev ${collapsed[id] ? "" : "open"}" id="chev-${id}">▼</span>
        </div>
      </div>
      <div class="sessions ${collapsed[id] ? "" : "open"}" id="sess-${id}">${sHtml}</div>
    </div>`;

    if (isNext) htmlNext += cardHTML;
    else if (past) htmlPast += cardHTML;
    else htmlUpcoming += cardHTML;
  });

  // Render into correct containers
  const nextRaceContainer = document.getElementById("next-race-content");
  const upcomingContainer = document.getElementById("upcoming-content");
  const pastContainer = document.getElementById("past-content");

  if (nextRaceContainer) {
    nextRaceContainer.innerHTML = htmlNext || '<div class="empty">No upcoming race found.</div>';
  }

  if (upcomingContainer) {
    upcomingContainer.innerHTML = htmlUpcoming || '<div class="empty">None</div>';
  }

  if (pastContainer) {
    pastContainer.innerHTML = htmlPast || '<div class="empty">No past races.</div>';
  }

  if (isMobile) {
    if (upcomingContainer) upcomingContainer.classList.toggle("open", mobileSections.upcoming);
    if (pastContainer) pastContainer.classList.toggle("open", mobileSections.past);
    const chevUp = document.getElementById("chev-upcoming");
    const chevPast = document.getElementById("chev-past");
    if (chevUp) chevUp.classList.toggle("open", mobileSections.upcoming);
    if (chevPast) chevPast.classList.toggle("open", mobileSections.past);
  } else {
    const pastWrapper = document.getElementById("past-container");
    if (pastWrapper) {
      pastWrapper.classList.toggle("show-past-desktop", showPast);
    }
  }
}

function renderResults() {
  const rev = [...completed].reverse();
  let h = "";
  rev.forEach((r) => {
    if (!r.Results || r.Results.length < 3) return;
    const [a, b, c] = r.Results;
    const n = (d) => d.Driver.code || d.Driver.familyName;
    h += `<div class="res-item">
      <div class="res-race">${FLAGS[r.raceName] || "🏁"} ${r.raceName}</div>
      <div class="podium">
        <span class="pod pod1">🥇 ${n(a)}</span>
        <span class="pod pod2">🥈 ${n(b)}</span>
        <span class="pod pod3">🥉 ${n(c)}</span>
      </div>
    </div>`;
  });
  document.getElementById("tc-res").innerHTML = h || '<div class="empty">No results yet.</div>';
}

function renderStandings() {
  if (!standings.length) {
    document.getElementById("tc-std").innerHTML = '<div class="empty">No standings yet.</div>';
    return;
  }
  const top = standings.slice(0, 10);
  const max = parseFloat(top[0].points) || 1;
  document.getElementById("s-leader").textContent = top[0].Driver.code || top[0].Driver.familyName;
  document.getElementById("s-leader-pts").textContent = top[0].points + " pts";
  let h = "";
  top.forEach((d) => {
    const pct = ((parseFloat(d.points) / max) * 100).toFixed(0);
    const constructor = d.Constructors?.[0] || {};
    const team = constructor.name || "";
    const col = TEAM_COLORS[constructor.constructorId] || TEAM_COLORS[team] || "#e10600";
    h += `<div class="stand-row">
      <span class="s-pos">${d.position}</span>
      <div class="s-info">
        <div class="s-top">
          <span class="s-name">${d.Driver.code || d.Driver.familyName}</span>
          <span class="s-pts">${d.points}</span>
        </div>
        <div class="s-bar">
          <div class="s-fill" style="width:${pct}%;background:${col}"></div>
        </div>
        <div class="s-team">${team}</div>
      </div>
    </div>`;
  });
  document.getElementById("tc-std").innerHTML = h;
}

// ============================================================
// MAIN FETCH FUNCTION
// ============================================================
async function fetchAll() {
  try {
    // Fetch both APIs in parallel
    const [openF1Sessions, jolpicaSchedule, jolpicaData] = await Promise.all([
      fetchOpenF1Sessions(currentSeasonYear),
      fetchJolpicaSchedule(),
      fetchJolpicaData()
    ]);
    
    // Update global data from Jolpica
    completed = jolpicaData.completed;
    standings = jolpicaData.standings;
    const qualis = jolpicaData.qualis;
    latestQuali = qualis.length > 0 ? qualis[qualis.length - 1] : null;
    
    // Build race calendar
    if (openF1Sessions && openF1Sessions.length > 0) {
      const meetings = buildCalendarFromSessions(openF1Sessions);
      races = mergeCalendars(meetings, jolpicaSchedule);
      
      // Update season year from data
      if (jolpicaSchedule.length > 0) {
        const jolpicaYear = jolpicaSchedule[0].season;
        if (jolpicaYear) currentSeasonYear = jolpicaYear;
      }
    } else {
      // Fallback to Jolpica only
      races = jolpicaSchedule;
      console.log("⚠️ Using Jolpica as fallback for race schedule");
    }
    
    // Sort races by date
    races.sort((a, b) => {
      const timeA = ts(a.date, a.time);
      const timeB = ts(b.date, b.time);
      return timeA - timeB;
    });
    
    // Update UI
    document.title = `F1 ${currentSeasonYear} Dashboard`;
    document.getElementById("year-display").textContent = currentSeasonYear;
    
    render();
    renderResults();
    renderStandings();
    
    console.log(`✅ Data loaded - ${races.length} races from ${openF1Sessions && openF1Sessions.length > 0 ? 'OpenF1 + Jolpica' : 'Jolpica fallback'}`);
  } catch (e) {
    console.error("❌ fetchAll failed:", e);
    document.getElementById("next-race-content").innerHTML = '<div class="err">Failed to load data. Check your connection and try refreshing.</div>';
  }
}

// ============================================================
// EVENT LISTENERS & INIT
// ============================================================
window.addEventListener('resize', () => {
  const isNowMobile = window.innerWidth <= 800;
  if (isNowMobile !== wasMobile) {
    wasMobile = isNowMobile;
    render();
  }
});

// Initial fetch
fetchAll();

// Periodic refresh
setInterval(fetchAll, 600000);  // Refresh data every 10 minutes
setInterval(render, 60000);     // Re-render UI every minute