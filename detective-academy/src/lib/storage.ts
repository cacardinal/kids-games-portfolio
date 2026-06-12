// Save guards (from shared contract §6). Corrupt JSON -> fresh save, NEVER white-screen.
export function loadSave<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return fallback;
    return { ...fallback, ...parsed }; // unknown fields ignored by readers; missing fields filled
  } catch {
    return fallback;
  }
}

export function persistSave(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota: drop silently */
  }
}

/** Clear a single profile's save key (used by reset + error boundary). */
export function clearSave(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
