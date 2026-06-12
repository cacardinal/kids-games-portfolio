// Reduced-motion: reflect the OS preference onto :root[data-reduced] so CSS can
// collapse set-pieces, and expose a boolean for JS timing decisions. Set-pieces
// honor shared-design §3 + GDD §4 (reduced-motion → ≤200ms fades, no particles).
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function installReducedMotionFlag() {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const apply = () => {
    document.documentElement.setAttribute("data-reduced", String(mq.matches));
  };
  apply();
  mq.addEventListener("change", apply);
  return () => mq.removeEventListener("change", apply);
}
