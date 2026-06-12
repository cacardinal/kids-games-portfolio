import { useState } from "react";
import { ChevronLeft, Volume2 } from "lucide-react";
import { PROFILES, useStore } from "../state/store";
import { sfx } from "../lib/sfx";
import type { TextSize } from "../state/types";

const SIZE_OPTIONS: { id: TextSize; label: string }[] = [
  { id: "standard", label: "Standard" },
  { id: "large", label: "Large" },
  { id: "largest", label: "Largest" },
];

export function SettingsScreen() {
  const save = useStore((s) => s.save);
  const profileId = useStore((s) => s.profileId);
  const setView = useStore((s) => s.setView);
  const setMutedSetting = useStore((s) => s.setMutedSetting);
  const setTextSize = useStore((s) => s.setTextSize);
  const resetActiveProfile = useStore((s) => s.resetActiveProfile);

  const [confirming, setConfirming] = useState(false);
  const profile = PROFILES.find((p) => p.id === profileId)!;
  const muted = save?.settings.muted ?? false;
  const textSize = save?.settings.textSize ?? "standard";

  return (
    <div className="shell settings">
      <header className="settings__head">
        <button
          type="button"
          className="btn btn--ghost"
          onPointerUp={() => {
            sfx.tap();
            setView("board");
          }}
        >
          <ChevronLeft size={18} /> Case board
        </button>
        <h1>Settings</h1>
      </header>

      <div className="settings__list">
        {/* Sound */}
        <div className="setting paper grain">
          <div className="setting__text">
            <div className="setting__title display">Sound</div>
            <div className="setting__sub meta">Stamps, chimes, page sounds.</div>
          </div>
          <button
            type="button"
            className={`toggle${!muted ? " toggle--on" : ""}`}
            role="switch"
            aria-checked={!muted}
            aria-label="Sound"
            onPointerUp={() => {
              const next = !muted;
              setMutedSetting(next);
              if (!next) sfx.select(); // play a tick when turning sound ON
            }}
          >
            <span className="toggle__knob" />
          </button>
        </div>

        {/* Text size */}
        <div className="setting paper grain">
          <div className="setting__text">
            <div className="setting__title display">Text size</div>
            <div className="setting__sub meta">Bigger text for easier reading.</div>
          </div>
          <div className="segmented">
            {SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`segmented__opt${textSize === opt.id ? " segmented__opt--on" : ""}`}
                aria-pressed={textSize === opt.id}
                onPointerUp={() => {
                  sfx.tap();
                  setTextSize(opt.id);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Read aloud (informational) */}
        <div className="setting paper grain">
          <div className="setting__text">
            <div className="setting__title display">
              <Volume2 size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} aria-hidden />
              Read aloud
            </div>
            <div className="setting__sub meta">Tap the speaker on any text to hear it.</div>
          </div>
        </div>

        {/* Reset profile */}
        <div className="setting setting--danger paper grain">
          <div className="setting__text">
            <div className="setting__title display">Reset this profile</div>
            <div className="setting__sub meta">
              Clears {profile.name}'s cases and badges. This can't be undone.
            </div>
          </div>
          {!confirming ? (
            <button
              type="button"
              className="btn"
              onPointerUp={() => {
                sfx.tap();
                setConfirming(true);
              }}
            >
              Reset
            </button>
          ) : (
            <div className="setting__confirm">
              <span className="setting__confirm-q meta">Reset {profile.name}? Type nothing — just confirm.</span>
              <div className="setting__confirm-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onPointerUp={() => {
                    sfx.tap();
                    setConfirming(false);
                  }}
                >
                  Keep my progress
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onPointerUp={() => {
                    sfx.tap();
                    resetActiveProfile();
                    setConfirming(false);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
