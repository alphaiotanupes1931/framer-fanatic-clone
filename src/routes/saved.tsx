import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bookmark, ImageIcon, Heart, MessageCircle, BookOpen, Ticket, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useEventImageUrl } from "@/components/event-image";

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

type SavedStory = {
  id: string;
  title: string | null;
  cover_url: string | null;
  excerpt: string | null;
  saved_at: string;
};

type SavedEvent = {
  id: string;
  title: string;
  image_url: string | null;
  location: string | null;
  starts_at: string | null;
  saved_at: string;
};

type Tab = "posts" | "stories" | "events";

function SavedPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/auth" }); return; }
      setMe(data.session.user.id);
      await loadAll(data.session.user.id);
    })();
  }, [navigate]);

  const loadAll = async (uid: string) => {
    setLoading(true);
    await Promise.all([loadPosts(uid), loadStories(uid), loadEvents(uid)]);
    setLoading(false);
  };

  const loadPosts = async (uid: string) => {
    const { data: saves } = await supabase
      .from("post_saves").select("post_id, created_at")
      .eq("user_id", uid).order("created_at", { ascending: false }).limit(120);
    const savedAt = new Map((saves || []).map((s: any) => [s.post_id, s.created_at]));
    const ids = Array.from(savedAt.keys());
    if (!ids.length) { setPosts([]); return; }
    const { data: ps } = await supabase.from("posts")
      .select("id, user_id, content, image_url, likes_count, comments_count, created_at").in("id", ids);
    const list = (ps || []) as SavedPost[];
    list.forEach((p) => { p.saved_at = savedAt.get(p.id) as string; });
    const authorIds = Array.from(new Set(list.map((p) => p.user_id)));
    if (authorIds.length) {
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: authorIds });
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      list.forEach((p) => { p.author = byId.get(p.user_id) as any; });
    }
    list.sort((a, b) => (a.saved_at < b.saved_at ? 1 : -1));
    setPosts(list);
  };

  const loadStories = async (uid: string) => {
    const { data: saves } = await supabase
      .from("story_saves").select("story_id, created_at")
      .eq("user_id", uid).order("created_at", { ascending: false }).limit(120);
    const savedAt = new Map((saves || []).map((s: any) => [s.story_id, s.created_at]));
    const ids = Array.from(savedAt.keys());
    if (!ids.length) { setStories([]); return; }
    const { data: ss, error } = await supabase.from("stories")
      .select("id, title, cover_url, excerpt").in("id", ids);
    if (error) {
      toast.error("Saved stories could not be loaded");
      setStories([]);
      return;
    }
    const list = ((ss || []) as any[]).map((s) => ({ ...s, saved_at: savedAt.get(s.id) as string })) as SavedStory[];
    list.sort((a, b) => (a.saved_at < b.saved_at ? 1 : -1));
    setStories(list);
  };

  const loadEvents = async (uid: string) => {
    const { data: saves } = await supabase
      .from("event_saves").select("event_id, created_at")
      .eq("user_id", uid).order("created_at", { ascending: false }).limit(120);
    const savedAt = new Map((saves || []).map((s: any) => [s.event_id, s.created_at]));
    const ids = Array.from(savedAt.keys());
    if (!ids.length) { setEvents([]); return; }
    const { data: es } = await supabase.from("events")
      .select("id, title, image_url, location, starts_at").in("id", ids);
    const list = ((es || []) as any[]).map((e) => ({ ...e, saved_at: savedAt.get(e.id) as string })) as SavedEvent[];
    list.sort((a, b) => (a.saved_at < b.saved_at ? 1 : -1));
    setEvents(list);
  };

  const unsavePost = async (id: string) => {
    if (!me) return;
    const prev = posts;
    setPosts((cur) => cur.filter((p) => p.id !== id));
    const { error } = await supabase.from("post_saves").delete().eq("post_id", id).eq("user_id", me);
    if (error) { toast.error(error.message); setPosts(prev); } else toast.success("Removed");
  };
  const unsaveStory = async (id: string) => {
    if (!me) return;
    const prev = stories;
    setStories((cur) => cur.filter((s) => s.id !== id));
    const { error } = await supabase.from("story_saves").delete().eq("story_id", id).eq("user_id", me);
    if (error) { toast.error(error.message); setStories(prev); } else toast.success("Removed");
  };
  const unsaveEvent = async (id: string) => {
    if (!me) return;
    const prev = events;
    setEvents((cur) => cur.filter((e) => e.id !== id));
    const { error } = await supabase.from("event_saves").delete().eq("event_id", id).eq("user_id", me);
    if (error) { toast.error(error.message); setEvents(prev); } else toast.success("Removed");
  };

  const tabs: { key: Tab; label: string; count: number; icon: typeof BookOpen }[] = [
    { key: "posts", label: "Posts", count: posts.length, icon: ImageIcon },
    { key: "stories", label: "Stories", count: stories.length, icon: BookOpen },
    { key: "events", label: "Events", count: events.length, icon: Ticket },
  ];

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <HeroBanner title="Saved" subtitle="Posts you've bookmarked across Planet Baltimore." />
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                  active ? "border-[#d4580a] text-[#d4580a]" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-[#d4580a]/10 text-[#d4580a]" : "bg-muted text-muted-foreground"}`}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : tab === "posts" ? (
          posts.length === 0 ? (
            <EmptyState icon={Bookmark} title="No saved posts" hint="Tap the bookmark on any post to save it here." cta="Browse the feed" to="/dashboard" />
          ) : (
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-1.5">
              {posts.map((p) => <SavedTile key={p.id} post={p} onUnsave={() => unsavePost(p.id)} />)}
            </div>
          )
        ) : tab === "stories" ? (
          stories.length === 0 ? (
            <EmptyState icon={BookOpen} title="No saved stories" hint="Tap the bookmark on any story to save it here." cta="Read stories" to="/stories" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {stories.map((s) => <StoryTile key={s.id} story={s} onUnsave={() => unsaveStory(s.id)} />)}
            </div>
          )
        ) : (
          events.length === 0 ? (
            <EmptyState icon={Ticket} title="No saved events" hint="Tap the bookmark on any event to save it here." cta="Browse events" to="/events" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {events.map((e) => <EventTile key={e.id} event={e} onUnsave={() => unsaveEvent(e.id)} />)}
            </div>
          )
        )}
      </div>
    </AppLayout>
  );
}

function EmptyState({ icon: Icon, title, hint, cta, to }: { icon: typeof Bookmark; title: string; hint: string; cta: string; to: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>
      <Link to={to} className="mt-5 inline-flex items-center rounded-full bg-orange px-5 py-2 text-sm font-medium text-white transition hover:brightness-110">
        {cta}
      </Link>
    </div>
  );
}

function StoryTile({ story, onUnsave }: { story: SavedStory; onUnsave: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md">
      <Link to="/stories/$storyId" params={{ storyId: story.id }} className="block">
        {story.cover_url ? (
          <img src={story.cover_url} alt="" loading="lazy" className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-orange/10 to-muted text-muted-foreground">
            <BookOpen className="h-8 w-8" />
          </div>
        )}
        <div className="p-3">
          <h4 className="line-clamp-2 text-sm font-semibold text-foreground">{story.title || "Untitled"}</h4>
          {story.excerpt && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{story.excerpt}</p>}
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); onUnsave(); }}
        aria-label="Remove from saved"
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground shadow transition hover:bg-white"
      >
        <Bookmark className="h-4 w-4 fill-current" />
      </button>
    </div>
  );
}

function EventTile({ event, onUnsave }: { event: SavedEvent; onUnsave: () => void }) {
  const when = event.starts_at ? new Date(event.starts_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;
  const resolvedImage = useEventImageUrl(event.image_url);
  const [imgOk, setImgOk] = useState(false);
  useEffect(() => {
    setImgOk(false);
    if (!resolvedImage) return;
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => { if (!cancelled) setImgOk(true); };
    probe.onerror = () => { if (!cancelled) setImgOk(false); };
    probe.src = resolvedImage;
    return () => { cancelled = true; };
  }, [resolvedImage]);
  const showImg = !!resolvedImage && imgOk;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md">
      <Link to="/events/$eventId" params={{ eventId: event.id }} className="block">
        {showImg ? (
          <img src={resolvedImage!} alt="" loading="lazy" onError={() => setImgOk(false)} className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-orange/10 to-muted text-muted-foreground">
            <Ticket className="h-8 w-8" />
          </div>
        )}
        <div className="p-3">
          <h4 className="line-clamp-1 text-sm font-semibold text-foreground">{event.title}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {when && <span className="inline-flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {when}</span>}
            {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>}
          </div>
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); onUnsave(); }}
        aria-label="Remove from saved"
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground shadow transition hover:bg-white"
      >
        <Bookmark className="h-4 w-4 fill-current" />
      </button>
    </div>
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