// Resource bar — each chip shows the CURRENT value and the projected next-turn
// delta; tapping a chip reveals the formula popover. People shows current/cap.
// All numbers/strings derive from display.ts (which derives from the reducer).
import { useState } from "react";
import { Wheat, Trees, Mountain, Coins, BookOpen, Users } from "lucide-react";
import type { KingdomState } from "../game/kingdom";
import type { ResourceId } from "../game/content";
import { projectResource, resourceDelta, RES_LABEL } from "../game/display";
import { sfx } from "../lib/sfx";

type Key = ResourceId | "research" | "population";

const META: Record<Key, { label: string; color: string; Icon: typeof Wheat }> = {
  food: { label: "Food", color: "var(--food)", Icon: Wheat },
  wood: { label: "Wood", color: "var(--wood)", Icon: Trees },
  stone: { label: "Stone", color: "var(--stone)", Icon: Mountain },
  gold: { label: "Gold", color: "var(--gold)", Icon: Coins },
  research: { label: "Research", color: "var(--research)", Icon: BookOpen },
  population: { label: "People", color: "var(--brass-bright)", Icon: Users },
};

function Chip({
  state,
  k,
  rolling,
  open,
  onToggle,
}: {
  state: KingdomState;
  k: Key;
  rolling: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const m = META[k];
  const isPop = k === "population";
  const value = isPop
    ? state.population
    : k === "research"
      ? state.researchPoints
      : state.resources[k as ResourceId];

  const delta = isPop ? null : resourceDelta(state, k as ResourceId | "research");
  const proj = isPop ? null : projectResource(state, k as ResourceId | "research");

  return (
    <div className="stack" style={{ flex: "1 1 0", minWidth: 92 }}>
      <button
        className={`res ${rolling ? "rolling" : ""} ${isPop ? "is-pop" : ""}`}
        onClick={() => {
          sfx.tap();
          onToggle();
        }}
        aria-expanded={open}
        aria-label={`${m.label}: ${value}${isPop ? `, room for ${state.popCap}` : ""}. Show formula.`}
      >
        <span className="res-label">
          <span className="dot" style={{ background: m.color }} />
          {m.label}
        </span>
        <span className="res-value" style={{ color: m.color }}>
          {value}
        </span>
        {isPop ? (
          <span className="res-delta flat">room for {state.popCap}</span>
        ) : (
          <span className={`res-delta ${delta!.dir}`}>{delta!.text}</span>
        )}
      </button>

      {open && !isPop && proj && (
        <div className="formula-pop" role="status">
          {proj.lines.length === 0 && (
            <div className="fline muted">No {RES_LABEL[k as ResourceId | "research"].toLowerCase()} workers yet.</div>
          )}
          {proj.lines.map((l, i) => (
            <div className="fline" key={i}>
              {l.label}: {l.formula} {k === "research" ? "research" : (k as string)}
            </div>
          ))}
          {k === "food" && (
            <>
              <div className="fline">
                {state.population} people eat {state.population}
              </div>
              <div className="fline fbrass">{proj.netLabel}</div>
            </>
          )}
          {k !== "food" && proj.produced > 0 && (
            <div className="fline fbrass">+{proj.produced} next season</div>
          )}
        </div>
      )}
      {open && isPop && (
        <div className="formula-pop" role="status">
          <div className="fline">
            {state.population} of {state.popCap} people
          </div>
          <div className="fline muted">Each House adds room. A surplus adds one person.</div>
        </div>
      )}
    </div>
  );
}

export function ResourceBar({
  state,
  rolling,
}: {
  state: KingdomState;
  /** set of resource keys currently animating a roll (during END TURN). */
  rolling: Set<Key>;
}) {
  const [open, setOpen] = useState<Key | null>(null);
  const order: Key[] = ["food", "wood", "stone", "gold", "research", "population"];
  return (
    <div className="resbar" role="group" aria-label="Kingdom resources">
      {order.map((k) => (
        <Chip
          key={k}
          state={state}
          k={k}
          rolling={rolling.has(k)}
          open={open === k}
          onToggle={() => setOpen(open === k ? null : k)}
        />
      ))}
    </div>
  );
}

export type ResourceKey = Key;
