/**
 * Tiny TTL-based localStorage cache. Used to avoid repeat API calls for
 * data that rarely changes (e.g. TMDB movie details). Fails silently if
 * storage is unavailable (private mode / quota).
 */

interface CacheEnvelope<T> {
  v: T;
  exp: number; // epoch ms expiry
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const env = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() > env.exp) {
      localStorage.removeItem(key);
      return null;
    }
    return env.v;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  try {
    const env: CacheEnvelope<T> = { v: value, exp: Date.now() + ttlMs };
    localStorage.setItem(key, JSON.stringify(env));
  } catch {
    // Ignore quota / unavailable storage — cache is a best-effort optimization.
  }
}

export function cacheRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

export const TTL = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};
