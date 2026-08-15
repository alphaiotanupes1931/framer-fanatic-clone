import { supabase } from "@/integrations/supabase/client";
import { STORED_URL_TTL } from "@/lib/image-compress";

export const MAX_MEDIA_MB = 200;

/** Uploads an audio/video file to storage and returns a long-lived signed URL. */
export async function uploadMediaFile(file: File, orgId: string, kind: "audio" | "video"): Promise<string> {
  if (file.size > MAX_MEDIA_MB * 1024 * 1024) {
    throw new Error(`File must be under ${MAX_MEDIA_MB}MB`);
  }
  const ext = file.name.split(".").pop() || (kind === "audio" ? "mp3" : "mp4");
  const path = `${orgId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("podcast-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || (kind === "audio" ? "audio/mpeg" : "video/mp4"),
  });
  if (error) throw error;
  const { data: signed, error: sErr } = await supabase.storage
    .from("podcast-media")
    .createSignedUrl(path, STORED_URL_TTL);
  if (sErr || !signed?.signedUrl) throw sErr ?? new Error("Could not prepare that file");
  return signed.signedUrl;
}

/** Reads the duration (in seconds) of an audio/video file in the browser. */
export function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const el = document.createElement("audio");
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        const d = Number.isFinite(el.duration) ? Math.round(el.duration) : null;
        URL.revokeObjectURL(url);
        resolve(d);
      };
      el.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      el.src = url;
    } catch { resolve(null); }
  });
}

export function formatDuration(secs?: number | null) {
  if (!secs && secs !== 0) return "";
  const m = Math.floor(secs / 60);
  const s = Math.abs(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
