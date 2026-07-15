import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { sfx } from "../lib/sfx";
import { detectWebGL } from "./office3d/webgl";
import { STAMP_TIMELINE, stampTargetFromRects } from "./office3d/scene-math";

// Code-split with the backdrop chunk; never downloaded without WebGL.
const Stamp3D = lazy(() =>
  import("./office3d/Stamp3D").then((m) => ({ default: m.Stamp3D })),
);

// CASE CLOSED set-piece (GDD §4.6.1; 3D slam per story 3d-upgrade/05).
// Three paths, all landing in the same final stamped DOM state:
//  - reduced motion: stamp fades in at final position (<=200ms), no splat/shake/motes
//  - no WebGL: the original flat ~1000ms drop/impact/rest treatment
//  - WebGL + motion: a 3D stamp tool descends and slams (~950ms, skippable after
//    120ms); the DOM imprint appears at the moment of impact
// StrictMode-safe: all timers cleared on unmount; sound fired once via a ref guard.
const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Deterministic-ish splat droplets (positions fixed per mount).
const DROPLETS = Array.from({ length: 8 }).map((_, i) => {
  const angle = (i / 8) * Math.PI * 2 + 0.4;
  const dist = 26 + (i % 3) * 9;
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    r: 4 + ((i * 7) % 9),
    delay: (i % 4) * 18,
  };
});

type Phase = "pre" | "drop" | "impact" | "rest";

export function CaseClosedStamp({
  culpritName,
  onContinue,
}: {
  culpritName: string;
  onContinue: () => void;
}) {
  // decided once per mount; WebGL verdict is cached after the first probe
  const use3d = !REDUCED && detectWebGL();
  const [phase, setPhase] = useState<Phase>(REDUCED ? "rest" : use3d ? "pre" : "drop");
  const [skippable, setSkippable] = useState(REDUCED);
  const [startedAt] = useState(() => performance.now());
  const [target, setTarget] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const soundFired = useRef(false);
  const timers = useRef<number[]>([]);

  // Measure the (invisible) DOM stamp so the 3D tool lands exactly on its footprint.
  useLayoutEffect(() => {
    if (!use3d || !stampRef.current) return;
    const r = stampRef.current.getBoundingClientRect();
    setTarget(
      stampTargetFromRects(
        { left: r.left, top: r.top, width: r.width, height: r.height },
        { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [use3d]);

  useEffect(() => {
    if (REDUCED) {
      if (!soundFired.current) {
        soundFired.current = true;
        sfx.stamp();
      }
      return;
    }
    if (!soundFired.current) {
      soundFired.current = true;
      sfx.whoosh();
    }
    if (use3d) {
      // DOM phases are timer-driven off the same clock the canvas animates against.
      const t0 = window.setTimeout(() => setSkippable(true), STAMP_TIMELINE.skippableAt);
      const t1 = window.setTimeout(() => {
        setPhase("impact");
        sfx.stamp();
      }, STAMP_TIMELINE.impactAt);
      const t2 = window.setTimeout(() => sfx.success(), STAMP_TIMELINE.successAt);
      const t3 = window.setTimeout(() => setPhase("rest"), STAMP_TIMELINE.restAt);
      timers.current = [t0, t1, t2, t3];
    } else {
      const t1 = window.setTimeout(() => {
        setPhase("impact");
        sfx.stamp();
        setSkippable(true);
      }, 120);
      const t2 = window.setTimeout(() => setPhase("rest"), 420);
      const t3 = window.setTimeout(() => sfx.success(), 360);
      timers.current = [t1, t2, t3];
    }
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [use3d]);

  const handleSkip = () => {
    if (!skippable) return;
    onContinue();
  };

  return (
    <div
      className={`closed-scene${REDUCED ? " closed-scene--reduced" : ""}${use3d ? " closed-scene--3d" : ""}`}
      onPointerUp={handleSkip}
      role="status"
      aria-label={`Case closed. ${culpritName} did it.`}
    >
      <div className={`closed-folder closed-folder--${phase}`}>
        <div ref={stampRef} className="closed-stamp display">
          CASE
          <br />
          CLOSED
          {phase === "impact" && !REDUCED && !use3d && (
            <svg className="closed-splat" viewBox="-60 -60 120 120" aria-hidden>
              {DROPLETS.map((d, i) => (
                <circle
                  key={i}
                  cx={d.x}
                  cy={d.y}
                  r={d.r}
                  fill="var(--stamp-red)"
                  className="closed-drop"
                  style={{ animationDelay: `${d.delay}ms` }}
                />
              ))}
            </svg>
          )}
        </div>
        {!REDUCED && (
          <>
            <span className="mote mote--1" aria-hidden />
            <span className="mote mote--2" aria-hidden />
            <span className="mote mote--3" aria-hidden />
          </>
        )}
        <div className="closed-name display">{culpritName} did it.</div>
        <div className="closed-underline" />
      </div>
      {use3d && target && phase !== "rest" && (
        <Suspense fallback={null}>
          <Stamp3D target={target} canvasHeight={window.innerHeight} startedAt={startedAt} />
        </Suspense>
      )}
      {skippable && (
        <div className="closed-continue display" aria-hidden>
          Tap to see your deduction
        </div>
      )}
    </div>
  );
}
