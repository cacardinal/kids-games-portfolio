// Synthesized SFX (from shared contract §4) — zero asset files.
// AudioContext unlocks on first user gesture (iOS). Default ON; mute persisted per profile.
let ctx: AudioContext | null = null;
let muted = false;
export function setMuted(m: boolean) {
  muted = m;
}
export function isMuted() {
  return muted;
}
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume(); // call sites are always user gestures
  return ctx;
}
function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  gainPeak = 0.18,
  when = 0,
) {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gainPeak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
function noise(dur: number, gainPeak = 0.12, when = 0) {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime + when;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource();
  s.buffer = buf;
  const g = c.createGain();
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 1200;
  g.gain.setValueAtTime(gainPeak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t0);
}
export const sfx = {
  tap: () => tone(660, 0.06, "triangle", 0.1),
  select: () => {
    tone(520, 0.05, "triangle", 0.09);
    tone(780, 0.06, "triangle", 0.07, 0.04);
  },
  success: () => {
    tone(523, 0.1, "sine", 0.16);
    tone(659, 0.1, "sine", 0.16, 0.09);
    tone(784, 0.22, "sine", 0.18, 0.18);
  },
  fail: () => tone(196, 0.25, "sine", 0.1), // soft, never harsh
  stamp: () => {
    noise(0.08, 0.2);
    tone(110, 0.15, "sine", 0.22, 0.02);
  },
  collect: () => {
    tone(880, 0.05, "triangle", 0.12);
    tone(1318, 0.09, "triangle", 0.1, 0.05);
  },
  // detective additions (GDD §4.8)
  whoosh: () => noise(0.18, 0.1), // rising air before the stamp lands
  paper: () => {
    noise(0.05, 0.06);
    tone(240, 0.05, "triangle", 0.05, 0.02);
  }, // soft page shuffle
};
