import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_HOST = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "";

// event-images bucket is private (workspace blocks public buckets), so any
// reference into that bucket must be served as a short-lived signed URL.
function extractEventImagePath(src: string): string | null {
  if (!src) return null;
  // Stored as a bare path (new uploads).
  if (!src.startsWith("http")) return src.replace(/^\/+/, "");
  // Stored as a supabase public/sign URL (older rows).
  const m = src.match(/\/storage\/v1\/object\/(?:public|sign)\/event-images\/([^?]+)/);
  return m ? m[1] : null;
}

const cache = new Map<string, { url: string; exp: number }>();

export function EventImage({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(() => {
    if (!src) return null;
    const path = extractEventImagePath(src);
    if (!path) return src; // external URL, use directly
    const cached = cache.get(path);
    return cached && cached.exp > Date.now() ? cached.url : null;
  });

  useEffect(() => {
    if (!src) return;
    const path = extractEventImagePath(src);
    if (!path) { setUrl(src); return; }
    const cached = cache.get(path);
    if (cached && cached.exp > Date.now()) { setUrl(cached.url); return; }
    let cancel = false;
    (async () => {
      const { data } = await supabase.storage.from("event-images").createSignedUrl(path, 60 * 60);
      if (cancel) return;
      if (data?.signedUrl) {
        cache.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
        setUrl(data.signedUrl);
      }
    })();
    return () => { cancel = true; };
  }, [src]);

  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
}

export { SUPABASE_HOST };