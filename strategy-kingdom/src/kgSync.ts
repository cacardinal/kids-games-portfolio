// Typing + a null-safe hook for the optional cloud-sync bridge injected at deploy
// time (Story 01). window.kgSync is UNDEFINED in plain `npm run dev` — every use
// here is feature-detected so local dev behaves exactly as before.
import { useEffect, useState } from "react";

interface KgSyncUser {
  email: string;
}

interface KgSyncBridge {
  ready: Promise<void>;
  user(): KgSyncUser | null;
  onAuthChange(cb: (u: KgSyncUser | null) => void): () => void;
  signOut(): Promise<void>;
}

declare global {
  interface Window {
    kgSync?: KgSyncBridge;
  }
}

export function useKgSync(): { present: boolean; user: KgSyncUser | null } {
  const present = typeof window !== "undefined" && !!window.kgSync;
  const [user, setUser] = useState<KgSyncUser | null>(() => window.kgSync?.user() ?? null);

  useEffect(() => {
    if (!window.kgSync) return;
    const unsubscribe = window.kgSync.onAuthChange((u) => setUser(u));
    return unsubscribe;
  }, []);

  return { present, user };
}
