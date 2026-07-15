// WebGL feature detection with an injectable probe (headless-testable).
// Fallback contract (story 3d-upgrade/05): no WebGL -> the current flat look,
// game fully playable.

type ContextProbe = (kind: string) => unknown;

let cached: boolean | null = null;

function domProbe(): ContextProbe | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  return (kind: string) => canvas.getContext(kind as "webgl2");
}

export function detectWebGL(probe?: ContextProbe): boolean {
  if (cached !== null) return cached;
  const p = probe ?? domProbe();
  if (!p) {
    cached = false;
    return cached;
  }
  try {
    cached = Boolean(p("webgl2") ?? p("webgl"));
  } catch {
    cached = false;
  }
  return cached;
}

// test hook
export function resetWebGLCache(): void {
  cached = null;
}
