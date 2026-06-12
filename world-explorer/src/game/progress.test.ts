import { describe, it, expect } from "vitest";
import {
  freshSave,
  applyCompletion,
  isRegionUnlocked,
  regionCompletedCount,
  totalStamps,
  totalStars,
  missionsNeededToUnlock,
  isCoverUnlocked,
  BADGES,
  UNLOCK_THRESHOLD,
} from "./progress";
import { missionsForRegion } from "../data/missions";
import type { Region } from "../data/types";

function completeN(region: Region, n: number) {
  let s = freshSave();
  const ms = missionsForRegion(region).slice(0, n);
  for (const m of ms) s = applyCompletion(s, m.id, false, m.fact, region);
  return s;
}

// REQUIRED SUITE #3 — Unlock logic: region gating at the ≥4 threshold.
describe("unlock logic", () => {
  it("region 1 (Americas) is open from a fresh save", () => {
    expect(isRegionUnlocked(freshSave(), "americas")).toBe(true);
  });

  it("region 2 stays LOCKED until 4 Americas missions complete", () => {
    for (let n = 0; n < UNLOCK_THRESHOLD; n++) {
      expect(isRegionUnlocked(completeN("americas", n), "europe-africa"), `at ${n}`).toBe(false);
    }
    expect(isRegionUnlocked(completeN("americas", 4), "europe-africa")).toBe(true);
    expect(isRegionUnlocked(completeN("americas", 6), "europe-africa")).toBe(true);
  });

  it("region 3 stays LOCKED until 4 Europe & Africa missions complete", () => {
    // Even with all of region 1 done, region 3 needs region 2 progress.
    let s = completeN("americas", 6);
    expect(isRegionUnlocked(s, "asia-oceania")).toBe(false);
    const ef = missionsForRegion("europe-africa").slice(0, 4);
    for (const m of ef) s = applyCompletion(s, m.id, false, m.fact, "europe-africa");
    expect(isRegionUnlocked(s, "asia-oceania")).toBe(true);
  });

  it("missionsNeededToUnlock counts down correctly", () => {
    expect(missionsNeededToUnlock(completeN("americas", 0), "europe-africa")).toBe(4);
    expect(missionsNeededToUnlock(completeN("americas", 1), "europe-africa")).toBe(3);
    expect(missionsNeededToUnlock(completeN("americas", 4), "europe-africa")).toBe(0);
  });
});

describe("completion economy (monotonic, frozen-first-result)", () => {
  it("a completion records a stamp and appends one log entry", () => {
    let s = freshSave();
    s = applyCompletion(s, "am-1", true, "fact", "americas");
    expect(totalStamps(s)).toBe(1);
    expect(totalStars(s)).toBe(1);
    expect(s.log.length).toBe(1);
    expect(regionCompletedCount(s, "americas")).toBe(1);
  });

  it("replaying never re-awards or decrements; first result frozen", () => {
    let s = freshSave();
    s = applyCompletion(s, "am-1", true, "fact", "americas"); // first try, star
    s = applyCompletion(s, "am-1", false, "fact", "americas"); // replay, no star
    expect(totalStars(s)).toBe(1); // star kept
    expect(totalStamps(s)).toBe(1); // not double-counted
    expect(s.log.length).toBe(1); // fact not duplicated
  });

  it("a no-star completion (reveal path) still earns a stamp", () => {
    let s = freshSave();
    s = applyCompletion(s, "am-2", false, "fact", "americas");
    expect(totalStamps(s)).toBe(1);
    expect(totalStars(s)).toBe(0);
  });
});

describe("cosmetic covers + badges", () => {
  it("covers unlock at their stamp thresholds", () => {
    const s0 = freshSave();
    expect(isCoverUnlocked(s0, "voyager")).toBe(true);
    expect(isCoverUnlocked(s0, "field-linen")).toBe(false);

    let s = freshSave();
    // complete 3 across region 1
    const ms = missionsForRegion("americas").slice(0, 3);
    for (const m of ms) s = applyCompletion(s, m.id, false, m.fact, "americas");
    expect(isCoverUnlocked(s, "field-linen")).toBe(true);
    expect(isCoverUnlocked(s, "deep-sea")).toBe(false);
  });

  it("default cover auto-advances to highest unlocked while still 'voyager'", () => {
    let s = freshSave();
    const ms = missionsForRegion("americas").slice(0, 3);
    for (const m of ms) s = applyCompletion(s, m.id, false, m.fact, "americas");
    expect(s.cover).toBe("field-linen"); // bumped from default
  });

  it("first-stamp + trailblazer badges fire correctly", () => {
    let s = freshSave();
    expect(BADGES.find((b) => b.id === "first-stamp")!.earned(s)).toBe(false);
    s = applyCompletion(s, "am-1", false, "fact", "americas");
    expect(BADGES.find((b) => b.id === "first-stamp")!.earned(s)).toBe(true);
    expect(BADGES.find((b) => b.id === "trailblazer")!.earned(s)).toBe(false);
    s = applyCompletion(s, "am-2", true, "fact", "americas"); // star
    expect(BADGES.find((b) => b.id === "trailblazer")!.earned(s)).toBe(true);
  });
});
