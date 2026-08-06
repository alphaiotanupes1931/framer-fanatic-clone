export type VideoOrientation = "portrait" | "landscape" | "square";

export function orientationFrom(width: number, height: number): VideoOrientation {
  if (!width || !height) return "landscape";
  const r = width / height;
  if (r < 0.95) return "portrait";
  if (r > 1.05) return "landscape";
  return "square";
}

/** Reads intrinsic dimensions of a video File or URL in the browser. */
export function probeVideo(source: File | string): Promise<{ width: number; height: number; orientation: VideoOrientation } | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const el = document.createElement("video");
    const objectUrl = typeof source === "string" ? null : URL.createObjectURL(source);
    let done = false;
    const finish = (v: { width: number; height: number; orientation: VideoOrientation } | null) => {
      if (done) return;
      done = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      el.removeAttribute("src");
      resolve(v);
    };
    el.preload = "metadata";
    el.muted = true;
    (el as any).playsInline = true;
    el.crossOrigin = "anonymous";
    el.onloadedmetadata = () => {
      const w = el.videoWidth;
      const h = el.videoHeight;
      finish(w && h ? { width: w, height: h, orientation: orientationFrom(w, h) } : null);
    };
    el.onerror = () => finish(null);
    setTimeout(() => finish(null), 12000);
    el.src = objectUrl || (source as string);
  });
}

const cache = new Map<string, VideoOrientation>();

/** Cached orientation probe for a remote video URL. */
export async function orientationForUrl(url: string): Promise<VideoOrientation | null> {
  if (!url) return null;
  const key = url.split("?")[0];
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await probeVideo(url);
  if (!res) return null;
  cache.set(key, res.orientation);
  return res.orientation;
}