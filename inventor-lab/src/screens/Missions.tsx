import { useStore, PROFILES } from "../state/store";
import { LEVELS } from "../data/levels";
import { StarPips } from "../components/Stars";
import { MuteToggle } from "../components/MuteToggle";
import { sfx } from "../lib/sfx";
import { PenTool, ScrollText } from "lucide-react";

const SERIES_META: Record<string, { label: string; subtitle: string }> = {
  bridge: { label: "BRIDGE", subtitle: "Span the gap." },
  ballrun: { label: "BALL RUN", subtitle: "Route the drop." },
  launch: { label: "LAUNCH", subtitle: "Launch the payload." },
};

export function Missions() {
  const profile = useStore((s) => s.profile)!;
  const openLevel = useStore((s) => s.openLevel);
  const getRecord = useStore((s) => s.getRecord);
  const go = useStore((s) => s.go);
  const totalStars = useStore((s) => s.totalStars());
  const clearProfile = useStore((s) => s.clearProfile);
  const p = PROFILES.find((x) => x.id === profile)!;

  const series: ("bridge" | "ballrun" | "launch")[] = ["bridge", "ballrun", "launch"];

  return (
    <div className="col" style={{ minHeight: "100%", maxWidth: 1180, margin: "0 auto", width: "100%", padding: "20px 24px 48px" }}>
      {/* Header bar */}
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div className="row gap-12">
          <button
            className="row no-select"
            aria-label="Switch engineer"
            style={{ background: "transparent", border: "none", cursor: "pointer", gap: 10, padding: 0 }}
            onClick={() => { sfx.tap(); clearProfile(); }}
          >
            <span style={{ width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontWeight: 600, color: "#0a1f36", background: p.disc }}>
              {p.name[0]}
            </span>
            <span className="col" style={{ alignItems: "flex-start" }}>
              <span className="label" style={{ lineHeight: 1 }}>Prototype Bench</span>
              <span className="mono" style={{ fontSize: 16 }}>{p.name}</span>
            </span>
          </button>
        </div>
        <div className="row gap-12">
          <span className="title-block" style={{ alignSelf: "center" }}>
            <span className="tb-row">
              <span className="tb-cell"><span className="tb-k">Total Stars</span><div className="tb-v">{totalStars} / 36</div></span>
            </span>
          </span>
          <button className="btn no-select" onClick={() => { sfx.tap(); go("pens"); }} aria-label="Blueprint Pens">
            <PenTool size={18} style={{ marginRight: 8, verticalAlign: "-3px" }} />Pens
          </button>
          <button className="btn no-select" onClick={() => { sfx.tap(); go("log"); }} aria-label="Engineer's Log">
            <ScrollText size={18} style={{ marginRight: 8, verticalAlign: "-3px" }} />Log
          </button>
          <MuteToggle />
        </div>
      </div>

      {series.map((s) => {
        const meta = SERIES_META[s];
        const levels = LEVELS.filter((l) => l.series === s);
        return (
          <section key={s} style={{ marginBottom: 28 }}>
            <div className="row" style={{ gap: 12, marginBottom: 12, alignItems: "baseline" }}>
              <h2 className="mono" style={{ margin: 0, fontSize: "var(--t-h2)", letterSpacing: "0.1em" }}>{meta.label}</h2>
              <span className="label">{meta.subtitle}</span>
            </div>
            <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
              {levels.map((l) => {
                const rec = getRecord(l.id);
                return (
                  <button
                    key={l.id}
                    className="panel col no-select level-card"
                    aria-label={`Mission ${l.id}, ${l.title}, ${rec.stars} of 3 stars`}
                    style={{
                      width: 210,
                      minHeight: 132,
                      padding: 14,
                      alignItems: "flex-start",
                      cursor: "pointer",
                      gap: 8,
                      textAlign: "left",
                    }}
                    onClick={() => { sfx.select(); openLevel(l.id); }}
                  >
                    <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
                      <span className="label" style={{ letterSpacing: "0.14em" }}>
                        MISSION {String(l.id).padStart(2, "0")}
                      </span>
                      <span className="label" style={{ letterSpacing: "0.1em" }}>REV {rec.rev}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.2 }}>{l.title}</div>
                    <div className="grow" />
                    <div className="row" style={{ justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                      <StarPips count={rec.stars} />
                      <span className="label" style={{ color: rec.solved ? "var(--success)" : "var(--chalk-dim)" }}>
                        {rec.solved ? "APPROVED" : "OPEN"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
