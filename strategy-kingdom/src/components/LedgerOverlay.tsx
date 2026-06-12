// THE SIGNATURE MOMENT — the END TURN ledger resolution.
// Production lines tick in one at a time (staggered) with resource-specific
// sounds, then consumption, then net+growth with the +1 person pip, then build /
// research completions. Skippable by tap (jumps to final). Reads ledgerRows()
// derived from the TurnReport so the math shown is exactly what the reducer did.
//
// On a growth turn a small villager pip arcs from the surplus line up into the
// People chip (CSS arc, the existing growth chime — no new sound), and the count
// answers with a soft bounce via onGrowthLanded.
//
// StrictMode-safe: all timers are tracked and fully cleared on unmount / skip.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { TurnReport } from "../game/kingdom";
import { ledgerRows, type LedgerRow } from "../game/display";
import { sfx } from "../lib/sfx";
import { turnIndicator } from "../game/display";

const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function rowSound(row: LedgerRow) {
  if (row.kind === "production") {
    switch (row.resource) {
      case "food":
        return sfx.food();
      case "wood":
        return sfx.wood();
      case "stone":
        return sfx.stone();
      case "gold":
        return sfx.collect();
      case "research":
        return sfx.research();
      default:
        return sfx.collect();
    }
  }
  if (row.kind === "consume") return sfx.deduct();
  if (row.kind === "build" || row.kind === "research") return sfx.stamp();
  // net handled separately (growth chimes success)
}

interface PipFlight {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export function LedgerOverlay({
  report,
  onDone,
  onGrowthLanded,
}: {
  report: TurnReport;
  onDone: () => void;
  /** Fired once when the +1-person pip lands on the People chip (growth turns). */
  onGrowthLanded?: () => void;
}) {
  const rows = ledgerRows(report);
  const [shown, setShown] = useState(prefersReduced ? rows.length : 0);
  const [skipped, setSkipped] = useState(prefersReduced);
  const [pip, setPip] = useState<PipFlight | null>(null);
  const timers = useRef<number[]>([]);
  const doneRef = useRef(false);
  const growthFiredRef = useRef(false);
  const netRowRef = useRef<HTMLDivElement | null>(null);

  function clearTimers() {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }

  function fireGrowthLanded() {
    if (growthFiredRef.current) return;
    growthFiredRef.current = true;
    onGrowthLanded?.();
  }

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimers();
    onDone();
  }

  /** Launch the villager pip from the surplus line toward the People chip. */
  function launchGrowthPip() {
    const from = netRowRef.current?.getBoundingClientRect();
    const to = document.querySelector(".res.is-pop")?.getBoundingClientRect();
    if (!from || !to) {
      fireGrowthLanded();
      return;
    }
    const x = from.right - 28;
    const y = from.top + from.height / 2 - 9;
    const dx = to.left + to.width / 2 - x;
    const dy = to.top + to.height / 2 - y;
    setPip({ x, y, dx, dy });
    const t = window.setTimeout(() => {
      setPip(null);
      fireGrowthLanded();
    }, 540);
    timers.current.push(t);
  }

  function skip() {
    if (skipped) return;
    setSkipped(true);
    clearTimers();
    setShown(rows.length);
    setPip(null);
    if (report.grew) fireGrowthLanded(); // the count still answers the +1
    sfx.collect();
    // settle briefly then close
    const t = window.setTimeout(finish, 350);
    timers.current.push(t);
  }

  useEffect(() => {
    if (prefersReduced) {
      // Fades only, no particles: show all, chime growth once, close fast.
      if (report.grew) sfx.success();
      const t = window.setTimeout(finish, 220);
      timers.current.push(t);
      return clearTimers;
    }

    // Season swell at 0.0s.
    sfx.season();
    const stagger = 150; // ms per ledger row
    rows.forEach((row, i) => {
      const t = window.setTimeout(() => {
        setShown((s) => Math.max(s, i + 1));
        rowSound(row);
        if (row.kind === "net" && report.grew) {
          sfx.success();
          launchGrowthPip();
        }
      }, 200 + i * stagger);
      timers.current.push(t);
    });
    // After all rows, settle then close.
    const total = 200 + rows.length * stagger + 600;
    const tEnd = window.setTimeout(finish, total);
    timers.current.push(tEnd);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="ledger-overlay"
      onClick={skip}
      role="dialog"
      aria-label="Season resolution"
    >
      <div className="ledger parchment ruled ledger-margin" onClick={(e) => e.stopPropagation()}>
        <h2>The season turns — {turnIndicator(report.turn)}</h2>
        <div className="ledger-rows">
          {rows.map((row, i) => (
            <div
              key={i}
              ref={row.kind === "net" ? netRowRef : undefined}
              className={[
                "ledger-row",
                i < shown ? "show" : "",
                row.kind === "idle" ? "idle" : "",
                row.kind === "consume" ? "consume" : "",
                row.kind === "build" ? "build-row" : "",
                row.kind === "net" && report.foodStatus === "surplus" ? "net-surplus" : "",
                row.kind === "net" && report.foodStatus === "deficit" ? "net-deficit" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="lr-label">{row.label}</span>
              <span className="lr-formula">{row.formula}</span>
              <span className="lr-amount">{row.amount}</span>
            </div>
          ))}
        </div>
        <div className="ledger-skip" onClick={skip} role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") skip(); }}>
          {skipped ? "…" : "Tap to skip"}
        </div>
      </div>

      {pip && (
        <span
          className="grow-pip"
          style={{ left: pip.x, top: pip.y, "--dx": `${pip.dx}px`, "--dy": `${pip.dy}px` } as CSSProperties}
          aria-hidden
        >
          <svg className="pip-figure" viewBox="0 0 12 16">
            <circle cx="6" cy="3.2" r="2.6" fill="currentColor" />
            <path d="M6 6.6c-2.7 0-4.3 1.8-4.3 4.6V16h8.6v-4.8c0-2.8-1.6-4.6-4.3-4.6z" fill="currentColor" />
          </svg>
        </span>
      )}
    </div>
  );
}
