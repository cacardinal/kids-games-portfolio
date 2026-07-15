export interface KgSync {
  ready: Promise<void>;
  user(): { email: string } | null;
  onAuthChange(cb: () => void): () => void;
  signOut(): Promise<void>;
}
declare global {
  interface Window { kgSync?: KgSync }
}
export const getKgSync = (): KgSync | undefined =>
  typeof window !== "undefined" ? window.kgSync : undefined;
