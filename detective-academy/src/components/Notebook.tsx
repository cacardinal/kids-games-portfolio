import { useState } from "react";
import { X } from "lucide-react";
import { SpeakButton } from "./SpeakButton";
import { sfx } from "../lib/sfx";
import type { Case } from "../game/types";

// Auto-logging notebook (GDD §4.7). Append-only, automatic — the player never types.
// One line per cleared suspect, in the moment of clearing. The running spine the
// recap is built from.
export function Notebook({
  caseData,
  clearedIds,
  clearedVia,
}: {
  caseData: Case;
  clearedIds: string[];
  clearedVia: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);

  const lines = clearedIds.map((sid) => {
    const suspect = caseData.suspects.find((s) => s.id === sid);
    const clue = caseData.clues.find((c) => c.id === clearedVia[sid]);
    let reason = "cleared by the evidence";
    if (clue) {
      if (clue.kind === "alibi") reason = `cleared. ${suspect?.name} was elsewhere`;
      else if (clue.kind === "attribute") reason = `cleared. Didn't match the ${clue.dimension} clue`;
    }
    return `— ${suspect?.name ?? sid}: ${reason}.`;
  });

  const fullText =
    lines.length > 0
      ? `Detective's notes. ${lines.join(" ")}`
      : "Your deductions will be recorded here as you clear suspects.";

  return (
    <>
      <button
        type="button"
        className="notebook-tab display"
        onPointerUp={() => {
          sfx.tap();
          setOpen(true);
        }}
        aria-label="Open notes"
      >
        NOTES
      </button>

      {open && (
        <div className="notebook-scrim" onPointerUp={() => setOpen(false)}>
          <aside
            className="notebook paper grain"
            onPointerUp={(e) => e.stopPropagation()}
            aria-label="Detective's notebook"
          >
            <div className="notebook__head">
              <h3 className="display">Notes</h3>
              <div className="notebook__head-actions">
                <SpeakButton text={fullText} />
                <button
                  type="button"
                  className="iconbtn"
                  onPointerUp={() => setOpen(false)}
                  aria-label="Close notes"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="notebook__body">
              {lines.length === 0 ? (
                <p className="notebook__empty">
                  Your deductions will be recorded here as you clear suspects.
                </p>
              ) : (
                <ul className="notebook__list">
                  {lines.map((line, i) => (
                    <li key={i} className="notebook__line display">
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
