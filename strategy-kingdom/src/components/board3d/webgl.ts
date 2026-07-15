// WebGL feature detection for the 3D board. When unavailable (old device,
// blocked context), KingdomBoard falls back to the flat DOM PlotGrid and the
// game stays fully playable.
let cached: boolean | null = null;

export function webglAvailable(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    cached = !!gl;
  } catch {
    cached = false;
  }
  return cached;
}
