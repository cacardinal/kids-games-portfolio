import { useEffect } from "react";
import { Star, Award, Palette as PaletteIcon } from "lucide-react";
import { useStore, triggerPatchMint } from "../state/store";
import { missionById } from "../data/missions";
import { successCopy, FLAVOR_CITATION } from "../data/copy";
import { BADGES } from "../data/badges";
import { COSMETICS } from "../data/cosmetics";

/**
 * Win set-piece: victory citation, completion/efficiency stars mint in, badge + cosmetic notices.
 * If the win cleared a sector, hands off to the PatchMint set-piece on dismiss.
 */
export function WinOverlay() {
  const win = useStore((s) => s.win);
  const dismissWin = useStore((s) => s.dismissWin);
  const backToMap = useStore((s) => s.backToMap);

  // Keyboard: Enter/Escape advance.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win]);

  if (!win) return null;
  const mission = missionById(win.missionId);
  if (!mission) return null;

  const citation = successCopy(mission, win.chips);
  const flavor = FLAVOR_CITATION[win.missionId];

  const advance = () => {
    const patch = win.patch;
    dismissWin();
    if (patch) {
      triggerPatchMint(patch);
    } else {
      backToMap();
    }
  };

  const badgeDefs = win.newBadges.map((id) => BADGES.find((b) => b.id === id)!).filter(Boolean);
  const cosmeticDefs = win.newCosmetics.map((id) => COSMETICS[id]);

  return (
    <div className="overlay win-overlay" onClick={advance} role="dialog" aria-label="Mission complete">
      <div className="win-card panel scanlines" onClick={(e) => e.stopPropagation()}>
        <div className="win-stars" aria-hidden="true">
          <Star size={40} className="win-star s1" fill="currentColor" />
          <Star size={40} className={`win-star s2${win.efficient ? " on" : " off"}`} fill={win.efficient ? "currentColor" : "none"} />
        </div>
        <h2 className="win-title">MISSION COMPLETE</h2>
        <p className="win-citation">{citation}</p>
        {flavor && <p className="win-flavor">{flavor}</p>}

        {(badgeDefs.length > 0 || cosmeticDefs.length > 0) && (
          <div className="win-awards">
            {badgeDefs.map((b) => (
              <div key={b.id} className="award-row">
                <Award size={18} />
                <span>Badge earned — {b.name}</span>
              </div>
            ))}
            {cosmeticDefs.map((c) => (
              <div key={c.id} className="award-row">
                <PaletteIcon size={18} />
                <span>Rover skin unlocked — {c.name}</span>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-run win-continue" onClick={advance}>
          {win.patch ? "VIEW SECTOR PATCH" : "CONTINUE"}
        </button>
      </div>
    </div>
  );
}
