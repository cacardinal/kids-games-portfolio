// Persistence guards — shared contract §6. Corrupt JSON -> fresh save, NEVER white-screen.
export function loadSave<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return fallback;
    return { ...fallback, ...parsed }; // unknown fields ignored; missing fields filled
  } catch {
    return fallback; // corrupt JSON -> fresh save
  }
}

export function persistSave(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota: drop silently */
  }
}
