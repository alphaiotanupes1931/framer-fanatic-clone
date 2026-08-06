import { useEffect, useState } from "react";
import { useSmartImageUrl } from "@/components/smart-image";

const SUPABASE_HOST = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "";

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
  return <img src={url} alt={alt} className={className} loading="eager" decoding="async" onError={() => setFailed(true)} />;
}

export { SUPABASE_HOST };