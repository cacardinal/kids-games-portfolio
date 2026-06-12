// Progression math (specs §"Progression"; GDD §2.1-2.3, §6). Pure functions.

export type RankId =
  | "cadet"
  | "junior"
  | "detective"
  | "senior"
  | "inspector"
  | "chief";

export interface Rank {
  id: RankId;
  name: string;
  xp: number; // cumulative lifetime XP needed
}

// GDD §2.3 — cumulative lifetime XP thresholds.
export const RANKS: Rank[] = [
  { id: "cadet", name: "Cadet", xp: 0 },
  { id: "junior", name: "Junior Detective", xp: 250 },
  { id: "detective", name: "Detective", xp: 800 },
  { id: "senior", name: "Senior Detective", xp: 1800 },
  { id: "inspector", name: "Inspector", xp: 3400 },
  { id: "chief", name: "Chief Inspector", xp: 5600 },
];

export function rankForXp(xp: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) if (xp >= r.xp) current = r;
  return current;
}

export function nextRank(xp: number): Rank | null {
  for (const r of RANKS) if (xp < r.xp) return r;
  return null; // at Chief Inspector
}

// GDD §2.1 base XP by tier.
export function baseXp(tier: 1 | 2 | 3): number {
  return tier === 1 ? 100 : tier === 2 ? 150 : 220;
}

export interface CaseOutcome {
  tier: 1 | 2 | 3;
  firstTry: boolean; // correct on first ACCUSE submit (no wrong accusation this case)
  hintFree: boolean; // hintsUsed === 0
  methodical: boolean; // every innocent cleared before accusation submitted
  firstTimeClear: boolean; // this case closed for the first time on this profile
}

export interface XpBreakdown {
  base: number;
  firstTry: number;
  sharpEye: number;
  methodical: number;
  firstTimeClear: number;
  total: number;
}

// GDD §2.2 — bonuses. Director amendment: replays MAY re-earn performance bonuses
// (firstTry, sharpEye, methodical), but NOT the one-time firstTimeClear.
// Fix 6 (honest payouts): Methodical raised +30 -> +60 so the thorough "clear every
// innocent first" path clearly out-earns the straight-to-accuse speedrun.
export function computeXp(o: CaseOutcome): XpBreakdown {
  const base = baseXp(o.tier);
  const firstTry = o.firstTry ? 50 : 0;
  const sharpEye = o.hintFree ? 40 : 0;
  const methodical = o.methodical ? 60 : 0;
  const firstTimeClear = o.firstTimeClear ? 25 : 0;
  return {
    base,
    firstTry,
    sharpEye,
    methodical,
    firstTimeClear,
    total: base + firstTry + sharpEye + methodical + firstTimeClear,
  };
}

// --- Badges (GDD §6.1) ---
export type BadgeId =
  | "sharp_eye"
  | "methodical"
  | "first_case"
  | "clean_hands"
  | "quick_study"
  | "red_herring_hunter"
  | "three_tiers"
  | "case_files_complete";

export interface BadgeDef {
  id: BadgeId;
  name: string;
  glyph: string; // lucide icon name
  description: string;
}

export const BADGES: BadgeDef[] = [
  { id: "sharp_eye", name: "Sharp Eye", glyph: "Eye", description: "Closed a case with no hints." },
  { id: "methodical", name: "Methodical", glyph: "ListChecks", description: "Cleared everyone before naming the culprit." },
  { id: "first_case", name: "First Case", glyph: "FolderOpen", description: "Opened and closed your very first file." },
  { id: "clean_hands", name: "Clean Hands", glyph: "Sparkles", description: "No wrong accusations on the case." },
  { id: "quick_study", name: "Quick Study", glyph: "Zap", description: "Read fast, deduced faster." },
  { id: "red_herring_hunter", name: "Red-Herring Hunter", glyph: "Fish", description: "Ignored the noise, used only real proof." },
  { id: "three_tiers", name: "Three Tiers", glyph: "Layers", description: "Solved across all difficulty tiers." },
  { id: "case_files_complete", name: "Case Files Complete", glyph: "Trophy", description: "Every case in the academy, closed." },
];

export function badgeById(id: BadgeId): BadgeDef {
  return BADGES.find((b) => b.id === id)!;
}

// Director amendment: Quick Study timer is tier-relative — 90 / 150 / 210s for tiers 1/2/3.
export function quickStudyThresholdMs(tier: 1 | 2 | 3): number {
  const seconds = tier === 1 ? 90 : tier === 2 ? 150 : 210;
  return seconds * 1000;
}

// --- Cosmetics: Detective ID-card styles (GDD §6.2 + director amendment: 6th card). ---
export type CardStyleId =
  | "standard"
  | "lamplight"
  | "pinboard"
  | "brass_ink"
  | "obsidian" // Inspector — added so every rank mints a card (director amendment)
  | "chiefs_seal";

export interface CardStyle {
  id: CardStyleId;
  name: string;
  unlockRank: RankId;
}

// One card per rank (director amendment makes the set 6, every rank mints one).
export const CARD_STYLES: CardStyle[] = [
  { id: "standard", name: "Standard Issue", unlockRank: "cadet" },
  { id: "lamplight", name: "Lamplight", unlockRank: "junior" },
  { id: "pinboard", name: "Pinboard", unlockRank: "detective" },
  { id: "brass_ink", name: "Brass & Ink", unlockRank: "senior" },
  { id: "obsidian", name: "Inspector's Ink", unlockRank: "inspector" },
  { id: "chiefs_seal", name: "Chief's Seal", unlockRank: "chief" },
];

const RANK_INDEX: Record<RankId, number> = {
  cadet: 0,
  junior: 1,
  detective: 2,
  senior: 3,
  inspector: 4,
  chief: 5,
};

/** Card styles unlocked at or below the given rank. */
export function unlockedCardStyles(rank: RankId): CardStyle[] {
  const max = RANK_INDEX[rank];
  return CARD_STYLES.filter((c) => RANK_INDEX[c.unlockRank] <= max);
}

/** The single card style newly granted when crossing INTO `rank` (1:1 mapping). */
export function cardStyleForRank(rank: RankId): CardStyle | undefined {
  return CARD_STYLES.find((c) => c.unlockRank === rank);
}
