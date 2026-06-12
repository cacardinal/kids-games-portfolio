# Shared Design & Technical Contract

> Binding for ALL five apps. Where an app spec or GDD conflicts with this document, THIS document wins — report the deviation in your build report. Reference code below is copied into each app verbatim (then typed/adjusted minimally); the point is that all five copies start identical.

## 1. Scaffold

```bash
npm create vite@latest <app-dir> -- --template react-ts
cd <app-dir> && npm install
```

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { port: 518X, strictPort: true, host: true }, // X per PLAN.md table — binding
});
```

If `npm install` fails with EEXIST/cache-race errors (parallel installs share ~/.npm), retry once with `npm install --cache /tmp/npm-cache-<app>`.

`index.html` head additions:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icon-180.png" />
```

`public/manifest.json` (adjust name/colors per app):
```json
{
  "name": "Detective Academy",
  "short_name": "Detective",
  "display": "standalone",
  "background_color": "#14161a",
  "theme_color": "#14161a",
  "icons": [{ "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }]
}
```
Icon requirement: design ONE strong SVG icon per app (flat, 2–3 colors, no text, app-aesthetic-matched), render to `icon-512.png` + `icon-180.png` (use `rsvg-convert`, `sips`, or a tiny node script with `sharp` as devDependency — your choice; PNGs must actually exist, not be empty placeholders).

## 2. Dependency allowlist

Runtime: `zustand`, `lucide-react`, `@fontsource/<font>` (your app's fonts only). Inventor adds `matter-js` (**exact pin `0.20.0`**, no caret) + `@types/matter-js` (dev). Explorer adds `d3-geo`, `topojson-client`, `world-atlas@2` (+ `@types/d3-geo`, `@types/topojson-client` dev). Dev: whatever the Vite template ships + `vitest` + optionally `sharp` for icon rendering. **Anything else: note it and justify it in your build report.** No Tailwind, no router, no UI kits, no animation libraries (CSS/SVG only), no axios/fetch wrappers (no network calls exist).

## 3. Design register

Per-app palettes/fonts live in each app spec. Shared scales:

- Type: body 18px / line-height 1.5; meta 14px; h2 24–28px; h1 32–40px; prose blocks max 60ch.
- Spacing: 4 / 8 / 12 / 16 / 24 / 32. One border-radius per app (6–10px), used everywhere.
- Hit targets: ≥48px primary actions, ≥44px everything else. Generous gaps between adjacent targets (kid fingers).
- Micro-interactions 100–200ms ease-out; earned set-pieces 800–1200ms (skippable by tap). Respect `prefers-reduced-motion` (cut set-pieces to ≤200ms fades, kill particles).
- Focus-visible rings on all interactive elements; text contrast ≥4.5:1; icon buttons get `aria-label`.

**Copy register.** Talk to the player like a capable colleague. System copy is calm, specific, and quietly warm.
- YES: "Case closed. The muddy footprint cleared Maya — solid deduction." / "Collision at step 4. The rover hit the east wall." / "Engineers test things. Test #3."
- NO: "Great job, buddy!!" / "Oops! Try again!" / emoji as UI chrome / exclamation marks in system copy / any sentence you couldn't imagine in a real professional tool.

**Forbidden:** streaks, daily-pressure mechanics, FOMO timers, loss-aversion copy, hollow celebration for trivial taps, default component-library styling (Bootstrap-gradient buttons, generic gray cards), talking mascots.

## 4. Game Feel (v1-MANDATORY — these apps must beat ad-funded games for the kids' attention)

- **100ms rule:** every tap produces visible (usually audible) feedback within 100ms — press states, chip pops, card lifts.
- **Success set-pieces** (800–1200ms, app spec defines yours): stamps slam with ink splat, flags raise, patches mint with glow. Particles encouraged when tied to meaning (ink, sparks, crystal sparkle, impact dust). Celebrations scale with achievement; trivial actions never celebrate.
- **Avatar charm:** the playable thing has life via motion (idle bob, reaction to failure/success). Personality lives in animation, never in talking mascots.
- **Atmosphere:** backgrounds have texture and light, never flat admin gray. Commit to your app's bit (lamplight, chalk dust, phosphor glow, parchment, linen).
- **Cosmetic unlocks:** 4–6 per app, earned by progression, pure CSS/SVG variables (skins/covers/banners/pen colors). Surfaced in the profile screen.
- **First win ≤2 minutes** from cold start for a brand-new profile.
- **Sound v1-required** — reference module below. Default ON, mute toggle persisted per profile.

### `src/lib/sfx.ts` (reference implementation — copy, then add 1–2 app-specific voices)
```ts
// Synthesized SFX — zero asset files. AudioContext unlocks on first user gesture (iOS).
let ctx: AudioContext | null = null;
let muted = false;
export function setMuted(m: boolean) { muted = m; }
export function isMuted() { return muted; }
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) { const C = window.AudioContext ?? (window as any).webkitAudioContext; if (!C) return null; ctx = new C(); }
  if (ctx.state === "suspended") void ctx.resume(); // call sites are always user gestures
  return ctx;
}
function tone(freq: number, dur: number, type: OscillatorType = "sine", gainPeak = 0.18, when = 0) {
  const c = ac(); if (!c || muted) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gainPeak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(dur: number, gainPeak = 0.12, when = 0) {
  const c = ac(); if (!c || muted) return;
  const t0 = c.currentTime + when;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf;
  const g = c.createGain(); const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1200;
  g.gain.setValueAtTime(gainPeak, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(c.destination); s.start(t0);
}
export const sfx = {
  tap: () => tone(660, 0.06, "triangle", 0.1),
  select: () => { tone(520, 0.05, "triangle", 0.09); tone(780, 0.06, "triangle", 0.07, 0.04); },
  success: () => { tone(523, 0.1, "sine", 0.16); tone(659, 0.1, "sine", 0.16, 0.09); tone(784, 0.22, "sine", 0.18, 0.18); },
  fail: () => tone(196, 0.25, "sine", 0.1), // soft, never harsh
  stamp: () => { noise(0.08, 0.2); tone(110, 0.15, "sine", 0.22, 0.02); },
  collect: () => { tone(880, 0.05, "triangle", 0.12); tone(1318, 0.09, "triangle", 0.1, 0.05); },
};
```
Wire `sfx.tap()`/`select()` into shared button/chip components, not into every call site.

## 5. Read-aloud — `src/lib/tts.ts` (reference implementation; additive ONLY)

The app must be fully playable with speech off/unavailable. Our 6-year-old is an early reader — every prose block (briefings, statements, facts, counsel/event text) gets a `SpeakButton` (lucide `Volume2`, `aria-label="Read aloud"`); a visible stop affordance appears while speaking.

```ts
const available = typeof window !== "undefined" && "speechSynthesis" in window;
export function speak(text: string) {
  if (!available) return;
  window.speechSynthesis.cancel(); // iOS stuck-queue guard
  for (const s of text.split(/(?<=[.!?])\s+/)) { // sentence chunks: iOS long-utterance bug
    const u = new SpeechSynthesisUtterance(s);
    u.rate = 0.95; // no voice selection — getVoices() is unreliable on iOS
    window.speechSynthesis.speak(u);
  }
}
export function stopSpeaking() { if (available) window.speechSynthesis.cancel(); }
```
Rules: ONLY called from tap handlers (iOS gesture gating — never auto-narrate); `stopSpeaking()` on unmount/navigation.

## 6. Profiles & persistence

Three fixed profiles, defined in each app's `src/profiles.ts`: **Player One**, **Player Two**, **Guest** (display names are overridable at home via an untracked `src/profiles.local.ts`). No CRUD UI. First screen (or header switcher): "Who's playing?" with three monogram discs (colored circle + initial — no emoji, no avatars to manage).

Storage: one key per profile, `kg.<app>.v1.<profileId>` (e.g., `kg.detective.v1.p1`). Save shape always includes `{ version: 1, ... }`.

### `src/lib/storage.ts` (reference)
```ts
export function loadSave<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return fallback;
    return { ...fallback, ...parsed }; // unknown fields ignored by readers; missing fields filled
  } catch { return fallback; } // corrupt JSON → fresh save, NEVER white-screen
}
export function persistSave(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota: drop silently */ }
}
```
Use zustand `persist` with a custom storage built on these guards, `name` = the profile key, re-created on profile switch (or roll your own store hydration — either is fine; the guards are mandatory). Autosave on every meaningful state change; quitting mid-anything is always safe.

Root component wraps in an `ErrorBoundary` whose fallback offers "Reset this profile's save" (clears only the active profile key).

## 7. Seeded PRNG — `src/lib/rng.ts` (reference)

```ts
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```
Draw order is FROZEN once shipped: content item N is defined by seed N forever (kids' "Case 12" must stay the same case after updates). Content growth is append-only.

## 8. Cleanup contract (StrictMode-safe, all apps)

Every `useEffect` that starts a timer/interval/rAF loop/speech/physics engine returns a FULL teardown. React StrictMode double-mounts in dev: two engines, double-speaking, and double intervals are bugs you must design out, not disable StrictMode around. Inventor's engine lifecycle has additional binding rules in its spec.

## 9. Touch / iPad

`touch-action: none` on boards/canvases (page must not scroll-fight); `user-select: none` on interactive surfaces; Pointer Events ONLY (no mouse-only handlers, no matter-js MouseConstraint). Tap-first: every interaction achievable with discrete taps (select-then-place; tap-to-append; chip taps). Drag may be ADDED as polish via pointer capture, never required. Test layouts at 1180×820 (iPad landscape) and 1440×900; portrait iPad should be usable, phone is best-effort.

## 10. App structure

```
src/
  game/        # pure logic: generators, solvers, interpreters, reducers — NO React imports
  state/       # zustand store(s)
  components/  # shared UI atoms (Button, Card, SpeakButton, Modal, Toast)
  screens/     # view-state screens (no router — a top-level view enum in the store)
  data/        # content: levels/cases/missions/decks as typed TS or JSON
  lib/         # sfx.ts, tts.ts, storage.ts, rng.ts (from this contract)
  styles.css   # design tokens as CSS custom properties + component classes
```

`src/game/` is where Vitest lives (`*.test.ts` colocated or in `src/game/__tests__/`). Logic modules export pure functions; React layers consume them.

## 11. Definition of done (engineer gate — run these, paste summaries in your report)

```bash
npx tsc --noEmit      # clean
npm run build         # clean
npx vitest run        # all green, including the app spec's REQUIRED suites
```
Plus: acceptance checklist self-reviewed against the running app (you may use `npm run build && npx vite preview` + curl for smoke, but do NOT use Playwright MCP and do NOT leave any server running); README.md (what it is, how to run, port, test command); manifest + real icons; no git commits; nothing written outside your app directory.
