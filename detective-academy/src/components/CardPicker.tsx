// Lets the player switch among UNLOCKED ID-card styles (GDD §6.2). Locked styles
// show their unlock rank. Pure CSS swatches.

import { Lock } from "lucide-react";
import { CARD_STYLES, rankForXp, unlockedCardStyles } from "../game/progression";
import { useStore } from "../state/store";
import { sfx } from "../lib/sfx";

export function CardPicker() {
  const save = useStore((s) => s.save);
  const setActiveCard = useStore((s) => s.setActiveCard);
  const rank = rankForXp(save?.xp ?? 0);
  const unlocked = new Set(unlockedCardStyles(rank.id).map((c) => c.id));

  return (
    <div className="cardpicker">
      <div className="cardpicker__label meta">ID card style</div>
      <div className="cardpicker__row">
        {CARD_STYLES.map((style) => {
          const isUnlocked = unlocked.has(style.id);
          const active = save?.activeCard === style.id;
          return (
            <button
              key={style.id}
              type="button"
              className={`cardswatch cardswatch--${style.id}${active ? " cardswatch--active" : ""}${
                isUnlocked ? "" : " cardswatch--locked"
              }`}
              disabled={!isUnlocked}
              onPointerUp={() => {
                if (!isUnlocked) return;
                sfx.select();
                setActiveCard(style.id);
              }}
              aria-label={
                isUnlocked
                  ? `Use ${style.name} card`
                  : `${style.name}, unlocks at ${CARD_STYLES.find((c) => c.id === style.id)!.unlockRank}`
              }
              title={isUnlocked ? style.name : `Unlocks at ${style.unlockRank}`}
            >
              {!isUnlocked && (
                <span className="cardswatch__lock">
                  <Lock size={13} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
