import { useEffect, useState } from "react";
import { Img } from "@/components/shared/smart-img";
import { useSmartImageUrl } from "@/components/smart-image";

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

// Delegates to the shared signer so event images share one batched, cached,
// synchronously-readable pipeline with every other image on the platform.
export function useEventImageUrl(src: string | null | undefined): string | null {
  return useSmartImageUrl(src || undefined, "event-images");
}

export function EventImage({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  const url = useEventImageUrl(src);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);
  if (!url || failed) return null;
  return <img src={url} alt={alt} className={className} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

export { SUPABASE_HOST };