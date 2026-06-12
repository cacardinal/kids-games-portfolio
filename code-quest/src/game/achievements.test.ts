import { describe, it, expect } from "vitest";
import { evaluateAwards, isSingleRepeat } from "./achievements";
import { freshSave, emptyMissionProgress } from "../state/save";
import type { ProfileSave } from "../state/save";
import type { Chip } from "./interpreter";
import { MISSIONS } from "../data/missions";

function saveWith(missions: ProfileSave["missions"], extra: Partial<ProfileSave> = {}): ProfileSave {
  return { ...freshSave(), missions, ...extra };
}

let idc = 0;
const c = (op: "MOVE" | "LEFT" | "RIGHT" | "ACTION"): Chip => ({ id: `a${idc++}`, op });

describe("First Contact badge", () => {
  it("awards on completing M1", () => {
    const save = saveWith({ 1: { ...emptyMissionProgress(), completed: true } });
    const { newBadges } = evaluateAwards(save, 1, [c("MOVE")]);
    expect(newBadges).toContain("first-contact");
  });
});

describe("Debugger badge (mandatory)", () => {
  it("awards when a mission that previously collided is later won", () => {
    const save = saveWith({ 1: { ...emptyMissionProgress(), completed: true, collided: true } });
    const { newBadges } = evaluateAwards(save, 1, [c("MOVE")]);
    expect(newBadges).toContain("debugger");
  });
  it("does NOT award if the mission never collided", () => {
    const save = saveWith({ 2: { ...emptyMissionProgress(), completed: true, collided: false } });
    const { newBadges } = evaluateAwards(save, 2, [c("MOVE")]);
    expect(newBadges).not.toContain("debugger");
  });
});

describe("One-Liner badge", () => {
  it("isSingleRepeat true only for a lone REPEAT chip", () => {
    const rep: Chip = { id: "r", op: "REPEAT", times: 5, body: [{ id: "b", op: "MOVE" }] };
    expect(isSingleRepeat([rep])).toBe(true);
    expect(isSingleRepeat([rep, c("MOVE")])).toBe(false);
    expect(isSingleRepeat([c("MOVE")])).toBe(false);
  });
  it("awards on a single-REPEAT win (M9 ×5)", () => {
    const save = saveWith({ 9: { ...emptyMissionProgress(), completed: true } });
    const { newBadges } = evaluateAwards(save, 9, MISSIONS.find((m) => m.id === 9)!.solutions[0]);
    expect(newBadges).toContain("one-liner");
  });
});

describe("Long Haul badge (>=15 expanded commands)", () => {
  it("awards on M12's 20-command circuit", () => {
    const save = saveWith({ 12: { ...emptyMissionProgress(), completed: true } });
    const { newBadges } = evaluateAwards(save, 12, MISSIONS.find((m) => m.id === 12)!.solutions[0]);
    expect(newBadges).toContain("long-haul");
  });
  it("does NOT award on a small ×5 MOVE loop (5 commands)", () => {
    const save = saveWith({ 9: { ...emptyMissionProgress(), completed: true } });
    const { newBadges } = evaluateAwards(save, 9, MISSIONS.find((m) => m.id === 9)!.solutions[0]);
    expect(newBadges).not.toContain("long-haul");
  });
});

describe("Efficient Operator + Phosphor cosmetic", () => {
  it("awards the badge at 6 efficiency stars and unlocks Phosphor Veteran", () => {
    const missions: ProfileSave["missions"] = {};
    for (let i = 1; i <= 6; i++) missions[i] = { ...emptyMissionProgress(), completed: true, efficient: true };
    const save = saveWith(missions);
    const { newBadges, newCosmetics } = evaluateAwards(save, 6, [c("MOVE")]);
    expect(newBadges).toContain("efficient-operator");
    expect(newCosmetics).toContain("phosphor");
  });
});

describe("sector-clear cosmetics + Loop Master", () => {
  it("clearing sector 1 unlocks Surveyor Cyan", () => {
    const missions: ProfileSave["missions"] = {};
    for (let i = 1; i <= 4; i++) missions[i] = { ...emptyMissionProgress(), completed: true };
    const save = saveWith(missions);
    const { newCosmetics } = evaluateAwards(save, 4, [c("MOVE")]);
    expect(newCosmetics).toContain("surveyor");
  });
  it("clearing all of sector 3 awards Loop Master + Loop Runner skin", () => {
    const missions: ProfileSave["missions"] = {};
    for (let i = 9; i <= 12; i++) missions[i] = { ...emptyMissionProgress(), completed: true };
    const save = saveWith(missions);
    const { newBadges, newCosmetics } = evaluateAwards(save, 12, MISSIONS.find((m) => m.id === 12)!.solutions[0]);
    expect(newBadges).toContain("loop-master");
    expect(newCosmetics).toContain("loop-runner");
  });
});
