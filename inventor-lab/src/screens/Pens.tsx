import { ArrowLeft, Lock, Check } from "lucide-react";
import { useStore } from "../state/store";
import { PENS, penUnlocked } from "../data/cosmetics";
import { sfx } from "../lib/sfx";

// Blueprint Pens — recolor placed-part lines + the flag. Unlocked by total stars.
export function Pens() {
  const go = useStore((s) => s.go);
  const totalStars = useStore((s) => s.totalStars());
  const pen = useStore((s) => s.save.pen);
  const setPen = useStore((s) => s.setPen);

  return (
    <div className="col" style={{ minHeight: "100%", maxWidth: 900, margin: "0 auto", width: "100%", padding: "20px 24px 48px" }}>
      <div className="row" style={{ gap: 12, marginBottom: 20 }}>
        <button className="btn no-select" onClick={() => { sfx.tap(); go("missions"); }} aria-label="Back to bench">
          <ArrowLeft size={18} style={{ marginRight: 8, verticalAlign: "-3px" }} />Bench
        </button>
        <h2 className="mono" style={{ margin: 0, letterSpacing: "0.1em" }}>Blueprint Pens</h2>
        <span className="label" style={{ alignSelf: "center" }}>{totalStars} / 36 stars</span>
      </div>

      <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
        {PENS.map((p) => {
          const unlocked = penUnlocked(p, totalStars);
          const active = pen === p.hex;
          return (
            <button
              key={p.id}
              className="panel col no-select"
              disabled={!unlocked}
              aria-label={`${p.name}${unlocked ? "" : `, unlock at ${p.unlockStars} stars`}${active ? ", selected" : ""}`}
              onClick={() => { if (unlocked) { sfx.select(); setPen(p.hex); } else sfx.fail(); }}
              style={{
                width: 200,
                padding: 16,
                gap: 12,
                alignItems: "flex-start",
                cursor: unlocked ? "pointer" : "not-allowed",
                opacity: unlocked ? 1 : 0.5,
                border: active ? "2px solid var(--cyan)" : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
                <span
                  style={{ width: 40, height: 40, borderRadius: 8, background: p.hex, boxShadow: `0 0 0 1px rgba(0,0,0,0.3), 0 0 14px ${p.hex}55` }}
                />
                {active ? <Check size={18} color="var(--cyan)" /> : !unlocked ? <Lock size={16} color="var(--chalk-dim)" /> : null}
              </div>
              {/* a sample drawn line in this pen */}
              <svg viewBox="0 0 168 24" width="100%" height={24} aria-hidden>
                <rect x={4} y={4} width={160} height={16} rx={3} fill="none" stroke={p.hex} strokeWidth={2.5} />
              </svg>
              <div className="mono" style={{ fontSize: 15 }}>{p.name}</div>
              <div className="label">{unlocked ? (active ? "EQUIPPED" : "READY") : `UNLOCK AT ${p.unlockStars}★`}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
