// Expedition-complete flourish: a gold travel arc draws from Home to the
// mission's region, then hands off to the existing stamp set piece. Pure
// DOM/SVG (the Atlas globe is paused behind the mission overlay; no second
// WebGL canvas). Tap-to-skip. Reduced motion: a ≤200ms fade of the full arc.
import { useEffect, useRef } from "react";
import type { Region } from "../data/types";
import { REGION_LABEL } from "../data/types";
import { arcPathD } from "../lib/globe-math";
import { prefersReducedMotion } from "../lib/motion";
import { sfx } from "../lib/sfx";

const HOME: [number, number] = [170, 460];
const DEST: [number, number] = [790, 190];

export function ArcFlourish({ region, onDone }: { region: Region; onDone: () => void }) {
  const reduced = prefersReducedMotion();
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    sfx.line();
    const t = window.setTimeout(finish, reduced ? 200 : 1100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = arcPathD(HOME[0], HOME[1], DEST[0], DEST[1], 0.34);

  return (
    <div
      className={`arc-flourish${reduced ? " is-reduced" : ""}`}
      role="status"
      aria-label={`Traveling to ${REGION_LABEL[region]}`}
      onPointerDown={finish}
    >
      <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <circle className="arc-flourish__home" cx={HOME[0]} cy={HOME[1]} r={7} />
        <text className="arc-flourish__text" x={HOME[0]} y={HOME[1] + 34} textAnchor="middle">
          Home
        </text>
        <path className="arc-flourish__path" d={d} pathLength={100} />
        <circle className="arc-flourish__dest" cx={DEST[0]} cy={DEST[1]} r={9} />
        <circle className="arc-flourish__ping" cx={DEST[0]} cy={DEST[1]} r={9} />
        <text className="arc-flourish__text" x={DEST[0]} y={DEST[1] - 26} textAnchor="middle">
          {REGION_LABEL[region]}
        </text>
      </svg>
    </div>
  );
}
