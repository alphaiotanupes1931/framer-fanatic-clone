import { useEffect, useState } from "react";
import { Repeat2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Img } from "@/components/shared/smart-img";

type Preview = { thumb: string | null; text: string; bg: string | null; color: string | null; bucket?: string };

/** Grid tile for a repost: shows the original post/event, with a small repost badge. */
export function RepostTile({ postId, eventId }: { postId?: string | null; eventId?: string | null }) {
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (postId) {
        const { data } = await supabase
          .from("posts")
          .select("content, image_url, media_urls, bg_color, text_color")
          .eq("id", postId)
          .maybeSingle();
        if (cancelled) return;
        const media = (data?.media_urls as string[] | null)?.[0] || data?.image_url || null;
        setPreview({ thumb: media, text: data?.content || "", bg: data?.bg_color ?? null, color: data?.text_color ?? null });
        return;
      }
      if (eventId) {
        const { data } = await supabase.from("events").select("title, image_url").eq("id", eventId).maybeSingle();
        if (cancelled) return;
        setPreview({ thumb: data?.image_url ?? null, text: data?.title || "", bg: null, color: null, bucket: "event-images" });
      }
    })();
    return () => { cancelled = true; };
  }, [postId, eventId]);

  const isVideo = preview?.thumb ? /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(preview.thumb) : false;

  return (
    <>
      {preview?.thumb && !isVideo ? (
        <Img src={preview.thumb} bucket={preview.bucket} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center p-3 text-center font-semibold leading-snug text-foreground"
          style={preview?.bg ? { background: preview.bg, color: preview.color || "#fff" } : undefined}
        >
          <span className="line-clamp-6 whitespace-pre-wrap break-words text-base">{preview?.text || ""}</span>
        </div>
      )}
      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white">
        <Repeat2 className="h-3.5 w-3.5" />
      </span>
    </>
  );
}
