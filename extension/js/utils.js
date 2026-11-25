function setSafeContent(el, htmlString) {
  if (!el) return;
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  el.replaceChildren(...doc.body.childNodes);
}

// ============================================================
// F1 Dash - Multi-Tab Engine (Weekend, Standings, Results, Live)
// ============================================================
var api = (typeof browser !== 'undefined') ? browser : (typeof chrome !== 'undefined' ? chrome : {
  storage: { local: { get: async () => ({}), set: async () => {} } },
  runtime: { getURL: (p) => p, sendMessage: async () => {} },
  tabs: { create: ({ url }) => window.open(url, '_blank') }
});

// Complete Country & Circuit Flags Map
var FLAGS = {
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

var TEAM_COLORS = {
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
var STATIC_DRIVERS = {
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

var SESSION_DURATIONS = {
  fp: 60 * 60 * 1000,
  sq: 45 * 60 * 1000,
  sprint: 60 * 60 * 1000,
  quali: 60 * 60 * 1000,
  race: 120 * 60 * 1000
};

var BELL_SVG = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
</svg>`;

var PLAY_SVG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
var CIRCLE_SVG = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/></svg>`;

var FASTEST_LAP_SVG = `
<svg class="fastest-lap-clock" viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="8" cy="9.2" r="5.2"/>
  <polyline points="8 6.8 8 9.2 9.8 10.3"/>
  <line x1="8" y1="1.4" x2="8" y2="3.8"/>
  <line x1="5.6" y1="1.4" x2="10.4" y2="1.4"/>
  <line x1="12.2" y1="5" x2="13.4" y2="3.8"/>
</svg>`;

var SPEAKER_SVG = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
</svg>`;


const ACTIVE_SEASON_YEAR = 2026;
const SUPPORTED_SEASONS = [2026, 2027];

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

