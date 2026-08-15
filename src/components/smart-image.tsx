import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Buckets whose contents are served via signed URLs (private buckets).
// Any storage URL matching one of these is re-signed at render time so that
// stale/expired signed URLs and bare storage paths both render reliably.
const SIGNED_BUCKETS = new Set([
  "event-images",
  "story-covers",
  "post-media",
  "podcast-media",
  "avatars",
]);

type Parsed = { bucket: string; path: string } | null;

function parseStorageUrl(src: string): Parsed {
  const m = src.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

/* ------------------------------------------------------------------ *
 * Signed-URL cache
 *
 * Signing a private storage object costs a network round trip. Doing that
 * per <img> on every render is why images used to "pop in" late. We keep a
 * process-wide cache that is:
 *   1. read synchronously (so a cached image renders on the very first paint)
 *   2. persisted to localStorage (so it survives reloads and route changes)
 *   3. batched (many images in one page = one signing request per bucket)
 * ------------------------------------------------------------------ */

const SIGN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const CACHE_SAFETY_MS = 60 * 60 * 1000; // refresh an hour before real expiry
const STORE_KEY = "pb_signed_url_cache_v1";

type Entry = { url: string; exp: number };

const cache = new Map<string, Entry>();

function cacheKey(bucket: string, path: string) {
  return `${bucket}::${path}`;
}

let hydrated = false;
function hydrateCache() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Entry>;
    const now = Date.now();
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v.url === "string" && v.exp > now) cache.set(k, v);
    }
  } catch {
    /* corrupt cache is not worth crashing over */
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistCache() {
  if (typeof window === "undefined") return;
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const now = Date.now();
      const obj: Record<string, Entry> = {};
      for (const [k, v] of cache) if (v.exp > now) obj[k] = v;
      window.localStorage.setItem(STORE_KEY, JSON.stringify(obj));
    } catch {
      /* quota errors are non-fatal */
    }
  }, 500);
}

/** Wipe cached capability URLs, e.g. when the signed-in user changes. */
export function clearSignedUrlCache() {
  cache.clear();
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

function readCache(bucket: string, path: string): string | null {
  hydrateCache();
  const hit = cache.get(cacheKey(bucket, path));
  return hit && hit.exp > Date.now() ? hit.url : null;
}

function writeCache(bucket: string, path: string, url: string) {
  cache.set(cacheKey(bucket, path), {
    url,
    exp: Date.now() + SIGN_TTL_SECONDS * 1000 - CACHE_SAFETY_MS,
  });
  persistCache();
}

/* --------------------------- batched signing --------------------------- */

type Pending = { resolve: (url: string | null) => void };

const queues = new Map<string, Map<string, Pending[]>>();
let flushScheduled = false;

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  // Coalesce within the current task only: every image mounted in the same
  // render pass shares one signing request per bucket, with no added delay.
  queueMicrotask(() => void flushQueues());
}

async function flushQueues() {
  flushScheduled = false;
  const snapshot = Array.from(queues.entries());
  queues.clear();
  await Promise.all(
    snapshot.map(async ([bucket, byPath]) => {
      const paths = Array.from(byPath.keys());
      try {
        const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGN_TTL_SECONDS);
        const byResult = new Map<string, string>();
        for (const row of data ?? []) {
          const p = (row as { path?: string | null }).path;
          const u = (row as { signedUrl?: string | null }).signedUrl;
          if (p && u) byResult.set(p, u);
        }
        for (const [path, waiters] of byPath) {
          const url = byResult.get(path) ?? null;
          if (url) writeCache(bucket, path, url);
          for (const w of waiters) w.resolve(url);
        }
      } catch {
        for (const [, waiters] of byPath) for (const w of waiters) w.resolve(null);
      }
    }),
  );
}

function signBatched(bucket: string, path: string): Promise<string | null> {
  return new Promise((resolve) => {
    let byPath = queues.get(bucket);
    if (!byPath) {
      byPath = new Map();
      queues.set(bucket, byPath);
    }
    const waiters = byPath.get(path);
    if (waiters) waiters.push({ resolve });
    else byPath.set(path, [{ resolve }]);
    scheduleFlush();
  });
}

/* ----------------------------- resolution ----------------------------- */

type Target =
  | { bucket: string; path: string }
  | { candidates: string[]; path: string }
  | { direct: string }
  | null;

// Order matters: most media stored as a bare path lives in one of these.
const CANDIDATE_BUCKETS = ["event-images", "post-media", "story-covers", "avatars", "podcast-media"];

function targetFor(src: string | null | undefined, bucketHint?: string): Target {
  if (!src) return null;
  // Local, inline, or object URLs never need signing.
  if (/^(data:|blob:|\/)/.test(src)) return { direct: src };
  // Bare storage path (e.g. "<uid>/<file>.jpg").
  if (!src.startsWith("http")) {
    const path = src.replace(/^\/+/, "");
    if (bucketHint) return { bucket: bucketHint, path };
    // No hint: try every private bucket and use whichever one has the object.
    return { candidates: CANDIDATE_BUCKETS, path };
  }
  const parsed = parseStorageUrl(src);
  if (parsed && SIGNED_BUCKETS.has(parsed.bucket)) return parsed;
  return { direct: src };
}

/** Cache-only lookup. Returns a URL usable on the very first render, or null. */
function resolveSync(src: string | null | undefined, bucketHint?: string): string | null {
  const t = targetFor(src, bucketHint);
  if (!t) return null;
  if ("direct" in t) return t.direct;
  if ("candidates" in t) {
    for (const b of t.candidates) {
      const hit = readCache(b, t.path);
      if (hit) return hit;
    }
    return null;
  }
  return readCache(t.bucket, t.path);
}

export async function resolveMediaUrl(src: string, bucketHint?: string): Promise<string | null> {
  return resolveAsync(src, bucketHint);
}

async function resolveAsync(src: string, bucketHint?: string): Promise<string | null> {
  const t = targetFor(src, bucketHint);
  if (!t) return null;
  if ("direct" in t) return t.direct;
  if ("candidates" in t) {
    for (const b of t.candidates) {
      const cached = readCache(b, t.path);
      if (cached) return cached;
    }
    for (const b of t.candidates) {
      const signed = await signBatched(b, t.path);
      if (signed && (await urlResolves(signed))) return signed;
    }
    return null;
  }
  const cached = readCache(t.bucket, t.path);
  if (cached) return cached;
  const signed = await signBatched(t.bucket, t.path);
  if (signed && (await urlResolves(signed))) return signed;
  // The hinted bucket didn't have the object (older uploads landed in a
  // different bucket). Try the rest before giving up.
  for (const b of CANDIDATE_BUCKETS) {
    if (b === t.bucket) continue;
    const cachedAlt = readCache(b, t.path);
    if (cachedAlt) return cachedAlt;
    const alt = await signBatched(b, t.path);
    if (alt && (await urlResolves(alt))) return alt;
  }
  // Fall back to the original URL — it may still work if the bucket has
  // since been made public.
  return signed ?? (src.startsWith("http") ? src : null);
}

/** Signed URLs are minted even for missing objects, so verify before using. */
async function urlResolves(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Warm the cache for a list of image URLs before they render. Use this in a
 * page loader so above-the-fold imagery is already signed by paint time.
 */
export function prefetchImageUrls(srcs: Array<string | null | undefined>, bucketHint?: string) {
  for (const s of srcs) {
    if (!s) continue;
    const t = targetFor(s, bucketHint);
    if (!t || "direct" in t) continue;
    if (resolveSync(s, bucketHint)) continue;
    void resolveAsync(s, bucketHint).then((url) => {
      if (!url || typeof window === "undefined") return;
      // Nudge the browser into fetching the bytes too, not just the URL.
      const img = new window.Image();
      img.decoding = "async";
      img.src = url;
    });
  }
}

export function useSmartImageUrl(src: string | null | undefined, bucketHint?: string): string | null {
  // Synchronous cache read means a warm image paints immediately instead of
  // flashing empty for a round trip.
  const [url, setUrl] = useState<string | null>(() => resolveSync(src, bucketHint));
  const lastSrc = useRef(src);

  if (lastSrc.current !== src) {
    lastSrc.current = src;
    const immediate = resolveSync(src, bucketHint);
    // Only swap synchronously when we already have something to show, so the
    // image never blinks back to an empty box while the next URL resolves.
    if (immediate && immediate !== url) setUrl(immediate);
    else if (!src) setUrl(null);
  }

  useEffect(() => {
    if (!src) {
      setUrl(null);
      return;
    }
    const immediate = resolveSync(src, bucketHint);
    if (immediate) {
      setUrl(immediate);
      return;
    }
    let cancelled = false;
    resolveAsync(src, bucketHint).then((r) => {
      if (!cancelled) setUrl(r);
    });
    return () => {
      cancelled = true;
    };
  }, [src, bucketHint]);

  return url;
}

export function SmartImage({
  src,
  alt,
  className,
  bucket,
  fallback = null,
  loading = "eager",
  fetchPriority,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  bucket?: string;
  fallback?: React.ReactNode;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
}) {
  const url = useSmartImageUrl(src, bucket);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { setFailed(false); setReady(false); }, [url]);
  if (!url || failed) return <>{fallback}</>;
  return (
    <img
      src={url}
      alt={alt}
      className={`${className ?? ""} transition-opacity duration-200 ${ready ? "opacity-100" : "opacity-0"}`}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      onLoad={() => setReady(true)}
      onError={() => setFailed(true)}
      ref={(el) => { if (el?.complete) setReady(true); }}
    />
  );
}