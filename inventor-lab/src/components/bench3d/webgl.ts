// One-shot WebGL capability probe. If this fails, BuildBench keeps the original flat SVG view
// (the game is fully playable without WebGL).
let cached: boolean | null = null;

export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached;
  try {
    if (typeof document === "undefined") return (cached = false);
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    cached = !!gl;
  } catch {
    cached = false;
  }
  return cached;
}
