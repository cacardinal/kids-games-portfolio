import { describe, it, expect } from "vitest";
import { chipCount, canAppendChip, PROGRAM_CAP } from "./interpreter";
import type { Chip } from "./interpreter";

let idc = 0;
const c = (op: "MOVE" | "LEFT" | "RIGHT" | "ACTION"): Chip => ({ id: `c${idc++}`, op });
const repeat = (times: 2 | 3 | 4 | 5, body: Array<"MOVE" | "LEFT" | "RIGHT" | "ACTION">): Chip => ({
  id: `c${idc++}`,
  op: "REPEAT",
  times,
  body: body.map((op) => ({ id: `c${idc++}`, op })),
});

describe("program cap — 20 SOURCE chips", () => {
  it("PROGRAM_CAP is 20", () => {
    expect(PROGRAM_CAP).toBe(20);
  });

  it("canAppendChip is true at 19 source chips, false at 20", () => {
    const nineteen: Chip[] = Array.from({ length: 19 }, () => c("MOVE"));
    expect(chipCount(nineteen)).toBe(19);
    expect(canAppendChip(nineteen)).toBe(true);
    const twenty = [...nineteen, c("MOVE")];
    expect(chipCount(twenty)).toBe(20);
    expect(canAppendChip(twenty)).toBe(false);
  });

  it("the cap counts SOURCE chips, never expansion (M12 canary: 6 source chips, 20 expanded -> legal)", () => {
    // M12's recorded solution shape: one REPEAT ×4 with a 5-chip body = 6 source chips.
    const m12: Chip[] = [repeat(4, ["MOVE", "ACTION", "MOVE", "ACTION", "RIGHT"])];
    expect(chipCount(m12)).toBe(6); // 1 REPEAT + 5 body
    expect(chipCount(m12)).toBeLessThanOrEqual(PROGRAM_CAP);
    expect(canAppendChip(m12)).toBe(true); // 6 << 20, room to spare
  });

  it("a REPEAT with a full 6-chip body counts as 7 source chips", () => {
    const big: Chip[] = [repeat(5, ["MOVE", "MOVE", "MOVE", "MOVE", "MOVE", "MOVE"])];
    expect(chipCount(big)).toBe(7); // 1 + 6
  });
});
