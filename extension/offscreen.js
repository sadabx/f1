if (audio) {
  audio.onended = () => {
    chrome.runtime.sendMessage({ action: 'AUDIO_ENDED' }).catch(() => {});
  };
}

// Offscreen audio player for Manifest V3 background audio
const audio = document.getElementById('f1-theme-audio');
let currentOscillators = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'PLAY_ALARM') {
    const volume = typeof msg.volume === 'number' ? msg.volume : 0.8;
    playAlarm(volume).then(() => sendResponse({ status: 'playing' }))
      .catch((err) => {
        console.warn('Audio element playback failed, falling back to Web Audio synth:', err);
        playWebAudioFanfare(volume);
        sendResponse({ status: 'synthesized_fallback' });
      });
    return true; // Keep message channel open for async response
  }

  if (msg.action === 'STOP_ALARM') {
    stopAlarm();
    sendResponse({ status: 'stopped' });
  }
});

async function playAlarm(volume) {
  if (!audio) return;
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.currentTime = 0;
  await audio.play();
}

function stopAlarm() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  currentOscillators.forEach(osc => {
    try { osc.stop(); } catch(e) {}
  });
  currentOscillators = [];
}

// Fallback procedural fanfare if audio file is blocked or fails
function playWebAudioFanfare(volume = 0.8) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.5;
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    const notes = [
      { f: 392.00, t: 0.0, d: 0.3 },  // G4
      { f: 523.25, t: 0.32, d: 0.3 }, // C5
      { f: 622.25, t: 0.65, d: 0.2 }, // Eb5
      { f: 783.99, t: 0.88, d: 0.6 }, // G5
      { f: 698.46, t: 1.5, d: 0.3 },  // F5
      { f: 622.25, t: 1.85, d: 0.35 },// Eb5
      { f: 523.25, t: 2.25, d: 0.2 }, // C5
      { f: 698.46, t: 2.5, d: 0.35 }, // F5
      { f: 783.99, t: 2.9, d: 1.0 }   // G5
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      noteGain.gain.setValueAtTime(0.001, now + n.t);
      noteGain.gain.exponentialRampToValueAtTime(1, now + n.t + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(noteGain);
      noteGain.connect(gain);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
      currentOscillators.push(osc);
    });
  } catch (e) {
    console.error('Web Audio Synth failed:', e);
  }
}
