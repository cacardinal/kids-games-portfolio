// The 3×4 plot grid + build sheet + worker stepper. Tap-first: tap an empty plot
// to build, tap a building to assign workers. This is the flat DOM board — kept
// intact as the no-WebGL fallback under the 3D kingdom board (KingdomBoard).
// The sheets live in BuildSheets.tsx, shared with the 3D path, so both surfaces
// run the exact same build/worker flow.
import { useState } from "react";
import type { KingdomState } from "../game/kingdom";
import { totalSlots } from "../game/kingdom";
import { BUILDINGS, COPY, type BuildingId } from "../game/content";
import { BuildingGlyph } from "./icons";
import { BuildSheet, WorkerSheet } from "./BuildSheets";
import { sfx } from "../lib/sfx";

interface Props {
  state: KingdomState;
  /** plot indices that just completed a build this turn (for the pop animation). */
  justBuilt: Set<number>;
  onBuild: (plot: number, building: BuildingId) => void;
  onAssign: (building: BuildingId) => void;
  onUnassign: (building: BuildingId) => void;
  disabled?: boolean;
}

export function PlotGrid({ state, justBuilt, onBuild, onAssign, onUnassign, disabled }: Props) {
  const [buildPlot, setBuildPlot] = useState<number | null>(null);
  const [workerBuilding, setWorkerBuilding] = useState<BuildingId | null>(null);

  const plotCount = state.plots.length;
  const queuedAt = new Map<number, BuildingId>();
  for (const q of state.buildQueue) queuedAt.set(q.plot, q.building);

  return (
    <div className="board">
      <div className="plot-grid" style={{ gridTemplateRows: `repeat(${Math.ceil(plotCount / 4)}, 1fr)` }}>
        {state.plots.map((b, i) => {
          const queued = queuedAt.get(i);
          if (b) {
            const slots = totalSlots(state, b);
            const assigned = state.workers[b] ?? 0;
            return (
              <button
                key={i}
                className={`plot built ${workerBuilding === b ? "selected" : ""} ${justBuilt.has(i) ? "just-built" : ""}`}
                disabled={disabled}
                onClick={() => {
                  sfx.tap();
                  setWorkerBuilding(b);
                }}
                aria-label={`${BUILDINGS[b].label}, ${assigned} of ${slots} workers. Adjust workers.`}
              >
                <BuildingGlyph id={b} className="plot-icon" />
                {BUILDINGS[b].slots > 0 && (
                  <span className="worker-pips" aria-hidden>
                    {Array.from({ length: slots }).map((_, s) => (
                      <span key={s} className={`pip ${s < assigned ? "" : "off"}`} />
                    ))}
                  </span>
                )}
                <span className="plot-name">{BUILDINGS[b].label}</span>
              </button>
            );
          }
          if (queued) {
            return (
              <div key={i} className="plot built scaffold queued" aria-label={`${BUILDINGS[queued].label}, building`}>
                <BuildingGlyph id={queued} className="plot-icon" />
                <span className="ready-tag">{COPY.buildReady}</span>
              </div>
            );
          }
          return (
            <button
              key={i}
              className="plot empty"
              disabled={disabled}
              onClick={() => {
                sfx.tap();
                setBuildPlot(i);
              }}
              aria-label={`Empty plot ${i + 1}. Build here.`}
            >
              <span style={{ fontSize: 26, opacity: 0.5 }}>+</span>
            </button>
          );
        })}
      </div>

      {buildPlot !== null && (
        <BuildSheet
          state={state}
          onPick={(bld) => {
            onBuild(buildPlot, bld);
            setBuildPlot(null);
          }}
          onClose={() => setBuildPlot(null)}
        />
      )}

      {workerBuilding && (
        <WorkerSheet
          state={state}
          building={workerBuilding}
          onAssign={() => onAssign(workerBuilding)}
          onUnassign={() => onUnassign(workerBuilding)}
          onClose={() => setWorkerBuilding(null)}
        />
      )}
    </div>
  );
}
