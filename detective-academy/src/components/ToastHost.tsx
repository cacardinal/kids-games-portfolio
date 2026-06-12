import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import { BadgeGlyph } from "./BadgeGlyph";
import { sfx } from "../lib/sfx";

// Toast host (GDD §4.9). Queue, never stack. Shows the FIRST toast; auto-dismisses
// after 3.2s; tap dismisses early and advances. StrictMode-safe timer.
export function ToastHost() {
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);
  const current = toasts[0];
  const firedFor = useRef<string | null>(null);

  // play the entry sound once per toast id
  useEffect(() => {
    if (current && firedFor.current !== current.id) {
      firedFor.current = current.id;
      sfx.collect();
    }
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => dismissToast(current.id), 3200);
    return () => window.clearTimeout(t);
  }, [current, dismissToast]);

  if (!current) return null;

  return (
    <div className="toasthost">
      <button
        type="button"
        className={`toast toast--${current.kind}`}
        onPointerUp={() => dismissToast(current.id)}
        aria-label={`${current.title}. ${current.sub}. Dismiss`}
      >
        <span className="toast__glyph">
          <BadgeGlyph glyph={current.glyph} size={22} />
        </span>
        <span className="toast__text">
          <span className="toast__title display">{current.title}</span>
          <span className="toast__sub meta">{current.sub}</span>
        </span>
        <span className="toast__shimmer" aria-hidden />
      </button>
    </div>
  );
}
