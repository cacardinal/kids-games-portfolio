// Seeded PRNG (from shared contract §7). Draw order is FROZEN once shipped:
// content item N is defined by seed N forever. Content growth is append-only.
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

/** Pick a random integer in [0, n) from a mulberry32 stream. */
export function randInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n);
}

/** Pick one element of arr from a mulberry32 stream. */
export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[randInt(rng, arr.length)];
}

/**
 * Fisher-Yates shuffle producing a NEW array, deterministic from the stream.
 * Used by the generator to sample distinct names/values without bias.
 */
export function shuffle<T>(rng: () => number, arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
