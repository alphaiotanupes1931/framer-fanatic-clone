import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Img, SmartAvatarImage } from "@/components/shared/smart-img";
import { timeAgo } from "@/lib/text-utils";

type Embed =
  | {
      kind: "post";
      id: string;
      content: string;
      media: string | null;
      created_at: string;
      author_name: string;
      author_username: string | null;
      author_avatar: string | null;
    }
  | {
      kind: "event";
      id: string;
      title: string;
      image: string | null;
      starts_at: string | null;
      venue: string | null;
    }
  | { kind: "gone" };

/** Compact card of the original post or event that a repost points at. */
export function RepostEmbed({ postId, eventId }: { postId?: string | null; eventId?: string | null }) {
  const [data, setData] = useState<Embed | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (postId) {
        const { data: p } = await supabase
          .from("posts")
          .select("id, user_id, content, image_url, media_urls, created_at, is_deleted")
          .eq("id", postId)
          .maybeSingle();
        if (!p || p.is_deleted) { if (!cancelled) setData({ kind: "gone" }); return; }
        const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: [p.user_id] });
        const author = (profs ?? [])[0] as { display_name: string | null; username: string | null; avatar_url: string | null } | undefined;
        if (cancelled) return;
        setData({
          kind: "post",
          id: p.id,
          content: p.content ?? "",
          media: (p.media_urls && p.media_urls[0]) || p.image_url || null,
          created_at: p.created_at,
          author_name: author?.display_name || author?.username || "Someone",
          author_username: author?.username ?? null,
          author_avatar: author?.avatar_url ?? null,
        });
        return;
      }
      if (eventId) {
        const { data: e } = await supabase
          .from("events")
          .select("id, title, image_url, starts_at, venue_name")
          .eq("id", eventId)
          .maybeSingle();
        if (cancelled) return;
        setData(e ? { kind: "event", id: e.id, title: e.title, image: e.image_url, starts_at: e.starts_at, venue: e.venue_name } : { kind: "gone" });
      }
    })();
    return () => { cancelled = true; };
  }, [postId, eventId]);

  if (!data) {
    return <div className="mx-3 my-2 h-24 animate-pulse rounded-xl border border-border bg-muted/40 sm:mx-5" />;
  }

  if (data.kind === "gone") {
    return (
      <div className="mx-3 my-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground sm:mx-5">
        This content is no longer available.
      </div>
    );
  }

  if (data.kind === "event") {
    return (
      <Link
        to="/events/$eventId"
        params={{ eventId: data.id }}
        className="mx-3 my-2 block overflow-hidden rounded-xl border border-border transition hover:border-[#d4580a] sm:mx-5"
      >
        {data.image && <Img src={data.image} bucket="event-images" alt="" className="max-h-[520px] w-full bg-muted object-contain" loading="lazy" />}
        <div className="p-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Event</div>
          <div className="mt-0.5 text-sm font-semibold text-foreground break-words">{data.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {data.starts_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {new Date(data.starts_at).toLocaleString()}
              </span>
            )}
            {data.venue && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {data.venue}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/posts/$postId"
      params={{ postId: data.id }}
      className="mx-3 my-2 block overflow-hidden rounded-xl border border-border transition hover:border-[#d4580a] sm:mx-5"
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        <Avatar className="h-7 w-7">
          {data.author_avatar && <SmartAvatarImage src={data.author_avatar} />}
          <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">{data.author_name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 text-xs">
          <div className="truncate font-semibold text-foreground">{data.author_name}</div>
          <div className="text-muted-foreground">{timeAgo(data.created_at)}</div>
        </div>
      </div>
      {data.content && (
        <p className="px-3 pt-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words line-clamp-6">{data.content}</p>
      )}
      {data.media && <Img src={data.media} alt="" className="mt-2 max-h-[240px] w-full object-cover" loading="lazy" />}
      <div className="h-3" />
    </Link>
  );
}
