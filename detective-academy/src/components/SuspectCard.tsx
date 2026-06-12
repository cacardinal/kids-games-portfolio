import { useState } from "react";
import { Check } from "lucide-react";
import { AttributeIcon } from "./icons";
import { SuspectPortrait } from "./SuspectPortrait";
import { SpeakButton } from "./SpeakButton";
import { sfx } from "../lib/sfx";
import type { Case, Suspect } from "../game/types";

// A suspect card with the in-card "Clear this suspect" flow. On a correct clear it
// flips to the CLEARED state with the cited clue printed (handled by parent state).
export function SuspectCard({
  caseData,
  suspect,
  rotation,
  cleared,
  citedClueId,
  highlightClueId,
  onClear,
}: {
  caseData: Case;
  suspect: Suspect;
  rotation: number;
  cleared: boolean;
  citedClueId?: string;
  highlightClueId?: string;
  onClear: (suspectId: string, clueId: string) => { ok: boolean; reason?: string };
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [armedClue, setArmedClue] = useState<string | null>(null);
  const [reject, setReject] = useState<string | null>(null);
  const [justFlipped, setJustFlipped] = useState(false);

  const citedClue = citedClueId
    ? caseData.clues.find((c) => c.id === citedClueId)
    : undefined;

  const openPanel = () => {
    if (cleared) return;
    sfx.select();
    setPanelOpen((o) => !o);
    setReject(null);
    setArmedClue(null);
  };

  const arm = (clueId: string) => {
    sfx.select();
    setArmedClue(clueId);
    setReject(null);
  };

  const cite = () => {
    if (!armedClue) return;
    const res = onClear(suspect.id, armedClue);
    if (res.ok) {
      setJustFlipped(true);
      setPanelOpen(false);
      window.setTimeout(() => setJustFlipped(false), 600);
    } else {
      setReject(res.reason ?? "That clue doesn't clear them.");
    }
  };

  return (
    <div className={`suspect${cleared ? " suspect--cleared" : ""}`}>
      <button
        type="button"
        className={`suspectcard paper grain${justFlipped ? " suspectcard--flip" : ""}`}
        style={{ "--jit": `${rotation}deg` } as React.CSSProperties}
        onPointerUp={openPanel}
        aria-expanded={panelOpen}
        aria-label={cleared ? `${suspect.name}, cleared` : `Work suspect ${suspect.name}`}
      >
        <div className="suspectcard__head">
          <span className="suspectcard__name display">{suspect.name}</span>
          {cleared && (
            <span className="cleared-stamp display" aria-label="cleared">
              <Check size={14} strokeWidth={3} /> CLEARED
            </span>
          )}
        </div>
        <div className="suspectcard__id">
          <SuspectPortrait
            name={suspect.name}
            hair={suspect.hair}
            accessory={suspect.accessory}
            pet={suspect.pet}
            size={84}
            cleared={cleared}
          />
          <div className="suspectcard__attrs" aria-hidden>
            <span className="attrpill" title={`${suspect.hair} hair`}>
              <AttributeIcon dimension="hair" value={suspect.hair} size={22} />
            </span>
            <span className="attrpill" title={suspect.accessory}>
              <AttributeIcon dimension="accessory" value={suspect.accessory} size={22} />
            </span>
            <span className="attrpill" title={suspect.pet === "none" ? "no pet" : suspect.pet}>
              <AttributeIcon dimension="pet" value={suspect.pet} size={22} />
            </span>
          </div>
        </div>
        {cleared && citedClue ? (
          <p className="suspectcard__cited display">{citedClue.text}</p>
        ) : (
          <p className="suspectcard__hint meta">
            {cleared ? "Set aside." : "Tap to clear with the proof."}
          </p>
        )}
      </button>

      {panelOpen && !cleared && (
        <div className="clearpanel paper grain">
          <div className="clearpanel__head">
            <span className="clearpanel__who">
              <SuspectPortrait
                name={suspect.name}
                hair={suspect.hair}
                accessory={suspect.accessory}
                pet={suspect.pet}
                size={52}
              />
              <span className="clearpanel__q display">Which clue clears {suspect.name}?</span>
            </span>
            <SpeakButton text={`Which clue clears ${suspect.name}?`} />
          </div>
          <div className="clearpanel__rows">
            {caseData.clues.map((clue) => (
              <div
                key={clue.id}
                role="button"
                tabIndex={0}
                className={`cluerow${armedClue === clue.id ? " cluerow--armed" : ""}${
                  highlightClueId === clue.id ? " cluerow--hl" : ""
                }${reject && armedClue === clue.id ? " cluerow--reject" : ""}`}
                onPointerUp={() => arm(clue.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    arm(clue.id);
                  }
                }}
                aria-pressed={armedClue === clue.id}
              >
                <span className="cluerow__txt">{clue.text}</span>
                <SpeakButton text={clue.text} />
              </div>
            ))}
          </div>
          {reject && <p className="clearpanel__reject">{reject}</p>}
          <div className="clearpanel__actions">
            <button
              type="button"
              className="btn btn--brass"
              disabled={!armedClue}
              onPointerUp={cite}
            >
              This clue clears them
            </button>
            <button type="button" className="btn btn--ghost" onPointerUp={() => setPanelOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
