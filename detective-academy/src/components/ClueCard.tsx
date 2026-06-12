import { useRef } from "react";
import { SpeakButton } from "./SpeakButton";
import { ClueCategoryIcon } from "./icons";
import { sfx } from "../lib/sfx";
import type { Clue } from "../game/types";

const KIND_LABEL: Record<string, string> = {
  alibi: "Statement",
  attribute: "Evidence",
  flavor: "Note",
};

function categoryLabel(clue: Clue): string {
  if (clue.kind === "alibi") return "Alibi";
  if (clue.kind === "flavor") return "Possible noise";
  return `${clue.dimension[0].toUpperCase()}${clue.dimension.slice(1)} clue`;
}

// A single evidence/clue card. Paper grain, category icon (the early reader's pre-literate sort),
// SpeakButton. `highlighted` powers the tier-2 hint pulse / ring.
export function ClueCard({
  clue,
  rotation,
  highlighted = false,
  onFirstOpen,
}: {
  clue: Clue;
  rotation: number;
  highlighted?: boolean;
  onFirstOpen?: (clueId: string) => void;
}) {
  const opened = useRef(false);

  const handlePress = () => {
    sfx.tap();
    if (!opened.current) {
      opened.current = true;
      sfx.paper();
      onFirstOpen?.(clue.id);
    }
  };

  return (
    <div
      className={`cluecard paper grain${highlighted ? " cluecard--hl" : ""}`}
      style={{ "--jit": `${rotation}deg` } as React.CSSProperties}
      onPointerDown={handlePress}
    >
      {/* a push-pin holding the card to the board; sways on idle (GDD §4.11) */}
      <span className="cluecard__pin" aria-hidden />
      <div className="cluecard__head">
        <span className="cluecard__cat">
          <span className="cluecard__cat-icon">
            <ClueCategoryIcon
              kind={clue.kind}
              dimension={clue.kind === "attribute" ? clue.dimension : undefined}
              value={clue.kind === "attribute" ? clue.value : undefined}
            />
          </span>
          <span className="cluecard__cat-txt display">{categoryLabel(clue)}</span>
        </span>
        <SpeakButton text={clue.text} />
      </div>
      <p className="cluecard__text">{clue.text}</p>
      <div className="cluecard__foot meta">{KIND_LABEL[clue.kind]}</div>
    </div>
  );
}
