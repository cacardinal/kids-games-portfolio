// Tiny pure color math for the season re-palette — no three.js so it stays
// unit-testable. The 3D board blends every seasonal color through mixHex.

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Ease for the season sweep (soft in/out). */
export function easeInOut(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Linear mix of two #rrggbb colors, t clamped to [0,1]. */
export function mixHex(a: string, b: string, t: number): string {
  const k = clamp01(t);
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const va = (pa >> shift) & 0xff;
    const vb = (pb >> shift) & 0xff;
    return Math.round(va + (vb - va) * k);
  };
  const v = (ch(16) << 16) | (ch(8) << 8) | ch(0);
  return `#${v.toString(16).padStart(6, "0")}`;
}
