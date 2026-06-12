import { useState } from "react";
import { ChevronLeft, LogOut } from "lucide-react";
import { useStore, PROFILES } from "../state/store";
import { sfx } from "../lib/sfx";

// Settings — mute, text size, reset profile (GDD §5 copy).
export function Settings() {
  const save = useStore((s) => s.save);
  const profile = useStore((s) => s.profile);
  const setView = useStore((s) => s.setView);
  const setMutedPref = useStore((s) => s.setMutedPref);
  const setLargeText = useStore((s) => s.setLargeText);
  const resetProfile = useStore((s) => s.resetProfile);
  const exitProfile = useStore((s) => s.exitProfile);

  const [confirming, setConfirming] = useState(false);
  const name = PROFILES.find((p) => p.id === profile)?.name ?? "this profile";

  return (
    <div className="sheet">
      <div className="backrow">
        <button className="icon-btn" aria-label="Back to atlas" onClick={() => { sfx.tap(); setView("atlas"); }}>
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <h2>Settings</h2>
      </div>

      <div className="sheet__body">
        <div className="sheet__wrap">
          <div className="settings-list">
            <div className="setrow">
              <div>
                <div className="setrow__label">Sound</div>
                <div className="setrow__hint">Stamps, taps, and chimes</div>
              </div>
              <div className="segmented" role="group" aria-label="Sound">
                <button
                  className={!save.muted ? "is-on" : ""}
                  aria-pressed={!save.muted}
                  onClick={() => {
                    setMutedPref(false);
                    sfx.tap();
                  }}
                >
                  On
                </button>
                <button
                  className={save.muted ? "is-on" : ""}
                  aria-pressed={save.muted}
                  onClick={() => setMutedPref(true)}
                >
                  Off
                </button>
              </div>
            </div>

            <div className="setrow">
              <div>
                <div className="setrow__label">Text size</div>
                <div className="setrow__hint">Larger prompt and card text</div>
              </div>
              <div className="segmented" role="group" aria-label="Text size">
                <button
                  className={!save.largeText ? "is-on" : ""}
                  aria-pressed={!save.largeText}
                  onClick={() => {
                    sfx.tap();
                    setLargeText(false);
                  }}
                >
                  Standard
                </button>
                <button
                  className={save.largeText ? "is-on" : ""}
                  aria-pressed={save.largeText}
                  onClick={() => {
                    sfx.tap();
                    setLargeText(true);
                  }}
                >
                  Large
                </button>
              </div>
            </div>

            <div className="setrow">
              <div>
                <div className="setrow__label">Switch explorer</div>
                <div className="setrow__hint">Back to the profile picker</div>
              </div>
              <button className="btn btn--ghost" onClick={() => { sfx.tap(); exitProfile(); }}>
                <LogOut size={16} aria-hidden="true" style={{ marginRight: 6, verticalAlign: "-2px" }} />
                Switch
              </button>
            </div>

            <div className="setrow">
              <div>
                <div className="setrow__label">Reset this profile</div>
                <div className="setrow__hint">Clears {name}'s stamps and log</div>
              </div>
              <button className="btn btn--quiet" onClick={() => { sfx.tap(); setConfirming(true); }}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirming && (
        <div className="confirm" role="dialog" aria-modal="true" aria-label="Confirm reset">
          <div className="confirm__box">
            <p>This clears {name}'s stamps and log. Continue?</p>
            <div className="confirm__buttons">
              <button className="btn btn--ghost" onClick={() => { sfx.tap(); setConfirming(false); }}>
                Keep
              </button>
              <button
                className="btn"
                onClick={() => {
                  resetProfile();
                  setConfirming(false);
                  sfx.select();
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
