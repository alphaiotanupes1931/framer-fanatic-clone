import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { EventCard } from "@/components/shared/event-card";
import { StoryCard } from "@/components/shared/story-card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Palette, TrendingUp, Users, Building2, MapPin, BookOpen } from "lucide-react";

type EventRow = { id: string; title: string; description: string | null; image_url: string | null; starts_at: string; location: string | null; category?: string | null };
type Creator = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; neighborhood?: string | null; role?: string | null };
type Org = { id: string; name: string; slug: string; type: string; avatar_url: string | null; neighborhood: string | null };
type N = { id: string; name: string; region: string | null };
type StoryRow = { id: string; title: string; excerpt: string | null; cover_image_url: string | null; created_at: string; user_id: string; read_time_minutes: number | null; category: string | null };

const CATS = ["All", "Events", "Artists", "Communities", "Businesses", "Stories", "Neighborhoods"] as const;
type Cat = (typeof CATS)[number];

// Deterministic shuffle that changes every 10 minutes so the discover
// page rotates its picks without being different on every render.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function DiscoverPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Cat>("All");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [artists, setArtists] = useState<Creator[]>([]);
  const [groups, setGroups] = useState<Org[]>([]);
  const [businesses, setBusinesses] = useState<Org[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<N[]>([]);
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [seed, setSeed] = useState(() => Math.floor(Date.now() / (10 * 60 * 1000)));

  useEffect(() => {
    const id = setInterval(() => {
      setSeed(Math.floor(Date.now() / (10 * 60 * 1000)));
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const [evUp, evPast, ar, gr, bu, ne, st] = await Promise.all([
        supabase.from("events").select("id,title,description,image_url,starts_at,location,venue_name").gte("starts_at", nowIso).order("starts_at", { ascending: true }).limit(40),
        supabase.from("events").select("id,title,description,image_url,starts_at,location,venue_name").lt("starts_at", nowIso).order("starts_at", { ascending: false }).limit(20),
        supabase.rpc("public_creators", { lim: 60 }),
        supabase.from("organizations").select("id,name,slug,type,avatar_url,neighborhood").eq("type", "group").limit(40),
        supabase.from("organizations").select("id,name,slug,type,avatar_url,neighborhood").eq("type", "business").limit(40),
        supabase.from("neighborhoods").select("id,name,region").order("name").limit(80),
        supabase.from("stories").select("id,title,excerpt,cover_image_url,created_at,user_id,read_time_minutes,category").eq("status", "published").order("created_at", { ascending: false }).limit(40),
      ]);
      const up = (evUp.data ?? []) as EventRow[];
      const past = (evPast.data ?? []) as EventRow[];
      setEvents([...up, ...past]);
      setArtists(((ar.data ?? []) as unknown) as Creator[]);
      setGroups(((gr.data ?? []) as unknown) as Org[]);
      setBusinesses(((bu.data ?? []) as unknown) as Org[]);
      setNeighborhoods(((ne.data ?? []) as unknown) as N[]);
      setStories(((st.data ?? []) as unknown) as StoryRow[]);
    })();
  }, []);

  const s = q.toLowerCase();
  const filterName = <T extends { name?: string; title?: string; display_name?: string | null; username?: string | null }>(x: T) => {
    if (!s) return true;
    const n = (x.name || x.title || x.display_name || x.username || "").toLowerCase();
    return n.includes(s);
  };
  const fEvents = seededShuffle(events.filter(filterName), seed);
  const fArtists = seededShuffle(artists.filter(filterName), seed + 1);
  const fGroups = seededShuffle(groups.filter(filterName), seed + 2);
  const fBiz = seededShuffle(businesses.filter(filterName), seed + 3);
  const fNbh = seededShuffle(neighborhoods.filter(filterName), seed + 4);
  const fStories = seededShuffle(stories.filter(filterName), seed + 5);

  const show = (k: Cat) => cat === "All" || cat === k;

  return (
    <AppLayout>
      <div className="space-y-8">
        <HeroBanner title="Discover Baltimore" subtitle="Find events, artists, communities, and stories across the city." />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events, artists, businesses..." className="pl-10 h-11 rounded-xl bg-secondary border-0" />
        </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fEvents.slice(0, 4).map((e) => <EventCard key={e.id} event={{ ...e, venue_name: e.location }} />)}
            </div>
          </section>
        )}

        {show("Artists") && fArtists.length > 0 && (
          <section>
            <SectionHead icon={Palette} title="Artists to Follow" to="/artists" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {fArtists.slice(0, 6).map((a) => (
                <Link key={a.id} to="/u/$username" params={{ username: a.username || a.id }}
                  className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 group">
                  <Avatar className="w-20 h-20 mx-auto mb-3">
                    <AvatarImage src={a.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-[#d4580a]/10 text-[#d4580a] font-bold">{(a.display_name || a.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="font-semibold truncate group-hover:text-[#d4580a] transition-colors">{a.display_name || a.username}</p>
                  <p className="text-xs text-muted-foreground truncate capitalize">{a.role || a.neighborhood || ""}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {show("Communities") && fGroups.length > 0 && (
          <section>
            <SectionHead icon={Users} title="Communities" to="/groups" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fGroups.slice(0, 6).map((g) => <OrgRow key={g.id} o={g} />)}
            </div>
          </section>
        )}

        {show("Businesses") && fBiz.length > 0 && (
          <section>
            <SectionHead icon={Building2} title="Businesses" to="/businesses" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {fBiz.slice(0, 6).map((b) => (
                <Link key={b.id} to="/o/$slug" params={{ slug: b.slug }}
                  className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 group">
                  <Avatar className="w-20 h-20 mx-auto mb-3 rounded-xl">
                    <AvatarImage src={b.avatar_url ?? undefined} className="rounded-xl" />
                    <AvatarFallback className="rounded-xl bg-[#d4580a]/10 text-[#d4580a] font-bold">{b.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="font-semibold truncate group-hover:text-[#d4580a] transition-colors">{b.name}</p>
                  <p className="text-xs text-muted-foreground truncate capitalize">{b.neighborhood || "Business"}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {show("Stories") && fStories.length > 0 && (
          <section>
            <SectionHead icon={BookOpen} title="Latest Stories" to="/stories" />
            <div className="flex flex-col gap-4">
              {fStories.slice(0, 4).map((s) => <StoryCard key={s.id} story={s as never} />)}
            </div>
          </section>
        )}

        {show("Neighborhoods") && fNbh.length > 0 && (
          <section>
            <SectionHead icon={MapPin} title="Neighborhoods" to="/neighborhoods" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {fNbh.slice(0, 12).map((n) => (
                <Link key={n.id} to="/neighborhoods"
                  className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 group">
                  <div className="h-24 bg-secondary flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <div className="p-3">
                    <p className="font-semibold truncate group-hover:text-[#d4580a] transition-colors">{n.name}</p>
                    {n.region && <p className="text-xs text-muted-foreground truncate">{n.region}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}

function OrgRow({ o }: { o: Org }) {
  return (
    <Link to="/o/$slug" params={{ slug: o.slug }}
      className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200">
      <Avatar className="w-14 h-14 rounded-xl flex-shrink-0">
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

function SectionHead({ icon: Icon, title, to }: { icon: typeof Palette; title: string; to: string }) {
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
