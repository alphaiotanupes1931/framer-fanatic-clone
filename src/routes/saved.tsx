import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bookmark, ImageIcon, Heart, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/saved")({
  component: SavedPage,
  head: () => ({ meta: [{ title: "Planet Baltimore - Saved" }] }),
});

type SavedPost = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
  saved_at: string;
  author?: { display_name: string | null; username: string | null; avatar_url: string | null };
};

function SavedPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [items, setItems] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/auth" }); return; }
      setMe(data.session.user.id);
      await load(data.session.user.id);
    })();
  }, [navigate]);

  const load = async (uid: string) => {
    setLoading(true);
    const { data: saves, error } = await supabase
      .from("post_saves")
      .select("post_id, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(120);
    if (error) { toast.error(error.message); setLoading(false); return; }
    const savedAtById = new Map((saves || []).map((s) => [s.post_id, s.created_at]));
    const ids = Array.from(savedAtById.keys());
    if (!ids.length) { setItems([]); setLoading(false); return; }
    const { data: ps } = await supabase
      .from("posts")
      .select("id, user_id, content, image_url, likes_count, comments_count, created_at")
      .in("id", ids);
    const list = (ps || []) as SavedPost[];
    list.forEach((p) => { p.saved_at = savedAtById.get(p.id) as string; });
    const authorIds = Array.from(new Set(list.map((p) => p.user_id)));
    if (authorIds.length) {
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: authorIds });
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      list.forEach((p) => { p.author = byId.get(p.user_id) as any; });
    }
    list.sort((a, b) => (a.saved_at < b.saved_at ? 1 : -1));
    setItems(list);
    setLoading(false);
  };

  const unsave = async (postId: string) => {
    if (!me) return;
    const prev = items;
    setItems((cur) => cur.filter((p) => p.id !== postId));
    const { error } = await supabase.from("post_saves").delete().eq("post_id", postId).eq("user_id", me);
    if (error) { toast.error(error.message); setItems(prev); }
    else { toast.success("Removed from saved"); }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <HeroBanner title="Saved" subtitle="Posts you've bookmarked across Planet Baltimore." />
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted-foreground">
              <Bookmark className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Nothing saved yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Tap the bookmark icon on any post to save it here for later.
            </p>
            <Link
              to="/dashboard"
              className="mt-5 inline-flex items-center rounded-full bg-orange px-5 py-2 text-sm font-medium text-white transition hover:brightness-110"
            >
              Browse the feed
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-1.5">
            {items.map((p) => (
              <SavedTile key={p.id} post={p} onUnsave={() => unsave(p.id)} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function SavedTile({ post, onUnsave }: { post: SavedPost; onUnsave: () => void }) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-md bg-muted">
      {post.image_url ? (
        <img
          src={post.image_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-orange/10 via-background to-muted p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Text post</span>
          </div>
          <p className="line-clamp-6 text-[12.5px] leading-snug text-foreground">{post.content}</p>
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              {post.author?.avatar_url && <AvatarImage src={post.author.avatar_url} />}
              <AvatarFallback className="bg-muted text-[9px]">
                {(post.author?.display_name || post.author?.username || "U").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-[10.5px] text-muted-foreground">
              {post.author?.display_name || post.author?.username || "Anonymous"}
            </span>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-2.5 pb-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="flex items-center gap-3 text-[11px] font-semibold text-white">
          <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {post.likes_count ?? 0}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {post.comments_count ?? 0}</span>
        </div>
        <button
          onClick={onUnsave}
          aria-label="Remove from saved"
          className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-foreground transition hover:bg-white"
        >
          <Bookmark className="h-3.5 w-3.5 fill-current" />
        </button>
      </div>
      {post.author?.username && (
        <Link
          to="/u/$username"
          params={{ username: post.author.username }}
          className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/55 to-transparent px-2.5 py-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          <Avatar className="h-5 w-5">
            {post.author.avatar_url && <AvatarImage src={post.author.avatar_url} />}
            <AvatarFallback className="bg-muted text-[9px]">
              {(post.author.display_name || post.author.username || "U").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-[11px] font-medium text-white">
            {post.author.display_name || post.author.username}
          </span>
        </Link>
      )}
    </div>
  );
}