import { PROFILES, useStore } from "../state/store";
import { loadSave } from "../lib/storage";
import { freshSave, type ProfileSave } from "../state/types";
import { rankForXp } from "../game/progression";
import { sfx } from "../lib/sfx";

// "Who's playing?" — three monogram discs (GDD §5.8). Sub-line shows rank or "New detective".
function peekRank(id: string): string {
  const save = loadSave<ProfileSave>(`kg.detective.v1.${id}`, freshSave("standard"));
  if (!save || save.xp === 0) return "New detective";
  return rankForXp(save.xp).name;
}

export function ProfilePicker() {
  const selectProfile = useStore((s) => s.selectProfile);

  return (
    <div className="shell profilepick">
      <div className="profilepick__head">
        <div className="kicker display">Detective Academy</div>
        <h1>Who's playing?</h1>
      </div>
      <div className="discrow">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            className="disccard"
            type="button"
            onPointerUp={() => {
              sfx.select();
              selectProfile(p.id);
            }}
          >
            <span className="disc" style={{ background: p.color }} aria-hidden>
              <span className="disc__initial display">{p.initial}</span>
            </span>
            <span className="disccard__name display">{p.name}</span>
            <span className="disccard__rank meta">{peekRank(p.id)}</span>
          </button>
        ))}
      </div>
      <p className="profilepick__foot meta">
        Three desks. Pick yours — your cases and badges are kept on your own desk.
      </p>
    </div>
  );
}
