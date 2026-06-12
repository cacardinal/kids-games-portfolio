import { useEffect } from "react";
import { useStore } from "../state/store";

/**
 * Calm advisory toast for non-blocking notices (cap reached, empty run, etc.). Auto-dismisses.
 * Not used for collision forensics — those live persistently in the status/diagnostics zone.
 */
export function Toast() {
  const toast = useStore((s) => s.toast);
  const setToast = useStore((s) => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {toast}
    </div>
  );
}
