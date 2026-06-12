import { useStore, PROFILES } from "../state/store";
import { CompassRose } from "../components/Glyphs";
import { sfx } from "../lib/sfx";

// "Who's exploring?" — three monogram discs (GDD §5 / shared contract §6).
export function ProfilePicker() {
  const selectProfile = useStore((s) => s.selectProfile);
  return (
    <div className="profiles">
      <CompassRose size={64} />
      <h1 className="profiles__title">Who's exploring?</h1>
      <div className="discs">
        {PROFILES.map((p) => (
          <div className="disc__wrap" key={p.id}>
            <button
              className="disc"
              style={{ ["--disc-tint" as string]: p.tint }}
              aria-label={p.name}
              onClick={() => {
                sfx.select();
                selectProfile(p.id);
              }}
            >
              {p.initial}
            </button>
            <span className="disc__name">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
