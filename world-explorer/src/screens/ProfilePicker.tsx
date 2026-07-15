import { useEffect, useState } from "react";
import { useStore, PROFILES } from "../state/store";
import { CompassRose } from "../components/Glyphs";
import { sfx } from "../lib/sfx";

interface KgSync {
  user(): { email: string } | null;
  onAuthChange(cb: () => void): () => void;
  signOut(): Promise<void>;
}
declare global {
  interface Window {
    kgSync?: KgSync;
  }
}

// Quiet cross-device sync cue. Hidden entirely when the sync module isn't loaded
// (plain `npm run dev`). Reactive via kgSync.onAuthChange.
function SyncAffordance() {
  const sync = typeof window !== "undefined" ? window.kgSync : undefined;
  const [email, setEmail] = useState<string | null>(() => sync?.user()?.email ?? null);
  useEffect(() => {
    if (!sync) return;
    setEmail(sync.user()?.email ?? null);
    return sync.onAuthChange(() => setEmail(sync.user()?.email ?? null));
  }, [sync]);
  if (!sync) return null;
  return (
    <p className="sync-cue">
      {email ? (
        <>
          <span className="sync-cue__label">Synced as {email}</span>
          <span aria-hidden="true"> · </span>
          <button className="sync-cue__action" onClick={() => sync.signOut()}>
            Sign out
          </button>
        </>
      ) : (
        <a className="sync-cue__action" href="../">
          Sign in to sync across devices
        </a>
      )}
    </p>
  );
}

// "Who's exploring?" — three monogram discs (GDD §5 / shared contract §6).
export function ProfilePicker() {
  const selectProfile = useStore((s) => s.selectProfile);
  return (
    <div className="profiles">
      <CompassRose size={64} />
      <h1 className="profiles__title">Who's exploring?</h1>
      <div className="discs">
        {PROFILES.map((p) => (
          <div className="disc__wrap" key={p.id}>
            <button
              className="disc"
              style={{ ["--disc-tint" as string]: p.tint }}
              aria-label={p.name}
              onClick={() => {
                sfx.select();
                selectProfile(p.id);
              }}
            >
              {p.initial}
            </button>
            <span className="disc__name">{p.name}</span>
          </div>
        ))}
      </div>
      <SyncAffordance />
    </div>
  );
}
