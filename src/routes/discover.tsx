import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { EventCard } from "@/components/shared/event-card";
import { StoryCard } from "@/components/shared/story-card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Sparkles, TrendingUp, Users, Building2, MapPin, BookOpen } from "lucide-react";

type EventRow = { id: string; title: string; description: string | null; image_url: string | null; starts_at: string; location: string | null; category?: string | null };
type Creator = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; neighborhood?: string | null; role?: string | null };
type Org = { id: string; name: string; slug: string; type: string; avatar_url: string | null; neighborhood: string | null };
type N = { id: string; name: string; region: string | null };
type StoryRow = { id: string; title: string; excerpt: string | null; cover_image_url: string | null; created_at: string; user_id: string; read_time_minutes: number | null; category: string | null };

const CATS = ["All", "Events", "Artists", "Communities", "Businesses", "Stories", "Neighborhoods"] as const;
type Cat = (typeof CATS)[number];

function DiscoverPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Cat>("All");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [artists, setArtists] = useState<Creator[]>([]);
  const [groups, setGroups] = useState<Org[]>([]);
  const [businesses, setBusinesses] = useState<Org[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<N[]>([]);
  const [stories, setStories] = useState<StoryRow[]>([]);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const [evUp, evPast, ar, gr, bu, ne, st] = await Promise.all([
        supabase.from("events").select("id,title,description,image_url,starts_at,location,venue_name").gte("starts_at", nowIso).order("starts_at", { ascending: true }).limit(8),
        supabase.from("events").select("id,title,description,image_url,starts_at,location,venue_name").lt("starts_at", nowIso).order("starts_at", { ascending: false }).limit(8),
        supabase.rpc("public_creators", { lim: 12 }),
        supabase.from("organizations").select("id,name,slug,type,avatar_url,neighborhood").eq("type", "group").limit(8),
        supabase.from("organizations").select("id,name,slug,type,avatar_url,neighborhood").eq("type", "business").limit(8),
        supabase.from("neighborhoods").select("id,name,region").order("name").limit(24),
        supabase.from("stories").select("id,title,excerpt,cover_image_url,created_at,user_id,read_time_minutes,category").eq("status", "published").order("created_at", { ascending: false }).limit(8),
      ]);
      const up = (evUp.data ?? []) as EventRow[];
      const past = (evPast.data ?? []) as EventRow[];
      setEvents([...up, ...past].slice(0, 8));
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
  const fEvents = events.filter(filterName);
  const fArtists = artists.filter(filterName);
  const fGroups = groups.filter(filterName);
  const fBiz = businesses.filter(filterName);
  const fNbh = neighborhoods.filter(filterName);
  const fStories = stories.filter(filterName);

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
             <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {fEvents.slice(0, 4).map((e) => <EventCard key={e.id} event={{ ...e, venue_name: e.location }} />)}
            </div>
          </section>
        )}

        {show("Artists") && fArtists.length > 0 && (
          <section>
            <SectionHead icon={Sparkles} title="Artists to Follow" to="/artists" />
             <div className="mx-auto flex max-w-2xl flex-col gap-3">
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

        {show("Communities") && fGroups.length > 0 && (
          <section>
            <SectionHead icon={Users} title="Communities" to="/groups" />
             <div className="mx-auto flex max-w-2xl flex-col gap-3">
              {fGroups.slice(0, 6).map((g) => <OrgRow key={g.id} o={g} />)}
            </div>
          </section>
        )}

        {show("Businesses") && fBiz.length > 0 && (
          <section>
            <SectionHead icon={Building2} title="Businesses" to="/businesses" />
             <div className="mx-auto flex max-w-2xl flex-col gap-3">
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

        {show("Stories") && fStories.length > 0 && (
          <section>
            <SectionHead icon={BookOpen} title="Trending Stories" to="/stories" />
             <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {fStories.slice(0, 4).map((s) => <StoryCard key={s.id} story={s as never} />)}
            </div>
          </section>
        )}

        {show("Neighborhoods") && fNbh.length > 0 && (
          <section>
            <SectionHead icon={MapPin} title="Neighborhoods" to="/neighborhoods" />
             <div className="mx-auto flex max-w-2xl flex-col gap-3">
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
