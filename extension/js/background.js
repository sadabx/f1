// ============================================================
// F1 Live Alert & Race Reminders - Background Service
// ============================================================
const api = typeof browser !== 'undefined' ? browser : chrome;

const DEFAULT_SETTINGS = {
  masterEnabled: true,
  alarmEnabled: true,
  leadMinutes: 5, // 5 minutes before session start
  leadTime: 5,
  soundEnabled: true,
  volume: 85, // Stored as 0..100 integer matching popup slider
  sessions: {
    fp: true,     // Practice 1, 2, 3
    sq: true,     // Sprint Qualifying
    sprint: true, // Sprint
    quali: true,  // Qualifying
    race: true    // Grand Prix Race
  },
  pushEnabled: true,
  pushGrid: true,
  pushLive: true
};

const CALENDAR_API = 'https://f1.trionine.com/api/current.json';

let currentAudio = null;
let currentSynthOscs = [];
let isSyncingAlarms = false;
let pendingAlarmResync = false;

// ============================================================
// INITIALIZATION
// ============================================================
api.runtime.onInstalled.addListener(async (details) => {
  console.log('[F1 Alert] Extension installed/updated:', details.reason);
  await initSettings();
  await syncCalendarAndSchedule();
  await checkQualifyingAndNotify();

  // Schedule calendar resync every 6 hours
  api.alarms.create('F1_CALENDAR_SYNC', { periodInMinutes: 360 });
});

api.runtime.onStartup.addListener(async () => {
  console.log('[F1 Alert] Browser started, verifying schedule...');
  await initSettings();
  await syncCalendarAndSchedule();
  await checkQualifyingAndNotify();
});

async function initSettings() {
  const data = await api.storage.local.get('f1_settings');
  if (!data.f1_settings) {
    await api.storage.local.set({ f1_settings: DEFAULT_SETTINGS });
    return;
  }
  // Migrate legacy 0..1 float volume (e.g. 0.85) to 0..100 percentage in storage
  const rawVol = data.f1_settings.volume;
  if (typeof rawVol === 'number' && rawVol > 0 && rawVol < 1) {
    await api.storage.local.set({
      f1_settings: { ...data.f1_settings, volume: Math.round(rawVol * 100) }
    });
  }
}

async function getSettings() {
  const data = await api.storage.local.get("f1_settings");
  const raw = data.f1_settings || {};
  const master = raw.alarmEnabled !== undefined ? raw.alarmEnabled : (raw.masterEnabled !== undefined ? raw.masterEnabled : true);
  const lead = raw.leadTime !== undefined ? raw.leadTime : (raw.leadMinutes !== undefined ? raw.leadMinutes : 5);
  const sound = raw.soundEnabled !== undefined ? raw.soundEnabled : (raw.alarmEnabled !== undefined ? raw.alarmEnabled : true);
  let vol = raw.volume !== undefined ? Number(raw.volume) : 85;
  if (isNaN(vol)) vol = 85;
  // Values >= 1 are 0..100% from slider/storage; fractional 0<vol<1 are legacy floats
  if (vol >= 1) vol = vol / 100;

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    masterEnabled: Boolean(master),
    alarmEnabled: Boolean(master),
    leadMinutes: Number(lead) || 5,
    leadTime: Number(lead) || 5,
    soundEnabled: Boolean(sound),
    volume: Math.max(0, Math.min(1, vol))
  };
}

function createSafeNotification(notifId, baseOptions, allowStopButton = false) {
  const opts = { ...baseOptions };
  // Firefox desktop defines browser.notifications.onButtonClicked in MV3,
  // but notifications.create throws when `buttons` is included.
  const canUseButtons = allowStopButton && typeof browser === 'undefined' && Boolean(api.notifications?.onButtonClicked);
  if (canUseButtons) {
    opts.buttons = [{ title: 'Stop' }];
  }
  try {
    const res = api.notifications.create(notifId, opts);
    if (res && typeof res.catch === 'function') {
      res.catch(() => {
        if (opts.buttons) {
          const fallbackOpts = { ...baseOptions };
          api.notifications.create(notifId, fallbackOpts).catch(() => {});
        }
      });
    }
  } catch (_) {
    if (opts.buttons) {
      try {
        api.notifications.create(notifId, { ...baseOptions });
      } catch (__) {}
    }
  }
}

async function sendOffscreenAudio(payload, justification) {
  if (typeof chrome === 'undefined' || !chrome['offscreen']) return;
  try {
    const hasDoc = chrome['offscreen']['hasDocument'] ? await chrome['offscreen']['hasDocument']() : false;
    let createdNew = false;
    if (!hasDoc) {
      await chrome['offscreen']['createDocument']({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification
      });
      createdNew = true;
    }
    try {
      await chrome.runtime.sendMessage(payload);
    } catch (_) {
      if (createdNew) {
        await new Promise(r => setTimeout(r, 150));
        await chrome.runtime.sendMessage(payload).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[F1 Alert] Chromium offscreen audio error:', err);
  }
}

// Reschedule immediately whenever settings change from popup UI
if (api.storage && api.storage.onChanged) {
  api.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.f1_settings) {
      console.log("[F1 Alert] Settings updated in storage, rescheduling alarms...");
      syncCalendarAndSchedule();
    }
  });
}


// ============================================================
// TEAM RADIO AUDIO PLAYBACK ENGINE (F1 Team Radio Beep)
// ============================================================
async function playRadioBeep(volume = 0.85) {
  if (typeof Audio !== "undefined") {
    try {
      const audioUrl = api.runtime.getURL("assets/f1_radio.mp3");
      const radioAudio = new Audio(audioUrl);
      radioAudio.volume = Math.max(0, Math.min(1, volume));
      radioAudio.play().catch(e => console.warn("[F1 Alert] Radio audio error:", e));
      return;
    } catch (err) {
      console.warn("[F1 Alert] Radio audio creation error:", err);
    }
  }

  if (typeof chrome !== "undefined" && chrome['offscreen']) {
    await sendOffscreenAudio({ action: "PLAY_RADIO", volume }, "F1 radio notification sound");
  }
}

async function checkQualifyingAndNotify() {
  const settings = await getSettings();
  if (!settings.pushEnabled || !settings.pushGrid) return;

  try {
    const [cRes, qRes] = await Promise.all([
      fetch(`${CALENDAR_API}?_t=${Date.now()}`),
      fetch(`https://f1.trionine.com/api/qualifying.json?_t=${Date.now()}`)
    ]);

    if (!cRes.ok || !qRes.ok) return;
    const cData = await cRes.json();
    const qData = await qRes.json();

    const races = cData?.MRData?.RaceTable?.Races || [];
    const qualis = qData?.MRData?.RaceTable?.Races || [];
    if (races.length === 0 || qualis.length === 0) return;

    const now = Date.now();
    let nextRace = null;
    for (const r of races) {
      const raceTime = parseSessionTimestamp(r.date, r.time) || (Date.now() + 86400000);
      if (raceTime + (120 * 60 * 1000) > now) {
        nextRace = r;
        break;
      }
    }

    const latestQuali = qualis[qualis.length - 1];
    if (nextRace && latestQuali && String(nextRace.round) === String(latestQuali.round)) {
      const stored = await api.storage.local.get("f1_alerted_grid_round");
      if (stored.f1_alerted_grid_round !== String(latestQuali.round)) {
        await api.storage.local.set({ f1_alerted_grid_round: String(latestQuali.round) });

        const pole = latestQuali.QualifyingResults?.[0];
        const poleName = pole?.Driver ? `${pole.Driver.givenName || ""} ${pole.Driver.familyName || ""}`.trim() : "Pole Sitter";
        const poleTime = pole?.Q3 || pole?.Q2 || pole?.Q1 || "";

        api.notifications.create(`f1_grid_${latestQuali.round}`, {
          type: "basic",
          iconUrl: api.runtime.getURL("assets/icon128.png"),
          title: `Starting Grid Confirmed • ${latestQuali.raceName}`,
          message: `Pole Position: ${poleName} (${poleTime}). View starting grid.`,
          priority: 2
        });

        playRadioBeep(settings.volume || 0.85);
      }
    }
  } catch (err) {
    console.warn("[F1 Alert] Qualifying check error:", err);
  }
}

// ============================================================
// AUDIO PLAYBACK ENGINE (Official F1 Theme MP3)
// ============================================================
function playWebAudioFanfare(volume = 0.85) {
  try {
    const AudioCtx = typeof AudioContext !== "undefined" ? AudioContext : (typeof webkitAudioContext !== "undefined" ? webkitAudioContext : null);
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume)) * 0.5;
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    const notes = [
      { f: 392.00, t: 0.0, d: 0.3 },   // G4
      { f: 523.25, t: 0.32, d: 0.3 },  // C5
      { f: 622.25, t: 0.65, d: 0.2 },  // Eb5
      { f: 783.99, t: 0.88, d: 0.6 },  // G5
      { f: 698.46, t: 1.5, d: 0.3 },   // F5
      { f: 622.25, t: 1.85, d: 0.35 }, // Eb5
      { f: 523.25, t: 2.25, d: 0.2 },  // C5
      { f: 698.46, t: 2.5, d: 0.35 },  // F5
      { f: 783.99, t: 2.9, d: 1.0 }    // G5
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(n.f, now + n.t);

      noteGain.gain.setValueAtTime(0.001, now + n.t);
      noteGain.gain.exponentialRampToValueAtTime(1, now + n.t + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(noteGain);
      noteGain.connect(gain);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
      currentSynthOscs.push(osc);
    });
  } catch (e) {
    console.error("[F1 Alert] Web Audio synth fallback failed:", e);
  }
}

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
          console.warn('[F1 Alert] Audio playback error, falling back to Web Audio synth:', err);
          playWebAudioFanfare(volume);
        });
      }
      return;
    } catch (err) {
      console.warn('[F1 Alert] Audio creation error, falling back to Web Audio synth:', err);
      playWebAudioFanfare(volume);
    }
  }

  // 2. Offscreen Audio (Chromium Service Worker: Chrome, Brave, Edge)
  if (typeof chrome !== 'undefined' && chrome['offscreen']) {
    await sendOffscreenAudio({ action: 'PLAY_ALARM', volume }, 'F1 pre-session alert music');
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

// Reschedules alarms based on current settings and calendar (serialized to avoid races)
async function syncCalendarAndSchedule() {
  if (isSyncingAlarms) {
    pendingAlarmResync = true;
    return;
  }
  isSyncingAlarms = true;
  try {
    do {
      pendingAlarmResync = false;
      await performAlarmSync();
    } while (pendingAlarmResync);
  } finally {
    isSyncingAlarms = false;
  }
}

async function performAlarmSync() {
  const settings = await getSettings();
  const races = await fetchCalendar();
  if (!races || races.length === 0) return;

  const now = Date.now();
  const leadMs = (settings.leadMinutes || 5) * 60 * 1000;

  // Clear existing session & live-start alarms
  const allAlarms = await api.alarms.getAll();
  for (const alarm of allAlarms) {
    if (alarm.name.startsWith('f1_sess_') || alarm.name.startsWith('f1_live_')) {
      await api.alarms.clear(alarm.name);
    }
  }

  const storedAlerted = await api.storage.local.get('f1_alerted_sessions');
  const alertedIds = new Set(Array.isArray(storedAlerted.f1_alerted_sessions) ? storedAlerted.f1_alerted_sessions : []);

  const alarmMap = {};
  let nextSession = null;

  // Find upcoming sessions (Only schedule within next 7 days to avoid browser 32-bit millisecond overflow)
  const MAX_SCHEDULE_HORIZON_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  for (const race of races) {
    const sessions = extractWeekendSessions(race);
    for (const sess of sessions) {
      if (sess.startTime > now) {
        if (!nextSession) nextSession = sess;

        const isTypeEnabled = settings.sessions?.[sess.sessionType] ?? true;
        if (sess.startTime <= (now + MAX_SCHEDULE_HORIZON_MS)) {
          if (settings.masterEnabled && isTypeEnabled) {
            const triggerTime = sess.startTime - leadMs;
            const alarmName = `f1_sess_${sess.id}_${sess.startTime}`;

            if (triggerTime > now) {
              api.alarms.create(alarmName, { when: triggerTime });
              alarmMap[alarmName] = { ...sess, triggerTime, leadMinutes: settings.leadMinutes };
            } else if (!alertedIds.has(alarmName)) {
              // Browser opened inside the lead window before green light: schedule immediately once.
              api.alarms.create(alarmName, { when: now + 1000 });
              alarmMap[alarmName] = { ...sess, triggerTime: now + 1000, leadMinutes: Math.max(1, Math.round((sess.startTime - now) / 60000)) };
            }
          }

          if (settings.pushEnabled && settings.pushLive) {
            const liveAlarmName = `f1_live_${sess.id}_${sess.startTime}`;
            api.alarms.create(liveAlarmName, { when: sess.startTime });
            alarmMap[liveAlarmName] = { ...sess, triggerTime: sess.startTime };
          }
        }
      }
    }
  }

  await api.storage.local.set({
    f1_scheduled_alarms: alarmMap,
    f1_next_session: nextSession
  });

  console.log(`[F1 Alert] Scheduled ${Object.keys(alarmMap).length} upcoming alarms. Next:`, nextSession?.raceName, nextSession?.sessionCode);
}

// ============================================================
// ALARM TRIGGER LISTENER
// ============================================================
api.alarms.onAlarm.addListener(async (alarm) => {
  console.log('[F1 Alert] Alarm triggered:', alarm.name);

  if (alarm.name === 'F1_CALENDAR_SYNC') {
    await syncCalendarAndSchedule();
    await checkQualifyingAndNotify();
    return;
  }

  if (alarm.name.startsWith('f1_sess_')) {
    const data = await api.storage.local.get(["f1_scheduled_alarms", "f1_alerted_sessions"]);
    const settings = await getSettings();
    const sessInfo = data.f1_scheduled_alarms?.[alarm.name];

    if (!settings.masterEnabled) return;
    if (sessInfo && settings.sessions?.[sessInfo.sessionType] === false) return;

    const alerted = Array.isArray(data.f1_alerted_sessions) ? data.f1_alerted_sessions : [];
    if (alerted.includes(alarm.name)) return;

    const sessionTitle = sessInfo ? `${sessInfo.sessionName} (${sessInfo.sessionCode})` : 'F1 Session';
    const raceTitle = sessInfo ? sessInfo.raceName : 'Grand Prix';
    const leadMin = sessInfo?.leadMinutes || settings.leadMinutes || 5;

    // Sanity check: Ensure the session is ACTUALLY starting soon (guards against 32-bit timer overflows or stale alarms)
    if (sessInfo) {
      const now = Date.now();
      const diffToStart = sessInfo.startTime - now;
      const maxDiff = Math.max(35, (settings.leadMinutes || 5) + 10) * 60 * 1000;
      if (diffToStart > maxDiff || diffToStart < -60 * 60 * 1000) {
        console.warn(`[F1 Alert] Ignored phantom alarm trigger: ${sessInfo.raceName} ${sessInfo.sessionCode} is ${Math.round(diffToStart / 60000)}m away.`);
        return;
      }
    }

    const updatedAlerted = [...alerted.slice(-29), alarm.name];
    await api.storage.local.set({ f1_alerted_sessions: updatedAlerted });

    // Trigger Notification safely (never block audio playback if notification options fail)
    createSafeNotification(alarm.name, {
      type: 'basic',
      iconUrl: api.runtime.getURL('assets/icon128.png'),
      title: `🏎️ ${sessionTitle} starts in ${leadMin} minute${leadMin === 1 ? '' : 's'}!`,
      message: `${raceTitle} • Green light is approaching. Lights out soon! Click to open F1 Dash.`,
      priority: 2
    }, true);

    // Play Audio Alarm
    if (settings.soundEnabled) {
      playF1Theme(settings.volume);
    }
  }

  if (alarm.name.startsWith('f1_live_')) {
    const data = await api.storage.local.get(["f1_scheduled_alarms", "f1_alerted_sessions"]);
    const settings = await getSettings();
    if (!settings.pushEnabled || !settings.pushLive) return;

    const alerted = Array.isArray(data.f1_alerted_sessions) ? data.f1_alerted_sessions : [];
    if (alerted.includes(alarm.name)) return;

    const sessInfo = data.f1_scheduled_alarms?.[alarm.name];
    if (sessInfo) {
      const diffToStart = sessInfo.startTime - Date.now();
      if (diffToStart > 10 * 60 * 1000 || diffToStart < -60 * 60 * 1000) return;
    }

    const updatedAlerted = [...alerted.slice(-29), alarm.name];
    await api.storage.local.set({ f1_alerted_sessions: updatedAlerted });

    const sessionTitle = sessInfo ? `${sessInfo.sessionName} (${sessInfo.sessionCode})` : 'F1 Session';
    const raceTitle = sessInfo ? sessInfo.raceName : 'Grand Prix';

    createSafeNotification(alarm.name, {
      type: 'basic',
      iconUrl: api.runtime.getURL('assets/icon128.png'),
      title: `🟢 ${sessionTitle} is Underway!`,
      message: `${raceTitle} • Session is now live! Open F1 Dash for the live timing tower.`,
      priority: 2
    }, false);

    playRadioBeep(settings.volume);
  }
});

// ============================================================
// OPEN EXTENSION POPUP / INTERFACE
// ============================================================
async function openExtensionUI() {
  const url = api.runtime.getURL('popup.html');

  // 1. Try to open the extension popup directly (if supported by browser)
  if (api.action && typeof api.action.openPopup === 'function') {
    try {
      await api.action.openPopup();
      return;
    } catch (_) {}
  }
  if (api.browserAction && typeof api.browserAction.openPopup === 'function') {
    try {
      await api.browserAction.openPopup();
      return;
    } catch (_) {}
  }

  // 2. If already open in a tab, switch to and focus that tab
  try {
    const tabs = await api.tabs.query({ url: `${url}*` });
    if (tabs && tabs.length > 0) {
      await api.tabs.update(tabs[0].id, { active: true });
      if (tabs[0].windowId && api.windows && api.windows.update) {
        await api.windows.update(tabs[0].windowId, { focused: true });
      }
      return;
    }
  } catch (_) {}

  // 3. Otherwise open the extension popup in a new tab
  try {
    await api.tabs.create({ url });
  } catch (err) {
    console.warn('[F1 Alert] Failed to open extension UI:', err);
  }
}

// Click notification button (Chrome / Edge / Chromium)
if (api.notifications && api.notifications.onButtonClicked) {
  api.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
    if (btnIdx === 0) {
      stopF1Theme();
      if (notifId) {
        try { api.notifications.clear(notifId); } catch (_) {}
      }
    }
  });
}

// Click notification body to stop alarm and open extension
api.notifications.onClicked.addListener((notifId) => {
  stopF1Theme();
  if (notifId) {
    try { api.notifications.clear(notifId); } catch (_) {}
  }
  openExtensionUI();
});

// Dismiss / swipe away notification automatically silences the alarm
if (api.notifications && api.notifications.onClosed) {
  api.notifications.onClosed.addListener(() => {
    stopF1Theme();
  });
}

// ============================================================
// RUNTIME MESSAGE HANDLER (From Popup UI)
// ============================================================
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "TEST_RADIO") {
    const volume = typeof msg.volume === "number" ? msg.volume : 0.85;
    playRadioBeep(volume);
    api.notifications.create("f1_test_radio_notification", {
      type: "basic",
      iconUrl: api.runtime.getURL("assets/icon128.png"),
      title: "Team Radio Alert",
      message: "Qualifying results confirmed. Testing team radio notification sound.",
      priority: 2
    });
    sendResponse({ status: "ok" });
    return true;
  }
  if (msg.action === 'TEST_ALARM') {
    const volume = typeof msg.volume === 'number' ? msg.volume : 0.85;
    
    // Fire test notification safely
    createSafeNotification('f1_test_notification', {
      type: 'basic',
      iconUrl: api.runtime.getURL('assets/icon128.png'),
      title: '🏎️ F1 Live Alert: Alarm Test Active!',
      message: 'Lights out in 5 minutes! Playing official F1 Theme. Click to open F1 Dash.',
      priority: 2
    }, true);

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
