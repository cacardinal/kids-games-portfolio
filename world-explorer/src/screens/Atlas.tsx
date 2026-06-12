import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ScrollText, Settings as SettingsIcon, Lock, X } from "lucide-react";
import { useStore } from "../state/store";
import { REGION_ORDER, REGION_LABEL, REGION_STAMP_ARC } from "../data/types";
import type { Region } from "../data/types";
import { missionsForRegion, MISSION_BY_ID } from "../data/missions";
import { LANDMARK_BY_ID } from "../data/landmarks";
import { ROUTE_BY_ID } from "../data/routes";
import { COUNTRY_BY_ISO3 } from "../data/countries";
import {
  isRegionUnlocked,
  missionsNeededToUnlock,
  regionCompletedCount,
} from "../game/progress";
import { WorldMap, type CountryVisualState } from "../components/WorldMap";
import { MissionPass } from "../components/MissionPass";
import { CompassRose } from "../components/Glyphs";
import { RegionStamp } from "../components/Stamp";
import { sfx } from "../lib/sfx";
import { prefersReducedMotion } from "../lib/motion";

// Fix 5: the quiet opening moment plays once per profile session — not every time
// the player returns to the Atlas from the passport/log. Tracks the profile that
// last saw the intro; a new selection re-arms it.
let introShownFor: string | null = null;

export function Atlas() {
  const save = useStore((s) => s.save);
  const profile = useStore((s) => s.profile);
  const activeRegion = useStore((s) => s.activeRegion);
  const setActiveRegion = useStore((s) => s.setActiveRegion);
  const setView = useStore((s) => s.setView);
  const view = useStore((s) => s.view);
  const openMission = useStore((s) => s.openMission);
  const justUnlockedRegion = useStore((s) => s.justUnlockedRegion);
  const clearJustUnlocked = useStore((s) => s.clearJustUnlocked);
  // Fix 4: only fire the unlock set-piece once we're back on the clean Atlas — not
  // while the completion stamp for the 4th mission is still on screen.
  const showUnlock = !!justUnlockedRegion && view === "atlas";

  // Play the entrance only on the first Atlas render of this profile session.
  const [intro] = useState(() => introShownFor !== profile);
  useEffect(() => {
    if (intro) introShownFor = profile;
  }, [intro, profile]);

  // Fix 4: when a region just unlocked (and we're back on the Atlas), surface its
  // tab by switching to it, then the set-piece plays once and clears the flag.
  useEffect(() => {
    if (showUnlock && justUnlockedRegion) setActiveRegion(justUnlockedRegion);
  }, [showUnlock, justUnlockedRegion, setActiveRegion]);

  const regionMissions = missionsForRegion(activeRegion);
  const unlocked = isRegionUnlocked(save, activeRegion);

  // Fix 1: tapping a country on the Atlas map selects it for the explorer label.
  const [selected, setSelected] = useState<{ iso3: string; name: string } | null>(null);

  // Visited tint: every country you've reached via a completed mission
  // (locate/landmark answers + route waypoints). The map fills in as you play.
  const visited = useMemo(() => {
    const out = new Set<string>();
    for (const [id, res] of Object.entries(save.missions)) {
      if (!res.completed) continue;
      const m = MISSION_BY_ID[id];
      if (!m) continue;
      if (m.type === "locate") out.add(m.answerIso3);
      else if (m.type === "landmark") out.add(LANDMARK_BY_ID[m.landmarkId].countryIso3);
      else if (m.type === "route")
        for (const iso of ROUTE_BY_ID[m.routeId].waypoints) out.add(iso);
      // compare reaches no specific country on the map
    }
    return out;
  }, [save.missions]);

  // Map fill: visited tint + the currently-explored country highlight.
  const states = useMemo(() => {
    const out: Record<string, CountryVisualState> = {};
    for (const iso of visited) out[iso] = { visited: true };
    if (selected?.iso3) out[selected.iso3] = { ...out[selected.iso3], explored: true };
    return out;
  }, [visited, selected]);

  const onExplore = (iso3: string, name: string) => {
    sfx.tap(); // soft tap tick only — exploration, not a mission
    setSelected(name ? { iso3, name } : null);
  };

  // The atlas map sits at the active region's continent zoom so it reads as a
  // "you are exploring here" frame.
  const zoom = useMemo(() => {
    const r = activeRegion;
    const continents =
      r === "americas"
        ? (["north-america", "south-america"] as const)
        : r === "europe-africa"
          ? (["europe", "africa"] as const)
          : (["asia", "oceania"] as const);
    return { continents: [...continents], padding: 0.18 };
  }, [activeRegion]);

  return (
    <div className={`atlas${intro ? " is-intro" : ""}`}>
      <header className="topbar">
        <span className="topbar__title">
          <CompassRose size={26} />
          World Explorer
        </span>
        <span className="topbar__spacer" />
        <span className="topbar__actions">
          <button className="icon-btn" aria-label="Passport" onClick={() => { sfx.tap(); setView("passport"); }}>
            <BookOpen size={20} aria-hidden="true" />
          </button>
          <button className="icon-btn" aria-label="Explorer Log" onClick={() => { sfx.tap(); setView("log"); }}>
            <ScrollText size={20} aria-hidden="true" />
          </button>
          <button className="icon-btn" aria-label="Settings" onClick={() => { sfx.tap(); setView("settings"); }}>
            <SettingsIcon size={20} aria-hidden="true" />
          </button>
        </span>
      </header>

      <div className="atlas__body">
        <div className="mapwrap">
          <WorldMap
            zoom={zoom}
            states={states}
            interactive={false}
            explore
            onExplore={onExplore}
          />
          <div className="mapwrap__linen" aria-hidden="true" />
          {selected && (
            <ExploreLabel
              iso3={selected.iso3}
              name={selected.name}
              visited={visited.has(selected.iso3)}
              onDismiss={() => setSelected(null)}
            />
          )}
        </div>

        <div className="tray">
          <div className="tabs" role="tablist" aria-label="Regions">
            {REGION_ORDER.map((r) => (
              <RegionTab
                key={r}
                region={r}
                active={r === activeRegion}
                unlocking={showUnlock && r === justUnlockedRegion}
                onSelect={setActiveRegion}
              />
            ))}
          </div>

          {unlocked ? (
            <>
              <div className="tray__header">
                <h2 style={{ fontSize: "20px" }}>Missions</h2>
                <span className="meta">
                  {regionCompletedCount(save, activeRegion)} of 6
                </span>
              </div>
              <div className="tray__list" role="tabpanel">
                {regionMissions.map((m) => {
                  const res = save.missions[m.id];
                  return (
                    <MissionPass
                      key={m.id}
                      mission={m}
                      completed={!!res?.completed}
                      star={!!res?.star}
                      onOpen={() => openMission(m.id)}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <LockedPanel region={activeRegion} />
          )}
        </div>
      </div>

      {showUnlock && justUnlockedRegion && (
        <RegionUnlock region={justUnlockedRegion} onDone={clearJustUnlocked} />
      )}
    </div>
  );
}

// Fix 4: the region-unlock set-piece. A brief plate + sfx.success(), the new tab
// glints (handled by RegionTab's `unlocking` flag), ≤1.2s, tap-to-skip, and
// reduced-motion collapses to a short fade with no sweep. Plays exactly once:
// `onDone` clears the store flag.
function RegionUnlock({ region, onDone }: { region: Region; onDone: () => void }) {
  const reduced = prefersReducedMotion();
  const fired = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!fired.current) {
      fired.current = true;
      sfx.success();
    }
    // Auto-dismiss within the 1.2s budget (reduced motion ends a touch sooner).
    timer.current = window.setTimeout(onDone, reduced ? 700 : 1200);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [reduced, onDone]);

  return (
    <div
      className={`region-unlock${reduced ? " is-reduced" : ""}`}
      role="status"
      aria-live="polite"
      onPointerDown={onDone}
    >
      <div className="region-unlock__plate">
        <span className="region-unlock__eyebrow">Unlocked</span>
        <span className="region-unlock__title">{REGION_STAMP_ARC[region]}</span>
        <span className="region-unlock__glint" aria-hidden="true" />
      </div>
    </div>
  );
}

function RegionTab({
  region,
  active,
  unlocking,
  onSelect,
}: {
  region: Region;
  unlocking?: boolean;
  active: boolean;
  onSelect: (r: Region) => void;
}) {
  const save = useStore((s) => s.save);
  const unlocked = isRegionUnlocked(save, region);
  const done = regionCompletedCount(save, region);
  return (
    <button
      role="tab"
      aria-selected={active}
      className={`tab${active ? " is-active" : ""}${unlocked ? "" : " is-locked"}${
        unlocking ? " is-unlocking" : ""
      }`}
      onClick={() => {
        sfx.tap();
        onSelect(region);
      }}
    >
      <span>{REGION_LABEL[region]}</span>
      {unlocked ? (
        <span className="meta" style={{ fontSize: "11px" }}>
          {done}/6
        </span>
      ) : (
        <span className="tab__lock">
          <Lock size={11} aria-hidden="true" /> Locked
        </span>
      )}
      {/* Fix 4: a single glint sweep across the freshly unlocked tab. */}
      {unlocking && <span className="tab__glint" aria-hidden="true" />}
    </button>
  );
}

// Fix 1: the elegant explorer label — a compass-card plate in the map corner.
// Featured countries get capital + signature (and a stamp mini-icon once visited);
// backdrop countries show just the name. Exploration only; no scoring.
function ExploreLabel({
  iso3,
  name,
  visited,
  onDismiss,
}: {
  iso3: string;
  name: string;
  visited: boolean;
  onDismiss: () => void;
}) {
  const country = COUNTRY_BY_ISO3[iso3];
  return (
    <div className="explore-card" role="status" aria-live="polite">
      <button className="explore-card__close" aria-label="Dismiss" onClick={onDismiss}>
        <X size={14} aria-hidden="true" />
      </button>
      <div className="explore-card__body">
        <div className="explore-card__eyebrow">
          <CompassRose size={14} />
          {country ? "Featured" : "On the map"}
        </div>
        <div className="explore-card__name">{country?.name ?? name}</div>
        {country && (
          <>
            <div className="explore-card__capital">Capital · {country.capital}</div>
            <div className="explore-card__signature">{country.signature}</div>
          </>
        )}
      </div>
      {country && visited && (
        <span className="explore-card__stamp" aria-label="Visited">
          <RegionStamp region={country.region} type="locate" size={56} />
        </span>
      )}
    </div>
  );
}

function LockedPanel({ region }: { region: Region }) {
  const save = useStore((s) => s.save);
  const need = missionsNeededToUnlock(save, region);
  const prevLabel =
    region === "europe-africa" ? "Americas" : region === "asia-oceania" ? "Europe & Africa" : "";
  return (
    <div className="tray__locked">
      <Lock size={32} aria-hidden="true" />
      <p>
        Locked. Complete {need} {prevLabel} {need === 1 ? "mission" : "missions"}.
      </p>
    </div>
  );
}
