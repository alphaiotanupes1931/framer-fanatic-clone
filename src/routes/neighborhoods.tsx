import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { HeroBanner } from "@/components/shared/hero-banner";
import { MapPin, Calendar } from "lucide-react";
import { BaltimoreMap } from "@/components/baltimore-map";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EventImage } from "@/components/event-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/neighborhoods")({
  component: NeighborhoodsPage,
  head: () => ({ meta: [{ title: "Neighborhoods - Planet Baltimore" }] }),
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

function NeighborhoodsPage() {
  const auth = useAuthState();
  const navigate = useNavigate();
  const [list, setList] = useState<N[]>([]);
  const [selected, setSelected] = useState<N | null>(null);
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"artists" | "events">("artists");

  useEffect(() => { (async () => {
    const { data } = await supabase.from("neighborhoods").select("id, name, region").order("name");
    setList((data || []) as N[]);
  })(); }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);
    setArtists([]);
    setEvents([]);
    setTab("artists");
    (async () => {
      const [{ data: a }, { data: e }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url, bio, neighborhood")
          .eq("role", "artist")
          .ilike("neighborhood", selected.name),
        supabase
          .from("events")
          .select("id, title, description, location, image_url, starts_at, price_cents")
          .ilike("neighborhood", selected.name)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setArtists((a || []) as ArtistRow[]);
      setEvents((e || []) as EventRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selected]);

  if (auth.loading) return null;
  if (!auth.signedIn) {
    return (
      <PublicShell title="Neighborhoods" subtitle="Every corner of Baltimore - from Hampden to Highlandtown." signedIn={false}>
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
        <p className="text-xs text-muted-foreground">
          Tap a pin to see the event. Events without a mapped location won't appear here yet, edit the event to add coordinates.
        </p>

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">All Neighborhoods</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((n) => (
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-4 w-4 text-orange" />
              {selected?.name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{selected?.region}</p>
          </DialogHeader>
          <div className="mt-2 flex gap-2 border-b border-border">
            {[
              { key: "artists" as const, label: `Artists (${artists.length})` },
              { key: "events" as const, label: `Events (${events.length})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-sm font-medium transition ${
                  tab === t.key
                    ? "text-orange border-b-2 border-orange -mb-[1px]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="mt-2 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : tab === "artists" ? (
              artists.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  No artists listed in {selected?.name} yet.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {artists.map((a) => (
                    <li key={a.id}>
                      <Link
                        to="/profile"
                        onClick={() => setSelected(null)}
                        className="flex items-center gap-3 px-1 py-3 transition hover:bg-accent"
                      >
                        <Avatar className="h-10 w-10">
                          {a.avatar_url && <AvatarImage src={a.avatar_url} />}
                          <AvatarFallback className="bg-muted text-[11px] text-foreground">
                            {(a.display_name || a.username || "?").slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {a.display_name || a.username || "Unnamed Artist"}
                          </div>
                          {a.bio && <div className="truncate text-xs text-muted-foreground">{a.bio}</div>}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )
            ) : events.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                No upcoming events in {selected?.name} yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {events.map((ev) => (
                  <li key={ev.id}>
                    <Link
                      to="/events"
                      onClick={() => setSelected(null)}
                      className="flex items-start gap-3 px-1 py-3 transition hover:bg-accent"
                    >
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {ev.image_url ? (
                          <EventImage src={ev.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{ev.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(ev.starts_at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </div>
                        {ev.location && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {ev.location}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-xs font-semibold text-orange flex items-center gap-1">
                        {(ev.price_cents ?? 0) > 0 ? `$${((ev.price_cents ?? 0)/100).toFixed(2)}` : "Free"}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}