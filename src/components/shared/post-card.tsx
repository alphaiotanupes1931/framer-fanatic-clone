import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Bookmark, Star, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { X } from "lucide-react";

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  video_url?: string | null;
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

  const share = async () => {
    const url = `${window.location.origin}/dashboard#post-${post.id}`;
    try {
      if (navigator.share) await navigator.share({ url, title: "Planet Baltimore" });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* cancelled */ }
  };

  const toggleSave = () => {
    setSaved((s) => {
      toast.success(s ? "Removed from saved" : "Saved");
      return !s;
    });
  };

  const openComments = () => {
    toast("Comments coming soon");
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
          </div>
          <div className="text-[12px] text-muted-foreground sm:text-[13px]">
            {post.neighborhood_name || post.neighborhood || "Baltimore"} · {format(new Date(post.created_at), "MMM d")}
          </div>
        </div>
        {isMine && onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(post.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      {post.content && (
        (post.post_type === "text" && post.bg_color) ? (
          <div
            className="mx-4 my-3 rounded-2xl p-6 text-center text-lg font-medium whitespace-pre-wrap break-words sm:mx-6 sm:text-xl"
            style={{ background: post.bg_color, color: post.text_color || "#fff" }}
          >
            {post.content}
          </div>
        ) : (
          <div className="px-4 py-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground sm:px-6 sm:py-4 sm:text-[17px]">{post.content}</div>
        )
      )}
      {post.image_url && (
        <button type="button" onClick={() => setLightbox(true)} className="block w-full overflow-hidden focus:outline-none">
          <img
            src={post.image_url}
            alt=""
            className="w-full cursor-zoom-in"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </button>
      )}
      {post.video_url && (
        <video
          src={post.video_url}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-[70vh] bg-black"
        />
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
          <MessageCircle className="h-5 w-5" /> {post.comments_count ?? 0}
        </button>
        <button onClick={share} className="flex items-center gap-2 transition hover:text-foreground">
          <Share2 className="h-5 w-5" />
        </button>
        <button onClick={toggleSave} className={`ml-auto flex items-center gap-2 transition ${saved ? "text-[#d4580a]" : "hover:text-foreground"}`} aria-label="Save">
          <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
        </button>
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
    </article>
  );
}