import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { EventCard } from "@/components/shared/event-card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Sparkles, TrendingUp, Users, Building2, MapPin, Heart, MessageCircle, MapPinned } from "lucide-react";

type EventRow = { id: string; title: string; description: string | null; image_url: string | null; starts_at: string; location: string | null; category?: string | null };
type Creator = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; neighborhood?: string | null; role?: string | null };
type Org = { id: string; name: string; slug: string; type: string; avatar_url: string | null; neighborhood: string | null };
type N = { id: string; name: string; region: string | null };
type PostRow = { id: string; user_id: string; content: string | null; image_url: string | null; likes_count: number | null; comments_count: number | null; neighborhood: string | null; created_at: string };
type FeedItem =
  | { kind: "event"; id: string; ts: string; data: EventRow }
  | { kind: "post"; id: string; ts: string; data: PostRow & { author?: Creator } };

const TABS = ["For You", "Following", "Nearby", "Discover"] as const;
type Tab = (typeof TABS)[number];

const CATS = ["All", "Events", "Artists", "Groups", "Businesses", "Neighborhoods"] as const;
type Cat = (typeof CATS)[number];

function DiscoverPage() {
  const [tab, setTab] = useState<Tab>("For You");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Cat>("All");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [posts, setPosts] = useState<(PostRow & { author?: Creator })[]>([]);
  const [userNeighborhood, setUserNeighborhood] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [artists, setArtists] = useState<Creator[]>([]);
  const [groups, setGroups] = useState<Org[]>([]);
  const [businesses, setBusinesses] = useState<Org[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<N[]>([]);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      const [evUp, evPast, po, ar, gr, bu, ne, prof, fol] = await Promise.all([
        supabase.from("events").select("id,title,description,image_url,starts_at,location,venue_name").gte("starts_at", nowIso).order("starts_at", { ascending: true }).limit(8),
        supabase.from("events").select("id,title,description,image_url,starts_at,location,venue_name").lt("starts_at", nowIso).order("starts_at", { ascending: false }).limit(8),
        supabase.from("posts").select("id,user_id,content,image_url,likes_count,comments_count,neighborhood,created_at").eq("is_deleted", false).order("created_at", { ascending: false }).limit(20),
        supabase.rpc("public_creators", { lim: 12 }),
        supabase.from("organizations").select("id,name,slug,type,avatar_url,neighborhood").eq("type", "group").limit(8),
        supabase.from("organizations").select("id,name,slug,type,avatar_url,neighborhood").eq("type", "business").limit(8),
        supabase.from("neighborhoods").select("id,name,region").order("name").limit(24),
        user ? supabase.from("profiles").select("neighborhood").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null } as never),
        user ? supabase.from("follows").select("following_id").eq("follower_id", user.id) : Promise.resolve({ data: [] } as never),
      ]);
      const up = (evUp.data ?? []) as EventRow[];
      const past = (evPast.data ?? []) as EventRow[];
      setEvents([...up, ...past].slice(0, 8));

      const rawPosts = (po.data ?? []) as PostRow[];
      const userIds = Array.from(new Set(rawPosts.map((p) => p.user_id)));
      let authorMap: Record<string, Creator> = {};
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,display_name,username,avatar_url,neighborhood").in("id", userIds);
        authorMap = Object.fromEntries(((profs ?? []) as Creator[]).map((p) => [p.id, p]));
      }
      setPosts(rawPosts.map((p) => ({ ...p, author: authorMap[p.user_id] })));

      setArtists(((ar.data ?? []) as unknown) as Creator[]);
      setGroups(((gr.data ?? []) as unknown) as Org[]);
      setBusinesses(((bu.data ?? []) as unknown) as Org[]);
      setNeighborhoods(((ne.data ?? []) as unknown) as N[]);
      setUserNeighborhood((prof as { data?: { neighborhood?: string | null } | null })?.data?.neighborhood ?? null);
      setFollowingIds((((fol as { data?: { following_id: string }[] }).data) ?? []).map((f) => f.following_id));
    })();
  }, []);

  const s = q.toLowerCase();
  const filterName = <T extends { name?: string; title?: string; display_name?: string | null; username?: string | null }>(x: T) => {
    if (!s) return true;
    const n = (x.name || x.title || x.display_name || x.username || "").toLowerCase();
    return n.includes(s);
  };
  const fEvents = events.filter(filterName);
  const fArtists = artists.filter(filterName);
  const fGroups = groups.filter(filterName);
  const fBiz = businesses.filter(filterName);
  const fNbh = neighborhoods.filter(filterName);

  const show = (k: Cat) => cat === "All" || cat === k;

  // Build merged, time-sorted feed for the tabbed section
  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [
      ...events.map((e) => ({ kind: "event" as const, id: `e-${e.id}`, ts: e.starts_at, data: e })),
      ...posts.map((p) => ({ kind: "post" as const, id: `p-${p.id}`, ts: p.created_at, data: p })),
    ];
    let filtered = items;
    if (tab === "Following") {
      filtered = items.filter((it) => it.kind === "post" && followingIds.includes(it.data.user_id));
    } else if (tab === "Nearby") {
      if (!userNeighborhood) filtered = [];
      else filtered = items.filter((it) => {
        const n = it.kind === "event" ? it.data.location : it.data.neighborhood;
        return n && n.toLowerCase().includes(userNeighborhood.toLowerCase());
      });
    }
    return filtered.sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 30);
  }, [events, posts, tab, followingIds, userNeighborhood]);

  return (
    <AppLayout>
      <div className="space-y-8">
        <HeroBanner title="Discover Baltimore" subtitle="Find events, artists, communities, and stories across the city." />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events, artists, businesses..." className="pl-10 h-11 rounded-xl bg-secondary border-0" />
        </div>

        {/* Feed tabs */}
        <section>
          <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  tab === t ? "border-[#d4580a] text-[#d4580a]" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>{t}</button>
            ))}
          </div>

          {tab === "Nearby" && !userNeighborhood && (
            <div className="bg-secondary/60 border border-border rounded-xl p-4 mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MapPinned className="w-5 h-5 text-[#d4580a]" />
                <p className="text-sm">Add your neighborhood to see local content</p>
              </div>
              <Link to="/settings" className="text-sm font-semibold text-[#d4580a] hover:underline">Set up →</Link>
            </div>
          )}

          {tab === "Discover" && (
            <p className="text-sm text-muted-foreground mb-4">Broadening your world, content from across Baltimore you haven't seen yet.</p>
          )}

          {feed.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">
              {tab === "Following" ? "Follow people to see their posts here." : "Nothing to show yet."}
            </div>
          ) : (
            <div className="space-y-4">
              {feed.map((it) => it.kind === "event"
                ? <FeedEventCard key={it.id} e={it.data} />
                : <FeedPostCard key={it.id} p={it.data} />
              )}
            </div>
          )}
        </section>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                cat === c ? "bg-[#d4580a] text-white shadow-sm" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}>{c}</button>
          ))}
        </div>

        {show("Events") && fEvents.length > 0 && (
          <section>
            <SectionHead icon={TrendingUp} title="Trending Events" to="/events" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fEvents.slice(0, 4).map((e) => <EventCard key={e.id} event={{ ...e, venue_name: e.location }} />)}
            </div>
          </section>
        )}

        {show("Artists") && fArtists.length > 0 && (
          <section>
            <SectionHead icon={Sparkles} title="Artists to Follow" to="/artists" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fArtists.slice(0, 6).map((a) => (
                <Link key={a.id} to="/u/$username" params={{ username: a.username || a.id }}
                  className="bg-card border border-border rounded-xl p-4 text-center hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 group">
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarImage src={a.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-[#d4580a]/10 text-[#d4580a] font-bold">{(a.display_name || a.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-semibold truncate group-hover:text-[#d4580a] transition-colors">{a.display_name || a.username}</p>
                  {a.neighborhood && <p className="text-xs text-muted-foreground truncate">{a.neighborhood}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {show("Groups") && fGroups.length > 0 && (
          <section>
            <SectionHead icon={Users} title="Communities" to="/groups" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fGroups.slice(0, 6).map((g) => <OrgRow key={g.id} o={g} />)}
            </div>
          </section>
        )}

        {show("Businesses") && fBiz.length > 0 && (
          <section>
            <SectionHead icon={Building2} title="Businesses" to="/businesses" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fBiz.slice(0, 6).map((b) => (
                <Link key={b.id} to="/o/$slug" params={{ slug: b.slug }}
                  className="bg-card border border-border rounded-xl p-4 text-center hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 group">
                  <Avatar className="w-14 h-14 mx-auto mb-2 rounded-xl">
                    <AvatarImage src={b.avatar_url ?? undefined} className="rounded-xl" />
                    <AvatarFallback className="rounded-xl bg-[#d4580a]/10 text-[#d4580a] font-bold">{b.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-semibold truncate group-hover:text-[#d4580a] transition-colors">{b.name}</p>
                  {b.neighborhood && <p className="text-xs text-muted-foreground truncate">{b.neighborhood}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {show("Neighborhoods") && fNbh.length > 0 && (
          <section>
            <SectionHead icon={MapPin} title="Neighborhoods" to="/neighborhoods" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {fNbh.slice(0, 12).map((n) => (
                <Link key={n.id} to="/neighborhoods"
                  className="bg-card border border-border rounded-xl p-3 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 group">
                  <p className="text-sm font-semibold truncate group-hover:text-[#d4580a] transition-colors">{n.name}</p>
                  {n.region && <p className="text-xs text-muted-foreground truncate">{n.region}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}

function FeedEventCard({ e }: { e: EventRow }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#d4580a] bg-[#d4580a]/10 px-2 py-0.5 rounded-full">New to You</span>
        <span className="text-xs text-muted-foreground">Event</span>
      </div>
      <EventCard event={{ ...e, venue_name: e.location }} />
    </div>
  );
}

function FeedPostCard({ p }: { p: PostRow & { author?: Creator } }) {
  const name = p.author?.display_name || p.author?.username || "Someone";
  const when = new Date(p.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <article className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#d4580a] bg-[#d4580a]/10 px-2 py-0.5 rounded-full">New to You</span>
      </div>
      <div className="flex items-start gap-3">
        <Link to="/u/$username" params={{ username: p.author?.username || p.user_id }}>
          <Avatar className="w-11 h-11">
            <AvatarImage src={p.author?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[#d4580a]/10 text-[#d4580a] font-bold">{name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/u/$username" params={{ username: p.author?.username || p.user_id }} className="font-semibold hover:underline truncate">{name}</Link>
            {p.neighborhood && <span className="text-muted-foreground truncate">{p.neighborhood}</span>}
            <span className="text-muted-foreground">· {when}</span>
          </div>
          {p.content && <p className="text-sm mt-1.5 whitespace-pre-wrap">{p.content}</p>}
          {p.image_url && (
            <div className="mt-3 rounded-lg overflow-hidden border border-border">
              <img src={p.image_url} alt="" className="w-full max-h-96 object-cover" loading="lazy" />
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{p.likes_count ?? 0}</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{p.comments_count ?? 0}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function OrgRow({ o }: { o: Org }) {
  return (
    <Link to="/o/$slug" params={{ slug: o.slug }}
      className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200">
      <Avatar className="w-12 h-12 rounded-xl flex-shrink-0">
        <AvatarImage src={o.avatar_url ?? undefined} className="rounded-xl" />
        <AvatarFallback className="rounded-xl bg-[#d4580a]/10 text-[#d4580a] font-bold">{o.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{o.name}</p>
        {o.neighborhood && <p className="text-xs text-muted-foreground truncate">{o.neighborhood}</p>}
      </div>
    </Link>
  );
}

function SectionHead({ icon: Icon, title, to }: { icon: typeof Sparkles; title: string; to: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold flex items-center gap-2"><Icon className="w-5 h-5" style={{ color: "#d4580a" }} />{title}</h2>
      <Link to={to} className="text-sm font-medium" style={{ color: "#d4580a" }}>See all</Link>
    </div>
  );
}

export const Route = createFileRoute("/discover")({
  component: DiscoverPage,
  head: () => ({ meta: [
    { title: "Discover Baltimore - Planet Baltimore" },
    { name: "description", content: "Find events, artists, communities, and stories across Baltimore." },
  ] }),
});
