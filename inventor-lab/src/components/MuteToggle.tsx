import { Volume2, VolumeX } from "lucide-react";
import { useStore } from "../state/store";
import { sfx } from "../lib/sfx";

// Sound mute toggle, persisted per profile. Default ON.
export function MuteToggle() {
  const muted = useStore((s) => s.save.muted);
  const setMutedPref = useStore((s) => s.setMutedPref);
  return (
    <button
      className="btn no-select"
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      style={{ minWidth: 48, width: 48, height: 48, padding: 0 }}
      onClick={() => {
        const next = !muted;
        setMutedPref(next);
        if (!next) sfx.tap(); // confirm unmute audibly
      }}
    >
      {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
    </button>
  );
}
