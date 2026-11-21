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
  "Barcelona-Catalunya Grand Prix": "🇪🇸",
};

let countryFlags;

function normalizeLookupText(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCountryFlags() {
  if (countryFlags) return countryFlags;
  countryFlags = new Map();

  if (typeof Intl.DisplayNames !== "function") return countryFlags;

  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  for (let first = 65; first <= 90; first++) {
    for (let second = 65; second <= 90; second++) {
      const code = String.fromCharCode(first, second);
      const country = displayNames.of(code);
      if (!country || country === code || country === "Unknown Region") continue;

      const flag = [...code]
        .map(letter => String.fromCodePoint(letter.charCodeAt(0) + 127397))
        .join("");
      countryFlags.set(normalizeLookupText(country), flag);
    }
  }

  // Common race naming that differs from Intl's official region names.
  countryFlags.set("usa", "🇺🇸");
  countryFlags.set("us", "🇺🇸");
  countryFlags.set("uk", "🇬🇧");
  countryFlags.set("great britain", "🇬🇧");
  return countryFlags;
}

const TEAM_COLORS = {
  red_bull: "#3671c6",
  "Red Bull": "#3671c6",
  "Red Bull Racing": "#3671c6",
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

// API Endpoints
const CALENDAR_URL = "api/current.json";
const STANDINGS_URL = "api/standings.json";
const RESULTS_URL = "api/results.json";
const QUALIFYING_URL = "api/qualifying.json";

function normalizeRaceName(name) {
  if (!name) return "";
  const clean = name
    .replace(/\bgrand prix\b/gi, "")
    .replace(/\bgp\b/gi, "")
    .replace(/[-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const key = clean.toLocaleLowerCase("en-US");
  const aliases = {
    "saudi arabia": "Saudi Arabian",
    "saudi arabian": "Saudi Arabian",
    "australia": "Australian",
    "australian": "Australian",
    "china": "Chinese",
    "chinese": "Chinese",
    "japan": "Japanese",
    "japanese": "Japanese",
    "canada": "Canadian",
    "canadian": "Canadian",
    "spain": "Spanish",
    "spanish": "Spanish",
    "barcelona": "Barcelona-Catalunya",
    "barcelona catalunya": "Barcelona-Catalunya",
    "austria": "Austrian",
    "austrian": "Austrian",
    "great britain": "British",
    "britain": "British",
    "british": "British",
    "belgium": "Belgian",
    "belgian": "Belgian",
    "hungary": "Hungarian",
    "hungarian": "Hungarian",
    "netherlands": "Dutch",
    "dutch": "Dutch",
    "italy": "Italian",
    "italian": "Italian",
    "mexico": "Mexico City",
    "mexican": "Mexico City",
    "mexico city": "Mexico City",
    "brazil": "Brazilian",
    "brazilian": "Brazilian",
    "sao paulo": "São Paulo",
    "são paulo": "São Paulo",
    "usa": "United States",
    "us": "United States",
    "united states": "United States"
  };
  return `${aliases[key] || clean} Grand Prix`;
}

function getRaceFlag(name) {
  const mappedFlag = FLAGS[normalizeRaceName(name)];
  if (mappedFlag) return mappedFlag;

  const flags = getCountryFlags();
  const parentheticalCountries = [...String(name).matchAll(/\(([^)]+)\)/g)]
    .map(match => match[1])
    .reverse();
  const raceCountry = String(name)
    .replace(/\([^)]*\)/g, "")
    .replace(/\bgrand prix\b|\bgp\b/gi, "");

  for (const candidate of [...parentheticalCountries, raceCountry]) {
    const flag = flags.get(normalizeLookupText(candidate));
    if (flag) return flag;
  }

  return "🏁";
}

function cleanDriver(driver) {
  if (!driver) return driver;
  let family = driver.familyName || "";
  const code = driver.code;
  if (code && family.includes(code)) {
    const parts = family.split(code);
    if (parts.length > 1 && parts[parts.length - 1].trim()) {
      family = parts[parts.length - 1].trim();
    }
  }
  driver.familyName = family;
  return driver;
}


// ============================================================
// GLOBAL STATE
// ============================================================
const ACTIVE_SEASON_YEAR = 2026;
const SUPPORTED_SEASONS = [2026, 2027];

function getInitialSeason() {
  const saved = parseInt(localStorage.getItem("selectedSeason") || "", 10);
  if (SUPPORTED_SEASONS.includes(saved)) return saved;
  const nowYear = new Date().getFullYear();
  return SUPPORTED_SEASONS.includes(nowYear) ? nowYear : ACTIVE_SEASON_YEAR;
}

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
  currentSeasonYear = getInitialSeason(),
  standingsViewMode = "drivers";

document.getElementById("btn-rel").classList.toggle("on", showRel);

// ============================================================
// GLOBAL FUNCTIONS (called from HTML onclick)
// ============================================================
window.toggleRel = toggleRel;
window.togglePast = togglePast;
window.switchTab = switchTab;
window.toggleCard = toggleCard;
window.toggleSection = toggleSection;
window.toggleSeasonMenu = toggleSeasonMenu;
window.selectSeason = selectSeason;
window.setStandingsView = setStandingsView;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function shortNamePlain(driver) {
  const first = driver.givenName.split(' ').pop();
  return `${first} ${driver.familyName}`;
}

function parseDateOnly(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).split('-');
  if (parts.length < 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

function formatDateOnly(dateStr) {
  const dt = parseDateOnly(dateStr);
  if (!dt) return dateStr || '';
  return dt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDaysUntilDate(dateStr) {
  const target = parseDateOnly(dateStr);
  if (!target) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

function getRaceEffectiveTimestamp(race) {
  if (!race) return Infinity;
  if (race.tbc) {
    const dt = parseDateOnly(race.date);
    return dt ? dt.getTime() + (24 * 60 * 60 * 1000) : Infinity;
  }
  return ts(race.date, race.time) + (120 * 60 * 1000);
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
// API: Custom - Race Schedule (with Sportstimes fallback)
// ============================================================
function parseSportstimesSession(timestamp) {
  if (!timestamp) return null;
  if (timestamp.includes("T")) {
    const [date, time] = timestamp.split("T");
    return { date, time, tbc: false };
  }
  return { date: timestamp, time: null, tbc: true };
}

function normalizeSportstimesCalendar(data, seasonYear) {
  const list = Array.isArray(data?.races) ? data.races : [];
  return list.map((item, idx) => {
    const sessions = item.sessions || {};
    const gpParsed = parseSportstimesSession(sessions.gp);
    const isTbc = !gpParsed || Boolean(gpParsed.tbc) || !gpParsed.time;
    const raceObj = {
      season: String(seasonYear),
      round: String(item.round || idx + 1),
      raceName: normalizeRaceName(item.name || "Grand Prix"),
      date: gpParsed ? gpParsed.date : (item.date || `${seasonYear}-01-01`),
      time: gpParsed ? gpParsed.time : null,
      tbc: isTbc,
      Circuit: { circuitName: item.location || "Official Circuit" }
    };

    if (sessions.fp1) raceObj.FirstPractice = parseSportstimesSession(sessions.fp1);
    if (sessions.fp2) raceObj.SecondPractice = parseSportstimesSession(sessions.fp2);
    if (sessions.fp3) raceObj.ThirdPractice = parseSportstimesSession(sessions.fp3);
    if (sessions.sprintQualifying) raceObj.SprintQualifying = parseSportstimesSession(sessions.sprintQualifying);
    else if (sessions.sprintShootout) raceObj.SprintQualifying = parseSportstimesSession(sessions.sprintShootout);
    if (sessions.sprint) raceObj.Sprint = parseSportstimesSession(sessions.sprint);
    if (sessions.qualifying) raceObj.Qualifying = parseSportstimesSession(sessions.qualifying);

    return raceObj;
  });
}

async function fetchCustomSchedule(seasonYear = currentSeasonYear) {
  const localUrl = Number(seasonYear) === ACTIVE_SEASON_YEAR ? CALENDAR_URL : `api/${seasonYear}.json`;
  try {
    const res = await fetch(localUrl);
    if (res.ok) {
      const data = await res.json();
      const races = data?.MRData?.RaceTable?.Races || [];
      races.forEach(r => {
        r.raceName = normalizeRaceName(r.raceName);
      });
      if (races.length > 0) return races;
    }
  } catch (e) {
    console.warn(`⚠️ Local schedule fetch failed for ${seasonYear}, trying upstream:`, e);
  }

  // Fallback directly to Sportstimes community DB (especially useful for 2027 preview before next API build)
  try {
    const rawRes = await fetch(`https://raw.githubusercontent.com/sportstimes/f1/main/_db/f1/${seasonYear}.json`);
    if (!rawRes.ok) throw new Error(`Sportstimes HTTP ${rawRes.status}`);
    const rawData = await rawRes.json();
    return normalizeSportstimesCalendar(rawData, seasonYear);
  } catch (e) {
    console.error(`❌ Custom schedule fetch failed for ${seasonYear}:`, e);
    return [];
  }
}

// ============================================================
// API: Custom - Results, Standings
// ============================================================
async function fetchCustomData() {
  try {
    const [r, d, q] = await Promise.all([
      fetch(RESULTS_URL),
      fetch(STANDINGS_URL),
      fetch(QUALIFYING_URL).catch(e => {
        console.warn("⚠️ Qualifying fetch failed, using empty fallback:", e);
        return { ok: true, json: () => ({ MRData: { RaceTable: { Races: [] } } }) };
      })
    ]);

    if (!r.ok) throw new Error(`Results HTTP ${r.status}`);
    if (!d.ok) throw new Error(`Standings HTTP ${d.status}`);

    const [rd, dd, qd] = await Promise.all([
      r.json(), d.json(), q.ok ? q.json() : { MRData: { RaceTable: { Races: [] } } }
    ]);

    const completed = rd.MRData?.RaceTable?.Races || [];
    completed.forEach(race => {
      race.raceName = normalizeRaceName(race.raceName);
      if (race.Results) {
        race.Results.forEach(res => {
          if (res.Driver) {
            cleanDriver(res.Driver);
          }
        });
      }
    });

    const standings = dd.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
    standings.forEach(std => {
      if (std.Driver) {
        cleanDriver(std.Driver);
      }
    });

    const qualis = qd.MRData?.RaceTable?.Races || [];
    qualis.forEach(race => {
      race.raceName = normalizeRaceName(race.raceName);
      if (race.QualifyingResults) {
        race.QualifyingResults.forEach(res => {
          if (res.Driver) {
            cleanDriver(res.Driver);
          }
        });
      }
    });

    return {
      completed: completed,
      standings: standings,
      qualis: qualis
    };
  } catch (e) {
    console.error("❌ Custom data fetch failed:", e);
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
  const toggleBar = document.getElementById("stand-toggle-bar");
  if (toggleBar) {
    toggleBar.style.display = t === "std" ? "flex" : "none";
  }
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

function updateSeasonUI() {
  const trigger = document.getElementById("year-display");
  if (trigger) trigger.textContent = currentSeasonYear;

  document.title = `F1 ${currentSeasonYear} Dashboard | Formula 1 Race Schedule & Standings`;
  document.querySelectorAll(".season-option").forEach((opt) => {
    opt.classList.toggle("on", Number(opt.dataset.year) === Number(currentSeasonYear));
  });
}

function closeSeasonMenu() {
  const menu = document.getElementById("season-menu");
  const trigger = document.getElementById("year-display");
  if (menu) menu.classList.remove("open");
  if (trigger) trigger.setAttribute("aria-expanded", "false");
}

function toggleSeasonMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById("season-menu");
  const trigger = document.getElementById("year-display");
  if (!menu) return;
  const isOpen = menu.classList.toggle("open");
  if (trigger) trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function selectSeason(year) {
  const targetYear = Number(year);
  closeSeasonMenu();
  if (!SUPPORTED_SEASONS.includes(targetYear) || targetYear === Number(currentSeasonYear)) {
    return;
  }
  currentSeasonYear = targetYear;
  localStorage.setItem("selectedSeason", String(targetYear));
  collapsed = {};
  isFirstLoad = true;
  clearInterval(cdInt);
  updateSeasonUI();
  fetchAll();
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

  const upcoming = races.filter((r) => getRaceEffectiveTimestamp(r) > now);
  const next = upcoming.length
    ? upcoming.reduce((a, b) => {
        const timeA = a.tbc ? (parseDateOnly(a.date)?.getTime() || Infinity) : ts(a.date, a.time);
        const timeB = b.tbc ? (parseDateOnly(b.date)?.getTime() || Infinity) : ts(b.date, b.time);
        return timeA < timeB ? a : b;
      })
    : null;

  if (next) {
    document.getElementById("countdown").classList.add("show");
    const flag = getRaceFlag(next.raceName);
    document.getElementById("cd-name").textContent = (flag ? flag + " " : "") + next.raceName;
    clearInterval(cdInt);

    if (next.tbc) {
      const daysLeft = getDaysUntilDate(next.date);
      if (daysLeft === 0) {
        document.getElementById("cd-timer").innerHTML = `<span class="cd-tbc-label">RACE DAY</span>`;
      } else {
        const label = daysLeft === 1 ? "DAY TO GO" : "DAYS TO GO";
        document.getElementById("cd-timer").innerHTML =
          `<span class="cd-tbc-days">${daysLeft}</span> <span class="cd-tbc-label">${label}</span>`;
      }
    } else {
      cdInt = setInterval(() => {
        const d = ts(next.date, next.time) - Date.now();
        if (d < 0) {
          const duration = 120 * 60 * 1000; // 2 hours
          if (d > -duration) {
            document.getElementById("cd-timer").innerHTML = '<a href="https://iptv.trionine.com/sports/f1-live" target="_blank" rel="noopener noreferrer">Live ↗</a>';
          } else {
            document.getElementById("cd-timer").textContent = "Finished";
            clearInterval(cdInt);
          }
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
  } else {
    document.getElementById("countdown").classList.remove("show");
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
    // Hide skeleton when grid is rendered
    const gridSkeleton = document.getElementById("grid-skeleton");
    if (gridSkeleton) gridSkeleton.style.display = "none";
    gridTabContent.innerHTML = gh;

    if (isFirstLoad) switchTab('grd');
  } else {
    gridTabBtn.style.display = 'none';
    if (isFirstLoad || gridTabBtn.classList.contains('on')) switchTab('std');
  }
  isFirstLoad = false;

  let htmlNext = "", htmlUpcoming = "", htmlPast = "";

  races.forEach((r) => {
    const isRaceTbc = Boolean(r.tbc);
    const isLive = !isRaceTbc && ts(r.date, r.time) <= now && ts(r.date, r.time) + (120 * 60 * 1000) > now;
    const past = isRaceTbc
      ? (parseDateOnly(r.date)?.getTime() || Infinity) + (24 * 60 * 60 * 1000) < now
      : ts(r.date, r.time) + (120 * 60 * 1000) < now;
    const isNext = next && r.raceName === next.raceName;
    const id = r.round;

    if (collapsed[id] === undefined) collapsed[id] = !isNext;

    const bdg = isLive
      ? '<span class="badge b-live">Live</span>'
      : past
        ? '<span class="badge b-done">Finished</span>'
        : isNext
          ? '<span class="badge b-next">Next race</span>'
          : '<span class="badge b-soon">Upcoming</span>';

    const sess = [];
    if (r.FirstPractice) sess.push({ n: "FP1", date: r.FirstPractice.date || r.date, time: r.FirstPractice.time, tbc: isRaceTbc || Boolean(r.FirstPractice.tbc), t: ts(r.FirstPractice.date, r.FirstPractice.time), dur: 60 * 60 * 1000 });
    if (r.SprintQualifying) sess.push({ n: "Sprint Quali", date: r.SprintQualifying.date || r.date, time: r.SprintQualifying.time, tbc: isRaceTbc || Boolean(r.SprintQualifying.tbc), t: ts(r.SprintQualifying.date, r.SprintQualifying.time), dur: 60 * 60 * 1000 });
    else if (r.SecondPractice) sess.push({ n: "FP2", date: r.SecondPractice.date || r.date, time: r.SecondPractice.time, tbc: isRaceTbc || Boolean(r.SecondPractice.tbc), t: ts(r.SecondPractice.date, r.SecondPractice.time), dur: 60 * 60 * 1000 });
    if (r.Sprint) sess.push({ n: "Sprint", date: r.Sprint.date || r.date, time: r.Sprint.time, tbc: isRaceTbc || Boolean(r.Sprint.tbc), t: ts(r.Sprint.date, r.Sprint.time), dur: 60 * 60 * 1000 });
    else if (r.ThirdPractice) sess.push({ n: "FP3", date: r.ThirdPractice.date || r.date, time: r.ThirdPractice.time, tbc: isRaceTbc || Boolean(r.ThirdPractice.tbc), t: ts(r.ThirdPractice.date, r.ThirdPractice.time), dur: 60 * 60 * 1000 });
    if (r.Qualifying) sess.push({ n: "Qualifying", date: r.Qualifying.date || r.date, time: r.Qualifying.time, tbc: isRaceTbc || Boolean(r.Qualifying.tbc), t: ts(r.Qualifying.date, r.Qualifying.time), dur: 60 * 60 * 1000 });
    sess.push({ n: "Race", date: r.date, time: r.time, tbc: isRaceTbc, t: ts(r.date, r.time), dur: 120 * 60 * 1000 });

    const sHtml = sess.map((s) => {
      if (s.tbc) {
        const dateFormatted = formatDateOnly(s.date);
        return `<div class="srow">
          <span class="sname">${s.n}</span>
          <span class="stime">
            <span class="abs-time">${dateFormatted}</span>
            <span class="tbc-chip">Time TBC</span>
          </span>
        </div>`;
      }

      const isSessPast = s.t + s.dur < now;
      const isSessLive = now >= s.t && now < s.t + s.dur;

      const srowClass = isSessLive ? "srow live" : isSessPast ? "srow past" : "srow";
      const nameHtml = isSessLive
        ? `<span class="sname" style="color: var(--f1red); font-weight: 600;">${s.n} <span class="live-dot">●</span></span>`
        : `<span class="sname">${s.n}</span>`;
      const timeHtml = isSessLive
        ? `<span class="stime" style="color: var(--f1red); font-weight: 600;">${fmt(s.t)}</span>`
        : `<span class="stime">${fmt(s.t)}</span>`;

      return `<div class="${srowClass}">
        ${nameHtml}
        ${timeHtml}
      </div>`;
    }).join("");

    const tbcFootnote = isRaceTbc
      ? `<div class="card-tbc-notice">Start times TBC · Dates confirmed by FIA</div>`
      : "";

    const cardHTML = `<div class="card ${isNext ? "next" : ""} ${isLive ? "live" : ""}">
      <div class="card-head" onclick="toggleCard('${id}')">
        <div class="card-title">
          <span class="race-flag">${getRaceFlag(r.raceName)}</span>
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
      <div class="sessions ${collapsed[id] ? "" : "open"}" id="sess-${id}">${sHtml}${tbcFootnote}</div>
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
    // Hide skeleton and show actual content
    const skeleton = document.getElementById("next-race-skeleton");
    if (skeleton) skeleton.style.display = "none";
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
    const flag = getRaceFlag(r.raceName);
    h += `<div class="res-item">
      <div class="res-race">${flag ? flag + " " : ""}${r.raceName}</div>
      <div class="podium">
        <span class="pod pod1">🥇 ${n(a)}</span>
        <span class="pod pod2">🥈 ${n(b)}</span>
        <span class="pod pod3">🥉 ${n(c)}</span>
      </div>
    </div>`;
  });
  // Hide skeleton when results are rendered
  const resultsSkeleton = document.getElementById("results-skeleton");
  if (resultsSkeleton) resultsSkeleton.style.display = "none";
  const emptyResultsMsg = Number(currentSeasonYear) > ACTIVE_SEASON_YEAR
    ? `${currentSeasonYear} season hasn't started yet.`
    : "No results yet.";
  document.getElementById("tc-res").innerHTML = h || `<div class="empty">${emptyResultsMsg}</div>`;
}

function getConstructorStandings(driverStandings) {
  if (!driverStandings || !driverStandings.length) return [];
  const teams = {};
  driverStandings.forEach((d) => {
    const constructor = d.Constructors?.[0] || {};
    const teamName = constructor.name || "Unknown";
    const teamId = constructor.constructorId || teamName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const pts = parseFloat(d.points) || 0;
    const driverCode = d.Driver?.code || d.Driver?.familyName || "";

    if (!teams[teamName]) {
      teams[teamName] = {
        name: teamName,
        constructorId: teamId,
        points: 0,
        drivers: []
      };
    }
    teams[teamName].points += pts;
    if (driverCode && !teams[teamName].drivers.includes(driverCode)) {
      teams[teamName].drivers.push(driverCode);
    }
  });

  return Object.values(teams)
    .sort((a, b) => b.points - a.points)
    .map((team, idx) => ({
      position: String(idx + 1),
      points: String(team.points),
      Constructor: {
        name: team.name,
        constructorId: team.constructorId
      },
      drivers: team.drivers
    }));
}

function setStandingsView(mode) {
  if (mode !== "drivers" && mode !== "constructors") return;
  standingsViewMode = mode;

  const btnDrivers = document.getElementById("btn-std-drivers");
  const btnTeams = document.getElementById("btn-std-teams");
  if (btnDrivers) btnDrivers.classList.toggle("on", mode === "drivers");
  if (btnTeams) btnTeams.classList.toggle("on", mode === "constructors");

  renderStandings();
}

function renderStandings() {
  const standingsSkeleton = document.getElementById("standings-skeleton");
  if (!standings.length) {
    if (standingsSkeleton) standingsSkeleton.style.display = "none";
    const emptyStandingsMsg = Number(currentSeasonYear) > ACTIVE_SEASON_YEAR
      ? `${currentSeasonYear} season hasn't started yet.`
      : "No standings yet.";
    document.getElementById("tc-std").innerHTML = `<div class="empty">${emptyStandingsMsg}</div>`;
    return;
  }
  if (standingsSkeleton) standingsSkeleton.style.display = "none";

  if (standingsViewMode === "constructors") {
    const teams = getConstructorStandings(standings);
    const maxPts = Math.max(...teams.map((t) => parseFloat(t.points) || 0), 1);
    let h = "";
    teams.forEach((t, index) => {
      const displayPos = index + 1;
      const pts = parseFloat(t.points) || 0;
      const pct = ((pts / maxPts) * 100).toFixed(0);
      const col = TEAM_COLORS[t.Constructor.constructorId] || TEAM_COLORS[t.Constructor.name] || "#e10600";
      const driversLine = t.drivers.join(" · ");

      h += `<div class="stand-row">
        <span class="s-pos">${displayPos}</span>
        <div class="s-info">
          <div class="s-top">
            <span class="s-name">${t.Constructor.name}</span>
            <span class="s-pts">${t.points}</span>
          </div>
          <div class="s-bar">
            <div class="s-fill" style="width:${pct}%;background:${col}"></div>
          </div>
          <div class="s-team">${driversLine}</div>
        </div>
      </div>`;
    });
    document.getElementById("tc-std").innerHTML = h;
    return;
  }

  // Drivers mode (default)
  const max = parseFloat(standings[0]?.points) || 1;
  let h = "";
  standings.forEach((d, index) => {
    const displayPos = index + 1;
    const pct = ((parseFloat(d.points) / max) * 100).toFixed(0);
    const constructor = d.Constructors?.[0] || {};
    const team = constructor.name || "";
    const col = TEAM_COLORS[constructor.constructorId] || TEAM_COLORS[team] || "#e10600";
    h += `<div class="stand-row">
      <span class="s-pos">${displayPos}</span>
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

function initExtensionPromo() {
  const ua = navigator.userAgent;
  const isFirefox = /firefox|fxios/i.test(ua);
  const isEdge = /edg/i.test(ua);
  const isBrave = /brave/i.test(ua) || (navigator.brave && navigator.brave.isBrave);
  const isChrome = /chrome|crios/i.test(ua) && !isEdge && !isBrave;

  const btn = document.getElementById("ext-install-btn");
  const btnText = document.getElementById("ext-install-text");
  const secondaryLink = document.getElementById("ext-secondary-link");

  if (!btn || !btnText) return;

  if (isFirefox) {
    btn.href = "https://addons.mozilla.org/firefox/addon/f1-dash/";
    btnText.textContent = "Add to Firefox";
    if (secondaryLink) {
      secondaryLink.href = "https://github.com/sadabx/f1/releases";
      secondaryLink.textContent = "Chrome & Brave release ↗";
    }
  } else if (isEdge) {
    btn.href = "https://github.com/sadabx/f1/releases";
    btnText.textContent = "Install on Edge";
    if (secondaryLink) {
      secondaryLink.href = "https://addons.mozilla.org/firefox/addon/f1-dash/";
      secondaryLink.textContent = "Firefox Add-on ↗";
    }
  } else if (isBrave) {
    btn.href = "https://github.com/sadabx/f1/releases";
    btnText.textContent = "Install on Brave";
    if (secondaryLink) {
      secondaryLink.href = "https://addons.mozilla.org/firefox/addon/f1-dash/";
      secondaryLink.textContent = "Firefox Add-on ↗";
    }
  } else if (isChrome) {
    btn.href = "https://github.com/sadabx/f1/releases";
    btnText.textContent = "Install on Chrome";
    if (secondaryLink) {
      secondaryLink.href = "https://addons.mozilla.org/firefox/addon/f1-dash/";
      secondaryLink.textContent = "Firefox Add-on ↗";
    }
  } else {
    btn.href = "https://addons.mozilla.org/firefox/addon/f1-dash/";
    btnText.textContent = "Get Extension";
    if (secondaryLink) {
      secondaryLink.href = "https://github.com/sadabx/f1/releases";
      secondaryLink.textContent = "Chromium release ↗";
    }
  }
}

// ============================================================
// MAIN FETCH FUNCTION
// ============================================================
async function fetchAll() {
  const targetSeason = Number(currentSeasonYear);
  updateSeasonUI();

  try {
    const isActiveSeason = targetSeason === ACTIVE_SEASON_YEAR;
    // Fetch schedule (plus OpenF1/Results/Standings only for active season)
    const [openF1Sessions, customSchedule, customData] = await Promise.all([
      isActiveSeason ? fetchOpenF1Sessions(targetSeason) : Promise.resolve(null),
      fetchCustomSchedule(targetSeason),
      isActiveSeason ? fetchCustomData() : Promise.resolve({ completed: [], standings: [], qualis: [] })
    ]);

    // Ignore stale response if user switched seasons mid-fetch
    if (targetSeason !== Number(currentSeasonYear)) return;

    // Update global data from custom endpoints
    completed = customData.completed;
    standings = customData.standings;
    const qualis = customData.qualis;
    latestQuali = qualis.length > 0 ? qualis[qualis.length - 1] : null;

    // Build race calendar
    if (openF1Sessions && openF1Sessions.length > 0) {
      const meetings = buildCalendarFromSessions(openF1Sessions);
      races = mergeCalendars(meetings, customSchedule);
    } else {
      races = customSchedule;
    }

    // Sort races by date
    races.sort((a, b) => {
      const timeA = ts(a.date, a.time);
      const timeB = ts(b.date, b.time);
      return timeA - timeB;
    });

    // Update UI
    updateSeasonUI();

    render();
    renderResults();
    renderStandings();

    console.log(`✅ Data loaded (${targetSeason}) - ${races.length} races`);
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

// Close season dropdown on click outside or Escape
document.addEventListener("click", (e) => {
  const switcher = document.getElementById("season-switcher");
  if (switcher && !switcher.contains(e.target)) {
    closeSeasonMenu();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSeasonMenu();
});

// Extension promo init
initExtensionPromo();

// Initial fetch
fetchAll();

// Periodic refresh
setInterval(fetchAll, 600000);  // Refresh data every 10 minutes
setInterval(render, 60000);     // Re-render UI every minute
