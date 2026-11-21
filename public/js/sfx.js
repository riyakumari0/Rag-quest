// Chiptune sound effects and a tiny noir music loop, made live with Web Audio (no files).
let ctx = null;
let soundOn = true;
let musicTimer = null;
let musicStep = 0;
let nextTime = 0;

function audio() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = "square", vol = 0.05, at = 0, slide = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const seq = (notes, step = 0.08, opts = {}) => notes.forEach((f, i) => f && tone(f, step * 1.4, { ...opts, at: i * step }));

const FX = {
  click: () => tone(660, 0.05, { vol: 0.04 }),
  tick: () => tone(1200 + Math.random() * 300, 0.02, { vol: 0.012 }),
  send: () => seq([523, 784], 0.06, { vol: 0.04 }),
  reply: () => seq([392, 330], 0.07, { vol: 0.035, type: "triangle" }),
  unlock: () => seq([523, 659, 784, 1047], 0.07, { vol: 0.045 }),
  pinOk: () => { seq([392, 523, 659, 784, 1047], 0.07, { vol: 0.05 }); tone(110, 0.25, { type: "triangle", vol: 0.2 }); },
  pinBad: () => seq([311, 262, 196, 147], 0.1, { vol: 0.05, type: "sawtooth" }),
  stress: () => tone(220, 0.18, { vol: 0.04, slide: 80 }),
  crack: () => seq([196, 0, 392, 523, 659], 0.09, { vol: 0.05 }),
  warrant: () => { tone(90, 0.12, { type: "triangle", vol: 0.25 }); seq([0, 0, 659, 880], 0.06, { vol: 0.04 }); },
  win: () => seq([523, 659, 784, 1047, 0, 784, 1047, 1319], 0.11, { vol: 0.05 }),
  lose: () => seq([392, 370, 349, 330, 0, 262], 0.16, { vol: 0.05, type: "triangle" }),
  meow: () => tone(880, 0.25, { type: "triangle", vol: 0.05, slide: -360 }),
};

export function sfx(name) {
  if (!soundOn) return;
  try { FX[name] && FX[name](); } catch { /* audio is optional */ }
}

export function setSound(on) { soundOn = on; }

// Am - F - Dm - E : a slow, sneaky detective loop
const BASS = [110, 110, 87.3, 87.3, 73.4, 73.4, 82.4, 82.4];
const ARP = [[220, 262, 330, 262], [175, 220, 262, 220], [147, 175, 220, 175], [165, 208, 247, 208]];

function scheduleMusic() {
  const a = audio();
  if (!a) return;
  while (nextTime < a.currentTime + 0.2) {
    const bar = Math.floor(musicStep / 8) % 4;
    const beat = musicStep % 8;
    const at = nextTime - a.currentTime;
    if (beat % 2 === 0) tone(BASS[bar * 2] / 2, 0.32, { type: "triangle", vol: 0.06, at });
    tone(ARP[bar][beat % 4] * 2, 0.12, { type: "square", vol: 0.012, at });
    nextTime += 0.2;
    musicStep++;
  }
}

export function setMusic(on) {
  if (on && !musicTimer) {
    const a = audio();
    if (!a) return;
    nextTime = a.currentTime + 0.05;
    musicTimer = setInterval(scheduleMusic, 50);
  } else if (!on && musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
