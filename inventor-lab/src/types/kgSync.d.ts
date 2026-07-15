// Ambient contract for the external cross-device sync module (injected at deploy time; Story 04).
// UNDEFINED in plain `npm run dev` — every consumer must feature-detect (`window.kgSync?.…`).
export interface KgSync {
  ready: Promise<void>;
  user(): { email: string } | null;
  onAuthChange(cb: () => void): () => void; // returns an unsubscribe fn
  signOut(): Promise<void>;
}

declare global {
  interface Window {
    kgSync?: KgSync;
  }
}
