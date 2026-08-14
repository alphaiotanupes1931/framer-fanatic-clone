import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { HeroBanner } from "@/components/shared/hero-banner";
import { MapPin, Calendar, X, Building2, Users, Palette, Landmark, Search } from "lucide-react";
import { BaltimoreMap } from "@/components/baltimore-map";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EventImage } from "@/components/event-image";
import { SmartAvatarImage } from "@/components/shared/smart-img";
import { pageHead } from "@/lib/seo";
import { useCachedFetch } from "@/hooks/use-cached-fetch";

export const Route = createFileRoute("/neighborhoods")({
  component: NeighborhoodsPage,
  head: () => pageHead({ path: "/neighborhoods", title: "Baltimore Neighborhoods Guide | Planet Baltimore", description: "Explore Baltimore neighborhood by neighborhood: the people, events and businesses in each one." }),
});

type N = { id: string; name: string; region: string };
type ArtistRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  neighborhood: string | null;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  image_url: string | null;
  starts_at: string;
  price_cents: number | null;
};

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  subtype: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type TabKey = "events" | "businesses" | "groups" | "artists" | "arts_orgs" | "associations";

function NeighborhoodsPage() {
  const auth = useAuthState();
  const navigate = useNavigate();
  const { data: cachedList } = useCachedFetch<N[]>("neighborhoods:list", async () => {
    const { data } = await supabase.from("neighborhoods").select("id, name, region").order("name");
    return (data || []) as N[];
  });
  const list = cachedList ?? [];
  const [selected, setSelected] = useState<N | null>(null);
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabKey>("events");
  const [nq, setNq] = useState("");

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);
    setArtists([]);
    setEvents([]);
    setOrgs([]);
    setTab("events");
    (async () => {
      const [{ data: a }, { data: e }, { data: o }] = await Promise.all([
        (supabase as any)
          .from("profiles_public")
          .select("id, display_name, username, avatar_url, bio, neighborhood")
          .eq("role", "artist")
          .ilike("neighborhood", selected.name),
        supabase
          .from("events")
          .select("id, title, description, location, image_url, starts_at, price_cents")
          .ilike("neighborhood", selected.name)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true }),
        supabase
          .from("organizations")
          .select("id, name, slug, type, subtype, avatar_url, bio")
          .ilike("neighborhood", selected.name)
          .order("name"),
      ]);
      if (cancelled) return;
      setArtists((a || []) as ArtistRow[]);
      setEvents((e || []) as EventRow[]);
      setOrgs((o || []) as OrgRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selected]);

  if (auth.loading) return null;
  if (!auth.signedIn) {
    return (
      <PublicShell title="Neighborhoods" subtitle="Every corner of Baltimore, from Hampden to Highlandtown." signedIn={false}>
        <PreviewGrid
          items={list}
          unlockedCount={3}
          signedIn={false}
          thing="neighborhood"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
          render={(n) => (
            <div className="flex items-center gap-3 rounded-xl border border-paper/15 bg-paper/5 p-4 h-full">
              <MapPin className="w-4 h-4 text-paper/70" />
              <div>
                <div className="font-semibold text-sm">{(n as N).name}</div>
                <div className="text-xs text-paper/60">{(n as N).region}</div>
              </div>
            </div>
          )}
          emptyLabel="No neighborhoods yet."
        />
      </PublicShell>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <HeroBanner
          title="Neighborhoods"
          subtitle="Every upcoming event, pinned to where it's happening across Baltimore."
        />
        <BaltimoreMap
          onSelectEvent={(e) => navigate({ to: "/events/$eventId", params: { eventId: e.id } })}
          onSelectNeighborhood={(n) => setSelected({ id: n.id, name: n.name, region: n.region ?? "" })}
        />

        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
            onClick={() => setSelected(null)}
          >
            <div
              className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-background text-foreground shadow-2xl sm:max-h-[82vh] sm:w-full sm:max-w-lg sm:rounded-2xl lg:max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-border sm:hidden" />
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted sm:h-12 sm:w-12">
                  <MapPin className="h-5 w-5 text-muted-foreground sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold leading-tight text-foreground sm:text-xl">{selected.name}</div>
                  {selected.region && (
                    <span className="mt-1 inline-flex max-w-full items-center truncate rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground sm:px-2.5 sm:py-1 sm:text-xs">
                      {selected.region}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:h-10 sm:w-10"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain">
            {(() => {
              const businesses = orgs.filter((o) => o.type === "business");
              const groups = orgs.filter((o) => o.type === "group");
              const artsOrgs = orgs.filter((o) => o.type === "arts_org");
              const associations = orgs.filter((o) => o.type === "community_assoc");
              const tabs: { key: TabKey; label: string; count: number; Icon: any }[] = [
                { key: "events", label: "Events", count: events.length, Icon: Calendar },
                { key: "businesses", label: "Businesses", count: businesses.length, Icon: Building2 },
                { key: "groups", label: "Groups", count: groups.length, Icon: Users },
                { key: "artists", label: "Artists", count: artists.length, Icon: Palette },
                { key: "arts_orgs", label: "Arts Orgs", count: artsOrgs.length, Icon: Landmark },
                { key: "associations", label: "Associations", count: associations.length, Icon: Landmark },
              ];
              const activeOrgs =
                tab === "businesses" ? businesses :
                tab === "groups" ? groups :
                tab === "arts_orgs" ? artsOrgs :
                tab === "associations" ? associations : [];
              return (
                <div className="bg-card">
                  <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 sm:flex-wrap sm:px-5 sm:py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {tabs.map((t) => {
                      const active = tab === t.key;
                      const Icon = t.Icon;
                      return (
                        <button
                          key={t.key}
                          onClick={() => setTab(t.key)}
                          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-medium transition sm:px-3.5 sm:text-sm ${
                            active
                              ? "bg-orange/10 text-orange"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
                    {loading ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
                    ) : tab === "events" ? (
                      events.length === 0 ? (
                        <EmptyRow label={`No upcoming events in ${selected.name} yet.`} />
                      ) : (
                        <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 xl:grid-cols-3">
                          {events.map((ev) => (
                            <li key={ev.id}>
                              <Link to="/events/$eventId" params={{ eventId: ev.id }} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-accent/60">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                                  {ev.image_url ? <EventImage src={ev.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <Calendar className="h-5 w-5 text-muted-foreground" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-semibold text-foreground">{ev.title}</div>
                                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(ev.starts_at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                  </div>
                                </div>
                                <div className="shrink-0 text-xs font-semibold text-orange">
                                  {(ev.price_cents ?? 0) > 0 ? `$${((ev.price_cents ?? 0) / 100).toFixed(2)}` : "Free"}
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : tab === "artists" ? (
                      artists.length === 0 ? (
                        <EmptyRow label={`No artists listed in ${selected.name} yet.`} />
                      ) : (
                        <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 xl:grid-cols-3">
                          {artists.map((a) => (
                            <li key={a.id}>
                              <Link to="/u/$username" params={{ username: a.username || a.id }} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-accent/60">
                                <Avatar className="h-12 w-12 rounded-lg">
                                  {a.avatar_url && <SmartAvatarImage src={a.avatar_url} />}
                                  <AvatarFallback className="rounded-lg bg-muted text-xs text-foreground">{(a.display_name || a.username || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-[15px] font-semibold text-foreground">{a.display_name || a.username || "Unnamed Artist"}</div>
                                  {a.bio && <div className="truncate text-xs text-muted-foreground">{a.bio}</div>}
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : activeOrgs.length === 0 ? (
                      <EmptyRow label={`Nothing in ${selected.name} yet.`} />
                    ) : (
                      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 xl:grid-cols-3">
                        {activeOrgs.map((o) => (
                          <li key={o.id}>
                            <Link to="/o/$slug" params={{ slug: o.slug }} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-accent/60">
                              <Avatar className="h-12 w-12 rounded-lg">
                                {o.avatar_url && <SmartAvatarImage src={o.avatar_url} className="rounded-lg object-cover" />}
                                <AvatarFallback className="rounded-lg bg-muted text-xs text-foreground">{o.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[15px] font-semibold text-foreground">{o.name}</div>
                                {o.bio && <div className="truncate text-xs text-muted-foreground">{o.bio}</div>}
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })()}
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">All Neighborhoods</h2>
            <div className="relative ml-auto w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={nq}
                onChange={(e) => setNq(e.target.value)}
                placeholder="Search neighborhoods..."
                className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-orange focus:outline-none"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list
              .filter((n) => {
                const q = nq.trim().toLowerCase();
                if (!q) return true;
                return n.name.toLowerCase().includes(q) || (n.region || "").toLowerCase().includes(q);
              })
              .map((n) => (
              <button
                key={n.id}
                onClick={() => setSelected(n)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card text-card-foreground p-4 text-left transition hover:border-orange/50 hover:bg-orange/5"
              >
                <MapPin className="h-4 w-4 text-orange" />
                <div>
                  <div className="font-semibold">{n.name}</div>
                  <div className="text-xs text-muted-foreground">{n.region}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}