// Story email-sync/03 — thin bridge to the external cross-device sync module.
// window.kgSync is injected only at deploy time (Story 04); it is UNDEFINED in
// plain `npm run dev`, so every access here is feature-detected and null-safe.
// This module owns NO persistence — the sync engine writes straight into the same
// kg.detective.v1.<id> localStorage keys the store already reads.

import { useEffect, useState } from "react";

export interface KgSyncUser {
  email: string;
}

interface KgSync {
  ready: Promise<void>;
  user(): KgSyncUser | null;
  onAuthChange(cb: (user: KgSyncUser | null) => void): () => void;
  signOut(): Promise<void>;
}

declare global {
  interface Window {
    kgSync?: KgSync;
  }
}

/** The injected sync module, or null when it is absent (local dev). */
export function getKgSync(): KgSync | null {
  return (typeof window !== "undefined" && window.kgSync) || null;
}

/**
 * Current synced user, kept live via onAuthChange.
 *   undefined -> sync module absent (hide the affordance entirely)
 *   null      -> signed out
 *   object    -> signed in
 */
export function useSyncUser(): KgSyncUser | null | undefined {
  const [user, setUser] = useState<KgSyncUser | null | undefined>(() => {
    const s = getKgSync();
    return s ? s.user() : undefined;
  });
  useEffect(() => {
    const s = getKgSync();
    if (!s) return;
    setUser(s.user());
    return s.onAuthChange((u) => setUser(u));
  }, []);
  return user;
}
