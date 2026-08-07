import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { PostCard } from "@/components/shared/post-card";
import { HeroBanner } from "@/components/shared/hero-banner";
import { StoryCard } from "@/components/shared/story-card";
import { EventCard } from "@/components/shared/event-card";
import { OnboardingCard } from "@/components/onboarding-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, Compass, MapPin, Loader2, Globe2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { prefetchImageUrls } from "@/components/smart-image";
import { Post, Story, Event, Follow } from "@/lib/entities";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Planet Baltimore - Your feed" }] }),
});

const FILTERS = ["On Planet", "Following", "Nearby", "Discover"] as const;
type Filter = (typeof FILTERS)[number];

type FeedItem =
  | { type: "post"; date: string; data: any; isNew?: boolean; reason?: string }
  | { type: "story"; date: string; data: any; isNew?: boolean; reason?: string }
  | { type: "event"; date: string; data: any; isNew?: boolean; reason?: string };

function shuffleSeed<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.abs((s * 1103515245 + 12345) % (i + 1));
    s = j;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function FeedSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ))}
    </>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user: currentUser, loading: userLoading } = useCurrentUser();
  const [activeFilter, setActiveFilter] = useState<Filter>("On Planet");
  const [checked, setChecked] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setVisibleCount(12); }, [activeFilter]);

  // Auth guard
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) navigate({ to: "/auth" });
      else setChecked(true);
    })();
  }, [navigate]);

  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["home-posts"],
    queryFn: () => Post.list("-created_at", 50),
    staleTime: 60_000,
  });

  const { data: stories = [], isLoading: loadingStories } = useQuery({
    queryKey: ["home-stories"],
    queryFn: () => Story.filter({ status: "published" }, "-created_at", 15),
    staleTime: 120000,
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["home-events"],
    queryFn: () => Event.upcoming(15),
    staleTime: 120000,
  });

  const { data: follows = [], isLoading: loadingFollows } = useQuery({
    queryKey: ["follows", currentUser?.id],
    queryFn: () => Follow.listMine(currentUser!.id),
    enabled: !!currentUser?.id,
    staleTime: 300_000,
  });

  const handleDeletePost = async (postId: string) => {
    // Optimistic: remove from cache immediately so it disappears from the feed.
    const prev = qc.getQueryData<any[]>(["home-posts"]);
    qc.setQueryData<any[]>(["home-posts"], (old = []) => old.filter((p: any) => p.id !== postId));
    try {
      await Post.delete(postId);
      qc.invalidateQueries({ queryKey: ["home-posts"] });
    } catch (e) {
      qc.setQueryData(["home-posts"], prev);
      throw e;
    }
  };

  const isLoading = loadingPosts || loadingStories || loadingEvents || (activeFilter === "Following" && loadingFollows);

  const feedItems = useMemo<FeedItem[]>(() => {
    const followedIds = new Set(follows.map((f: any) => f.target_id));
    const filteredPosts = (posts as any[]).filter((p) => !p.is_deleted);

    if (activeFilter === "On Planet") {
      // Reference site: stories lead the home feed, posts and events interleaved.
      // Order: story, story, post, story, post, event, story, post, ...
      const storyStream: FeedItem[] = (stories as any[])
        .slice(0, 20)
        .map((s) => ({
          type: "story" as const,
          date: s.created_at,
          data: s,
          reason: followedIds.has(s.user_id) ? "From someone you follow" : undefined,
          isNew: !followedIds.has(s.user_id) && !followedIds.size ? false : !followedIds.has(s.user_id),
        }));

      const postStream: FeedItem[] = filteredPosts
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 25)
        .map((p) => ({
          type: "post" as const,
          date: p.created_at,
          data: p,
          reason: followedIds.has(p.user_id) ? "Following" : undefined,
          isNew: !followedIds.has(p.user_id),
        }));

      const eventStream: FeedItem[] = (events as any[])
        .slice(0, 8)
        .map((e) => ({
          type: "event" as const,
          date: e.created_at,
          data: e,
          reason: followedIds.has(e.user_id) ? "From someone you follow" : undefined,
          isNew: !followedIds.has(e.user_id),
        }));

      // Strict newest -> oldest across all content types.
      const merged: FeedItem[] = [...storyStream, ...postStream, ...eventStream].sort(
        (a, b) => +new Date(b.date) - +new Date(a.date),
      );
      return merged.slice(0, 60);
    }

    if (activeFilter === "Following") {
      const fp = filteredPosts.filter((p) => followedIds.has(p.user_id));
      const fs = (stories as any[]).filter((s) => followedIds.has(s.user_id));
      const fe = (events as any[]).filter((e) => followedIds.has(e.user_id));
      return [
        ...fp.map((p) => ({ type: "post" as const, date: p.created_at, data: p })),
        ...fs.map((s) => ({ type: "story" as const, date: s.created_at, data: s })),
        ...fe.map((e) => ({ type: "event" as const, date: e.created_at, data: e })),
      ].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    }

    if (activeFilter === "Nearby") {
      const hoods = [
        ...(currentUser?.neighborhood_names ?? []),
        currentUser?.neighborhood,
      ]
        .filter(Boolean)
        .map((h) => String(h).trim().toLowerCase());
      if (hoods.length === 0) return [];
      const match = (h: string | null | undefined) =>
        !!h && hoods.includes(String(h).trim().toLowerCase());
      const np = filteredPosts.filter((p) => match(p.neighborhood));
      const ne = (events as any[]).filter((e) => match(e.neighborhood));
      return [
        ...np.map((p) => ({ type: "post" as const, date: p.created_at, data: p })),
        ...ne.map((e) => ({ type: "event" as const, date: e.created_at, data: e })),
      ].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    }

    // Discover
    const all: FeedItem[] = [
      ...filteredPosts.map((p) => ({ type: "post" as const, date: p.created_at, data: p, isNew: true })),
      ...(stories as any[]).map((s) => ({ type: "story" as const, date: s.created_at, data: s, isNew: true })),
      ...(events as any[]).map((e) => ({ type: "event" as const, date: e.created_at, data: e, isNew: true })),
    ];
    const dayOfYear = Math.floor(Date.now() / 86400000);
    return shuffleSeed(all, dayOfYear).slice(0, 40);
  }, [activeFilter, posts, stories, events, follows, currentUser]);

  const orderedFeedItems = useMemo(
    () => [...feedItems].sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [feedItems],
  );
  const isEmpty = !isLoading && orderedFeedItems.length === 0;
  const visibleItems = orderedFeedItems.slice(0, visibleCount);
  const hasMore = visibleCount < orderedFeedItems.length;

  // Warm the media for the next screenful while the user reads the current
  // one, so scrolling never waits on a signing round trip or image bytes.
  useEffect(() => {
    const upcoming = orderedFeedItems.slice(visibleCount, visibleCount + 12);
    const srcs: Array<string | null | undefined> = [];
    for (const item of upcoming) {
      const d: any = item.data;
      if (Array.isArray(d?.media_urls)) srcs.push(...d.media_urls.slice(0, 2));
      srcs.push(d?.image_url, d?.cover_image_url, d?.thumbnail_url, d?.avatar_url);
    }
    prefetchImageUrls(srcs.filter(Boolean));
  }, [orderedFeedItems, visibleCount]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((n) => Math.min(n + 12, feedItems.length));
      }
    }, { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, feedItems.length]);

  const rawHood = currentUser?.neighborhood_names?.[0] || currentUser?.neighborhood;
  const hoodPrimary = rawHood && rawHood.trim().length > 0 ? rawHood : null;

  if (!checked) return null;

  return (
    <AppLayout>
      <div className="w-full space-y-5 sm:space-y-[22px]">
        <HeroBanner
          title="Planet Baltimore"
          subtitle="Baltimore. Your community. Your feed."
        />

        {/* Filters */}
        <div className="scrollbar-hide flex flex-wrap gap-2 overflow-x-auto pb-5 pt-0">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 ${
                activeFilter === filter
                  ? "bg-[#d4580a] text-white"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:border-orange-300"
              }`}
            >
              {filter === "Discover" && <Compass className="h-4 w-4" />}
              {filter}
            </button>
          ))}
        </div>

        {activeFilter === "On Planet" && <OnboardingCard />}

        {activeFilter === "Discover" && (
          <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs text-muted-foreground sm:p-4 sm:text-sm">
            <Globe2 className="h-4 w-4 flex-shrink-0 text-[#d4580a] sm:h-5 sm:w-5" />
            <span>Broadening your world, content from across Baltimore you haven't seen yet.</span>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-5 pt-1">
          {isLoading ? (
            <FeedSkeleton />
          ) : isEmpty ? (
            <div className="py-12 text-center sm:py-16 col-span-full">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#d4580a]/10 sm:mb-6 sm:h-20 sm:w-20">
                {activeFilter === "Following" ? <Users className="h-7 w-7 text-[#d4580a] sm:h-9 sm:w-9" /> : activeFilter === "Nearby" ? <MapPin className="h-7 w-7 text-[#d4580a] sm:h-9 sm:w-9" /> : <span className="text-3xl sm:text-4xl">🏙️</span>}
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground sm:text-lg">
                {activeFilter === "Following"
                  ? "No activity from people you follow"
                  : activeFilter === "Nearby" && !hoodPrimary
                  ? "Set your neighborhood to see local content"
                  : activeFilter === "Nearby"
                  ? "No local content yet"
                  : "Your feed is quiet"}
              </h3>
              <p className="mb-6 text-xs text-muted-foreground sm:text-sm">
                {activeFilter === "Following"
                  ? "Follow artists, businesses, and organizations to see their updates here."
                  : activeFilter === "Nearby" && !hoodPrimary
                  ? "Add your neighborhood to your profile and we'll show you posts and events from your area."
                  : activeFilter === "Nearby"
                  ? "Be the first to post something in your neighborhood."
                  : "Explore Baltimore communities to fill your feed."}
              </p>
              {activeFilter === "Following" && (
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  <Link to="/artists"><Button variant="outline" size="sm" className="rounded-lg text-xs sm:text-sm">Browse Artists</Button></Link>
                  <Link to="/arts-orgs"><Button variant="outline" size="sm" className="rounded-lg text-xs sm:text-sm">Browse Orgs</Button></Link>
                  <Link to="/businesses"><Button variant="outline" size="sm" className="rounded-lg text-xs sm:text-sm">Browse Businesses</Button></Link>
                </div>
              )}
              {activeFilter === "Nearby" && !hoodPrimary && (
                <Link to="/profile">
                  <Button size="sm" className="rounded-lg text-xs sm:text-sm" style={{ backgroundColor: "#d4580a" }}>Set My Neighborhood</Button>
                </Link>
              )}
            </div>
          ) : (
            <>
            {visibleItems.map((item, idx) => {
              const inner = (() => {
                if (item.type === "post") return <PostCard post={item.data} currentUserId={currentUser?.id} onDelete={handleDeletePost} onPinnedChange={(id, pinned, pinnedAt) => qc.setQueryData<any[]>(["home-posts"], (old = []) => old.map((post) => post.id === id ? { ...post, featured: pinned, featured_at: pinnedAt } : post))} reason={item.reason} />;
                if (item.type === "story") return (
                  <div className="space-y-0">
                    <span className="relative left-3 top-1 z-10 inline-flex h-4 items-center rounded-t-md bg-slate-100 px-2 text-[9px] font-extrabold uppercase leading-none text-slate-500">Story</span>
                    <StoryCard story={item.data} currentUserId={currentUser?.id} onPinnedChange={(id, pinned, pinnedAt) => qc.setQueryData<any[]>(["home-stories"], (old = []) => old.map((story) => story.id === id ? { ...story, featured: pinned, featured_at: pinnedAt } : story))} />
                  </div>
                );
                return (
                  <div className="space-y-0">
                    <span className="relative left-3 top-1 z-10 inline-flex h-4 items-center rounded-t-md bg-slate-100 px-2 text-[9px] font-extrabold uppercase leading-none text-slate-500">Event</span>
                    <EventCard event={item.data} />
                  </div>
                );
              })();
              // content-visibility lets the browser skip layout/paint for cards
              // that are off-screen, the web equivalent of a recycling list.
              return (
                <div
                  key={`${item.type}-${item.data.id}-${idx}`}
                  style={idx > 3 ? { contentVisibility: "auto", containIntrinsicSize: "auto 520px" } : undefined}
                >
                  {inner}
                </div>
              );
            })}
            <div ref={sentinelRef} className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              {hasMore ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading more…</span>
              ) : (
                <span>You're all caught up.</span>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}