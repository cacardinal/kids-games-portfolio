import { ChevronLeft } from "lucide-react";
import { useStore } from "../state/store";
import { REGION_ORDER, REGION_LABEL } from "../data/types";
import type { Region } from "../data/types";
import { missionsForRegion } from "../data/missions";
import {
  COVERS,
  BADGES,
  isCoverUnlocked,
  regionCompletedCount,
  totalStamps,
} from "../game/progress";
import { RegionStamp } from "../components/Stamp";
import { CompassRose } from "../components/Glyphs";
import { sfx } from "../lib/sfx";

const COVER_CLASS: Record<string, string> = {
  voyager: "cover-voyager",
  "field-linen": "cover-field-linen",
  "deep-sea": "cover-deep-sea",
  summit: "cover-summit",
  aurora: "cover-aurora",
};

export function Passport() {
  const save = useStore((s) => s.save);
  const setView = useStore((s) => s.setView);
  const setCover = useStore((s) => s.setCover);

  const stamps = totalStamps(save);

  return (
    <div className="sheet">
      <div className="backrow">
        <button className="icon-btn" aria-label="Back to atlas" onClick={() => { sfx.tap(); setView("atlas"); }}>
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <h2>Passport · {stamps} stamps</h2>
      </div>

      <div className="sheet__body">
        <div className="sheet__wrap">
          {/* the book, with the active cover */}
          <div className={`passport-book ${COVER_CLASS[save.cover] ?? "cover-voyager"}`}>
            <CompassRose size={56} />
            <div className="passport-book__title">WORLD EXPLORER</div>
            <div className="passport-book__count">{stamps} of 18 stamps collected</div>
          </div>

          {/* stamp pages per region */}
          {REGION_ORDER.map((region) => (
            <RegionStampPage key={region} region={region} />
          ))}

          {/* cover picker */}
          <section>
            <div className="section-title">
              <span className="eyebrow">Passport cover</span>
            </div>
            <div className="picker-grid">
              {COVERS.map((cover) => {
                const unlocked = isCoverUnlocked(save, cover.id);
                const active = save.cover === cover.id;
                return (
                  <button
                    key={cover.id}
                    className={`cover-tile${active ? " is-active" : ""}${unlocked ? "" : " is-locked"}`}
                    onClick={() => {
                      if (!unlocked) return;
                      sfx.collect();
                      setCover(cover.id);
                    }}
                    aria-label={`${cover.name}${unlocked ? (active ? ", selected" : "") : `, unlocks at ${cover.unlockAt} stamps`}`}
                    disabled={!unlocked}
                  >
                    <span className={`cover-tile__swatch ${COVER_CLASS[cover.id]}`}>
                      <CompassRose size={32} />
                    </span>
                    <span className="cover-tile__meta">
                      <span className="cover-tile__name">{cover.name}</span>
                      <span className="cover-tile__lock">
                        {unlocked ? (active ? "Selected" : "Tap to use") : `Unlocks at ${cover.unlockAt} stamps`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* badges */}
          <section>
            <div className="section-title">
              <span className="eyebrow">Badges</span>
            </div>
            <div className="badge-grid">
              {BADGES.map((badge) => {
                const earned = badge.earned(save);
                return (
                  <div key={badge.id} className={`badge${earned ? " is-earned" : ""}`}>
                    <span className="badge__disc">
                      <CompassRose size={32} />
                    </span>
                    <span className="badge__name">{badge.name}</span>
                    <span className="badge__desc">{earned ? badge.description : "Locked"}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function RegionStampPage({ region }: { region: Region }) {
  const save = useStore((s) => s.save);
  const missions = missionsForRegion(region);
  const done = regionCompletedCount(save, region);
  return (
    <div className="region-page">
      <div className="region-page__head">
        <span className="region-page__title">{REGION_LABEL[region]}</span>
        <span className="region-page__count">{done} of 6</span>
      </div>
      <div className="stamp-grid">
        {missions.map((m) => {
          const res = save.missions[m.id];
          if (res?.completed) {
            return (
              <div className="stamp-cell" key={m.id}>
                <RegionStamp region={region} type={m.type} size={84} />
                <span className="stamp-cell__label">{res.star ? "★ first try" : "stamped"}</span>
              </div>
            );
          }
          return (
            <div className="stamp-cell is-empty" key={m.id}>
              <RegionStamp region={region} type={m.type} size={84} />
              <span className="stamp-cell__label">empty</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
