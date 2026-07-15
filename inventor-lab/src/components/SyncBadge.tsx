import { useEffect, useState } from "react";

// Quiet cross-device sync cue for the bench-picker. Hidden entirely when the external sync
// module isn't loaded (plain dev builds). The launcher (../) owns the sign-in form; this only
// reflects state and offers sign-out. Reactive via onAuthChange.
export function SyncBadge() {
  const sync = typeof window !== "undefined" ? window.kgSync : undefined;
  const [email, setEmail] = useState<string | null>(sync?.user()?.email ?? null);

  useEffect(() => {
    if (!sync) return;
    setEmail(sync.user()?.email ?? null);
    return sync.onAuthChange(() => setEmail(sync.user()?.email ?? null));
  }, [sync]);

  if (!sync) return null; // no sync module → behave exactly as before

  // Mono, chalk-dim lettering to read as a diagnostic line; cyan for the one interactive control.
  const link: React.CSSProperties = {
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    padding: "0 6px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--mono)",
    fontSize: "var(--t-meta)",
    letterSpacing: "0.06em",
    color: "var(--cyan)",
  };

  return (
    <div
      className="row"
      style={{ gap: 8, minHeight: 44, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}
    >
      {email ? (
        <>
          <span
            className="mono"
            style={{ fontSize: "var(--t-meta)", letterSpacing: "0.06em", color: "var(--chalk-dim)" }}
          >
            Synced as {email}
          </span>
          <span aria-hidden="true" style={{ color: "var(--chalk-dim)" }}>·</span>
          <button type="button" style={link} onClick={() => void sync.signOut()}>
            Sign out
          </button>
        </>
      ) : (
        <a href="../" style={link}>
          Sign in to sync across devices
        </a>
      )}
    </div>
  );
}
