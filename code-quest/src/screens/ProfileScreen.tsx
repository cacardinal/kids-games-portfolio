import { ChevronLeft, Award, Check, Lock } from "lucide-react";
import { useStore } from "../state/store";
import { BADGES } from "../data/badges";
import { COSMETIC_ORDER, COSMETICS } from "../data/cosmetics";
import { SECTORS } from "../data/missions";
import { SectorPatch } from "../components/SectorPatch";
import { Rover } from "../components/Rover";
import { sectorCleared, PROFILES, totalStars, efficiencyStarCount } from "../state/save";
import { sfx } from "../lib/sfx";

export function ProfileScreen() {
  const save = useStore((s) => s.save);
  const profile = useStore((s) => s.profile);
  const goView = useStore((s) => s.goView);
  const selectCosmetic = useStore((s) => s.selectCosmetic);

  const earnedBadges = new Set(save.badges);
  const name = PROFILES.find((p) => p.id === profile)?.name ?? "Operator";

  return (
    <div className="screen profile-screen">
      <header className="profile-header panel scanlines">
        <button className="icon-btn back-btn" aria-label="Back to sector map" onClick={() => { sfx.tap(); goView("map"); }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <div className="statusline"><span className="dot" /><span>OPERATOR FILE // {name.toUpperCase()}</span></div>
          <h1 className="profile-title">{name}</h1>
        </div>
        <div className="profile-stats">
          <span>{totalStars(save)}/24 stars</span>
          <span>{efficiencyStarCount(save)} efficient</span>
        </div>
      </header>

      <section className="profile-section panel">
        <h2 className="section-title">ROVER PAINT</h2>
        <div className="cosmetic-gallery">
          {COSMETIC_ORDER.map((id) => {
            const cos = COSMETICS[id];
            const unlocked = save.cosmeticUnlocked.includes(id);
            const selected = save.cosmeticSelected === id;
            return (
              <button
                key={id}
                type="button"
                className={`cosmetic-card${selected ? " selected" : ""}${unlocked ? "" : " locked"}`}
                disabled={!unlocked}
                onClick={() => { if (unlocked) { sfx.select(); selectCosmetic(id); } }}
                aria-label={`${cos.name}${unlocked ? "" : " (locked)"}`}
              >
                <div className="cosmetic-rover">
                  <Rover heading="N" pose="idle" cosmetic={id} size={64} />
                </div>
                <span className="cosmetic-name">{cos.name}</span>
                <span className="cosmetic-status">
                  {selected ? <><Check size={13} /> equipped</> : unlocked ? "tap to equip" : <><Lock size={12} /> {cos.unlockLabel}</>}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="profile-section panel">
        <h2 className="section-title">SECTOR PATCHES</h2>
        <div className="patch-shelf">
          {([1, 2, 3] as const).map((sec) => {
            const cleared = sectorCleared(save, sec);
            return (
              <div key={sec} className={`shelf-patch${cleared ? "" : " locked"}`}>
                <SectorPatch sector={sec} size={104} earned={cleared} />
                <span className="shelf-label">{SECTORS[sec].name}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="profile-section panel">
        <h2 className="section-title">BADGES</h2>
        <div className="badge-grid">
          {BADGES.map((b) => {
            const earned = earnedBadges.has(b.id);
            return (
              <div key={b.id} className={`badge-card${earned ? " earned" : ""}`}>
                <div className="badge-icon">
                  {earned ? <Award size={22} /> : <Lock size={18} />}
                </div>
                <div className="badge-text">
                  <span className="badge-name">{b.name}</span>
                  <span className="badge-criteria">{b.criteria}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
