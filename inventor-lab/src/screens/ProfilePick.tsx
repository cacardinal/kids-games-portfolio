import { useStore, PROFILES } from "../state/store";
import { sfx } from "../lib/sfx";
import { SyncBadge } from "../components/SyncBadge";

// "Who's at the bench?" — three monogram discs. The early reader's first win path starts here.
export function ProfilePick() {
  const setProfile = useStore((s) => s.setProfile);
  return (
    <div className="col" style={{ minHeight: "100%", alignItems: "center", justifyContent: "center", gap: 32, padding: 24 }}>
      <div className="col" style={{ alignItems: "center", gap: 8 }}>
        <div className="label">Inventor Lab</div>
        <h1 style={{ margin: 0, fontFamily: "var(--mono)", fontSize: "var(--t-h1)", letterSpacing: "0.04em" }}>
          Who's at the bench?
        </h1>
      </div>
      <div className="row" style={{ gap: 28, flexWrap: "wrap", justifyContent: "center" }}>
        {PROFILES.map((p) => (
          <button
            key={p.id}
            className="col no-select"
            aria-label={`Play as ${p.name}`}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              alignItems: "center",
              gap: 12,
              padding: 8,
            }}
            onClick={() => {
              sfx.select();
              setProfile(p.id);
            }}
          >
            <span
              className="disc"
              style={{
                width: 128,
                height: 128,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--mono)",
                fontSize: 56,
                fontWeight: 600,
                color: "#0a1f36",
                background: `radial-gradient(120% 120% at 30% 25%, ${p.disc}, ${p.disc}cc)`,
                boxShadow: `0 0 0 2px ${p.disc}55, 0 12px 28px rgba(0,0,0,0.35)`,
              }}
            >
              {p.name[0]}
            </span>
            <span className="mono" style={{ fontSize: 18, letterSpacing: "0.08em" }}>
              {p.name}
            </span>
          </button>
        ))}
      </div>
      <p className="label" style={{ maxWidth: 420, textAlign: "center", lineHeight: 1.6 }}>
        Pick a bench. Builds and stars are saved for each engineer.
      </p>
      <SyncBadge />
    </div>
  );
}
