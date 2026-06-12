import { useEffect, useRef, useState } from "react";
import { sfx } from "../lib/sfx";

// CASE CLOSED set-piece (GDD §4.6.1). ~1000ms, skippable by tap after t=120.
// Reduced-motion: stamp fades in at final position, no splat/shake/motes.
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

export function CaseClosedStamp({
  culpritName,
  onContinue,
}: {
  culpritName: string;
  onContinue: () => void;
}) {
  const [phase, setPhase] = useState<"drop" | "impact" | "rest">(
    REDUCED ? "rest" : "drop",
  );
  const [skippable, setSkippable] = useState(REDUCED);
  const soundFired = useRef(false);
  const timers = useRef<number[]>([]);

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
    const t1 = window.setTimeout(() => {
      setPhase("impact");
      sfx.stamp();
      setSkippable(true);
    }, 120);
    const t2 = window.setTimeout(() => setPhase("rest"), 420);
    const t3 = window.setTimeout(() => sfx.success(), 360);
    timers.current = [t1, t2, t3];
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, []);

  const handleSkip = () => {
    if (!skippable) return;
    onContinue();
  };

  return (
    <div
      className={`closed-scene${REDUCED ? " closed-scene--reduced" : ""}`}
      onPointerUp={handleSkip}
      role="status"
      aria-label={`Case closed. ${culpritName} did it.`}
    >
      <div className={`closed-folder closed-folder--${phase}`}>
        <div className="closed-stamp display">
          CASE
          <br />
          CLOSED
          {phase === "impact" && !REDUCED && (
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
      {skippable && (
        <div className="closed-continue display" aria-hidden>
          Tap to see your deduction
        </div>
      )}
    </div>
  );
}
