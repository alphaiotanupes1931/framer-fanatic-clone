import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, X } from "lucide-react";
import pbLogo from "@/assets/pb-logo-dark.png";

export const Route = createFileRoute("/videos/$id")({
  component: VideoDetail,
  head: () => ({ meta: [{ title: "Video - Planet Baltimore" }] }),
});

type Video = {
  id: string; user_id: string; title: string; description: string | null;
  video_url: string; thumbnail_url: string | null; featured: boolean;
  created_at: string; category?: string | null;
  author?: { display_name: string | null; username: string | null; avatar_url?: string | null };
};

function parseEmbed(url: string): { kind: "youtube" | "vimeo" | "file" | "unknown"; embed?: string; poster?: string | null } {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return { kind: "youtube", embed: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`, poster: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` };
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return { kind: "vimeo", embed: `https://player.vimeo.com/video/${vim[1]}?autoplay=1` };
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url) || url.startsWith("blob:") || url.startsWith("http")) return { kind: "file" };
  return { kind: "unknown" };
}

function VideoDetail() {
  const { id } = useParams({ from: "/videos/$id" });
  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: v } = await supabase.from("videos").select("*").eq("id", id).maybeSingle();
      if (v) {
        const { data: prof } = await (supabase as any).from("profiles_public").select("id, display_name, username, avatar_url").eq("id", v.user_id).maybeSingle();
        (v as any).author = prof || undefined;
        setVideo(v as Video);
      }
      const { data: rel } = await supabase.from("videos").select("*").neq("id", id).order("created_at", { ascending: false }).limit(15);
      const list = (rel || []) as Video[];
      const ids = Array.from(new Set(list.map((x) => x.user_id)));
      if (ids.length) {
        const { data: profs } = await (supabase as any).from("profiles_public").select("id, display_name, username, avatar_url").in("id", ids);
        const byId = new Map((profs || []).map((p: any) => [p.id, p]));
        list.forEach((x) => { x.author = byId.get(x.user_id) as any; });
      }
      setRelated(list);
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 text-neutral-100 overflow-y-auto">
      <div className="mx-auto flex max-w-[1800px] flex-col px-4 py-4 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={pbLogo} alt="Planet Baltimore" width={32} height={32} className="w-8 h-8 invert" />
            <span className="font-display text-base sm:text-lg font-extrabold tracking-tight uppercase">Planet Baltimore</span>
          </Link>
          <Link to="/videos" className="rounded-full p-2 text-neutral-300 hover:bg-neutral-800 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </Link>
        </div>
        {loading ? (
          <div className="text-sm text-neutral-400">Loading…</div>
        ) : !video ? (
          <div className="text-sm text-neutral-400">Video not found.</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_426px]">
            <div className="min-w-0">
              <VideoPlayer url={video.video_url} poster={video.thumbnail_url} />
              <h1 className="mt-4 text-xl font-bold sm:text-2xl">{video.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-300">
                {video.author?.username ? (
                  <Link to="/u/$username" params={{ username: video.author.username }} className="flex items-center gap-2 font-semibold hover:text-orange-400">
                    {video.author.avatar_url ? (
                      <img src={video.author.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-neutral-700" />
                    )}
                    <span>
                      <div>{video.author.display_name || video.author.username}</div>
                      <div className="text-xs font-normal text-neutral-400">{new Date(video.created_at).toLocaleDateString()}</div>
                    </span>
                  </Link>
                ) : (
                  <span className="font-semibold">{video.author?.display_name || "Anonymous"}</span>
                )}
                {video.category && (
                  <span className="ml-auto rounded-full bg-neutral-800 px-3 py-1 text-xs font-semibold text-neutral-200">{video.category}</span>
                )}
              </div>
              {video.description && (
                <div className="mt-4 rounded-xl bg-neutral-900 p-4 text-sm leading-relaxed text-neutral-200 whitespace-pre-wrap">
                  {video.description}
                </div>
              )}
            </div>
            <aside className="min-w-0">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">Up next</h2>
              <div className="space-y-3">
                {related.map((r) => <RelatedCard key={r.id} v={r} />)}
                {related.length === 0 && <div className="text-sm text-neutral-500">No more videos yet.</div>}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function VideoPlayer({ url, poster }: { url: string; poster: string | null }) {
  const info = parseEmbed(url || "");
  if (info.kind === "youtube" || info.kind === "vimeo") {
    return (
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
        <iframe src={info.embed} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video player" />
      </div>
    );
  }
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
      <video src={url} controls autoPlay playsInline poster={poster || undefined} className="absolute inset-0 h-full w-full object-contain" />
    </div>
  );
}

function RelatedCard({ v }: { v: Video }) {
  const info = parseEmbed(v.video_url || "");
  const poster = v.thumbnail_url || info.poster;
  return (
    <Link to="/videos/$id" params={{ id: v.id }} className="group flex gap-3">
      <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
        {poster ? (
          <img src={poster} alt={v.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : info.kind === "file" ? (
          <video src={`${v.video_url}#t=0.5`} preload="metadata" muted playsInline className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/60"><Play className="h-6 w-6" /></div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-semibold text-neutral-100 group-hover:text-orange-400">{v.title}</div>
        <div className="mt-1 truncate text-xs text-neutral-400">{v.author?.display_name || v.author?.username || "Anonymous"}</div>
      </div>
    </Link>
  );
}