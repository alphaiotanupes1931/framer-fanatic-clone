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
      <header className="flex items-center gap-3 px-5 pt-3">
        <Link to="/u/$username" params={{ username: post.author_username || post.user_id }}>
          <Avatar className="h-10 w-10">
            {post.author_avatar && <AvatarImage src={post.author_avatar} />}
            <AvatarFallback className="bg-muted text-[11px] text-muted-foreground">{initial}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
            <Link to="/u/$username" params={{ username: post.author_username || post.user_id }} className="truncate hover:text-[#d4580a]">
              {authorName}
            </Link>
            {post.is_founder && (
              <span title="Founding Member" className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                <Star className="h-3 w-3" strokeWidth={2} /> Founding Member
              </span>
            )}
          </div>
          <div className="text-[12px] text-muted-foreground">
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
        <div className="px-5 py-3 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{post.content}</div>
      )}
      {post.image_url && (
        <button type="button" onClick={() => setLightbox(true)} className="block w-full overflow-hidden focus:outline-none">
          <img src={post.image_url} alt="" className="w-full cursor-zoom-in" loading="lazy" />
        </button>
      )}
      <footer className="flex items-center gap-6 px-5 py-3 text-[12.5px] text-muted-foreground">
        <button onClick={toggleLike} className={`flex items-center gap-1.5 transition ${liked ? "text-[#d4580a]" : "hover:text-foreground"}`}>
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {likes}
        </button>
        <button onClick={openComments} className="flex items-center gap-1.5 transition hover:text-foreground">
          <MessageCircle className="h-4 w-4" /> {post.comments_count ?? 0}
        </button>
        <button onClick={share} className="flex items-center gap-1.5 transition hover:text-foreground">
          <Share2 className="h-4 w-4" />
        </button>
        <button onClick={toggleSave} className={`ml-auto flex items-center gap-1.5 transition ${saved ? "text-[#d4580a]" : "hover:text-foreground"}`} aria-label="Save">
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
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