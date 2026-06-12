import { useState } from "react";
import { X } from "lucide-react";
import { AttributeIcon } from "./icons";
import { SuspectPortrait } from "./SuspectPortrait";
import { sfx } from "../lib/sfx";
import type { Case } from "../game/types";

// AccuseModal (GDD §4.5/§4.6): one suspect + exactly two clues. Selecting a third clue
// deselects the oldest. Wrong result types a specific line in; correct triggers the
// parent's CASE CLOSED set-piece.
export function AccuseModal({
  caseData,
  onClose,
  onSubmit,
}: {
  caseData: Case;
  onClose: () => void;
  onSubmit: (suspectId: string, clueIds: string[]) => { ok: boolean; reason?: string };
}) {
  const [suspectId, setSuspectId] = useState<string | null>(null);
  const [clueIds, setClueIds] = useState<string[]>([]);
  const [reject, setReject] = useState<string | null>(null);

  const toggleClue = (id: string) => {
    sfx.select();
    setReject(null);
    setClueIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length < 2) return [...prev, id];
      // deselect the oldest, append the new (tick)
      return [prev[1], id];
    });
  };

  const pickSuspect = (id: string) => {
    sfx.select();
    setReject(null);
    setSuspectId(id);
  };

  const canSubmit = !!suspectId && clueIds.length === 2;

  const submit = () => {
    if (!suspectId) return;
    sfx.tap();
    const res = onSubmit(suspectId, clueIds);
    if (!res.ok) {
      setReject(res.reason ?? "That accusation doesn't hold.");
    }
    // on success the parent unmounts this modal for the set-piece
  };

  return (
    <div className="modal-scrim" onPointerUp={onClose}>
      <div
        className="modal paper grain"
        role="dialog"
        aria-modal="true"
        aria-label="Name the culprit"
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <h2 className="display">Name the culprit</h2>
            <p className="modal__sub meta">
              Choose one suspect and the two clues that point to them.
            </p>
          </div>
          <button type="button" className="iconbtn" onPointerUp={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <div className="modal__section">
          <div className="modal__label display">Suspect</div>
          <div className="accuse-suspects">
            {caseData.suspects.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`accuse-suspect${suspectId === s.id ? " accuse-suspect--on" : ""}`}
                onPointerUp={() => pickSuspect(s.id)}
                aria-pressed={suspectId === s.id}
              >
                <span className="accuse-suspect__top">
                  <SuspectPortrait
                    name={s.name}
                    hair={s.hair}
                    accessory={s.accessory}
                    pet={s.pet}
                    size={56}
                  />
                  <span className="accuse-suspect__name display">{s.name}</span>
                </span>
                <span className="accuse-suspect__attrs" aria-hidden>
                  <AttributeIcon dimension="hair" value={s.hair} size={18} />
                  <AttributeIcon dimension="accessory" value={s.accessory} size={18} />
                  <AttributeIcon dimension="pet" value={s.pet} size={18} />
                </span>
                {suspectId === s.id && reject && (
                  <span className="accuse-suspect__reject typeline">{reject}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="modal__section">
          <div className="modal__label display">
            Two clues that point to them{" "}
            <span className="meta">({clueIds.length}/2)</span>
          </div>
          <div className="accuse-clues">
            {caseData.clues.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`accuse-clue${clueIds.includes(c.id) ? " accuse-clue--on" : ""}`}
                onPointerUp={() => toggleClue(c.id)}
                aria-pressed={clueIds.includes(c.id)}
              >
                <span className="accuse-clue__txt">{c.text}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="modal__actions">
          <button type="button" className="btn btn--brass" disabled={!canSubmit} onPointerUp={submit}>
            Make the accusation
          </button>
          <button type="button" className="btn btn--ghost" onPointerUp={onClose}>
            Not yet
          </button>
        </div>
      </div>
    </div>
  );
}
