import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Bookmark, Star, TrendingUp, Send, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { Flag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { timeAgo } from "@/lib/text-utils";
import { X } from "lucide-react";
import { ReportDialog } from "@/components/report-dialog";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { externalShare } from "@/lib/share-preview";
import { useIsAdmin } from "@/hooks/use-is-admin";

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  video_url?: string | null;
  media_urls?: string[] | null;
  music_url?: string | null;
  post_type?: string | null;
  bg_color?: string | null;
  text_color?: string | null;
  likes_count: number | null;
  comments_count: number | null;
  neighborhood: string | null;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
  author_username?: string | null;
  neighborhood_name?: string | null;
  is_founder?: boolean;
  tag?: string | null;
  category?: string | null;
  featured?: boolean | null;
};

export function PostCard({ post, currentUserId, onDelete, reason }: {
  post: Post;
  currentUserId?: string;
  onDelete?: (id: string) => void;
  reason?: string;
}) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes_count ?? 0);
  const [saved, setSaved] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<{ id: string; body: string; user_id: string; created_at: string; author_name?: string }[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentCount, setCommentCount] = useState(post.comments_count ?? 0);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);
  const isAdmin = useIsAdmin();
  const [isFeatured, setIsFeatured] = useState(!!post.featured);
  const [featuring, setFeaturing] = useState(false);

  const toggleFeatured = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAdmin || featuring) return;
    setFeaturing(true);
    const next = !isFeatured;
    setIsFeatured(next);
    const { error } = await supabase.from("posts").update({ featured: next } as never).eq("id", post.id);
    setFeaturing(false);
    if (error) { setIsFeatured(!next); toast.error(error.message); return; }
    toast.success(next ? "Marked as featured" : "Removed from featured");
  };

  // Build unified media list. Prefer media_urls; fall back to legacy image_url / video_url.
  const mediaList: { url: string; kind: "image" | "video" }[] = (() => {
    const list: { url: string; kind: "image" | "video" }[] = [];
    const inferKind = (u: string): "image" | "video" =>
      /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u) ? "video" : "image";
    if (post.media_urls && post.media_urls.length) {
      for (const u of post.media_urls) list.push({ url: u, kind: inferKind(u) });
    } else {
      if (post.image_url) list.push({ url: post.image_url, kind: "image" });
      if (post.video_url) list.push({ url: post.video_url, kind: "video" });
    }
    return list;
  })();
  const current = mediaList[mediaIdx];
  const prevMedia = () => setMediaIdx((i) => (i - 1 + mediaList.length) % mediaList.length);
  const nextMedia = () => setMediaIdx((i) => (i + 1) % mediaList.length);

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    (async () => {
      const [likeRes, saveRes] = await Promise.all([
        supabase.from("post_likes").select("post_id").eq("post_id", post.id).eq("user_id", currentUserId).maybeSingle(),
        supabase.from("post_saves").select("post_id").eq("post_id", post.id).eq("user_id", currentUserId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (likeRes.data) setLiked(true);
      if (saveRes.data) setSaved(true);
    })();
    return () => { cancelled = true; };
  }, [currentUserId, post.id]);

  const toggleLike = async () => {
    if (!currentUserId) { toast.error("Sign in to like"); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((n) => n + (wasLiked ? -1 : 1));
    const res = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId)
      : await supabase.from("post_likes").insert({ post_id: post.id, user_id: currentUserId });
    if (res.error) {
      setLiked(wasLiked);
      setLikes((n) => n + (wasLiked ? 1 : -1));
    }
  };

  const share = () => setShareOpen(true);
  const postUrl = typeof window !== "undefined" ? `${window.location.origin}/posts/${post.id}` : `/posts/${post.id}`;
  const sendExternal = () => void externalShare(postUrl, post.content?.slice(0, 80) || "A post on Planet Baltimore");

  const toggleSave = async () => {
    if (!currentUserId) { toast.error("Sign in to save"); return; }
    const wasSaved = saved;
    setSaved(!wasSaved);
    const res = wasSaved
      ? await supabase.from("post_saves").delete().eq("post_id", post.id).eq("user_id", currentUserId)
      : await supabase.from("post_saves").insert({ post_id: post.id, user_id: currentUserId });
    if (res.error) { setSaved(wasSaved); toast.error(res.error.message); }
    else toast.success(wasSaved ? "Removed from saved" : "Saved");
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, body, user_id, created_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })
      .limit(100);
    const rows = data ?? [];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    let byId = new Map<string, { display_name: string | null; username: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      byId = new Map((profs ?? []).map((p: { id: string; display_name: string | null; username: string | null }) => [p.id, p]));
    }
    setComments(rows.map((r) => ({ ...r, author_name: byId.get(r.user_id)?.display_name || byId.get(r.user_id)?.username || "Someone" })));
  };

  const openComments = async () => {
    setCommentsOpen(true);
    await loadComments();
  };

  const submitComment = async () => {
    if (!currentUserId) { toast.error("Sign in to comment"); return; }
    const text = newComment.trim();
    if (!text) return;
    const { error } = await supabase.from("post_comments").insert({ post_id: post.id, user_id: currentUserId, body: text });
    if (error) { toast.error(error.message); return; }
    setNewComment("");
    setCommentCount((n) => n + 1);
    await loadComments();
  };

  const isMine = currentUserId && currentUserId === post.user_id;
  const authorName = post.author_name || "Someone";
  const initial = authorName.slice(0, 1).toUpperCase();

  return (
    <article className="overflow-hidden rounded-xl bg-card shadow-sm transition-all duration-200 hover:shadow-md">
      {reason && (
        <div className="px-5 pt-3">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> {reason}
          </span>
        </div>
      )}
      <header className="flex items-center gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
        <Link to="/u/$username" params={{ username: post.author_username || post.user_id }} className="shrink-0">
          <Avatar className="h-11 w-11 sm:h-12 sm:w-12">
            {post.author_avatar && <AvatarImage src={post.author_avatar} />}
            <AvatarFallback className="bg-muted text-sm text-muted-foreground">{initial}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground sm:text-base">
            <Link to="/u/$username" params={{ username: post.author_username || post.user_id }} className="truncate hover:text-[#d4580a]">
              {authorName}
            </Link>
            {post.is_founder && (
              <span title="Founding Member" className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                <Star className="h-3 w-3" strokeWidth={2} /> Founding Member
              </span>
            )}
            {isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-yellow-900">★ Featured</span>
            )}
          </div>
          <div className="text-[12px] text-muted-foreground sm:text-[13px]">
            {post.neighborhood_name || post.neighborhood || "Baltimore"} · {timeAgo(post.created_at)}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[120]">
            {isMine && (
              <DropdownMenuItem asChild>
                <Link to="/edit-post/$id" params={{ id: post.id }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </DropdownMenuItem>
            )}
            {isMine && onDelete && (
              <DropdownMenuItem
                className="text-destructive"
                onSelect={() => {
                  if (window.confirm("Delete this post? This can't be undone.")) onDelete(post.id);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
            {!isMine && (
              <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                <Flag className="mr-2 h-4 w-4" /> Report
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {current && (
        <div className="relative mt-3 w-full">
          {current.kind === "image" ? (
            <Link
              to="/posts/$postId"
              params={{ postId: post.id }}
              className="block w-full overflow-hidden focus:outline-none"
            >
              <img
                src={current.url}
                alt=""
                className="w-full cursor-pointer"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </Link>
          ) : (
            <video
              key={current.url}
              src={current.url}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[70vh] bg-black"
            />
          )}
          {mediaList.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); prevMedia(); }}
                aria-label="Previous"
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); nextMedia(); }}
                aria-label="Next"
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-black/40 px-2 py-1">
                {mediaList.map((_, i) => (
                  <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === mediaIdx ? "bg-white" : "bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {post.content && (
        (post.post_type === "text" && post.bg_color) ? (
          <Link
            to="/posts/$postId"
            params={{ postId: post.id }}
            className="mx-4 my-3 block rounded-2xl p-6 text-center text-lg font-medium whitespace-pre-wrap break-words sm:mx-6 sm:text-xl"
            style={{ background: post.bg_color, color: post.text_color || "#fff" }}
          >
            {post.content}
          </Link>
        ) : (
          <Link
            to="/posts/$postId"
            params={{ postId: post.id }}
            className="block px-4 py-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground hover:bg-accent/30 sm:px-6 sm:py-4 sm:text-[17px]"
          >
            {post.content}
          </Link>
        )
      )}
      {post.tag && (
        <div className="px-4 pb-2 sm:px-6">
          <span className="inline-flex items-center rounded-full bg-[#d4580a]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#d4580a]">
            #{post.tag}
          </span>
        </div>
      )}
      {post.music_url && (
        <div className="px-4 pb-3 sm:px-6">
          <a
            href={post.music_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-700 hover:border-orange-300"
          >
            🎵 Listen
          </a>
        </div>
      )}
      <footer className="flex items-center gap-5 px-4 py-3 text-sm text-muted-foreground sm:gap-7 sm:px-6 sm:py-4">
        <button onClick={toggleLike} className={`flex items-center gap-2 transition ${liked ? "text-[#d4580a]" : "hover:text-foreground"}`}>
          <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} /> {likes}
        </button>
        <button onClick={openComments} className="flex items-center gap-2 transition hover:text-foreground">
          <MessageCircle className="h-5 w-5" /> {commentCount}
        </button>
        <button onClick={share} className="flex items-center gap-2 transition hover:text-foreground" aria-label="Share in app">
          <Send className="h-5 w-5" />
        </button>
        <button onClick={sendExternal} className="flex items-center gap-2 transition hover:text-foreground" aria-label="Share outside the app" title="Share outside the app">
          <Share2 className="h-5 w-5" />
        </button>
        <button onClick={toggleSave} className={`ml-auto flex items-center transition ${saved ? "text-[#d4580a]" : "hover:text-foreground"}`} aria-label={saved ? "Unsave" : "Save"} title={saved ? "Unsave" : "Save"}>
          <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
        </button>
        {isAdmin && (
          <button onClick={toggleFeatured} disabled={featuring} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${isFeatured ? "border-yellow-500 bg-yellow-100 text-yellow-800" : "border-border hover:border-yellow-500 hover:text-yellow-700"}`} title={isFeatured ? "Unfeature" : "Feature"}>
            <Star className={`h-4 w-4 ${isFeatured ? "fill-yellow-500" : ""}`} /> {isFeatured ? "Featured" : "Feature"}
          </button>
        )}
      </footer>
      {lightbox && post.image_url && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={post.image_url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[95vh] max-w-[95vw] object-contain"
          />
        </div>
      )}
      {commentsOpen && (
        <div role="dialog" aria-modal="true" onClick={() => setCommentsOpen(false)} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <h3 className="text-sm font-semibold">Comments</h3>
              <button onClick={() => setCommentsOpen(false)} className="rounded p-1 text-neutral-500 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[50vh] space-y-3 overflow-y-auto py-3">
              {comments.length === 0 ? (
                <p className="text-sm text-neutral-500">No comments yet. Be the first.</p>
              ) : comments.map((c) => (
                <div key={c.id} className="text-sm">
                  <span className="font-semibold">{c.author_name}</span>{" "}
                  <span className="text-neutral-700">{c.body}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-neutral-100 pt-2">
              <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }} placeholder="Add a comment..." className="flex-1 rounded-full border border-neutral-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              <Button size="sm" onClick={submitComment} disabled={!newComment.trim()}>Post</Button>
            </div>
          </div>
        </div>
      )}
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} contentType="post" contentId={post.id} />
      <ShareToUsersDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={postUrl}
        title={post.content?.slice(0, 120) || "A post on Planet Baltimore"}
        preview={{
          type: "post",
          id: post.id,
          url: postUrl,
          title: post.content?.slice(0, 120) || null,
          excerpt: null,
          image: post.image_url || null,
          author: post.author_name || null,
        }}
      />
    </article>
  );
}