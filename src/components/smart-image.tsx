import { useEffect, useState } from "react";
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

const cache = new Map<string, { url: string; exp: number }>();

function cacheKey(bucket: string, path: string) {
  return `${bucket}::${path}`;
}

async function resolveSrc(src: string, bucketHint?: string): Promise<string | null> {
  if (!src) return null;
  // Local, inline, or object URLs never need signing.
  if (/^(data:|blob:|\/)/.test(src)) return src;
  // Bare storage path (e.g. "<uid>/<file>.jpg") — needs a bucket to sign.
  if (!src.startsWith("http")) {
    if (!bucketHint) return null;
    const path = src.replace(/^\/+/, "");
    const key = cacheKey(bucketHint, path);
    const c = cache.get(key);
    if (c && c.exp > Date.now()) return c.url;
    const { data } = await supabase.storage.from(bucketHint).createSignedUrl(path, 60 * 60);
    if (!data?.signedUrl) return null;
    cache.set(key, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
    return data.signedUrl;
  }
  // Supabase storage URL — re-sign if it points at a private bucket.
  const parsed = parseStorageUrl(src);
  if (parsed && SIGNED_BUCKETS.has(parsed.bucket)) {
    const key = cacheKey(parsed.bucket, parsed.path);
    const c = cache.get(key);
    if (c && c.exp > Date.now()) return c.url;
    const { data } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 60);
    if (data?.signedUrl) {
      cache.set(key, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
      return data.signedUrl;
    }
    // Fall through to the original URL — it may still work if the bucket
    // has since been made public.
    return src;
  }
  return src;
}

export function useSmartImageUrl(src: string | null | undefined, bucketHint?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!src) { setUrl(null); return; }
    let cancelled = false;
    resolveSrc(src, bucketHint).then((r) => { if (!cancelled) setUrl(r); });
    return () => { cancelled = true; };
  }, [src, bucketHint]);
  return url;
}

export function SmartImage({
  src,
  alt,
  className,
  bucket,
  fallback = null,
  loading = "lazy",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  bucket?: string;
  fallback?: React.ReactNode;
  loading?: "lazy" | "eager";
}) {
  const url = useSmartImageUrl(src, bucket);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);
  if (!url || failed) return <>{fallback}</>;
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}