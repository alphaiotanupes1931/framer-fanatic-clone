import { siteUrl } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Bookmark, Trash2, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/text-utils";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { externalShare } from "@/lib/share-preview";
import { Img, SmartAvatarImage, SmartVideo } from "@/components/shared/smart-img";
import { prefetchImageUrls } from "@/components/smart-image";
import { readCache, writeCache } from "@/hooks/use-cached-fetch";
import { useReaction } from "@/hooks/use-reaction";

type Post = {
  id: string; user_id: string; content: string | null;
  image_url: string | null; video_url: string | null;
  media_urls: string[] | null; music_url: string | null;
  post_type: string | null; bg_color: string | null;
  text_color: string | null; font_size: string | null;
  likes_count: number | null; comments_count: number | null;
  neighborhood: string | null; created_at: string;
};
type Author = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
type Comment = { id: string; user_id: string; body: string; created_at: string; author?: Author | null };

export function PostSplitView({ postId, meId, onDeleted }: { postId: string; meId?: string | null; onDeleted?: () => void }) {
  const navigate = useNavigate();
  const cacheKey = `post:${postId}`;
  const cached = readCache<{ post: Post; author: Author | null; comments: Comment[] }>(cacheKey);
  const [post, setPost] = useState<Post | null>(cached?.post ?? null);
  const [author, setAuthor] = useState<Author | null>(cached?.author ?? null);
  const { liked, saved, setLiked, setSaved } = useReaction(postId, meId ?? undefined);
  const [comments, setComments] = useState<Comment[]>(cached?.comments ?? []);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(!cached);
  const [shareOpen, setShareOpen] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);

  const load = async () => {
    const { data: p } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
    setPost(p as Post | null);
    if (p) {
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: [p.user_id] });
      const a = ((profs || [])[0] as Author) || null;
      setAuthor(a);
      const { data: cs } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
      const list = (cs || []) as Comment[];
      const ids = Array.from(new Set(list.map((c) => c.user_id)));
      if (ids.length) {
        const { data: cp } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
        const by = new Map(((cp || []) as Author[]).map((a) => [a.id, a]));
        list.forEach((c) => { c.author = by.get(c.user_id) || null; });
      }
      setComments(list);
      writeCache(cacheKey, { post: p as Post, author: a, comments: list });
      // Warm every frame of the carousel so arrow clicks never wait on a signed URL.
      const media = (p as Post).media_urls?.length
        ? (p as Post).media_urls!
        : [(p as Post).image_url, (p as Post).video_url];
      prefetchImageUrls(media.filter((u): u is string => !!u && !/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u)));
    }
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [postId, meId]);

  if (loading) return (
    <div className="grid animate-pulse md:grid-cols-[minmax(0,1.2fr)_minmax(320px,420px)]">
      <div className="aspect-square w-full bg-muted md:aspect-auto md:min-h-[70vh]" />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>
    </div>
  );
  if (!post) return <div className="p-8 text-sm text-muted-foreground">Post not found.</div>;

  const mediaList: { url: string; kind: "image" | "video" }[] = (() => {
    const list: { url: string; kind: "image" | "video" }[] = [];
    const inferKind = (u: string): "image" | "video" => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u) ? "video" : "image";
    if (post.media_urls && post.media_urls.length) for (const u of post.media_urls) list.push({ url: u, kind: inferKind(u) });
    else {
      if (post.image_url) list.push({ url: post.image_url, kind: "image" });
      if (post.video_url) list.push({ url: post.video_url, kind: "video" });
    }
    return list;
  })();
  const current = mediaList[mediaIdx];
  const hasMedia = mediaList.length > 0;

  const toggleLike = async () => {
    if (!meId) { navigate({ to: "/auth" }); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setPost({ ...post, likes_count: (post.likes_count ?? 0) + (wasLiked ? -1 : 1) });
    const res = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", meId)
      : await supabase.from("post_likes").insert({ post_id: post.id, user_id: meId });
    if (res.error) { setLiked(wasLiked); toast.error(res.error.message); }
  };
  const toggleSave = async () => {
    if (!meId) { navigate({ to: "/auth" }); return; }
    const wasSaved = saved;
    setSaved(!wasSaved);
    const res = wasSaved
      ? await supabase.from("post_saves").delete().eq("post_id", post.id).eq("user_id", meId)
      : await supabase.from("post_saves").insert({ post_id: post.id, user_id: meId });
    if (res.error) { setSaved(wasSaved); toast.error(res.error.message); }
    else toast.success(wasSaved ? "Removed from saved" : "Saved");
  };
  const send = async () => {
    if (!meId || !text.trim()) return;
    const body = text.trim(); setText("");
    // Optimistic: the comment lands immediately, the round trip happens behind it.
    const tempId = `tmp-${Date.now()}`;
    setComments((prev) => [
      ...prev,
      { id: tempId, user_id: meId, body, created_at: new Date().toISOString(), author: { id: meId, display_name: "You", username: null, avatar_url: null } },
    ]);
    const { error } = await supabase.from("post_comments").insert({ post_id: post.id, user_id: meId, body });
    if (error) {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      toast.error(error.message); setText(body); return;
    }
    await load();
  };
  const remove = async () => {
    if (!meId || post.user_id !== meId) return;
    if (!confirm("Delete this post? This can't be undone.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    if (onDeleted) onDeleted(); else navigate({ to: "/dashboard" });
  };
  const shareExternal = () => {
    const url = siteUrl(`/posts/${post.id}`);
    void externalShare(url, post.content?.slice(0, 80) || "A post on Planet Baltimore");
  };

  const initials = (author?.display_name || author?.username || "U").slice(0, 2).toUpperCase();
  const isOwner = meId && meId === post.user_id;
  const isTextOnly = !hasMedia;

  return (
    <div className={`grid overflow-hidden bg-background ${isTextOnly ? "md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]" : "md:grid-cols-[minmax(0,1.2fr)_minmax(320px,420px)]"}`}>
      {isTextOnly && post.content && (
        <div
          className="flex aspect-square w-full items-center justify-center p-8 md:aspect-auto md:min-h-[85vh]"
          style={{ background: post.bg_color || "#111827", color: post.text_color || "#ffffff" }}
        >
          <div
            className={`whitespace-pre-wrap break-words text-center font-semibold leading-snug ${
              post.font_size === "sm" ? "text-lg" : post.font_size === "lg" ? "text-3xl" : post.font_size === "xl" ? "text-5xl" : "text-2xl"
            }`}
          >
            {post.content}
          </div>
        </div>
      )}
      {hasMedia && (
        <div className="relative flex items-center justify-center bg-white">
          {current.kind === "image" ? (
            <Img src={current.url} alt="" className="max-h-[85vh] w-full object-contain" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
          ) : (
            <SmartVideo key={current.url} src={current.url} controls playsInline preload="metadata" className="max-h-[85vh] w-full bg-white" />
          )}
          {mediaList.length > 1 && (
            <>
              <button type="button" onClick={() => setMediaIdx((i) => (i - 1 + mediaList.length) % mediaList.length)}
                aria-label="Previous" className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => setMediaIdx((i) => (i + 1) % mediaList.length)}
                aria-label="Next" className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-black/40 px-2 py-1">
                {mediaList.map((_, i) => (
                  <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === mediaIdx ? "bg-white" : "bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          {author ? (
            <Link to="/u/$username" params={{ username: author.username || author.id }} className="flex min-w-0 items-center gap-2.5">
              <Avatar className="h-9 w-9 shrink-0">
                {author.avatar_url && <SmartAvatarImage src={author.avatar_url} alt="" />}
                <AvatarFallback className="bg-[#d4580a]/10 text-xs text-[#d4580a]">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{author.display_name || author.username || "Someone"}</div>
                <div className="truncate text-[11px] text-muted-foreground">{post.neighborhood || "Baltimore"}</div>
              </div>
            </Link>
          ) : <div className="text-sm text-muted-foreground">Someone</div>}
          {isOwner && (
            <div className="ml-auto flex items-center gap-1">
              <Link to="/edit-post/$id" params={{ id: post.id }} aria-label="Edit post" className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                <Pencil className="h-4 w-4" />
              </Link>
              <button onClick={remove} aria-label="Delete post" className="rounded-full p-1.5 text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto">
          {post.content && !isTextOnly && (
            (post.post_type === "text" && post.bg_color) ? (
              <div className={`m-4 rounded-2xl p-6 text-center font-medium whitespace-pre-wrap break-words ${
                post.font_size === "sm" ? "text-base" : post.font_size === "lg" ? "text-2xl" : post.font_size === "xl" ? "text-4xl" : "text-xl"
              }`} style={{ background: post.bg_color, color: post.text_color || "#fff" }}>
                {post.content}
              </div>
            ) : (
              <div className="px-4 py-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
                <span className="mr-2 font-semibold">{author?.display_name || author?.username || "Someone"}</span>
                {post.content}
              </div>
            )
          )}
          <div className="px-4 pb-2 text-[11px] text-muted-foreground">{timeAgo(post.created_at)}</div>

          <ul className="space-y-3 border-t border-border px-4 py-4">
            {comments.length === 0 && <li className="text-sm text-muted-foreground">Be the first to comment.</li>}
            {comments.map((c) => {
              const ci = (c.author?.display_name || c.author?.username || "U").slice(0, 2).toUpperCase();
              return (
                <li key={c.id} className="flex gap-2.5">
                  <Avatar className="h-7 w-7 shrink-0">
                    {c.author?.avatar_url && <SmartAvatarImage src={c.author.avatar_url} alt="" />}
                    <AvatarFallback className="bg-[#d4580a]/10 text-[10px] text-[#d4580a]">{ci}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground/90">
                      <span className="mr-1.5 font-semibold text-foreground">{c.author?.display_name || c.author?.username || "Anonymous"}</span>
                      <span className="whitespace-pre-wrap break-words">{c.body}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{timeAgo(c.created_at)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-border">
          <div className="flex items-center gap-4 px-4 py-2.5 text-sm text-muted-foreground">
            <button onClick={toggleLike} className={`flex items-center gap-1.5 transition ${liked ? "text-[#d4580a]" : "hover:text-foreground"}`}>
              <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} /> {post.likes_count ?? 0}
            </button>
            <div className="flex items-center gap-1.5"><MessageCircle className="h-5 w-5" /> {comments.length}</div>
            <button onClick={() => setShareOpen(true)} aria-label="Share" title="Share" className="hover:text-foreground">
              <Send className="h-5 w-5 -rotate-45" />
            </button>
            <button onClick={toggleSave} className={`ml-auto transition ${saved ? "text-[#d4580a]" : "hover:text-foreground"}`} aria-label={saved ? "Unsave" : "Save"}>
              <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
            </button>
          </div>
          {meId ? (
            <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Add a comment…" className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm outline-none focus:border-[#d4580a]" />
              <button onClick={send} disabled={!text.trim()} className="rounded-full bg-[#d4580a] p-2 text-white disabled:opacity-50" aria-label="Send">
                <Send className="h-4 w-4 -rotate-45" />
              </button>
            </div>
          ) : (
            <Link to="/auth" className="block border-t border-border px-4 py-3 text-sm font-semibold text-[#d4580a] hover:underline">Sign in to comment</Link>
          )}
        </div>
      </div>

      <ShareToUsersDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={siteUrl(`/posts/${post.id}`)}
        title={post.content?.slice(0, 80) || "Post"}
        preview={{
          type: "post",
          id: post.id,
          url: siteUrl(`/posts/${post.id}`),
          title: post.content?.slice(0, 80) || null,
          excerpt: post.content?.slice(0, 200) || null,
          image: mediaList.find((m) => m.kind === "image")?.url || null,
          author: author?.display_name || author?.username || null,
        }}
      />
    </div>
  );
}