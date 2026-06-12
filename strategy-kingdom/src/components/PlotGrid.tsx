// The 3×4 plot grid + build sheet + worker stepper. Tap-first: tap an empty plot
// to build, tap a building to assign workers. The stepper shows the live product
// big (early reader: "more workers, bigger number"). Costs/feasibility come from the
// reducer's helpers so the UI never disagrees with what build/assign will do.
import { useState } from "react";
import type { KingdomState } from "../game/kingdom";
import {
  canAfford,
  atCap,
  totalSlots,
  buildingCount,
  idleHands,
  effectiveBase,
} from "../game/kingdom";
import { BUILDINGS, BUILDING_ORDER, COPY, type BuildingId } from "../game/content";
import { BuildingGlyph } from "./icons";
import { Button } from "./Button";
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

function BuildSheet({
  state,
  onPick,
  onClose,
}: {
  state: KingdomState;
  onPick: (b: BuildingId) => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet parchment ruled" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ color: "var(--seal-red)" }}>{COPY.buildTitle}</h2>
          <Button variant="ghost" sound="tap" onClick={onClose} ariaLabel="Close">
            Close
          </Button>
        </div>
        <div className="build-list">
          {BUILDING_ORDER.map((id) => {
            const def = BUILDINGS[id];
            const affordable = canAfford(state, id);
            const capped = atCap(state, id);
            const disabled = !affordable || capped;
            const missing: string[] = [];
            if (state.resources.wood < def.cost.wood)
              missing.push(`${def.cost.wood - state.resources.wood} wood`);
            if (state.resources.stone < def.cost.stone)
              missing.push(`${def.cost.stone - state.resources.stone} stone`);
            return (
              <button
                key={id}
                className="build-opt"
                disabled={disabled}
                onClick={() => {
                  sfx.select();
                  onPick(id);
                }}
                aria-label={`Build ${def.label}, costs ${def.cost.wood} wood${def.cost.stone ? ` and ${def.cost.stone} stone` : ""}${capped ? ", at the limit" : ""}`}
              >
                <BuildingGlyph id={id} className="b-icon" />
                <span>
                  <div className="b-name">{def.label}</div>
                  <div className="b-cost">{effectLine(id)}</div>
                </span>
                <span className="b-cost">
                  {capped
                    ? COPY.buildCapped
                    : !affordable
                      ? `Need ${missing.map((m) => m).join(", ")}`
                      : `${def.cost.wood} wood${def.cost.stone ? `, ${def.cost.stone} stone` : ""}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function effectLine(id: BuildingId): string {
  const def = BUILDINGS[id];
  switch (id) {
    case "house":
      return "Room for 4 more people";
    case "library":
      return "Makes research";
    default:
      return `${def.baseYield} ${def.produces === "research" ? "research" : def.produces} per worker`;
  }
}

function WorkerSheet({
  state,
  building,
  onAssign,
  onUnassign,
  onClose,
}: {
  state: KingdomState;
  building: BuildingId;
  onAssign: () => void;
  onUnassign: () => void;
  onClose: () => void;
}) {
  const def = BUILDINGS[building];
  const slots = totalSlots(state, building);
  const assigned = state.workers[building] ?? 0;
  const base = effectiveBase(building, state.researched);
  const product = assigned * base;
  const resourceWord = def.produces === "research" ? "research" : def.produces;
  const free = idleHands(state);
  const count = buildingCount(state, building);

  if (def.slots === 0) {
    // Houses have no workers — show their effect and close.
    return (
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="sheet parchment ruled" onClick={(e) => e.stopPropagation()}>
          <h2 style={{ color: "var(--seal-red)" }}>{def.label}</h2>
          <p>This House gives room for 4 more people. It needs no workers.</p>
          <Button onClick={onClose} sound="tap">
            Got it
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet parchment ruled" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ color: "var(--seal-red)" }}>{def.label}</h2>
          <span className="b-cost">
            {count > 1 ? `${count} of these · ` : ""}
            {slots} slots
          </span>
        </div>

        <div className="stepper">
          <Button
            className="step-btn"
            variant="secondary"
            ariaLabel={COPY.workerRemove}
            disabled={assigned <= 0}
            onClick={() => {
              onUnassign();
            }}
          >
            −
          </Button>
          <div className="big-product" aria-live="polite">
            {assigned} × {base} = <span style={{ color: "var(--seal-red)" }}>{product}</span> {resourceWord}
          </div>
          <Button
            className="step-btn"
            ariaLabel={COPY.workerAdd}
            disabled={assigned >= slots || free <= 0}
            sound="select"
            onClick={() => {
              onAssign();
            }}
          >
            +
          </Button>
        </div>

        <p className="center muted" style={{ margin: "4px 0 12px" }}>
          {assigned >= slots
            ? COPY.workerFull
            : free <= 0
              ? "No free hands. Take a worker off somewhere else."
              : `${free} ${free === 1 ? "hand" : "hands"} free to assign`}
        </p>

        <Button onClick={onClose} sound="tap" variant="secondary">
          Done
        </Button>
      </div>
    </div>
  );
}
