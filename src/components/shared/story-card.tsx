import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Heart, MessageCircle, Share2, Bookmark, Trash2, Send, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { stripHtml, timeAgo } from "@/lib/text-utils";
import { externalShare } from "@/lib/share-preview";
import { useIsAdmin } from "@/hooks/use-is-admin";

type Story = {
  id: string;
  user_id?: string;
  title: string;
  excerpt?: string | null;
  cover_url?: string | null;
  likes_count?: number | null;
  comments_count?: number | null;
  read_minutes?: number | null;
  author_name?: string;
  author_avatar?: string | null;
  category?: string | null;
  created_at?: string | null;
  featured?: boolean | null;
};

export function StoryCard({ story, featured = false, currentUserId, isAdmin: isAdminProp, onDeleted }: { story: Story; featured?: boolean; currentUserId?: string; isAdmin?: boolean; onDeleted?: (id: string) => void }) {
  const detectedAdmin = useIsAdmin();
  const isAdmin = isAdminProp ?? detectedAdmin;
  const cleanExcerpt = stripHtml(story.excerpt);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(story.likes_count || 0);
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFeatured, setIsFeatured] = useState(!!story.featured);
  const [featuring, setFeaturing] = useState(false);
  const isOwner = !!currentUserId && !!story.user_id && currentUserId === story.user_id;
  const canDelete = isOwner || isAdmin;
  const storyUrl = typeof window !== "undefined" ? `${window.location.origin}/stories/${story.id}` : `/stories/${story.id}`;

  const toggleFeatured = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAdmin || featuring) return;
    setFeaturing(true);
    const next = !isFeatured;
    setIsFeatured(next);
    const { error } = await supabase.from("stories").update({ featured: next }).eq("id", story.id);
    setFeaturing(false);
    if (error) { setIsFeatured(!next); toast.error(error.message); return; }
    toast.success(next ? "Marked as featured" : "Removed from featured");
  };

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    (async () => {
      const [likeRes, saveRes] = await Promise.all([
        supabase.from("story_likes").select("story_id").eq("story_id", story.id).eq("user_id", currentUserId).maybeSingle(),
        supabase.from("story_saves").select("story_id").eq("story_id", story.id).eq("user_id", currentUserId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (likeRes.data) setLiked(true);
      if (saveRes.data) setSaved(true);
    })();
    return () => { cancelled = true; };
  }, [currentUserId, story.id]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!currentUserId) { toast.error("Sign in to like"); return; }
    const was = liked;
    setLiked(!was); setLikes((n) => n + (was ? -1 : 1));
    const res = was
      ? await supabase.from("story_likes").delete().eq("story_id", story.id).eq("user_id", currentUserId)
      : await supabase.from("story_likes").insert({ story_id: story.id, user_id: currentUserId });
    if (res.error) { setLiked(was); setLikes((n) => n + (was ? 1 : -1)); toast.error(res.error.message); }
  };
  const openShare = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setShareOpen(true); };
  const sendExternal = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); void externalShare(storyUrl, story.title, cleanExcerpt || undefined); };
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!canDelete || deleting) return;
    const msg = isOwner ? "Delete this story? This can't be undone." : "Delete this story as admin? This can't be undone.";
    if (!confirm(msg)) return;
    setDeleting(true);
    const { error } = await supabase.from("stories").delete().eq("id", story.id);
    if (error) { setDeleting(false); toast.error(error.message); return; }
    toast.success("Story deleted");
    onDeleted?.(story.id);
  };
  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!currentUserId) { toast.error("Sign in to save"); return; }
    const was = saved;
    setSaved(!was);
    const res = was
      ? await supabase.from("story_saves").delete().eq("story_id", story.id).eq("user_id", currentUserId)
      : await supabase.from("story_saves").insert({ story_id: story.id, user_id: currentUserId });
    if (res.error) { setSaved(was); toast.error(res.error.message); }
    else toast.success(was ? "Removed from saved" : "Saved");
  };

  if (featured) {
    return (
      <Link to="/stories/$storyId" params={{ storyId: story.id }} className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-[1px] hover:shadow-sm active:translate-y-0">
        <div className="flex items-center gap-2 px-4 pt-3">
          <Avatar className="h-7 w-7">
            <AvatarImage src={story.author_avatar ?? undefined} />
            <AvatarFallback className="bg-slate-100 text-[10px] font-bold text-slate-500">
              {story.author_name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs font-extrabold text-slate-800">{story.author_name}</span>
          {story.category && <Badge variant="secondary" className="h-5 rounded-full border-0 bg-slate-100 px-2 text-[10px] font-bold capitalize leading-none text-slate-600 hover:bg-slate-100">{story.category}</Badge>}
          {isFeatured && <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-yellow-900">★ Featured</span>}
          {story.created_at && <span className="ml-auto text-[11px] text-slate-500">{timeAgo(story.created_at)}</span>}
        </div>
        {story.cover_url && (
          <div className="relative mt-3 aspect-[2/1] overflow-hidden bg-muted">
            <img src={story.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            {isAdmin && (
              <button onClick={toggleFeatured} disabled={featuring} className={`absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold shadow-md transition ${isFeatured ? "bg-white text-neutral-900 hover:bg-neutral-100" : "bg-yellow-400 text-yellow-900 hover:bg-yellow-300"}`}>
                <Star className={`h-3.5 w-3.5 ${isFeatured ? "" : "fill-yellow-900"}`} /> {isFeatured ? "Unfeature" : "Feature"}
              </button>
            )}
          </div>
        )}
        <div className="p-5">
          <h2 className="line-clamp-2 font-serif text-xl font-bold text-foreground transition-colors group-hover:text-[#d4580a] break-words">{story.title}</h2>
          {cleanExcerpt && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground break-words">{cleanExcerpt}</p>}
          <div className="mt-3 text-[11px] text-slate-500">
            {story.read_minutes || 5} min read
          </div>
        </div>
      </Link>
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-sm transition-all duration-200 hover:shadow-md">
      <Link
        to="/stories/$storyId"
        params={{ storyId: story.id }}
        className="flex items-center gap-3 px-4 pt-4 sm:px-6 sm:pt-5"
      >
        <Avatar className="h-11 w-11 shrink-0 sm:h-12 sm:w-12">
          <AvatarImage src={story.author_avatar ?? undefined} />
          <AvatarFallback className="bg-muted text-sm text-muted-foreground">
            {story.author_name?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground sm:text-base">
            <span className="truncate">{story.author_name || "Someone"}</span>
            {story.category && (
              <Badge variant="secondary" className="h-5 rounded-full border-0 bg-slate-100 px-2 text-[10px] font-bold capitalize leading-none text-slate-600 hover:bg-slate-100">
                {story.category}
              </Badge>
            )}
            {isFeatured && <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-yellow-900">★ Featured</span>}
          </div>
          <div className="text-[12px] text-muted-foreground sm:text-[13px]">
            {story.created_at ? timeAgo(story.created_at) : ""}
          </div>
        </div>
      </Link>
      {story.cover_url && (
        <Link
          to="/stories/$storyId"
          params={{ storyId: story.id }}
          className="mt-3 block aspect-[16/9] w-full overflow-hidden bg-muted"
        >
          <img
            src={story.cover_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </Link>
      )}
      <Link
        to="/stories/$storyId"
        params={{ storyId: story.id }}
        className="flex flex-1 flex-col px-4 py-3 sm:px-6 sm:py-4"
      >
        <h3 className="line-clamp-2 font-serif text-[17px] font-bold leading-snug text-foreground transition-colors group-hover:text-[#d4580a] break-words sm:text-lg">
          {story.title}
        </h3>
        {cleanExcerpt && (
          <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-muted-foreground break-words sm:text-[15px]">
            {cleanExcerpt}
          </p>
        )}
      </Link>
      <footer className="flex items-center gap-5 px-4 py-3 text-sm text-muted-foreground sm:gap-7 sm:px-6 sm:py-4">
        <button onClick={toggleLike} className={`flex items-center gap-2 transition ${liked ? "text-[#d4580a]" : "hover:text-foreground"}`} aria-label="Like">
          <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} /> {likes}
        </button>
        <Link
          to="/stories/$storyId"
          params={{ storyId: story.id }}
          hash="comments"
          className="flex items-center gap-2 transition hover:text-foreground"
        >
          <MessageCircle className="h-5 w-5" /> {story.comments_count || 0}
        </Link>
        <span className="flex items-center gap-2 text-muted-foreground/80">
          <Clock className="h-5 w-5" />{story.read_minutes || 5}m
        </span>
        <button onClick={openShare} className="ml-auto flex items-center gap-2 transition hover:text-foreground" aria-label="Share in app" title="Share in app">
          <Send className="h-5 w-5" />
        </button>
        <button onClick={sendExternal} className="flex items-center gap-2 transition hover:text-foreground" aria-label="Share outside the app" title="Share outside the app">
          <Share2 className="h-5 w-5" />
        </button>
        <button onClick={toggleSave} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${saved ? "border-[#d4580a] bg-[#d4580a]/10 text-[#d4580a]" : "border-border hover:border-[#d4580a] hover:text-[#d4580a]"}`} aria-label="Save">
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
          {saved ? "Saved" : "Save"}
        </button>
        {canDelete && (
          <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 text-red-600 transition hover:text-red-700 disabled:opacity-50" aria-label={isOwner ? "Delete" : "Admin delete"} title={isOwner ? "Delete" : "Admin delete"}>
            <Trash2 className="h-5 w-5" />
          </button>
        )}
        {isAdmin && (
          <button onClick={toggleFeatured} disabled={featuring} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${isFeatured ? "border-yellow-500 bg-yellow-100 text-yellow-800" : "border-border hover:border-yellow-500 hover:text-yellow-700"}`} title={isFeatured ? "Unfeature" : "Feature"}>
            <Star className={`h-4 w-4 ${isFeatured ? "fill-yellow-500" : ""}`} /> {isFeatured ? "Featured" : "Feature"}
          </button>
        )}
      </footer>
      <ShareToUsersDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={storyUrl}
        title={story.title}
        preview={{
          type: "story",
          id: story.id,
          url: storyUrl,
          title: story.title,
          excerpt: cleanExcerpt || null,
          image: story.cover_url || null,
          author: story.author_name || null,
        }}
      />
    </article>
  );
}