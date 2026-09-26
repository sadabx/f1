// ============================================================
// F1 Live Alert & Race Reminders - Background Service
// ============================================================
const api = typeof browser !== 'undefined' ? browser : chrome;

const DEFAULT_SETTINGS = {
  masterEnabled: true,
  leadMinutes: 5, // 5 minutes before session start
  soundEnabled: true,
  volume: 0.85,
  sessions: {
    fp: true,     // Practice 1, 2, 3
    sq: true,     // Sprint Qualifying
    sprint: true, // Sprint
    quali: true,  // Qualifying
    race: true    // Grand Prix Race
  }
};

const CALENDAR_API = 'https://f1.trionine.com/api/current.json';

let currentAudio = null;
let currentSynthOscs = [];

// ============================================================
// INITIALIZATION
// ============================================================
api.runtime.onInstalled.addListener(async (details) => {
  console.log('[F1 Alert] Extension installed/updated:', details.reason);
  await initSettings();
  await syncCalendarAndSchedule();
  
  // Schedule calendar resync every 6 hours
  api.alarms.create('F1_CALENDAR_SYNC', { periodInMinutes: 360 });
});

api.runtime.onStartup.addListener(async () => {
  console.log('[F1 Alert] Browser started, verifying schedule...');
  await syncCalendarAndSchedule();
});

async function initSettings() {
  const data = await api.storage.local.get('f1_settings');
  if (!data.f1_settings) {
    await api.storage.local.set({ f1_settings: DEFAULT_SETTINGS });
  }
}

async function getSettings() {
  const data = await api.storage.local.get('f1_settings');
  return { ...DEFAULT_SETTINGS, ...(data.f1_settings || {}) };
}

// ============================================================
// AUDIO PLAYBACK ENGINE (Official F1 Theme MP3)
// ============================================================
async function playF1Theme(volume = 0.85) {
  stopF1Theme();

  // 1. Native Audio (Firefox background page)
  if (typeof Audio !== 'undefined') {
    try {
      const audioUrl = api.runtime.getURL('assets/f1_theme.mp3');
      currentAudio = new Audio(audioUrl);
      currentAudio.volume = Math.max(0, Math.min(1, volume));

      currentAudio.onended = () => {
        currentAudio = null;
        api.runtime.sendMessage({ action: 'AUDIO_ENDED' }).catch(() => {});
      };

      const playPromise = currentAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[F1 Alert] Audio playback error:', err);
        });
      }
      return;
    } catch (err) {
      console.warn('[F1 Alert] Audio creation error:', err);
    }
  }

  // 2. Offscreen Audio (Chromium Service Worker: Chrome, Brave, Edge)
  if (typeof chrome !== 'undefined' && chrome.offscreen) {
    try {
      const hasDoc = chrome.offscreen.hasDocument ? await chrome.offscreen.hasDocument() : false;
      if (!hasDoc) {
        await chrome.offscreen.createDocument({
          url: 'offscreen.html',
          reasons: ['AUDIO_PLAYBACK'],
          justification: 'F1 pre-session alert music'
        });
      }
      chrome.runtime.sendMessage({ action: 'PLAY_ALARM', volume }).catch(() => {});
    } catch (err) {
      console.warn('[F1 Alert] Chromium offscreen audio error:', err);
    }
  }
}

function stopF1Theme() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}
    currentAudio = null;
  }
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ action: 'STOP_ALARM' }).catch(() => {});
  }
  currentSynthOscs.forEach((osc) => {
    try { osc.stop(); } catch (e) {}
  });
  currentSynthOscs = [];
}

// ============================================================
// CALENDAR & SESSION SCHEDULE ENGINE
// ============================================================
async function fetchCalendar() {
  try {
    const res = await fetch(`${CALENDAR_API}?_t=${Date.now()}`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const races = data?.MRData?.RaceTable?.Races || [];
    if (races.length > 0) {
      await api.storage.local.set({ f1_races: races, f1_last_fetch: Date.now() });
      return races;
    }
  } catch (err) {
    console.warn('[F1 Alert] Primary API fetch failed, checking cache:', err);
  }

  // Fallback to cached data
  const cached = await api.storage.local.get('f1_races');
  return cached.f1_races || [];
}

function parseSessionTimestamp(dateStr, timeStr) {
  try {
    return new Date(`${dateStr}T${timeStr || '00:00:00Z'}`).getTime();
  } catch {
    return null;
  }
}

function extractWeekendSessions(race) {
  const sessions = [];
  const grandPrix = `${race.raceName.replace(/grand prix/gi, '').trim()} Grand Prix`;

  const add = (name, code, type, obj) => {
    if (obj?.date) {
      const t = parseSessionTimestamp(obj.date, obj.time);
      if (t) {
        sessions.push({
          id: `${race.round}_${code}`,
          round: race.round,
          raceName: grandPrix,
          circuitName: race.Circuit?.circuitName || '',
          sessionName: name,
          sessionCode: code,
          sessionType: type,
          startTime: t
        });
      }
    }
  };

  add('Practice 1', 'FP1', 'fp', race.FirstPractice);
  add('Practice 2', 'FP2', 'fp', race.SecondPractice);
  add('Practice 3', 'FP3', 'fp', race.ThirdPractice);
  add('Sprint Qualifying', 'SQ', 'sq', race.SprintQualifying);
  add('Sprint', 'Sprint', 'sprint', race.Sprint);
  add('Qualifying', 'Quali', 'quali', race.Qualifying);
  add('Grand Prix', 'Race', 'race', { date: race.date, time: race.time });

  return sessions.sort((a, b) => a.startTime - b.startTime);
}

// Reschedules alarms based on current settings and calendar
async function syncCalendarAndSchedule() {
  const settings = await getSettings();
  const races = await fetchCalendar();
  if (!races || races.length === 0) return;

  const now = Date.now();
  const leadMs = (settings.leadMinutes || 5) * 60 * 1000;

  // Clear existing session alarms
  const allAlarms = await api.alarms.getAll();
  for (const alarm of allAlarms) {
    if (alarm.name.startsWith('f1_sess_')) {
      await api.alarms.clear(alarm.name);
    }
  }

  const alarmMap = {};
  let nextSession = null;

  // Find upcoming sessions
  for (const race of races) {
    const sessions = extractWeekendSessions(race);
    for (const sess of sessions) {
      if (sess.startTime > now) {
        if (!nextSession) nextSession = sess;

        const isTypeEnabled = settings.sessions?.[sess.sessionType] ?? true;
        if (settings.masterEnabled && isTypeEnabled) {
          const triggerTime = sess.startTime - leadMs;
          const alarmName = `f1_sess_${sess.id}_${sess.startTime}`;

          if (triggerTime > now) {
            api.alarms.create(alarmName, { when: triggerTime });
            alarmMap[alarmName] = { ...sess, triggerTime, leadMinutes: settings.leadMinutes };
          }
        }
      }
    }
  }

  await api.storage.local.set({
    f1_scheduled_alarms: alarmMap,
    f1_next_session: nextSession
  });

  console.log(`[F1 Alert] Scheduled ${Object.keys(alarmMap).length} upcoming session alarms. Next:`, nextSession?.raceName, nextSession?.sessionCode);
}

// ============================================================
// ALARM TRIGGER LISTENER
// ============================================================
api.alarms.onAlarm.addListener(async (alarm) => {
  console.log('[F1 Alert] Alarm triggered:', alarm.name);

  if (alarm.name === 'F1_CALENDAR_SYNC') {
    await syncCalendarAndSchedule();
    return;
  }

  if (alarm.name.startsWith('f1_sess_')) {
    const data = await api.storage.local.get(['f1_scheduled_alarms', 'f1_settings']);
    const settings = { ...DEFAULT_SETTINGS, ...(data.f1_settings || {}) };
    const sessInfo = data.f1_scheduled_alarms?.[alarm.name];

    if (!settings.masterEnabled) return;
    if (sessInfo && settings.sessions?.[sessInfo.sessionType] === false) return;

    const sessionTitle = sessInfo ? `${sessInfo.sessionName} (${sessInfo.sessionCode})` : 'F1 Session';
    const raceTitle = sessInfo ? sessInfo.raceName : 'Grand Prix';
    const leadMin = settings.leadMinutes || 5;

    // Trigger Notification
    api.notifications.create(alarm.name, {
      type: 'basic',
      iconUrl: api.runtime.getURL('assets/icon128.png'),
      title: `🏎️ ${sessionTitle} starts in ${leadMin} minutes!`,
      message: `${raceTitle} • Green light is approaching. Lights out soon! Click to open live dashboard.`,
      priority: 2
    });

    // Play Audio Alarm
    if (settings.soundEnabled) {
      playF1Theme(settings.volume || 0.85);
    }
  }
});

// Click notification to open user's live dashboard
api.notifications.onClicked.addListener(() => {
  api.tabs.create({ url: 'https://f1.trionine.com' });
});

// ============================================================
// RUNTIME MESSAGE HANDLER (From Popup UI)
// ============================================================
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'TEST_ALARM') {
    const volume = typeof msg.volume === 'number' ? msg.volume : 0.85;
    
    // Fire test notification
    api.notifications.create('f1_test_notification', {
      type: 'basic',
      iconUrl: api.runtime.getURL('assets/icon128.png'),
      title: '🏎️ F1 Live Alert: Alarm Test Active!',
      message: 'Lights out in 5 minutes! Playing official F1 Theme.',
      priority: 2
    });

    // Play audio
    playF1Theme(volume);
    sendResponse({ status: 'testing' });
    return false;
  }

  if (msg.action === 'STOP_ALARM') {
    stopF1Theme();
    sendResponse({ status: 'stopped' });
    return false;
  }

  if (msg.action === 'UPDATE_SETTINGS') {
    api.storage.local.set({ f1_settings: msg.settings }).then(() => {
      syncCalendarAndSchedule().then(() => {
        sendResponse({ status: 'updated' });
      });
    });
    return true;
  }

  if (msg.action === 'FORCE_SYNC') {
    syncCalendarAndSchedule().then(() => {
      sendResponse({ status: 'synced' });
    });
    return true;
  }
});
