// Persistence guards — copied verbatim from specs/shared-design.md §6.
// Corrupt JSON -> fresh save, NEVER white-screen. Quota -> drop silently.
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
export function clearSave(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
