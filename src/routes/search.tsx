import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EventImage } from "@/components/event-image";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search as SearchIcon, MapPin, Calendar } from "lucide-react";
import { EmptyState, ListSkeleton } from "@/components/shared/empty-state";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  head: () => ({ meta: [{ title: "Search - Planet Baltimore" }] }),
});

type Person = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; neighborhood: string | null; role: string | null };
type Org = { id: string; name: string; slug: string; type: string; avatar_url: string | null; neighborhood: string | null };
type Ev = { id: string; title: string; starts_at: string; venue_name: string | null; image_url: string | null };
type PostLite = { id: string; content: string | null; image_url: string | null; user_id: string; created_at: string };

const TABS = ["All", "People", "Organizations", "Events", "Posts"] as const;
type Tab = (typeof TABS)[number];

function SearchPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [tab, setTab] = useState<Tab>("All");
  const [people, setPeople] = useState<Person[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [posts, setPosts] = useState<PostLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const hasQ = debounced.length > 0;
      const like = `%${debounced}%`;
      const [pplRes, orgRes, evRes, postRes] = await Promise.all([
        hasQ
          ? supabase.rpc("search_creators", { q: debounced, lim: 24 })
          : supabase.from("profiles").select("id,display_name,username,avatar_url,neighborhood,role").order("created_at", { ascending: false }).limit(24),
        hasQ
          ? supabase.from("organizations").select("id,name,slug,type,avatar_url,neighborhood").ilike("name", like).limit(24)
          : supabase.from("organizations").select("id,name,slug,type,avatar_url,neighborhood").order("created_at", { ascending: false }).limit(24),
        hasQ
          ? supabase.from("events").select("id,title,starts_at,venue_name,image_url").ilike("title", like).order("starts_at", { ascending: true }).limit(24)
          : supabase.from("events").select("id,title,starts_at,venue_name,image_url").order("starts_at", { ascending: true }).limit(24),
        hasQ
          ? supabase.from("posts").select("id,content,image_url,user_id,created_at").ilike("content", like).order("created_at", { ascending: false }).limit(24)
          : supabase.from("posts").select("id,content,image_url,user_id,created_at").order("created_at", { ascending: false }).limit(24),
      ]);
      if (cancelled) return;
      setPeople((pplRes.data ?? []) as Person[]);
      setOrgs((orgRes.data ?? []) as Org[]);
      setEvents((evRes.data ?? []) as Ev[]);
      setPosts((postRes.data ?? []) as PostLite[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [debounced]);

  const totals = useMemo(() => ({
    People: people.length, Organizations: orgs.length, Events: events.length, Posts: posts.length,
    All: people.length + orgs.length + events.length + posts.length,
  }), [people, orgs, events, posts]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <HeroBanner title="Search" subtitle="Find people, organizations, events, and posts across Baltimore." />

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Baltimore..."
            className="w-full rounded-2xl border-2 border-border bg-card py-4 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-orange focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                tab === t ? "border-orange bg-orange text-white" : "border-border bg-card text-foreground hover:bg-accent"
              }`}
            >
              {t}
              <span className={`text-xs ${tab === t ? "opacity-80" : "text-muted-foreground"}`}>{totals[t]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <ListSkeleton count={4} />
        ) : totals.All === 0 ? (
          <EmptyState icon={SearchIcon} title={debounced ? `No results for "${debounced}"` : "Nothing here yet"} description="Try another spelling or a different filter." />
        ) : (
          <div className="space-y-8">
            {(tab === "All" || tab === "People") && people.length > 0 && (
              <Section title="People">
                <div className="grid gap-3 sm:grid-cols-2">
                  {people.slice(0, tab === "All" ? 6 : 24).map((p) => (
                    <Link key={p.id} to="/u/$username" params={{ username: p.username || p.id }} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 hover:bg-accent">
                      <Avatar className="h-11 w-11 shrink-0">
                        {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                        <AvatarFallback>{(p.display_name || p.username || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{p.display_name || p.username}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {p.username && <span className="truncate">@{p.username}</span>}
                          {p.neighborhood && <span className="inline-flex items-center gap-0.5 whitespace-nowrap"><MapPin className="h-3 w-3" /> {p.neighborhood}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {(tab === "All" || tab === "Organizations") && orgs.length > 0 && (
              <Section title="Organizations">
                <div className="grid gap-3 sm:grid-cols-2">
                  {orgs.slice(0, tab === "All" ? 6 : 24).map((o) => (
                    <Link key={o.id} to="/o/$slug" params={{ slug: o.slug }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-accent">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {o.avatar_url && <img src={o.avatar_url} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{o.name}</div>
                        <div className="text-xs text-muted-foreground">{o.type.replace(/[_-]+/g, " ").split(" ").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ")}{o.neighborhood ? ` · ${o.neighborhood}` : ""}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {(tab === "All" || tab === "Events") && events.length > 0 && (
              <Section title="Events">
                <div className="grid gap-3 sm:grid-cols-2">
                  {events.slice(0, tab === "All" ? 6 : 24).map((e) => (
                    <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }} className="overflow-hidden rounded-xl border border-border bg-card hover:bg-accent">
                      {e.image_url && <EventImage src={e.image_url} alt="" className="h-32 w-full object-cover" />}
                      <div className="p-3">
                        <div className="text-sm font-semibold text-foreground line-clamp-1">{e.title}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" /> {new Date(e.starts_at).toLocaleDateString()}
                          {e.venue_name && <span className="truncate">· {e.venue_name}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {(tab === "All" || tab === "Posts") && posts.length > 0 && (
              <Section title="Posts">
                <div className="space-y-3">
                  {posts.slice(0, tab === "All" ? 4 : 24).map((p) => (
                    <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                      {p.content && <p className="text-sm text-foreground line-clamp-3">{p.content}</p>}
                      {p.image_url && <img src={p.image_url} alt="" className="mt-2 max-h-48 rounded-lg object-cover" />}
                      <div className="mt-2 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}