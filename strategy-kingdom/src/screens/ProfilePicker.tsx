// "Who is ruling today?" — three monogram discs (no avatars to manage).
import { useStore, PROFILES } from "../state/store";
import { COPY } from "../game/content";
import { CrestBanner } from "../components/CrestBanner";
import { sfx } from "../lib/sfx";

export function ProfilePicker() {
  const pickProfile = useStore((s) => s.pickProfile);
  return (
    <div className="center-screen">
      <div className="stack center" style={{ gap: 24, maxWidth: 560 }}>
        <CrestBanner cosmeticId="plain" width={120} />
        <div className="stack center" style={{ gap: 4 }}>
          <h1 style={{ color: "var(--brass)" }}>{COPY.appTitle}</h1>
          <p className="muted">A small kingdom, season by season. Every number shown.</p>
        </div>
        <h2 className="display" style={{ color: "var(--text)" }}>
          {COPY.profilePrompt}
        </h2>
        <div className="row wrap gap16" style={{ justifyContent: "center" }}>
          {PROFILES.map((p) => (
            <button
              key={p.id}
              className="stack center"
              style={{ gap: 8, background: "none", border: "none", cursor: "pointer" }}
              onClick={() => {
                sfx.select();
                pickProfile(p.id);
              }}
              aria-label={`Play as ${p.name}`}
            >
              <span className="monogram" style={{ background: p.color }}>
                {p.name[0]}
              </span>
              <span className="display" style={{ fontSize: 20, color: "var(--text)" }}>
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
