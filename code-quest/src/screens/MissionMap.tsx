import { Lock, Star, User, Volume2, VolumeX } from "lucide-react";
import { useStore } from "../state/store";
import { MISSIONS, SECTORS } from "../data/missions";
import { getMission, sectorUnlocked, sectorCleared, PROFILES } from "../state/save";
import type { ProfileSave } from "../state/save";
import { SectorPatch } from "../components/SectorPatch";
import { STR } from "../data/copy";
import { sfx } from "../lib/sfx";

function StarPair({ completed, efficient }: { completed: boolean; efficient: boolean }) {
  return (
    <span className="star-pair" aria-hidden="true">
      <Star size={14} className={completed ? "star on" : "star"} fill={completed ? "currentColor" : "none"} />
      <Star size={14} className={efficient ? "star on eff" : "star"} fill={efficient ? "currentColor" : "none"} />
    </span>
  );
}

export function MissionMap() {
  const save = useStore((s) => s.save);
  const profile = useStore((s) => s.profile);
  const openMission = useStore((s) => s.openMission);
  const goView = useStore((s) => s.goView);
  const toggleMute = useStore((s) => s.toggleMute);
  const setToast = useStore((s) => s.setToast);

  const profileName = PROFILES.find((p) => p.id === profile)?.name ?? "Operator";

  return (
    <div className="screen mission-map">
      <header className="map-header panel scanlines">
        <div className="map-header-left">
          <div className="statusline">
            <span className="dot" />
            <span>OPERATOR // {profileName.toUpperCase()}</span>
          </div>
          <h1 className="map-title">SECTOR MAP</h1>
        </div>
        <div className="map-header-right">
          <button className={`icon-btn${save.muted ? "" : " active"}`} aria-label={save.muted ? "Unmute" : "Mute"}
            onClick={() => { toggleMute(); }}>
            {save.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button className="icon-btn" aria-label="Operator profile and patches"
            onClick={() => { sfx.tap(); goView("profileScreen"); }}>
            <User size={18} />
          </button>
          <button className="btn-ghost btn switch-btn" onClick={() => { sfx.tap(); goView("profile"); }}>
            SWITCH
          </button>
        </div>
      </header>

      <div className="sectors">
        {([1, 2, 3] as const).map((sec) => {
          const unlocked = sectorUnlocked(save, sec);
          const cleared = sectorCleared(save, sec);
          const meta = SECTORS[sec];
          const missions = MISSIONS.filter((m) => m.sector === sec);
          return (
            <section key={sec} className={`sector-block panel${unlocked ? "" : " locked"}`}>
              <div className="sector-block-head">
                <div className="sector-patch-slot">
                  <SectorPatch sector={sec} size={88} earned={cleared} />
                </div>
                <div className="sector-meta">
                  <span className="sector-no">SECTOR {sec}</span>
                  <h2 className="sector-name">{meta.name}</h2>
                  <span className="sector-sub">{meta.subtitle}</span>
                </div>
                {!unlocked && (
                  <div className="sector-lock">
                    <Lock size={16} />
                    <span>{STR.sectorLocked(sec)}</span>
                  </div>
                )}
              </div>

              <div className="mission-grid">
                {missions.map((m) => {
                  const mp = getMission(save, m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`mission-card${mp.completed ? " done" : ""}${unlocked ? "" : " is-locked"}`}
                      disabled={!unlocked}
                      onClick={() => {
                        if (!unlocked) {
                          setToast(STR.sectorLocked(sec));
                          return;
                        }
                        sfx.select();
                        openMission(m.id);
                      }}
                      aria-label={`Mission ${m.id}: ${m.title}`}
                    >
                      <span className="mission-no">M{String(m.id).padStart(2, "0")}</span>
                      <span className="mission-name">{m.title}</span>
                      <span className="mission-foot">
                        <StarPair completed={mp.completed} efficient={mp.efficient} />
                        <span className="mission-par">par {m.par}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <FooterProgress save={save} />
    </div>
  );
}

function FooterProgress({ save }: { save: ProfileSave }) {
  let stars = 0;
  for (const id in save.missions) {
    if (save.missions[id].completed) stars++;
    if (save.missions[id].efficient) stars++;
  }
  return (
    <div className="map-footer statusline">
      <span>{stars}/24 STARS</span>
      <span>·</span>
      <span>{save.badges.length}/6 BADGES</span>
      <span>·</span>
      <span>{save.cosmeticUnlocked.length}/5 SKINS</span>
    </div>
  );
}
