import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Bookmark, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

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

export function PostCard({ post, currentUserId, onDelete }: {
  post: Post;
  currentUserId?: string;
  onDelete?: (id: string) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes_count ?? 0);

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

  const isMine = currentUserId && currentUserId === post.user_id;
  const authorName = post.author_name || "Someone";
  const initial = authorName.slice(0, 1).toUpperCase();

  return (
    <article className="rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-border/80 hover:shadow-sm">
      <header className="flex items-center gap-3">
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
      <div className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{post.content}</div>
      {post.image_url && (
        <div className="mt-3 overflow-hidden rounded-lg">
          <img src={post.image_url} alt="" className="w-full" loading="lazy" />
        </div>
      )}
      <footer className="mt-3 flex items-center gap-6 pt-3 text-[12.5px] text-muted-foreground">
        <button onClick={toggleLike} className={`flex items-center gap-1.5 transition ${liked ? "text-[#d4580a]" : "hover:text-foreground"}`}>
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {likes}
        </button>
        <button className="flex items-center gap-1.5 transition hover:text-foreground">
          <MessageCircle className="h-4 w-4" /> {post.comments_count ?? 0}
        </button>
        <button onClick={share} className="flex items-center gap-1.5 transition hover:text-foreground">
          <Share2 className="h-4 w-4" />
        </button>
        <button className="ml-auto flex items-center gap-1.5 transition hover:text-foreground" aria-label="Save">
          <Bookmark className="h-4 w-4" />
        </button>
      </footer>
    </article>
  );
}