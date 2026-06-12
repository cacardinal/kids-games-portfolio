import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { SectorPatch } from "./SectorPatch";
import { PATCH_CITATION, STR } from "../data/copy";
import { sfx, stampThud } from "../lib/sfx";

/**
 * Patch-minting set-piece (GDD §4.3, 900ms, skippable by tap; <=200ms fade under reduced-motion).
 * Fires when a sector is newly cleared. StrictMode-safe: timers owned by refs, fully cleared.
 */
export function PatchMint() {
  const patchMinting = useStore((s) => s.patchMinting);
  const dismissPatch = useStore((s) => s.dismissPatch);
  const backToMap = useStore((s) => s.backToMap);
  const [phase, setPhase] = useState<"hush" | "arrive" | "stitch" | "settle">("hush");
  const playedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!patchMinting) {
      playedRef.current = false;
      setPhase("hush");
      return;
    }
    // guard against StrictMode double-fire of the audio
    if (!playedRef.current) {
      playedRef.current = true;
      // fanfare at ~120ms, stamp thud at ~180ms
      timersRef.current.push(setTimeout(() => sfx.success(), 120));
      timersRef.current.push(setTimeout(() => stampThud(), 180));
    }
    const t: ReturnType<typeof setTimeout>[] = [];
    t.push(setTimeout(() => setPhase("arrive"), 120));
    t.push(setTimeout(() => setPhase("stitch"), 420));
    t.push(setTimeout(() => setPhase("settle"), 700));
    timersRef.current.push(...t);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [patchMinting]);

  if (!patchMinting) return null;
  const sector = patchMinting.sector;

  const skip = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    dismissPatch();
    backToMap();
  };

  return (
    <div className={`overlay patch-overlay phase-${phase}`} onClick={skip} role="dialog" aria-label="Sector patch minted">
      <div className="patch-mint-stage" onClick={(e) => e.stopPropagation()}>
        <div className="statusline mint-status">
          <span className="dot" />
          <span>{STR.mintingStatus}</span>
        </div>

        <div className="patch-holder">
          {/* phosphor glow bloom */}
          <div className={`patch-glow sector-${sector}`} />
          <div className="patch-scale">
            <SectorPatch sector={sector} size={200} earned />
          </div>
          {/* spark particles */}
          {(phase === "stitch" || phase === "settle") &&
            Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className={`particle spark spark-${i} sector-${sector}`} />
            ))}
        </div>

        <p className="patch-citation">{PATCH_CITATION[sector]}</p>

        <button className="btn btn-run patch-continue" onClick={skip}>
          RETURN TO MAP
        </button>
      </div>
    </div>
  );
}
