import { useEffect, useState } from "react";
import { getKgSync } from "../lib/kgSync";

export function SyncStatus() {
  const sync = getKgSync();
  const [email, setEmail] = useState<string | null>(() => sync?.user()?.email ?? null);
  useEffect(() => {
    if (!sync) return;
    setEmail(sync.user()?.email ?? null);
    return sync.onAuthChange(() => setEmail(sync.user()?.email ?? null));
  }, [sync]);
  if (!sync) return null;
  return email ? (
    <p className="sync-status">
      Synced as {email} ·{" "}
      <button type="button" className="sync-link" onClick={() => { void sync.signOut(); }}>
        Sign out
      </button>
    </p>
  ) : (
    <a className="sync-link" href="../">Sign in to sync across devices</a>
  );
}
