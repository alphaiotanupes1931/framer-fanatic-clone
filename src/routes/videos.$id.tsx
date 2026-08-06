import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/text-utils";
import { Play, X, Bookmark, Heart, MessageCircle, Send, Share2, BellOff, Bell, Trash2 } from "lucide-react";
import { toast } from "sonner";
import pbLogo from "@/assets/pb-logo.png";
import { Img, SmartVideo } from "@/components/shared/smart-img";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { externalShare } from "@/lib/share-preview";
import { useVideoOrientation, orientationClass } from "@/hooks/use-video-orientation";
import { useUserRole } from "@/hooks/use-user-role";

export const Route = createFileRoute("/videos/$id")({
  component: VideoDetail,
  head: () => ({ meta: [{ title: "Video - Planet Baltimore" }] }),
});

type Video = {
  id: string; user_id: string; title: string; description: string | null;
  video_url: string; thumbnail_url: string | null; featured: boolean;
  created_at: string; category?: string | null; comments_muted?: boolean;
  orientation?: string | null; aspect_ratio?: number | null;
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
    <div className="fixed inset-0 z-50 bg-white text-neutral-900 overflow-y-auto">
      <div className="mx-auto flex max-w-[1800px] flex-col px-4 py-4 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Img src={pbLogo} alt="Planet Baltimore" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="font-display text-base sm:text-lg font-extrabold tracking-tight uppercase">Planet Baltimore</span>
          </Link>
          <Link to="/videos" className="rounded-full p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900" aria-label="Close">
            <X className="h-5 w-5" />
          </Link>
        </div>
        {loading ? (
          <div className="text-sm text-neutral-500">Loading…</div>
        ) : !video ? (
          <div className="text-sm text-neutral-500">Video not found.</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_426px]">
            <div className="min-w-0">
              <VideoPlayer url={video.video_url} poster={video.thumbnail_url} video={video} />
              <div className="mt-4 flex items-start gap-3">
                <h1 className="flex-1 text-xl font-bold sm:text-2xl">{video.title}</h1>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-700">
                {video.author?.username ? (
                  <Link to="/u/$username" params={{ username: video.author.username }} className="flex items-center gap-2 font-semibold hover:text-orange-600">
                    {video.author.avatar_url ? (
                      <Img src={video.author.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-neutral-200" />
                    )}
                    <span>
                      <div>{video.author.display_name || video.author.username}</div>
                      <div className="text-xs font-normal text-neutral-500">{timeAgo(video.created_at)}</div>
                    </span>
                  </Link>
                ) : (
                  <span className="font-semibold">{video.author?.display_name || "Anonymous"}</span>
                )}
                {video.category && (
                  <span className="ml-auto rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">{video.category}</span>
                )}
              </div>
              {video.description && (
                <div className="mt-4 rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-sm leading-relaxed text-neutral-800 whitespace-pre-wrap">
                  {video.description}
                </div>
              )}
              <VideoActions video={video} onVideoChange={(v) => setVideo(v)} />
            </div>
            <aside className="min-w-0">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500">Up next</h2>
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

function VideoPlayer({ url, poster, video }: { url: string; poster: string | null; video: Video }) {
  const info = parseEmbed(url || "");
  const orientation = useVideoOrientation({
    url: info.kind === "file" ? url : null,
    orientation: video.orientation,
    aspectRatio: video.aspect_ratio ?? null,
    probe: info.kind === "file",
  });
  if (info.kind === "youtube" || info.kind === "vimeo") {
    return (
      <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-2xl bg-black">
        <iframe src={info.embed} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video player" />
      </div>
    );
  }
  const portrait = orientation === "portrait";
  return (
    <div className={`relative mx-auto w-full overflow-hidden rounded-2xl bg-black ${orientationClass(orientation)} ${portrait ? "max-w-[420px]" : ""}`}>
      <SmartVideo
        src={url}
        controls
        autoPlay
        playsInline
        poster={poster || undefined}
        className={`absolute inset-0 h-full w-full bg-black ${portrait ? "object-contain" : "object-cover"}`}
      />
    </div>
  );
}

function RelatedCard({ v }: { v: Video }) {
  const info = parseEmbed(v.video_url || "");
  const poster = v.thumbnail_url || info.poster;
  const orientation = useVideoOrientation({
    url: info.kind === "file" ? v.video_url : null,
    orientation: v.orientation,
    aspectRatio: v.aspect_ratio ?? null,
    probe: info.kind === "file",
  });
  return (
    <Link to="/videos/$id" params={{ id: v.id }} className="group flex gap-3">
      <div className={`relative shrink-0 overflow-hidden rounded-lg bg-neutral-200 ${orientationClass(orientation)} ${orientation === "portrait" ? "w-24" : "w-40"}`}>
        {poster ? (
          <Img src={poster} alt={v.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : info.kind === "file" ? (
          <SmartVideo src={`${v.video_url}#t=0.5`} preload="metadata" muted playsInline className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-500"><Play className="h-6 w-6" /></div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-semibold text-neutral-900 group-hover:text-orange-600">{v.title}</div>
        <div className="mt-1 truncate text-xs text-neutral-500">{v.author?.display_name || v.author?.username || "Anonymous"}</div>
      </div>
    </Link>
  );
}

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { display_name: string | null; username: string | null; avatar_url: string | null };
};

const pill =
  "inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-[#d4580a] hover:text-[#d4580a]";

function VideoActions({ video, onVideoChange }: { video: Video; onVideoChange: (v: Video) => void }) {
  const [meId, setMeId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [saved, setSaved] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const muted = !!video.comments_muted;
  const isOwner = !!meId && meId === video.user_id;
  const url = typeof window !== "undefined" ? `${window.location.origin}/videos/${video.id}` : "";

  const loadComments = async () => {
    const { data } = await supabase
      .from("video_comments")
      .select("id,user_id,content,created_at")
      .eq("video_id", video.id)
      .order("created_at", { ascending: false });
    const list = (data || []) as Comment[];
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: profs } = await (supabase as any)
        .from("profiles_public")
        .select("id, display_name, username, avatar_url")
        .in("id", ids);
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      list.forEach((c) => { c.author = byId.get(c.user_id) as any; });
    }
    setComments(list);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMeId(user?.id ?? null);
      const [likeRows, savedRow] = await Promise.all([
        supabase.from("video_likes").select("user_id").eq("video_id", video.id),
        user
          ? supabase.from("video_saves").select("video_id").eq("video_id", video.id).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      const rows = (likeRows.data || []) as Array<{ user_id: string }>;
      setLikes(rows.length);
      setLiked(!!user && rows.some((r) => r.user_id === user.id));
      setSaved(!!savedRow?.data);
      await loadComments();
    })();
  }, [video.id]);

  const toggleLike = async () => {
    if (!meId) { toast.error("Sign in to like"); return; }
    const next = !liked;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1));
    const { error } = next
      ? await supabase.from("video_likes").insert({ video_id: video.id, user_id: meId })
      : await supabase.from("video_likes").delete().eq("video_id", video.id).eq("user_id", meId);
    if (error) { setLiked(!next); setLikes((n) => n + (next ? -1 : 1)); toast.error(error.message); }
  };

  const toggleSave = async () => {
    if (!meId) { toast.error("Sign in to save"); return; }
    const next = !saved; setSaved(next);
    const { error } = next
      ? await supabase.from("video_saves").insert({ video_id: video.id, user_id: meId })
      : await supabase.from("video_saves").delete().eq("video_id", video.id).eq("user_id", meId);
    if (error) { setSaved(!next); toast.error(error.message); return; }
    toast.success(next ? "Saved" : "Unsaved");
  };

  const toggleMute = async () => {
    const next = !muted;
    const { error } = await supabase.from("videos").update({ comments_muted: next } as any).eq("id", video.id);
    if (error) { toast.error(error.message); return; }
    onVideoChange({ ...video, comments_muted: next });
    toast.success(next ? "Comments muted" : "Comments turned back on");
  };

  const postComment = async () => {
    if (!meId) { toast.error("Sign in to comment"); return; }
    const content = draft.trim();
    if (!content) return;
    setPosting(true);
    const { error } = await supabase.from("video_comments").insert({ video_id: video.id, user_id: meId, content });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setDraft("");
    loadComments();
  };

  const removeComment = async (c: Comment) => {
    const prev = comments;
    setComments((list) => list.filter((x) => x.id !== c.id));
    const { error } = await supabase.from("video_comments").delete().eq("id", c.id);
    if (error) { setComments(prev); toast.error(error.message); }
  };

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2 border-y border-neutral-200 py-3">
        <button onClick={toggleLike} aria-label="Like" className={`${pill} ${liked ? "border-[#d4580a] bg-[#d4580a]/10 text-[#d4580a]" : ""}`}>
          <Heart className={`h-4 w-4 ${liked ? "fill-[#d4580a]" : ""}`} /> {likes}
        </button>
        <button onClick={() => setShowComments((s) => !s)} aria-label="Comments" className={pill}>
          <MessageCircle className="h-4 w-4" /> {comments.length}
        </button>
        <button onClick={() => setShareOpen(true)} aria-label="Share in app" title="Share with people you follow" className={pill}>
          <Send className="h-4 w-4" /> Share
        </button>
        <button
          onClick={() => externalShare(url, video.title, video.description || undefined)}
          aria-label="Share outside the app"
          title="Share outside the app"
          className={pill}
        >
          <Share2 className="h-4 w-4" />
        </button>
        <button onClick={toggleSave} aria-label={saved ? "Unsave" : "Save"} className={`${pill} ${saved ? "border-[#d4580a] bg-[#d4580a]/10 text-[#d4580a]" : ""}`}>
          <Bookmark className={`h-4 w-4 ${saved ? "fill-[#d4580a]" : ""}`} /> {saved ? "Saved" : "Save"}
        </button>
        {isOwner && (
          <button onClick={toggleMute} className={`${pill} ml-auto ${muted ? "border-[#d4580a] text-[#d4580a]" : ""}`}>
            {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {muted ? "Comments muted" : "Mute comments"}
          </button>
        )}
      </div>

      {showComments && (
        <div className="mt-4 space-y-4">
          {muted ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
              The creator has turned off comments for this video.
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") postComment(); }}
                placeholder="Add a comment…"
                className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm focus:border-[#d4580a] focus:outline-none"
              />
              <button
                onClick={postComment}
                disabled={posting || !draft.trim()}
                className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Post
              </button>
            </div>
          )}
          {comments.length === 0 ? (
            !muted && <div className="text-sm text-neutral-500">No comments yet.</div>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  {c.author?.avatar_url ? (
                    <Img src={c.author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-neutral-200" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-neutral-900">
                      {c.author?.display_name || c.author?.username || "Anonymous"}
                      <span className="ml-2 font-normal text-neutral-400">{timeAgo(c.created_at)}</span>
                    </div>
                    <div className="text-sm text-neutral-800 whitespace-pre-wrap">{c.content}</div>
                  </div>
                  {(meId === c.user_id || isOwner) && (
                    <button onClick={() => removeComment(c)} aria-label="Delete comment" className="text-neutral-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ShareToUsersDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={url}
        title={video.title}
        preview={{
          type: "video",
          id: video.id,
          url,
          title: video.title,
          excerpt: video.description,
          image: video.thumbnail_url,
          author: video.author?.display_name || video.author?.username,
        }}
      />
    </div>
  );
}