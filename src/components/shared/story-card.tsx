import { siteUrl } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ReportButton } from "@/components/shared/report-button";
import { Clock, Heart, MessageCircle, Bookmark, Trash2, Send, Star, MoreHorizontal, Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { stripHtml, timeAgo } from "@/lib/text-utils";
import { externalShare } from "@/lib/share-preview";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Img, SmartAvatarImage } from "@/components/shared/smart-img";

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
  author_username?: string | null;
  category?: string | null;
  created_at?: string | null;
  featured?: boolean | null;
  featured_at?: string | null;
};

export function StoryCard({ story, featured = false, currentUserId, isAdmin: isAdminProp, onDeleted, onPinnedChange }: { story: Story; featured?: boolean; currentUserId?: string; isAdmin?: boolean; onDeleted?: (id: string) => void; onPinnedChange?: (id: string, pinned: boolean, pinnedAt: string | null) => void }) {
  const detectedAdmin = useIsAdmin();
  const isAdmin = isAdminProp ?? detectedAdmin;
  const cleanExcerpt = stripHtml(story.excerpt);
  const authorHandle = story.author_username || null;
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(story.likes_count || 0);
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFeatured, setIsFeatured] = useState(!!story.featured);
  const [featuring, setFeaturing] = useState(false);
  const isOwner = !!currentUserId && !!story.user_id && currentUserId === story.user_id;
  const canDelete = isOwner || isAdmin;
  const storyUrl = siteUrl(`/stories/${story.id}`);

  const toggleFeatured = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAdmin || featuring) return;
    setFeaturing(true);
    const next = !isFeatured;
    const pinnedAt = next ? new Date().toISOString() : null;
    setIsFeatured(next);
    const { error } = await supabase.rpc("admin_toggle_content_pin", {
      _content_type: "story",
      _content_id: story.id,
      _pinned: next,
    });
    setFeaturing(false);
    if (error) { setIsFeatured(!next); toast.error(error.message); return; }
    onPinnedChange?.(story.id, next, pinnedAt);
    toast.success(next ? "Featured" : "Unfeatured");
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
  const handleDelete = async (e: { preventDefault: () => void; stopPropagation: () => void }) => {
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

  const ownerMenu = isOwner ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Story options"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[120]">
        <DropdownMenuItem asChild>
          <Link to="/edit-story/$id" params={{ id: story.id }}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onSelect={(event) => void handleDelete(event)}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <ReportButton contentType="story" contentId={story.id} className="shrink-0" />
  );

  if (featured) {
    return (
      <article className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-[1px] hover:shadow-sm active:translate-y-0">
        <div className="flex items-center gap-2 px-4 pt-3">
          <AuthorLink handle={authorHandle} className="flex min-w-0 items-center gap-2">
            <Avatar className="h-7 w-7">
              <SmartAvatarImage src={story.author_avatar ?? undefined} />
              <AvatarFallback className="bg-slate-100 text-[10px] font-bold text-slate-500">
                {story.author_name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs font-extrabold text-slate-800 hover:text-[#d4580a]">{story.author_name}</span>
          </AuthorLink>
          {story.category && <Badge variant="secondary" className="h-5 rounded-full border-0 bg-slate-100 px-2 text-[10px] font-bold capitalize leading-none text-slate-600 hover:bg-slate-100">{story.category}</Badge>}
          {isFeatured && <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-yellow-900">★ Featured</span>}
          {story.created_at && <span className={`${isOwner ? "mr-9" : "ml-auto"} text-[11px] text-slate-500`}>{timeAgo(story.created_at)}</span>}
        </div>
        <Link to="/stories/$storyId" params={{ storyId: story.id }} className="block">
        {story.cover_url && (
          <div className="relative mt-3 aspect-[16/7] overflow-hidden bg-muted">
            <Img src={story.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            {isAdmin && (
              <button onClick={toggleFeatured} disabled={featuring} className={`absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold shadow-md transition ${isFeatured ? "bg-white text-neutral-900 hover:bg-neutral-100" : "bg-yellow-400 text-yellow-900 hover:bg-yellow-300"}`}>
                <Star className={`h-3.5 w-3.5 ${isFeatured ? "" : "fill-yellow-900"}`} /> {isFeatured ? "Unfeature" : "Feature"}
              </button>
            )}
          </div>
        )}
        <div className="p-4">
          <h2 className="line-clamp-2 font-serif text-lg font-bold text-foreground transition-colors group-hover:text-[#d4580a] break-words">{story.title}</h2>
          {cleanExcerpt && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground break-words">{cleanExcerpt}</p>}
          <div className="mt-2 text-[11px] text-slate-500">
            {story.read_minutes || 5} min read
          </div>
        </div>
        </Link>
        <div className="absolute right-2 top-2 z-10 rounded-full bg-white/80 p-1">{ownerMenu}</div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-center gap-3 px-4 pt-3 sm:px-6 sm:pt-4">
        <AuthorLink handle={authorHandle} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0 sm:h-10 sm:w-10">
            <SmartAvatarImage src={story.author_avatar ?? undefined} />
            <AvatarFallback className="bg-muted text-xs text-muted-foreground">
              {story.author_name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
            <span className="truncate hover:text-[#d4580a]">{story.author_name || "Someone"}</span>
            {story.category && (
              <Badge variant="secondary" className="h-5 rounded-full border-0 bg-slate-100 px-2 text-[10px] font-bold capitalize leading-none text-slate-600 hover:bg-slate-100">
                {story.category}
              </Badge>
            )}
            {isFeatured && <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-yellow-900">★ Featured</span>}
          </div>
          <div className="text-[11px] text-muted-foreground sm:text-xs">
            {story.created_at ? timeAgo(story.created_at) : ""}
          </div>
          </div>
        </AuthorLink>
        {ownerMenu}
      </div>
      {story.cover_url && (
        <Link
          to="/stories/$storyId"
          params={{ storyId: story.id }}
          className="mt-2 block aspect-[16/7] w-full overflow-hidden bg-muted"
        >
          <Img
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
        className="flex flex-1 flex-col px-4 py-2.5 sm:px-6 sm:py-3"
      >
        <h3 className="line-clamp-2 font-serif text-base font-bold leading-snug text-foreground transition-colors group-hover:text-[#d4580a] break-words sm:text-[17px]">
          {story.title}
        </h3>
        {cleanExcerpt && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground break-words">
            {cleanExcerpt}
          </p>
        )}
      </Link>
      <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm text-muted-foreground sm:px-6 sm:py-3">
        <button onClick={toggleLike} className={`flex items-center gap-1.5 transition ${liked ? "text-[#d4580a]" : "hover:text-foreground"}`} aria-label="Like">
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {likes}
        </button>
        <Link
          to="/stories/$storyId"
          params={{ storyId: story.id }}
          hash="comments"
          className="flex items-center gap-1.5 transition hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4" /> {story.comments_count || 0}
        </Link>
        <span className="flex items-center gap-1.5 text-muted-foreground/80">
          <Clock className="h-4 w-4" />{story.read_minutes || 5}m
        </span>
        <button onClick={openShare} className="flex items-center transition hover:text-foreground" aria-label="Share" title="Share">
          <Send className="h-4 w-4 -rotate-45" />
        </button>
        <button onClick={toggleSave} className={`flex items-center transition ${saved ? "text-[#d4580a]" : "hover:text-foreground"}`} aria-label={saved ? "Unsave" : "Save"} title={saved ? "Unsave" : "Save"}>
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
        </button>
        {canDelete && (
          <button onClick={handleDelete} disabled={deleting} className="flex items-center text-red-600 transition hover:text-red-700 disabled:opacity-50" aria-label={isOwner ? "Delete" : "Admin delete"} title={isOwner ? "Delete" : "Admin delete"}>
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        {isAdmin && (
          <button onClick={toggleFeatured} disabled={featuring} className={`ml-auto flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition ${isFeatured ? "border-yellow-500 bg-yellow-100 text-yellow-800" : "border-border hover:border-yellow-500 hover:text-yellow-700"}`} title={isFeatured ? "Unfeature" : "Feature"}>
            <Star className={`h-3.5 w-3.5 ${isFeatured ? "fill-yellow-500" : ""}`} /> {isFeatured ? "Featured" : "Feature"}
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
function AuthorLink({ handle, className, children }: { handle: string | null; className?: string; children: React.ReactNode }) {
  if (!handle) return <div className={className}>{children}</div>;
  return (
    <Link
      to="/u/$username"
      params={{ username: handle }}
      className={className}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}
