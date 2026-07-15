// The build & worker DOM sheets, shared by the flat PlotGrid and the 3D board.
// Extracted verbatim from PlotGrid so both surfaces run the exact same flow:
// costs/feasibility come from the reducer's helpers, and the stepper shows the
// live product big (early reader: "more workers, bigger number").
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

export function BuildSheet({
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

export function WorkerSheet({
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
