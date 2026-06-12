// Per-profile save shape + helpers. Storage key: kg.codequest.v1.<profileId> (shared contract §6).
import type { BadgeId } from "../data/badges";
import type { CosmeticId } from "../data/cosmetics";
import { PROFILES } from "../profiles";

// Ids are config-driven (profiles.ts) and key the localStorage saves, so the id type is
// an open string.
export type ProfileId = string;

export interface MissionProgress {
  completed: boolean; // completion star
  efficient: boolean; // efficiency star (chips <= par)
  collided: boolean; // ever ended a run in collision (for the Debugger badge)
  bestChips: number | null; // fewest source chips on a winning run
}

export interface ProfileSave {
  version: 1;
  missions: Record<number, MissionProgress>;
  badges: BadgeId[];
  cosmeticUnlocked: CosmeticId[];
  cosmeticSelected: CosmeticId;
  muted: boolean;
  stepHintSeen: number[]; // mission ids where the STEP hint already surfaced
}

export const SAVE_KEY = (profile: ProfileId) => `kg.codequest.v1.${profile}`;

export function emptyMissionProgress(): MissionProgress {
  return { completed: false, efficient: false, collided: false, bestChips: null };
}

export function freshSave(): ProfileSave {
  return {
    version: 1,
    missions: {},
    badges: [],
    cosmeticUnlocked: ["standard"],
    cosmeticSelected: "standard",
    muted: false,
    stepHintSeen: [],
  };
}

export { PROFILES };

export function getMission(save: ProfileSave, id: number): MissionProgress {
  return save.missions[id] ?? emptyMissionProgress();
}

// Total stars (completion + efficiency).
export function totalStars(save: ProfileSave): number {
  let n = 0;
  for (const id in save.missions) {
    const m = save.missions[id];
    if (m.completed) n++;
    if (m.efficient) n++;
  }
  return n;
}

export function efficiencyStarCount(save: ProfileSave): number {
  let n = 0;
  for (const id in save.missions) if (save.missions[id].efficient) n++;
  return n;
}

// A sector is complete when all four of its missions have a completion star.
export function sectorCleared(save: ProfileSave, sector: 1 | 2 | 3): boolean {
  const ids = sectorMissionIds(sector);
  return ids.every((id) => getMission(save, id).completed);
}

export function sectorMissionIds(sector: 1 | 2 | 3): number[] {
  // Sector N owns missions [4N-3 .. 4N].
  const base = sector * 4 - 3;
  return [base, base + 1, base + 2, base + 3];
}

// Sector unlock: sector 1 always; sector N+1 unlocks when sector N is cleared.
export function sectorUnlocked(save: ProfileSave, sector: 1 | 2 | 3): boolean {
  if (sector === 1) return true;
  return sectorCleared(save, (sector - 1) as 1 | 2 | 3);
}
