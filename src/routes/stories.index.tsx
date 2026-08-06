import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { HeroBanner } from "@/components/shared/hero-banner";
import { StoryCard } from "@/components/shared/story-card";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Clock, Plus, X, Send, Loader2, Trash2, Share2, Bookmark, MoreHorizontal, Search } from "lucide-react";

import { toast } from "sonner";
import { stripHtml } from "@/lib/text-utils";
import { Img } from "@/components/shared/smart-img";
import { pageHead } from "@/lib/seo";
import { readCache, writeCache, hasCache } from "@/hooks/use-cached-fetch";

function storyCacheKey(o: { tab: string; sort: string; filter: string; storyFormat: string; search: string }) {
  return `stories:${o.tab}:${o.sort}:${o.filter}:${o.storyFormat}:${o.search}`;
}
const INITIAL_STORY_KEY = storyCacheKey({
  tab: "Discover",
  sort: "newest",
  filter: "All",
  storyFormat: "All Formats",
  search: "",
});

function StoryCover({ storyId, url }: { storyId: string; url: string | null }) {
  const [error, setError] = useState(false);
  if (!url || error) return null;
  return (
    <Link to="/stories/$storyId" params={{ storyId }} className="block">
      <Img
        src={url}
        alt=""
        className="aspect-[16/9] w-full rounded-xl object-cover bg-muted"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
      />
    </Link>
  );
}

export const Route = createFileRoute("/stories/")({
  component: StoriesPage,
  head: () => pageHead({ path: "/stories", title: "Baltimore Stories and Essays | Planet Baltimore", description: "Blogs, essays and photo stories written by Baltimore residents, artists and organizers." }),
});

type Story = {
  id: string; user_id: string; title: string; excerpt: string | null;
  cover_url: string | null; format: string; read_minutes: number | null;
  likes_count: number; comments_count: number; created_at: string;
  featured?: boolean; featured_at?: string | null;
  author?: { display_name: string | null; avatar_url: string | null; username: string | null; neighborhood: string | null; is_founder: boolean };
};

const STORY_FORMATS = [
  { value: "All Formats", label: "All Formats" },
  { value: "blog", label: "Blog" },
  { value: "essay", label: "Essay" },
  { value: "poetry", label: "Poetry" },
  { value: "review", label: "Review" },
  { value: "interview", label: "Interview" },
  { value: "resource", label: "Resource" },
  { value: "short story", label: "Short Story" },
  { value: "novel", label: "Novel" },
  { value: "novella", label: "Novella" },
  { value: "play", label: "Play" },
  { value: "screenplay", label: "Screenplay" },
  { value: "memoir", label: "Memoir" },
  { value: "flash fiction", label: "Flash Fiction" },
  { value: "spoken word", label: "Spoken Word" },
  { value: "journal", label: "Journal" },
] as const;
const FORMATS = ["All","poetry","blog","essay","resource"];
const TABS = ["Discover","Trending","Featured"] as const;
const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "most_liked", label: "Most liked" },
  { key: "most_commented", label: "Most commented" },
  { key: "quickest_read", label: "Quickest read" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];


type Comment = {
  id: string; user_id: string; body: string; created_at: string;
  author?: { display_name: string | null; avatar_url: string | null };
};

function CommentsDialog({ story, onClose, onCountChange }: { story: Story; onClose: () => void; onCountChange: (n: number) => void }) {
  const me = useCurrentProfile();
  const [items, setItems] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("story_comments")
      .select("*").eq("story_id", story.id).order("created_at", { ascending: true });
    const list = (data || []) as Comment[];
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      list.forEach((c) => { c.author = byId.get(c.user_id) as any; });
    }
    setItems(list); setLoading(false); onCountChange(list.length);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [story.id]);

  const send = async () => {
    if (!me || !text.trim()) return;
    setSending(true);
    const body = text.trim();
    setText("");
    const optimistic: Comment = { id: `temp-${Date.now()}`, story_id: story.id, user_id: me.id, body, created_at: new Date().toISOString(), author: { display_name: me.display_name, avatar_url: me.avatar_url } } as Comment;
    setItems((cur) => [...cur, optimistic]);
    onCountChange(items.length + 1);
    const { error } = await supabase.from("story_comments").insert({ story_id: story.id, user_id: me.id, body });
    setSending(false);
    if (error) { toast.error(error.message); setItems((cur) => cur.filter((c) => c.id !== optimistic.id)); setText(body); return; }
    load();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-background text-foreground shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Comments</div>
            <div className="truncate font-semibold">{story.title}</div>
          </div>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No comments yet. Be the first.</div>
          ) : items.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                {c.author?.avatar_url && <Img src={c.author.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />}
                <AvatarFallback className="bg-orange-100 text-xs text-orange-700">{(c.author?.display_name || "U")[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{c.author?.display_name || "Anonymous"}</div>
                <div className="text-sm text-muted-foreground">{c.body}</div>
              </div>
            </div>
          ))}
        </div>
        {me ? (
          <div className="flex gap-2 border-t p-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Add a comment…"
              className="flex-1 rounded-full border bg-transparent px-4 py-2 text-sm"
            />
            <button onClick={send} disabled={sending || !text.trim()} className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="border-t p-3 text-center text-sm text-muted-foreground">Sign in to comment.</div>
        )}
      </div>
    </div>
  );
}

function StoriesPage() {
  const auth = useAuthState();
  if (auth.loading) return null;
  if (!auth.signedIn) return <AnonStories />;
  return <StoriesSignedIn />;
}

function AnonStories() {
  const [list, setList] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("stories")
        .select("id, user_id, title, excerpt, cover_url, format, read_minutes, likes_count, comments_count, created_at")
        .order("created_at", { ascending: false }).limit(24);
      setList((data || []) as Story[]); setLoading(false);
    })();
  }, []);
  return (
    <PublicShell title="Stories" subtitle="Poetry, essays, blogs and resources from Baltimore's writing community." signedIn={false}>
      {loading ? <div className="text-paper/60 text-sm">Loading…</div> :
        <PreviewGrid
          items={list}
          unlockedCount={1}
          signedIn={false}
          thing="story"
          render={(s) => (
            <article className="rounded-2xl border border-paper/10 bg-paper/5 p-5 h-full">
              <div className="text-[10px] font-bold uppercase tracking-wider text-paper/60">{(s as Story).format}</div>
              <h3 className="font-display text-lg font-bold mt-1">{(s as Story).title}</h3>
              {stripHtml((s as Story).excerpt) && <p className="text-sm text-paper/70 mt-2 line-clamp-3">{stripHtml((s as Story).excerpt)}</p>}
              <div className="mt-3 flex items-center gap-3 text-xs text-paper/60">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {(s as Story).read_minutes || 1} min</span>
                <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {(s as Story).likes_count}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {(s as Story).comments_count}</span>
              </div>
            </article>
          )}
          emptyLabel="No stories yet."
        />
      }
    </PublicShell>
  );
}

function StoriesSignedIn() {
  const me = useCurrentProfile();
  const { isAdmin } = useUserRole();
  const [stories, setStories] = useState<Story[]>(() => readCache<Story[]>(INITIAL_STORY_KEY) ?? []);
  const [filter, setFilter] = useState("All");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Discover");
  const [storyFormat, setStoryFormat] = useState<string>("All Formats");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [commentsFor, setCommentsFor] = useState<Story | null>(null);
  const [loading, setLoading] = useState(() => !hasCache(INITIAL_STORY_KEY));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState<SortKey>("newest");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(id);
  }, [searchInput]);
  const PAGE = 12;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const removeStory = async (s: Story) => {
    if (!me || s.user_id !== me.id) return;
    if (!confirm("Delete this story? This can't be undone.")) return;
    const prev = stories;
    setStories((cur) => cur.filter((x) => x.id !== s.id));
    const { error } = await supabase.from("stories").delete().eq("id", s.id);
    if (error) {
      toast.error(error.message);
      setStories(prev);
    } else {
      toast.success("Story deleted");
    }
  };

  const buildQuery = (from: number, to: number) => {
    let q = supabase.from("stories").select("*").range(from, to);
    if (tab === "Trending") {
      q = q.order("featured", { ascending: false, nullsFirst: false }).order("featured_at", { ascending: false, nullsFirst: false }).order("likes_count", { ascending: false });
    } else {
      switch (sort) {
        case "oldest": q = q.order("created_at", { ascending: true }); break;
        case "most_liked": q = q.order("likes_count", { ascending: false }); break;
        case "most_commented": q = q.order("comments_count", { ascending: false }); break;
        case "quickest_read": q = q.order("read_minutes", { ascending: true, nullsFirst: false }); break;
        default: q = q.order("created_at", { ascending: false });
      }
    }
    if (filter !== "All") q = q.eq("format", filter);
    if (storyFormat !== "All Formats") q = q.eq("format", storyFormat);
    if (tab === "Featured") q = q.eq("featured", true);
    if (search) q = q.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
    return q;
  };

  const hydrateAuthors = async (list: Story[]) => {
    const ids = Array.from(new Set(list.map((s) => s.user_id)));
    if (!ids.length) return list;
    const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
    const byId = new Map((profs || []).map((p: any) => [p.id, p]));
    list.forEach((s) => { s.author = byId.get(s.user_id) as any; });
    return list;
  };

  const load = async () => {
    const key = storyCacheKey({ tab, sort, filter, storyFormat, search });
    const cached = readCache<Story[]>(key);
    if (cached) {
      // Paint the previous result immediately, then refresh silently.
      setStories(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setHasMore(true);
    const { data } = await buildQuery(0, PAGE - 1);
    const list = await hydrateAuthors((data || []) as Story[]);
    writeCache(key, list);
    setStories(list);
    prefetchImageUrls(list.map((s) => s.cover_url));
    setHasMore(list.length === PAGE);
    if (me && list.length) {
      const { data: likes } = await supabase
        .from("story_likes").select("story_id")
        .eq("user_id", me.id)
        .in("story_id", list.map((s) => s.id));
      setLikedIds(new Set((likes || []).map((l: any) => l.story_id)));
    }
    setLoading(false);
  };

  const loadMore = async () => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    const from = stories.length;
    const { data } = await buildQuery(from, from + PAGE - 1);
    const list = await hydrateAuthors((data || []) as Story[]);
    prefetchImageUrls(list.map((s) => s.cover_url));
    setStories((cur) => {
      const seen = new Set(cur.map((x) => x.id));
      const dedup = list.filter((x) => !seen.has(x.id));
      return [...cur, ...dedup];
    });
    setHasMore(list.length === PAGE);
    setLoadingMore(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter, tab, storyFormat, sort, search, me?.id]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line
  }, [stories.length, hasMore, loadingMore, loading]);

  const toggleLike = async (s: Story) => {
    if (!me) { toast.error("Sign in to like"); return; }
    const liked = likedIds.has(s.id);
    // optimistic
    setLikedIds((prev) => {
      const n = new Set(prev);
      if (liked) n.delete(s.id); else n.add(s.id);
      return n;
    });
    setStories((prev) => prev.map((x) => x.id === s.id ? { ...x, likes_count: Math.max(0, (x.likes_count || 0) + (liked ? -1 : 1)) } : x));
    const res = liked
      ? await supabase.from("story_likes").delete().eq("story_id", s.id).eq("user_id", me.id)
      : await supabase.from("story_likes").insert({ story_id: s.id, user_id: me.id });
    if (res.error) {
      toast.error(res.error.message);
      await load();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <HeroBanner
          title="Stories"
          subtitle="Discover stories from Baltimore's writing community."
          cta={
            <Link
              to="/create-story"
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: "#d4580a", color: "#d4580a" }}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Write A Story</span>
            </Link>
          }
        />

        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">Browse by format</div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search stories by title or excerpt…"
              className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <div className="relative max-w-md">
            <select
              value={storyFormat}
              onChange={(e) => setStoryFormat(e.target.value)}
              className="w-full appearance-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-800 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              {STORY_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
              viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.24 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <div className="flex gap-4 border-b border-neutral-200">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`border-b-2 pb-2.5 text-sm font-semibold ${tab===t ? "border-orange-600 text-orange-600" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}>{t}</button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div />
          <label className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
            <span className="uppercase tracking-wider">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              disabled={tab === "Trending"}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
            >
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 pt-1 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl bg-card shadow-sm">
                <div className="flex items-center gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
                  <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted sm:h-12 sm:w-12" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                    <div className="h-2 w-1/4 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="mt-3 aspect-[16/9] w-full animate-pulse bg-muted" />
                <div className="space-y-2 px-4 py-3 sm:px-6 sm:py-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-orange-50 text-orange-600">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-base font-semibold text-neutral-800">No stories to show</div>
            <p className="max-w-sm text-sm text-neutral-500">Try a different format or filter, or share the first story in this category.</p>
            {me && (
              <Link to="/create-story" className="mt-1 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: "#d4580a" }}>
                <Plus className="mr-2 h-4 w-4" /> Write A Story
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 pt-1 sm:grid-cols-2 xl:grid-cols-3">
              {stories.map((s) => (
                <StoryCard
                  key={s.id}
                  currentUserId={me?.id}
                  isAdmin={isAdmin}
                  onDeleted={(id) => setStories((prev) => prev.filter((x) => x.id !== id))}
                  onPinnedChange={(id, pinned, pinnedAt) => setStories((prev) => [...prev.map((story) => story.id === id ? { ...story, featured: pinned, featured_at: pinnedAt } : story)].sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || +new Date(b.featured_at || b.created_at) - +new Date(a.featured_at || a.created_at)))}
                  story={{
                    id: s.id,
                    user_id: s.user_id,
                    title: s.title,
                    excerpt: s.excerpt,
                    cover_url: s.cover_url,
                    likes_count: s.likes_count,
                    comments_count: s.comments_count,
                    read_minutes: s.read_minutes,
                    author_name: s.author?.display_name || undefined,
                    author_avatar: s.author?.avatar_url || undefined,
                    category: s.format,
                    created_at: s.created_at,
                    featured: (s as any).featured,
                    featured_at: (s as any).featured_at,
                  }}
                />
              ))}
            </div>
            <div ref={sentinelRef} className="flex items-center justify-center py-6 text-sm text-neutral-500">
              {loadingMore ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading more…</span>
              ) : hasMore ? (
                <span className="opacity-0">.</span>
              ) : (
                <span>You're all caught up.</span>
              )}
            </div>
          </>
        )}
      </div>

      {commentsFor && (
        <CommentsDialog story={commentsFor} onClose={() => setCommentsFor(null)} onCountChange={(n: number) => {
          setStories((prev) => prev.map((x) => x.id === commentsFor.id ? { ...x, comments_count: n } : x));
        }} />
      )}
    </AppLayout>
  );
}