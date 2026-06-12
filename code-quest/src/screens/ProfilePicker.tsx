import { useStore } from "../state/store";
import { PROFILES } from "../state/save";
import { STR } from "../data/copy";
import { sfx } from "../lib/sfx";

export function ProfilePicker() {
  const pickProfile = useStore((s) => s.pickProfile);

  return (
    <div className="screen profile-picker">
      <div className="boot-header">
        <div className="statusline">
          <span className="dot" />
          <span>CODE QUEST // MISSION CONTROL</span>
        </div>
        <h1 className="boot-title">CODE QUEST</h1>
        <p className="boot-sub">{STR.profileHeader}</p>
      </div>

      <div className="profile-discs">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            type="button"
            className="profile-disc"
            onClick={() => {
              sfx.select();
              pickProfile(p.id);
            }}
            aria-label={`Operate as ${p.name}`}
          >
            <span className="disc" style={{ "--disc-color": p.color } as React.CSSProperties}>
              {p.name[0]}
            </span>
            <span className="disc-name">{p.name}</span>
          </button>
        ))}
      </div>

      <p className="boot-foot">Select an operator to begin. Progress saves automatically.</p>
    </div>
  );
}
