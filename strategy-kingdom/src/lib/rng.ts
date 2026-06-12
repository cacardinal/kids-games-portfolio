// Seeded PRNG — copied verbatim from specs/shared-design.md §7.
// Strategy Kingdom's reducer is purely arithmetic and uses no RNG (events are
// fixed-order), so this is unused by the game logic; kept per the shared contract
// for parity with the other apps and any future cosmetic randomness.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
