import { useEffect, useState } from "react";
import { orientationForUrl, orientationFrom, type VideoOrientation } from "@/lib/video-orientation";
import { useSmartImageUrl } from "@/components/smart-image";

/** Resolves a video's orientation from stored metadata, falling back to probing the file. */
export function useVideoOrientation(opts: {
  url?: string | null;
  orientation?: string | null;
  aspectRatio?: number | null;
  probe?: boolean;
}): VideoOrientation {
  const stored = opts.orientation as VideoOrientation | null | undefined;
  const fromRatio = opts.aspectRatio ? orientationFrom(opts.aspectRatio, 1) : null;
  const initial = stored || fromRatio || null;
  const [value, setValue] = useState<VideoOrientation>(initial || "landscape");
  // Private storage URLs must be signed before the browser can read metadata.
  const resolved = useSmartImageUrl(!initial && opts.probe !== false ? (opts.url?.split("#")[0] ?? undefined) : undefined);

  useEffect(() => {
    if (initial) { setValue(initial); return; }
    if (opts.probe === false || !resolved) return;
    let alive = true;
    orientationForUrl(resolved).then((o) => { if (alive && o) setValue(o); });
    return () => { alive = false; };
  }, [resolved, initial, opts.probe]);

  return value;
}

export function orientationClass(o: VideoOrientation): string {
  return o === "portrait" ? "aspect-[9/16]" : o === "square" ? "aspect-square" : "aspect-video";
}