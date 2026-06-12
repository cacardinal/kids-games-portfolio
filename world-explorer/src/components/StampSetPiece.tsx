import { useEffect, useRef, useState, useMemo } from "react";
import type { Region, MissionType } from "../data/types";
import { RegionStamp } from "./Stamp";
import { Star } from "./Glyphs";
import { SpeakButton } from "./SpeakButton";
import { sfx } from "../lib/sfx";
import { prefersReducedMotion } from "../lib/motion";

// The passport-stamp set-piece (GDD §4.2). One earned 1000ms ink moment, fired
// on every mission completion, tap-to-skip, reduced-motion collapses to a fade.
// `onDone` is called when the player dismisses (after settle, or skip+tap-out).

const REGION_INK: Record<Region, string> = {
  americas: "#b5642f",
  "europe-africa": "#2f7d72",
  "asia-oceania": "#3b4e8f",
};

type Phase = "windup" | "impact" | "bloom" | "settle";

export function StampSetPiece({
  region,
  type,
  star,
  fact,
  onFactRead,
  onDone,
  onReplay,
}: {
  region: Region;
  type: MissionType;
  star: boolean;
  fact: string;
  onFactRead?: () => void;
  onDone: () => void;
  /** Fix 3: when present, offer a one-tap "try again for the star" replay. */
  onReplay?: () => void;
}) {
  const reduced = prefersReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduced ? "settle" : "windup");
  const timers = useRef<number[]>([]);
  const soundsFired = useRef(false);

  // Deterministic ink-fleck offsets (no rng dependency needed).
  const flecks = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const ang = (i / 7) * Math.PI * 2 + 0.4;
        const dist = 30 + (i % 3) * 12;
        return { dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist };
      }),
    [],
  );

  useEffect(() => {
    if (reduced) {
      // Collapse: just the soft completion sound, no fanfare timeline.
      if (!soundsFired.current) {
        soundsFired.current = true;
        sfx.stamp();
      }
      return;
    }
    const push = (fn: () => void, ms: number) => {
      timers.current.push(window.setTimeout(fn, ms));
    };
    // Beat 1 → 2 (impact + thunk) at 120ms
    push(() => {
      setPhase("impact");
      sfx.stamp();
      sfx.ink();
    }, 120);
    // Beat 3 (ink spread) at 260ms
    push(() => setPhase("bloom"), 260);
    // Beat 4 (settle + fact) at 620ms; star sparkle plays here if earned
    push(() => {
      setPhase("settle");
      if (star) sfx.collect();
    }, 620);
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [reduced, star]);

  // Tap anywhere after wind-up jumps to the settled end-state.
  const skip = () => {
    if (phase === "settle") return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (!soundsFired.current) {
      soundsFired.current = true;
      sfx.stamp();
    }
    setPhase("settle");
  };

  const ink = REGION_INK[region];
  const showRing = phase === "impact" || phase === "bloom";
  const showFlecks = phase === "bloom";
  const stampClass =
    phase === "settle" ? "the-stamp is-final" : phase === "windup" ? "the-stamp" : "the-stamp is-dropping";

  return (
    <div
      className="stamp-stage"
      onPointerDown={skip}
      role="dialog"
      aria-label="Passport stamp"
    >
      <div className={`stamp-page${phase === "impact" ? " is-rocking" : ""}`}>
        <div className="stamp-slot">
          {showRing && <span className="stamp-impact-ring" />}
          <div className={stampClass}>
            <RegionStamp region={region} type={type} size={152} />
          </div>
          {showFlecks &&
            flecks.map((f, i) => (
              <span
                key={i}
                className="ink-fleck"
                style={{
                  ["--dx" as string]: `${f.dx}px`,
                  ["--dy" as string]: `${f.dy}px`,
                  ["--fleck" as string]: ink,
                }}
              />
            ))}
          {star && phase === "settle" && (
            <span className="stamp-star" aria-hidden="true">
              <Star size={30} />
              {/* Fix 6: a quick glint sweep rides across the star as it scales in. */}
              <span className="stamp-star__glint" />
            </span>
          )}
        </div>

        {phase === "settle" && (
          <>
            <span className="stamp-microlabel">{star ? "First-try star" : "Stamp earned"}</span>
            {/* Fix 6: with no star, the fact card carries the win emphasis instead. */}
            <div className={`stamp-fact${star ? "" : " stamp-fact--emphasis"}`}>
              <SpeakButton text={fact} onSpoken={onFactRead} />
              <span>{fact}</span>
            </div>
            {/* Fix 3: wrong-pick redemption — no shame, just the offer. */}
            {onReplay ? (
              <div className="stamp-actions">
                <button className="btn btn--ghost" onClick={onDone}>
                  Continue
                </button>
                <button className="btn" onClick={onReplay} autoFocus>
                  Try again for the star
                </button>
              </div>
            ) : (
              <button className="btn" onClick={onDone} autoFocus>
                Continue
              </button>
            )}
          </>
        )}
        {phase !== "settle" && <span className="stamp-skiphint">Tap to skip</span>}
      </div>
    </div>
  );
}
