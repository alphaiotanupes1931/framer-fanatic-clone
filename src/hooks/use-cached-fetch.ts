import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Process-wide, in-memory cache for page data.
 *
 * Tab switches in this app used to re-fetch from scratch and flash a skeleton
 * every time. Keeping results here lets a revisited page paint its previous
 * data on the very first render while fresh data is revalidated silently in
 * the background, which is what makes native-feeling apps feel instant.
 *
 * The cache is also mirrored into localStorage so a hard refresh (or coming
 * back later in the day) still paints from the last known result instead of a
 * skeleton. Entries older than CACHE_TTL_MS are dropped on hydration.
 */
const STORAGE_KEY = "pb:datacache:v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // one day
const MAX_PERSISTED_BYTES = 3_000_000;

type Entry = { v: unknown; t: number };

const store = new Map<string, Entry>();

let hydrated = false;
/**
 * Pulls the persisted cache into memory. Called from effects (never during
 * render) so the first client render still matches the server HTML.
 */
export function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Entry>;
    const now = Date.now();
    for (const [k, e] of Object.entries(parsed)) {
      if (e && typeof e.t === "number" && now - e.t < CACHE_TTL_MS && !store.has(k)) {
        store.set(k, e);
      }
    }
  } catch {
    // Corrupt or unavailable storage is never fatal: we just start cold.
  }
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist() {
  if (typeof window === "undefined" || flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    try {
      const obj: Record<string, Entry> = {};
      for (const [k, e] of store) obj[k] = e;
      const json = JSON.stringify(obj);
      if (json.length > MAX_PERSISTED_BYTES) {
        // Keep only the freshest entries when the payload gets large.
        const trimmed = [...store.entries()].sort((a, b) => b[1].t - a[1].t).slice(0, 12);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(trimmed)));
      } else {
        window.localStorage.setItem(STORAGE_KEY, json);
      }
    } catch {
      // Quota errors are ignored; the in-memory cache still works.
    }
  }, 300);
}

export function readCache<T>(key: string): T | undefined {
  const e = store.get(key);
  return e ? (e.v as T) : undefined;
}
export function writeCache<T>(key: string, value: T) {
  store.set(key, { v: value, t: Date.now() });
  schedulePersist();
}
export function hasCache(key: string) {
  return store.has(key);
}
export function clearDataCache() {
  store.clear();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

type Updater<T> = T | ((prev: T | undefined) => T);

export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: { debounceMs?: number } = {},
) {
  const { debounceMs = 0 } = opts;
  const [data, setDataState] = useState<T | undefined>(() => readCache<T>(key));
  const [loading, setLoading] = useState(() => !hasCache(key));
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);
  keyRef.current = key;

  const setData = useCallback((updater: Updater<T>) => {
    setDataState((prev) => {
      const next =
        typeof updater === "function" ? (updater as (p: T | undefined) => T)(prev) : updater;
      writeCache(keyRef.current, next);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    ensureHydrated();
    const cached = readCache<T>(key);
    if (cached !== undefined) {
      setDataState(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    const run = async () => {
      try {
        const result = await fetcherRef.current();
        if (cancelled) return;
        writeCache(key, result);
        setDataState(result);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    // Only debounce cold keys (typing a new search). A warm key revalidates
    // immediately behind already-visible content.
    if (cached !== undefined || debounceMs === 0) {
      void run();
      return () => {
        cancelled = true;
      };
    }
    const t = setTimeout(() => void run(), debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [key, tick, debounceMs]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, setData, refetch };
}
