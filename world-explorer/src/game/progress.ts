import type { Region } from "../data/types";
import { REGION_ORDER, REGION_CONTINENTS } from "../data/types";
import { MISSIONS, missionsForRegion } from "../data/missions";

// ── Save shape ──────────────────────────────────────────────────────────────
// One record per mission: completed + whether a star was earned (first result
// frozen; stars/stamps are monotonic and never decrement — GDD §2).
export interface MissionResult {
  completed: boolean;
  star: boolean;
}

export interface ExplorerLogEntry {
  factId: string; // mission id (one fact per mission)
  text: string;
  region: Region;
}

export interface SaveV1 {
  version: 1;
  missions: Record<string, MissionResult>; // keyed by mission id
  log: ExplorerLogEntry[]; // appended on completion, deduped by factId
  factsRead: string[]; // distinct factIds read aloud (Fact Reader badge)
  cover: string; // active passport cover id
  muted: boolean;
  largeText: boolean;
}

export function freshSave(): SaveV1 {
  return {
    version: 1,
    missions: {},
    log: [],
    factsRead: [],
    cover: "voyager",
    muted: false,
    largeText: false,
  };
}

// ── Completion counts ────────────────────────────────────────────────────────
export function regionCompletedCount(save: SaveV1, region: Region): number {
  return missionsForRegion(region).reduce(
    (n, m) => n + (save.missions[m.id]?.completed ? 1 : 0),
    0,
  );
}

export function totalStamps(save: SaveV1): number {
  return Object.values(save.missions).filter((r) => r.completed).length;
}

export function totalStars(save: SaveV1): number {
  return Object.values(save.missions).filter((r) => r.completed && r.star).length;
}

// ── Unlock gating (GDD §2; spec required test #3: ≥4 threshold) ──────────────
export const UNLOCK_THRESHOLD = 4;

export function isRegionUnlocked(save: SaveV1, region: Region): boolean {
  const idx = REGION_ORDER.indexOf(region);
  if (idx <= 0) return true; // Region 1 always open
  const prev = REGION_ORDER[idx - 1];
  return regionCompletedCount(save, prev) >= UNLOCK_THRESHOLD;
}

/** For a locked region, how many more of the PREVIOUS region are needed. */
export function missionsNeededToUnlock(save: SaveV1, region: Region): number {
  const idx = REGION_ORDER.indexOf(region);
  if (idx <= 0) return 0;
  const prev = REGION_ORDER[idx - 1];
  return Math.max(0, UNLOCK_THRESHOLD - regionCompletedCount(save, prev));
}

// ── Apply a mission completion (pure; returns a NEW save) ─────────────────────
export function applyCompletion(
  save: SaveV1,
  missionId: string,
  earnedStar: boolean,
  fact: string,
  region: Region,
): SaveV1 {
  const existing = save.missions[missionId];
  // Monotonic, never-decrement rule: the stamp is frozen once earned, and the star
  // only ever goes UP (false → true) — never down. This lets the wrong-pick
  // redemption replay (Fix 3) actually award the star on a later clean run, while
  // a re-miss can never strip a star already earned.
  const next: MissionResult = existing?.completed
    ? { completed: true, star: existing.star || earnedStar }
    : { completed: true, star: earnedStar };

  const missions = { ...save.missions, [missionId]: next };

  const log = save.log.some((e) => e.factId === missionId)
    ? save.log
    : [...save.log, { factId: missionId, text: fact, region }];

  const candidate: SaveV1 = { ...save, missions, log };
  return { ...candidate, cover: highestUnlockedIfDefault(candidate) };
}

/** Record a distinct fact read aloud (Fact Reader badge). Returns NEW save. */
export function recordFactRead(save: SaveV1, factId: string): SaveV1 {
  if (save.factsRead.includes(factId)) return save;
  return { ...save, factsRead: [...save.factsRead, factId] };
}

// ── Cosmetic covers (GDD §2 ladder + §6) ─────────────────────────────────────
export interface Cover {
  id: string;
  name: string;
  unlockAt: number; // stamps required
}

export const COVERS: Cover[] = [
  { id: "voyager", name: "Voyager", unlockAt: 0 },
  { id: "field-linen", name: "Field Linen", unlockAt: 3 },
  { id: "deep-sea", name: "Deep Sea", unlockAt: 8 },
  { id: "summit", name: "Summit", unlockAt: 13 },
  { id: "aurora", name: "Aurora", unlockAt: 18 },
];

export function isCoverUnlocked(save: SaveV1, coverId: string): boolean {
  const cover = COVERS.find((c) => c.id === coverId);
  if (!cover) return false;
  return totalStamps(save) >= cover.unlockAt;
}

// If the player hasn't manually changed cover (still on a now-surpassed default),
// auto-advance to the highest unlocked. We approximate "hasn't changed" by: the
// current cover is still unlocked → keep it; only bump when a freshly unlocked
// cover appears AND the player is on the previous default tier. To stay simple and
// predictable we only auto-bump from the literal default ("voyager") so any manual
// pick sticks.
function highestUnlockedIfDefault(save: SaveV1): string {
  if (save.cover !== "voyager") return save.cover; // manual pick is sticky
  const stamps = totalStamps(save);
  const best = [...COVERS].reverse().find((c) => stamps >= c.unlockAt);
  return best?.id ?? "voyager";
}

// ── Badges (GDD §6) ──────────────────────────────────────────────────────────
export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: (save: SaveV1) => boolean;
}

export const BADGES: Badge[] = [
  {
    id: "first-stamp",
    name: "First Stamp",
    description: "Your passport's first mark.",
    earned: (s) => totalStamps(s) >= 1,
  },
  {
    id: "trailblazer",
    name: "Trailblazer",
    description: "Found it on the first tap.",
    earned: (s) => totalStars(s) >= 1,
  },
  {
    id: "route-master",
    name: "Route Master",
    description: "Traced every great route.",
    earned: (s) =>
      MISSIONS.filter((m) => m.type === "route").every((m) => s.missions[m.id]?.completed),
  },
  {
    id: "continental",
    name: "Continental",
    description: "Cleared a whole region.",
    earned: (s) => REGION_ORDER.some((r) => regionCompletedCount(s, r) === 6),
  },
  {
    id: "fact-reader",
    name: "Fact Reader",
    description: "Listened to ten discoveries.",
    earned: (s) => s.factsRead.length >= 10,
  },
  {
    id: "globetrotter",
    name: "Globetrotter",
    description: "Stamped the whole world.",
    earned: (s) => totalStamps(s) >= 18,
  },
];

// Continent bounds key for the map's fitExtent (region → continents).
export function continentsForRegion(region: Region) {
  return REGION_CONTINENTS[region];
}
