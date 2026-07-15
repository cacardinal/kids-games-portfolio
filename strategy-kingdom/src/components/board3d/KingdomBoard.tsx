// The kingdom board surface. Renders the low-poly 3D board when WebGL is
// available, and falls back to the flat DOM PlotGrid when it isn't — the game
// is fully playable either way. Every interaction flows through the SAME
// zustand actions as the flat grid: tap an empty tile → BuildSheet, tap a
// building → WorkerSheet. A focusable DOM tile list mirrors the 3D tiles so
// keyboard and screen-reader play survives (it appears on keyboard focus).
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import type { KingdomState } from "../../game/kingdom";
import type { BuildingId } from "../../game/content";
import { buildBoardModel } from "./boardModel";
import { webglAvailable } from "./webgl";
import { PlotGrid } from "../PlotGrid";
import { BuildSheet, WorkerSheet } from "../BuildSheets";
import { sfx } from "../../lib/sfx";

const Board3D = lazy(() => import("./Board3D"));

interface Props {
  state: KingdomState;
  /** plot indices that just completed a build this turn (construction rise). */
  justBuilt: Set<number>;
  onBuild: (plot: number, building: BuildingId) => void;
  onAssign: (building: BuildingId) => void;
  onUnassign: (building: BuildingId) => void;
  disabled?: boolean;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function KingdomBoard({ state, justBuilt, onBuild, onAssign, onUnassign, disabled }: Props) {
  const [buildPlot, setBuildPlot] = useState<number | null>(null);
  const [workerBuilding, setWorkerBuilding] = useState<BuildingId | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const webgl = useMemo(() => webglAvailable(), []);

  // No WebGL: the flat grid carries the whole flow (it owns its own sheets).
  if (!webgl) {
    return (
      <PlotGrid
        state={state}
        justBuilt={justBuilt}
        disabled={disabled}
        onBuild={onBuild}
        onAssign={onAssign}
        onUnassign={onUnassign}
      />
    );
  }

  const model = buildBoardModel(state);

  // Selection highlight: the plot being built on, or every plot of the
  // building type whose worker sheet is open (workers are pooled per type).
  const selected = new Set<number>();
  if (buildPlot !== null) selected.add(buildPlot);
  if (workerBuilding) {
    model.tiles.forEach((t) => {
      if (t.kind === "built" && t.building === workerBuilding) selected.add(t.index);
    });
  }

  function tapTile(index: number) {
    if (disabled) return;
    const tile = model.tiles[index];
    if (!tile) return;
    sfx.tap();
    if (tile.kind === "built" && tile.building) {
      setWorkerBuilding(tile.building);
    } else if (tile.kind === "empty") {
      setBuildPlot(index);
    }
    // queued tiles: nothing to do yet — ready next season.
  }

  return (
    <div className="stack" style={{ gap: 8, position: "relative" }}>
      <Suspense
        fallback={
          <div className="board board3d board3d-loading" aria-hidden>
            <span className="muted">Raising the kingdom…</span>
          </div>
        }
      >
        <Board3D
          model={model}
          justBuilt={justBuilt}
          selected={selected}
          disabled={disabled}
          holdSeasonSweep={disabled}
          reducedMotion={reducedMotion}
          onTileTap={tapTile}
        />
      </Suspense>

      {/* DOM tile-selection path: same tiles, same labels, same actions.
          Visually tucked away until it receives keyboard focus. */}
      <nav className="tile-dom-list" aria-label="Kingdom tiles">
        {model.tiles.map((tile) => (
          <button
            key={tile.index}
            type="button"
            disabled={disabled || tile.kind === "queued"}
            aria-label={tile.label}
            onClick={() => tapTile(tile.index)}
          >
            {tile.building ? `${tile.index + 1}. ${tile.label}` : tile.label}
          </button>
        ))}
      </nav>

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
