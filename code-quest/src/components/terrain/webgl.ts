// WebGL availability probe. Headless/SSR-safe: no document -> no WebGL -> the
// mission board renders the flat Grid fallback and the game stays fully playable.

export function webglAvailable(): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    if (typeof canvas.getContext !== "function") return false;
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    return gl != null;
  } catch {
    return false;
  }
}
