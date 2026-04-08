const STORAGE_KEY = "solved-app-liked-item-keys-v1";

export function readLikedKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return new Set();
    return new Set(data.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function writeLikedKeys(keys: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    /* ignore quota / private mode */
  }
}

export { STORAGE_KEY as LIKED_ITEMS_STORAGE_KEY };
