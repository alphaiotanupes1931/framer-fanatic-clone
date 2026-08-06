import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Process-wide, in-memory cache for page data.
 *
 * Tab switches in this app used to re-fetch from scratch and flash a skeleton
 * every time. Keeping results here lets a revisited page paint its previous
 * data on the very first render while fresh data is revalidated silently in
 * the background, which is what makes native-feeling apps feel instant.
 */
const store = new Map<string, unknown>();

export function readCache<T>(key: string): T | undefined {
  return store.has(key) ? (store.get(key) as T) : undefined;
}
export function writeCache<T>(key: string, value: T) {
  store.set(key, value);
}
export function hasCache(key: string) {
  return store.has(key);
}
export function clearDataCache() {
  store.clear();
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
