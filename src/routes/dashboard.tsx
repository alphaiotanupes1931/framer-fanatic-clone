import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { PostCard } from "@/components/shared/post-card";
import { StoryCard } from "@/components/shared/story-card";
import { EventCard } from "@/components/shared/event-card";
import { DiscoverCard } from "@/components/discovery/discover-card";
import { StoryBar } from "@/components/stories/story-bar";
import { OnboardingCard } from "@/components/onboarding-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, Compass, MapPin } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Post, Story, Event, Follow } from "@/lib/entities";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Planet Baltimore - Your feed" }] }),
});

const FILTERS = ["For You", "Following", "Nearby", "Discover"] as const;
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
  const [activeFilter, setActiveFilter] = useState<Filter>("For You");
  const [filterLoading, setFilterLoading] = useState(false);
  const [checked, setChecked] = useState(false);

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
    staleTime: 0,
  });

  const { data: stories = [], isLoading: loadingStories } = useQuery({
    queryKey: ["home-stories"],
    queryFn: () => Story.filter({ status: "published" }, "-created_at", 15),
    staleTime: 120000,
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["home-events"],
    queryFn: () => Event.filter({ status: "upcoming" }, "date", 15),
    staleTime: 120000,
  });

  const { data: follows = [], isLoading: loadingFollows } = useQuery({
    queryKey: ["follows", currentUser?.id],
    queryFn: () => Follow.listMine(currentUser!.id),
    enabled: !!currentUser?.id,
  });

  const handleDeletePost = async (postId: string) => {
    await Post.delete(postId);
    qc.invalidateQueries({ queryKey: ["home-posts"] });
  };

  const isLoading = loadingPosts || loadingStories || loadingEvents || (activeFilter === "Following" && loadingFollows);

  const feedItems = useMemo<FeedItem[]>(() => {
    const followedIds = new Set(follows.map((f: any) => f.target_id));
    const filteredPosts = (posts as any[]).filter((p) => !p.is_deleted);

    if (activeFilter === "For You") {
      const followedPosts = filteredPosts.filter((p) => followedIds.has(p.user_id));
      const otherPosts = filteredPosts.filter((p) => !followedIds.has(p.user_id));
      const followedEvents = (events as any[]).filter((e) => followedIds.has(e.user_id));
      const discoverEvents = (events as any[]).filter((e) => !followedIds.has(e.user_id));

      const followed: FeedItem[] = [
        ...followedPosts.map((p) => ({ type: "post" as const, date: p.created_at, data: p, reason: "Following" })),
        ...(stories as any[]).slice(0, 10).map((s) => ({ type: "story" as const, date: s.created_at, data: s })),
        ...followedEvents.map((e) => ({ type: "event" as const, date: e.created_at, data: e, reason: "From someone you follow" })),
      ].sort((a, b) => +new Date(b.date) - +new Date(a.date));

      const discover: FeedItem[] = [
        ...otherPosts.slice(0, 20).map((p) => ({ type: "post" as const, date: p.created_at, data: p, isNew: true })),
        ...discoverEvents.slice(0, 8).map((e) => ({ type: "event" as const, date: e.created_at, data: e, isNew: true })),
      ];

      const merged: FeedItem[] = [];
      let di = 0;
      followed.forEach((item, idx) => {
        merged.push(item);
        if ((idx + 1) % 3 === 0 && di < discover.length) merged.push(discover[di++]);
      });
      while (di < discover.length) merged.push(discover[di++]);
      return merged.slice(0, 50);
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
      const hood = currentUser?.neighborhood_names?.[0] || currentUser?.neighborhood;
      if (!hood) return [];
      const np = filteredPosts.filter((p) => p.neighborhood === hood);
      const ne = (events as any[]).filter((e) => e.neighborhood === hood);
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

  const isEmpty = !isLoading && feedItems.length === 0;
  const hoodPrimary = currentUser?.neighborhood_names?.[0] || currentUser?.neighborhood;

  if (!checked) return null;

  return (
    <AppLayout>
      <div className="space-y-5 overflow-x-hidden sm:space-y-7">
        {/* Hero Banner */}
        <div
          className="relative overflow-hidden rounded-2xl border-2 p-6 sm:p-10 lg:p-14"
          style={{ borderColor: "#d4580a", backgroundColor: "#fdf5ee" }}
        >
          <div className="relative z-10">
            <h1 className="mb-2 text-3xl font-bold sm:text-4xl lg:text-5xl" style={{ color: "#d4580a" }}>
              Planet Baltimore
            </h1>
            <p className="text-sm sm:text-base" style={{ color: "#d4580a" }}>
              Your city. Your community. Your feed.
            </p>
          </div>
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full" style={{ backgroundColor: "#f5d9c2", opacity: 0.6 }} />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full" style={{ backgroundColor: "#f5d9c2", opacity: 0.5 }} />
        </div>

        {/* Filters */}
        <div className="scrollbar-hide -mx-3 flex gap-2 overflow-x-auto px-3 pb-2 sm:-mx-4 sm:px-4">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => { setActiveFilter(filter); setFilterLoading(true); setTimeout(() => setFilterLoading(false), 400); }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 sm:px-4 sm:text-sm ${
                activeFilter === filter ? "bg-[#d4580a] text-white shadow-sm" : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              {filter === "Discover" && <Compass className="h-4 w-4 sm:h-5 sm:w-5" />}
              {filter}
            </button>
          ))}
        </div>

        <div className="border-b border-border" />

        {/* Neighborhood quick-filter */}
        {currentUser && !userLoading && (
          hoodPrimary ? (
            <button
              onClick={() => { setActiveFilter("Nearby"); setFilterLoading(true); setTimeout(() => setFilterLoading(false), 400); }}
              className={`flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm transition-all ${
                activeFilter === "Nearby"
                  ? "bg-[#d4580a] text-white"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>My Neighborhood: <span className="font-semibold text-foreground">{hoodPrimary}</span></span>
              {activeFilter !== "Nearby" && <span className="ml-auto text-xs">See local feed →</span>}
            </button>
          ) : (
            <Link
              to="/profile"
              className="flex w-full items-center gap-2 rounded-xl bg-secondary/60 px-4 py-3 text-sm text-muted-foreground transition-all hover:bg-secondary"
            >
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>Add your neighborhood to see local content</span>
              <span className="ml-auto text-xs">Set up →</span>
            </Link>
          )
        )}

        {/* Onboarding for zero-follow users */}
        {!loadingFollows && follows.length === 0 && <OnboardingCard />}

        {activeFilter === "Discover" && (
          <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs text-muted-foreground sm:p-4 sm:text-sm">
            <Sparkles className="h-4 w-4 flex-shrink-0 text-[#d4580a] sm:h-5 sm:w-5" />
            <span>Broadening your world, content from across Baltimore you haven't seen yet.</span>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-4 sm:space-y-5">
          {isLoading || filterLoading ? (
            <FeedSkeleton />
          ) : isEmpty ? (
            <div className="py-12 text-center sm:py-16">
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
            feedItems.map((item, idx) => {
              const inner = (() => {
                if (item.type === "post") return <PostCard post={item.data} currentUserId={currentUser?.id} onDelete={handleDeletePost} />;
                if (item.type === "story") return (
                  <div className="space-y-1.5">
                    <span className="inline-block rounded-full bg-[#d4580a]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#d4580a]">Story</span>
                    <StoryCard story={item.data} />
                  </div>
                );
                return (
                  <div className="space-y-1.5">
                    <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Event</span>
                    <EventCard event={item.data} />
                  </div>
                );
              })();

              if (item.isNew || item.reason) {
                return (
                  <DiscoverCard key={`${item.type}-${item.data.id}-${idx}`} isNew={item.isNew} reason={item.reason}>
                    {inner}
                  </DiscoverCard>
                );
              }
              return <div key={`${item.type}-${item.data.id}-${idx}`}>{inner}</div>;
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}