import { useMemo } from "react";
import type { Heading, Mission, TraceStep } from "../game/interpreter";
import { parseGridForView } from "../game/view";
import { Rover, type RoverPose } from "./Rover";
import type { CosmeticId } from "../data/cosmetics";

const CELL = 64; // px per tile
const GAP = 6;

interface GridProps {
  mission: Mission;
  step: TraceStep | null; // current visible trace step, or null for idle (rover at start)
  collectedKeys: Set<string>; // crystal keys collected so far this run
  activatedKeys: Set<string>; // beacon keys activated so far this run
  pose: RoverPose;
  cosmetic: CosmeticId;
  running: boolean;
  goalShimmer: boolean; // goal tile pulses when stepped on without winning
}

export function Grid({
  mission,
  step,
  collectedKeys,
  activatedKeys,
  pose,
  cosmetic,
  running,
  goalShimmer,
}: GridProps) {
  const parsed = useMemo(() => parseGridForView(mission.grid), [mission.grid]);
  const { width, height, start } = parsed;

  const boardW = width * CELL + (width - 1) * GAP;
  const boardH = height * CELL + (height - 1) * GAP;

  // Rover position: from the step if present, else the mission start.
  const rx = step ? step.rover.x : start.x;
  const ry = step ? step.rover.y : start.y;
  const heading: Heading = step ? step.rover.heading : mission.startHeading;

  const tileXY = (x: number, y: number) => ({
    left: x * (CELL + GAP),
    top: y * (CELL + GAP),
  });

  const isCollision = step?.event === "collision";

  return (
    <div className={`grid-viewport panel scanlines${running ? " running" : ""}`}>
      <div className="grid-board" style={{ width: boardW, height: boardH }}>
        {/* tiles */}
        {parsed.tiles.map((t) => {
          const { left, top } = tileXY(t.x, t.y);
          const key = `${t.x},${t.y}`;
          const collected = collectedKeys.has(key);
          const activated = activatedKeys.has(key);
          const classes = ["tile"];
          if (t.type === "wall") classes.push("wall");
          if (t.type === "goal") classes.push("goal");
          if (t.type === "start") classes.push("start");
          if (t.type === "crystal") classes.push("crystal");
          if (t.type === "beacon") classes.push("beacon");
          if (goalShimmer && t.type === "goal") classes.push("shimmer");
          return (
            <div key={key} className={classes.join(" ")} style={{ left, top, width: CELL, height: CELL }}>
              {t.type === "goal" && (
                <svg viewBox="0 0 64 64" className="tile-icon">
                  <circle cx="32" cy="32" r="20" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeDasharray="4 4" />
                  <circle cx="32" cy="32" r="8" fill="var(--green)" opacity="0.55" />
                </svg>
              )}
              {t.type === "crystal" && !collected && (
                <svg viewBox="0 0 64 64" className="tile-icon crystal-icon">
                  <polygon points="32,14 46,32 32,50 18,32" fill="var(--cyan)" opacity="0.85" />
                  <line x1="32" y1="14" x2="32" y2="50" stroke="var(--bg)" strokeWidth="1.5" opacity="0.5" />
                </svg>
              )}
              {t.type === "beacon" && (
                <svg viewBox="0 0 64 64" className={`tile-icon beacon-icon${activated ? " on" : ""}`}>
                  <circle cx="32" cy="32" r="9" fill="var(--cyan)" opacity={activated ? "1" : "0.4"} />
                  {activated && (
                    <>
                      <circle cx="32" cy="32" r="16" fill="none" stroke="var(--cyan)" strokeWidth="2" opacity="0.5" />
                      <circle cx="32" cy="32" r="22" fill="none" stroke="var(--cyan)" strokeWidth="1.5" opacity="0.3" />
                    </>
                  )}
                </svg>
              )}
              {t.type === "start" && <div className="start-pad" />}
            </div>
          );
        })}

        {/* impact dust on collision */}
        {isCollision && (
          <div className="dust" style={{ left: rx * (CELL + GAP), top: ry * (CELL + GAP), width: CELL, height: CELL }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className={`particle dust-p dust-p${i}`} />
            ))}
          </div>
        )}

        {/* the rover — signature charm. Positioned by transform for the 150ms tile transition. */}
        <div
          className="rover-slot"
          data-testid="rover"
          data-x={rx}
          data-y={ry}
          data-heading={heading}
          style={{
            width: CELL,
            height: CELL,
            transform: `translate(${rx * (CELL + GAP)}px, ${ry * (CELL + GAP)}px)`,
          }}
        >
          <Rover heading={heading} pose={pose} cosmetic={cosmetic} size={CELL - 8} />
        </div>
      </div>
    </div>
  );
}

export { CELL };
