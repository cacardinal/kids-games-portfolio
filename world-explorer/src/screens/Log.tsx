import { ChevronLeft } from "lucide-react";
import { useStore } from "../state/store";
import { REGION_LABEL } from "../data/types";
import { SpeakButton } from "../components/SpeakButton";
import { sfx } from "../lib/sfx";

// Explorer Log — discovered facts, each with a SpeakButton (GDD §5).
export function Log() {
  const save = useStore((s) => s.save);
  const setView = useStore((s) => s.setView);
  const markFactRead = useStore((s) => s.markFactRead);

  return (
    <div className="sheet">
      <div className="backrow">
        <button className="icon-btn" aria-label="Back to atlas" onClick={() => { sfx.tap(); setView("atlas"); }}>
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <h2>Explorer Log · {save.log.length} discoveries</h2>
      </div>

      <div className="sheet__body">
        <div className="sheet__wrap">
          {save.log.length === 0 ? (
            <p className="log-empty">No discoveries yet. Complete a mission to fill your log.</p>
          ) : (
            <div className="log-list">
              {save.log.map((entry) => (
                <div className="log-entry" key={entry.factId}>
                  <SpeakButton text={entry.text} onSpoken={() => markFactRead(entry.factId)} />
                  <span className="log-entry__text">{entry.text}</span>
                  <span className="log-entry__tag">{REGION_LABEL[entry.region]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
