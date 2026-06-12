// Cosmetics (Blueprint Pens) + Achievements (Engineer's Log).
// Pens recolor placed-part lines + the flag (CSS var --pen). Unlocked by TOTAL stars.
// Per the director amendment, an early-reader-reachable "Workshop Brass" pen unlocks at 5 stars,
// in addition to the GDD's six.
import type { ProfileSave } from "../state/store";

export interface Pen {
  id: string;
  name: string;
  hex: string;
  unlockStars: number;
}

export const PENS: Pen[] = [
  { id: "chalk", name: "Chalk White", hex: "#e8f1ff", unlockStars: 0 },
  { id: "brass", name: "Workshop Brass", hex: "#d9a441", unlockStars: 5 }, // director amendment (warm amber family)
  { id: "cyan", name: "Cyan Draft", hex: "#4cc9f0", unlockStars: 6 },
  { id: "amber", name: "Amber Line", hex: "#ffd166", unlockStars: 14 },
  { id: "green", name: "Spec Green", hex: "#80ed99", unlockStars: 22 },
  { id: "magenta", name: "Magenta Rev", hex: "#f72585", unlockStars: 30 },
  { id: "gold", name: "Gold Master", hex: "#ffd700", unlockStars: 36 },
];

export function penUnlocked(pen: Pen, totalStars: number): boolean {
  return totalStars >= pen.unlockStars;
}

// FIX 6 — which badges are newly earned going from `before` to `after`? Used to fire a moment-of-earning
// toast on the win screen. Returns the badges that flipped from un-earned to earned.
export function newlyEarnedBadges(before: ProfileSave, after: ProfileSave): Badge[] {
  return BADGES.filter((b) => !b.earned(before) && b.earned(after));
}

// Toast copy for a badge earn, in the game's commendation register: "COMMENDATION · TEST PILOT".
export function badgeToast(badge: Badge): string {
  return `COMMENDATION · ${badge.name.toUpperCase()}`;
}

export interface Badge {
  id: string;
  name: string;
  criteria: string;
  earned: (save: ProfileSave) => boolean;
}

const seriesIds = {
  bridge: [1, 2, 3, 4, 5],
  ballrun: [6, 7, 8, 9],
  launch: [10, 11, 12],
};

export const BADGES: Badge[] = [
  {
    id: "first-approval",
    name: "First Approval",
    criteria: "Solve any mission.",
    earned: (s) => Object.values(s.levels).some((r) => r?.solved),
  },
  {
    id: "test-pilot",
    name: "Test Pilot",
    criteria: "Run 10 tests. Engineers test things.",
    earned: (s) => s.totalTests >= 10,
  },
  {
    id: "clean-sheet",
    name: "Clean Sheet",
    criteria: "Earn all 3 stars on any mission.",
    earned: (s) => Object.values(s.levels).some((r) => (r?.stars ?? 0) >= 3),
  },
  {
    id: "bridge-builder",
    name: "Bridge Builder",
    criteria: "3-star every BRIDGE mission.",
    earned: (s) => seriesIds.bridge.every((id) => (s.levels[id]?.stars ?? 0) >= 3),
  },
  {
    id: "down-the-run",
    name: "Down the Run",
    criteria: "Solve all 4 BALL RUN missions.",
    earned: (s) => seriesIds.ballrun.every((id) => s.levels[id]?.solved),
  },
  {
    id: "launch-authority",
    name: "Launch Authority",
    criteria: "3-star the finale, Over the Wall.",
    earned: (s) => (s.levels[12]?.stars ?? 0) >= 3,
  },
];
