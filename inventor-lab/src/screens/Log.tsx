import { ArrowLeft, Award } from "lucide-react";
import { useStore } from "../state/store";
import { BADGES } from "../data/cosmetics";
import { LEVELS } from "../data/levels";
import { sfx } from "../lib/sfx";
import { PartShape } from "./Sheet";
import { PART_COST } from "../game/types";

// Engineer's Log — achievement plates + My Inventions (saved builds, mini-SVG thumbnails).
export function Log() {
  const go = useStore((s) => s.go);
  const openLevel = useStore((s) => s.openLevel);
  const save = useStore((s) => s.save);
  const pen = save.pen;
  const totalTests = save.totalTests;

  const inventions = LEVELS.filter((l) => save.levels[l.id]?.build && save.levels[l.id]!.build!.length > 0);

  return (
    <div className="col" style={{ minHeight: "100%", maxWidth: 1000, margin: "0 auto", width: "100%", padding: "20px 24px 48px" }}>
      <div className="row" style={{ gap: 12, marginBottom: 20 }}>
        <button className="btn no-select" onClick={() => { sfx.tap(); go("missions"); }} aria-label="Back to bench">
          <ArrowLeft size={18} style={{ marginRight: 8, verticalAlign: "-3px" }} />Bench
        </button>
        <h2 className="mono" style={{ margin: 0, letterSpacing: "0.1em" }}>Engineer's Log</h2>
        <span className="label" style={{ alignSelf: "center" }}>{totalTests} tests run</span>
      </div>

      <div className="row" style={{ gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        {BADGES.map((b) => {
          const earned = b.earned(save);
          return (
            <div
              key={b.id}
              className="panel col"
              style={{ width: 224, padding: 16, gap: 8, opacity: earned ? 1 : 0.55, border: earned ? "1px solid rgba(128,237,153,0.4)" : "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <Award size={20} color={earned ? "var(--success)" : "var(--chalk-dim)"} />
                <span className="label" style={{ color: earned ? "var(--success)" : "var(--chalk-dim)" }}>{earned ? "EARNED" : "LOCKED"}</span>
              </div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 500 }}>{b.name}</div>
              <div style={{ fontSize: 14, color: "var(--chalk-dim)", lineHeight: 1.4 }}>{b.criteria}</div>
            </div>
          );
        })}
      </div>

      <div className="row" style={{ gap: 12, marginBottom: 14, alignItems: "baseline" }}>
        <h2 className="mono" style={{ margin: 0, fontSize: 22, letterSpacing: "0.1em" }}>My Inventions</h2>
      </div>
      {inventions.length === 0 ? (
        <p style={{ color: "var(--chalk-dim)" }}>Solve a mission to save your first build.</p>
      ) : (
        <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
          {inventions.map((l) => {
            const rec = save.levels[l.id]!;
            const build = rec.build!;
            const cost = build.reduce((s, p) => s + PART_COST[p.part], 0);
            return (
              <button
                key={l.id}
                className="panel col no-select"
                style={{ width: 240, padding: 12, gap: 8, cursor: "pointer", textAlign: "left", color: "var(--chalk)" }}
                onClick={() => { sfx.select(); openLevel(l.id); }}
                aria-label={`Load build for mission ${l.id}`}
              >
                <svg viewBox="0 0 1280 720" width="100%" height={120} style={{ background: "rgba(8,24,44,0.6)", borderRadius: 6 }} aria-hidden>
                  {l.terrain.map((t, i) => (
                    <rect key={i} x={t.x - t.w / 2} y={t.y - t.h / 2} width={t.w} height={t.h} fill="rgba(255,255,255,0.06)" stroke="rgba(232,241,255,0.3)" strokeWidth={2} />
                  ))}
                  <rect x={l.goal.x} y={l.goal.y} width={l.goal.w} height={l.goal.h} fill="none" stroke="var(--success)" strokeWidth={3} strokeDasharray="10 8" />
                  {build.map((p, i) => <PartShape key={i} p={p} pen={pen} />)}
                </svg>
                <div className="mono" style={{ fontSize: 14 }}>MISSION {String(l.id).padStart(2, "0")} · {rec.stars}★</div>
                <div className="label">{build.length} parts, {cost} cost · Load build</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
