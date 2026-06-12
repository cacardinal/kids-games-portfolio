// The right-hand Counsel panel: advisor tips (Tutorial), the Discoveries/research
// list, and event cards. Every prose block carries a SpeakButton for the early reader.
import type { ChoiceResolution, KingdomState } from "../game/kingdom";
import { effectiveOptionLabel, resolutionNoteLines } from "../game/display";
import { RESEARCH, RESEARCH_ORDER, SCENARIOS, COPY, type ResearchId } from "../game/content";
import { SpeakButton } from "./SpeakButton";
import { Button } from "./Button";
import { sfx } from "../lib/sfx";

// ── Counsel tip (Tutorial, dismissible) ───────────────────────────────────────
export function CounselTip({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div className="counsel-card parchment ledger-margin">
      <div className="counsel-head">
        <span className="counsel-title">Counsel</span>
        <SpeakButton text={text} />
      </div>
      <p className="counsel-text">{text}</p>
      <div className="counsel-actions">
        <Button onClick={onDismiss} sound="tap" variant="secondary">
          Got it
        </Button>
      </div>
    </div>
  );
}

// ── Event card ─────────────────────────────────────────────────────────────────
export function EventCardView({
  state,
  dealIn,
  onChoose,
}: {
  state: KingdomState;
  dealIn: boolean;
  onChoose: (option: 0 | 1) => void;
}) {
  const card = state.pendingChoice;
  if (!card) return null;
  // Dry-run each option against the current state so the button (and the read-
  // aloud) promises the EFFECTIVE outcome, never a number a cap or floor would cut.
  const honest = card.options.map((opt) => effectiveOptionLabel(state, opt));
  const speakText = `${card.title}. ${card.setup} Option one: ${honest[0].text}. Option two: ${honest[1].text}.`;
  return (
    <div className={`event-card parchment ledger-margin ${dealIn ? "deal-in" : ""}`}>
      <div className="counsel-head">
        <span className="counsel-title">{card.title}</span>
        <SpeakButton text={speakText} />
      </div>
      <p className="counsel-text">{card.setup}</p>
      <p className="meta" style={{ color: "var(--ink-soft)", marginTop: 6 }}>
        {COPY.eventResolve}
      </p>
      <div className="event-options">
        {honest.map((h, i) => (
          <button
            key={i}
            className="event-opt"
            onClick={() => {
              sfx.select();
              onChoose(i as 0 | 1);
            }}
          >
            {h.text}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Resolution note — the ledger line after a modified choice ─────────────────
// Shown only when caps/floors changed the stated numbers; states the modification
// in the advisor's dry register. Cleared by the next season's resolution.
export function ResolutionNote({ resolution }: { resolution: ChoiceResolution }) {
  const lines = resolutionNoteLines(resolution);
  if (lines.length === 0) return null;
  const text = lines.join(" ");
  return (
    <div className="counsel-card parchment ledger-margin resolution-note">
      <div className="counsel-head">
        <span className="counsel-title">{resolution.title}</span>
        <SpeakButton text={text} />
      </div>
      {lines.map((l, i) => (
        <p className="counsel-text" key={i} style={{ margin: i === 0 ? 0 : "4px 0 0" }}>
          {l}
        </p>
      ))}
    </div>
  );
}

// ── Discoveries / research list ───────────────────────────────────────────────
export function ResearchPanel({
  state,
  onSelect,
}: {
  state: KingdomState;
  onSelect: (node: ResearchId) => void;
}) {
  const goal = SCENARIOS[state.scenarioId].goals.research;
  return (
    <div className="counsel-card slate" style={{ color: "var(--text)" }}>
      <div className="counsel-head">
        <span className="counsel-title" style={{ color: "var(--brass)" }}>
          {COPY.researchTitle}
        </span>
        <span className="meta">
          {state.researched.length}
          {goal ? ` / goal ${goal}` : ""} found
        </span>
      </div>
      {state.pendingResearch && (
        <p className="meta" style={{ marginBottom: 8 }}>
          Studying <strong style={{ color: "var(--research)" }}>{RESEARCH[state.pendingResearch].label}</strong>:{" "}
          {state.researchPoints} of {RESEARCH[state.pendingResearch].cost} research
        </p>
      )}
      <div className="stack gap8">
        {RESEARCH_ORDER.map((id) => {
          const def = RESEARCH[id];
          const done = state.researched.includes(id);
          const prereqMet = !def.prereq || state.researched.includes(def.prereq);
          const active = state.pendingResearch === id;
          const can = !done && prereqMet;
          return (
            <button
              key={id}
              className="build-opt"
              disabled={!can}
              style={{
                opacity: done ? 0.7 : prereqMet ? 1 : 0.5,
                background: active
                  ? "color-mix(in srgb, var(--research) 22%, var(--parchment))"
                  : undefined,
              }}
              onClick={() => {
                if (!can) return;
                sfx.tap();
                onSelect(id);
              }}
              aria-label={`${def.label}. ${def.effect}. Costs ${def.cost} research.${done ? " Already discovered." : prereqMet ? "" : ` Discover ${RESEARCH[def.prereq!].label} first.`}`}
            >
              <span style={{ flex: 1 }}>
                <div className="b-name" style={{ fontSize: 16 }}>
                  {done ? "✓ " : ""}
                  {def.label}
                </div>
                <div className="b-cost">{def.effect}</div>
                {!prereqMet && def.prereq && (
                  <div className="b-cost" style={{ color: "var(--seal-red)" }}>
                    Discover {RESEARCH[def.prereq].label} first
                  </div>
                )}
              </span>
              <span className="b-cost">{done ? "done" : `${def.cost} RP`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
