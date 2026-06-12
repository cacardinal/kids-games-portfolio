import { useMemo } from "react";
import { FolderOpen, Lock, Settings as SettingsIcon, Users } from "lucide-react";
import {
  PROFILES,
  caseIsClosed,
  caseIsUnlocked,
  useStore,
} from "../state/store";
import { generateCase, TOTAL_CASES } from "../game/generator";
import {
  BADGES,
  nextRank,
  rankForXp,
} from "../game/progression";
import { BadgeGlyph } from "../components/BadgeGlyph";
import { IdCard } from "../components/IdCard";
import { CardPicker } from "../components/CardPicker";

const TIER_LABELS: Record<1 | 2 | 3, string> = {
  1: "Tier I — Field Cases",
  2: "Tier II — Casework",
  3: "Tier III — Cold Files",
};

export function CaseBoard() {
  const save = useStore((s) => s.save);
  const profileId = useStore((s) => s.profileId);
  const openCase = useStore((s) => s.openCase);
  const setView = useStore((s) => s.setView);
  const clearProfile = useStore((s) => s.clearProfile);

  const profile = PROFILES.find((p) => p.id === profileId)!;
  const rank = rankForXp(save?.xp ?? 0);
  const upcoming = nextRank(save?.xp ?? 0);

  // XP bar progress within the current rank band.
  const xp = save?.xp ?? 0;
  const bandStart = rank.xp;
  const bandEnd = upcoming ? upcoming.xp : rank.xp;
  const pct = upcoming
    ? Math.min(100, Math.round(((xp - bandStart) / (bandEnd - bandStart)) * 100))
    : 100;

  const tiers = useMemo(() => {
    // Lightly generate just to read tier/title for board labels (cheap, memoized).
    const byTier: Record<1 | 2 | 3, { id: number; title: string }[]> = { 1: [], 2: [], 3: [] };
    for (let id = 1; id <= TOTAL_CASES; id++) {
      const c = generateCase(id);
      byTier[c.tier].push({ id, title: c.title });
    }
    return byTier;
  }, []);

  const nothingClosed = !save || Object.values(save.cases).every((c) => !c.closed);

  return (
    <div className="shell board">
      {/* Header: rank + XP bar + ID card */}
      <header className="board__head">
        <div className="board__head-left">
          <button
            className="board__who"
            type="button"
            onPointerUp={clearProfile}
            aria-label="Switch detective"
            title="Switch detective"
          >
            <span className="disc disc--sm" style={{ background: profile.color }}>
              <span className="display">{profile.initial}</span>
            </span>
            <span className="board__who-txt">
              <span className="display board__who-name">{profile.name}</span>
              <span className="meta">{rank.name}</span>
            </span>
          </button>

          <div className="xpbar" aria-label={`Experience: ${xp} points`}>
            <div className="xpbar__track">
              <div className="xpbar__fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="xpbar__meta meta">
              {upcoming
                ? `${xp} XP · ${upcoming.xp - xp} to ${upcoming.name}`
                : `${xp} XP · top rank reached`}
            </div>
          </div>
        </div>

        <div className="board__head-right">
          <button
            className="iconbtn"
            type="button"
            onPointerUp={() => setView("settings")}
            aria-label="Settings"
          >
            <SettingsIcon size={22} />
          </button>
        </div>
      </header>

      {/* ID card + cosmetics */}
      <section className="board__identity">
        <IdCard
          styleId={save?.activeCard ?? "standard"}
          name={profile.name}
          rankName={rank.name}
          initial={profile.initial}
          discColor={profile.color}
        />
        <CardPicker />
      </section>

      {nothingClosed && (
        <p className="board__intro paper grain prose">
          Your first case is on the desk. Open it when you're ready.
        </p>
      )}

      {/* Folder grid by tier */}
      {([1, 2, 3] as const).map((tier) => (
        <section key={tier} className="board__tier">
          <h2 className="board__tier-title">{TIER_LABELS[tier]}</h2>
          <div className="foldergrid">
            {tiers[tier].map(({ id, title }) => {
              const unlocked = caseIsUnlocked(save, id);
              const closed = caseIsClosed(save, id);
              return (
                <button
                  key={id}
                  className={`folder${closed ? " folder--closed" : ""}${unlocked ? "" : " folder--locked"}`}
                  type="button"
                  disabled={!unlocked}
                  onPointerUp={() => unlocked && openCase(id)}
                  aria-label={
                    unlocked ? `Open ${title}, case ${id}` : `Locked. Close case ${id - 1} to open this one.`
                  }
                >
                  <span className="folder__tab" aria-hidden />
                  <span className="folder__num display">Case {id}</span>
                  <span className="folder__title">{unlocked ? title : "Sealed file"}</span>
                  <span className="folder__foot">
                    {!unlocked ? (
                      <span className="folder__lock meta">
                        <Lock size={13} /> Locked. Close case {id - 1}.
                      </span>
                    ) : closed ? (
                      <span className="folder__stamp display">CLOSED</span>
                    ) : (
                      <span className="folder__open meta">
                        <FolderOpen size={13} /> Open case file
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {/* Badge wall */}
      <section className="board__badges">
        <h2 className="board__tier-title">
          <Users size={18} style={{ verticalAlign: "-3px", marginRight: 6 }} aria-hidden />
          Commendations
        </h2>
        {(save?.badges.length ?? 0) === 0 && (
          <p className="meta board__badges-empty">
            No badges yet. They're earned by how you work a case, not how fast.
          </p>
        )}
        <div className="badgewall">
          {BADGES.map((b) => {
            const earned = save?.badges.includes(b.id);
            return (
              <div key={b.id} className={`badgechip${earned ? " badgechip--earned" : ""}`}>
                <span className="badgechip__glyph">
                  <BadgeGlyph glyph={b.glyph} size={22} />
                </span>
                <span className="badgechip__name display">{b.name}</span>
                <span className="badgechip__desc meta">{b.description}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
