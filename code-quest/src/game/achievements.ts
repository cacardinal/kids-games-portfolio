// Pure achievement evaluation: given a winning run + program + prior save, return newly earned
// badges and cosmetic unlocks. Keeps the store thin and makes awards unit-testable.
import type { Chip } from "./interpreter";
import { chipCount, expandedLength } from "./interpreter";
import type { ProfileSave } from "../state/save";
import { efficiencyStarCount, sectorCleared } from "../state/save";
import type { BadgeId } from "../data/badges";
import { EFFICIENT_OPERATOR_COUNT, LONG_HAUL_THRESHOLD } from "../data/badges";
import type { CosmeticId } from "../data/cosmetics";

export interface AwardResult {
  newBadges: BadgeId[];
  newCosmetics: CosmeticId[];
}

// Is the entire program a single REPEAT chip? (One-Liner badge.)
export function isSingleRepeat(program: Chip[]): boolean {
  return program.length === 1 && program[0].op === "REPEAT";
}

/**
 * Evaluate achievements after committing a win. `save` is the POST-win save (mission progress
 * already updated: completed/efficient/collided flags set). `program` is what the kid ran.
 * Returns only newly-earned items (not already present in save.badges / save.cosmeticUnlocked).
 */
export function evaluateAwards(save: ProfileSave, missionId: number, program: Chip[]): AwardResult {
  const have = new Set(save.badges);
  const haveCos = new Set(save.cosmeticUnlocked);
  const newBadges: BadgeId[] = [];
  const newCosmetics: CosmeticId[] = [];

  const add = (b: BadgeId) => {
    if (!have.has(b)) {
      have.add(b);
      newBadges.push(b);
    }
  };
  const addCos = (c: CosmeticId) => {
    if (!haveCos.has(c)) {
      haveCos.add(c);
      newCosmetics.push(c);
    }
  };

  // First Contact — complete M1.
  if (missionId === 1) add("first-contact");

  // Debugger — this mission previously collided and now (post-win) is completed.
  const mp = save.missions[missionId];
  if (mp?.completed && mp?.collided) add("debugger");

  // Efficient Operator — efficiency star on >= 6 missions.
  if (efficiencyStarCount(save) >= EFFICIENT_OPERATOR_COUNT) add("efficient-operator");

  // One-Liner — won with a program that is a single REPEAT chip.
  if (isSingleRepeat(program)) add("one-liner");

  // Long Haul — the run expanded to >= 15 commands.
  if (expandedLength(program) >= LONG_HAUL_THRESHOLD) add("long-haul");

  // Loop Master — all four Loops-sector (sector 3) missions cleared.
  if (sectorCleared(save, 3)) add("loop-master");

  // --- Cosmetic unlocks (sector patches + efficiency badge) ---
  if (sectorCleared(save, 1)) addCos("surveyor");
  if (sectorCleared(save, 2)) addCos("relay");
  if (sectorCleared(save, 3)) addCos("loop-runner");
  if (have.has("efficient-operator")) addCos("phosphor");

  return { newBadges, newCosmetics };
}

export { chipCount };
