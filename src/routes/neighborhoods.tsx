import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { MapPin } from "lucide-react";
import { BaltimoreMap } from "@/components/baltimore-map";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

function NeighborhoodsPage() {
  const auth = useAuthState();
  const [list, setList] = useState<N[]>([]);
  const [selected, setSelected] = useState<N | null>(null);
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(false);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("neighborhoods").select("id, name, region").order("name");
    setList((data || []) as N[]);
  })(); }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoadingArtists(true);
    setArtists([]);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, bio, neighborhood")
        .eq("role", "artist")
        .ilike("neighborhood", selected.name);
      if (cancelled) return;
      setArtists((data || []) as ArtistRow[]);
      setLoadingArtists(false);
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
    <AppLayout title="Neighborhoods" subtitle="Explore Baltimore's communities - click a pin to discover what's happening nearby.">
      <div className="space-y-6">
        <BaltimoreMap onSelect={(n) => setSelected({ id: n.id, name: n.name, region: n.region })} />
        <div className="flex flex-wrap gap-3 text-xs text-neutral-600">
          {[
            ["North Baltimore","#f59e0b"],["South Baltimore","#ef4444"],
            ["East Baltimore","#10b981"],["West Baltimore","#6366f1"],
            ["Central Baltimore","#f97316"],
          ].map(([label,c]) => (
            <span key={label} className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
              {label}
            </span>
          ))}
        </div>

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500">All Neighborhoods</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((n) => (
              <button
                key={n.id}
                onClick={() => setSelected(n)}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-left transition hover:border-orange/50 hover:bg-orange/5"
              >
                <MapPin className="h-4 w-4 text-orange" />
                <div>
                  <div className="font-semibold">{n.name}</div>
                  <div className="text-xs text-neutral-500">{n.region}</div>
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
            <p className="text-xs text-neutral-500">{selected?.region} · Artists in this neighborhood</p>
          </DialogHeader>
          <div className="mt-2 max-h-[60vh] overflow-y-auto">
            {loadingArtists ? (
              <div className="py-8 text-center text-sm text-neutral-400">Loading…</div>
            ) : artists.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-neutral-500">
                No artists listed in {selected?.name} yet.
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {artists.map((a) => (
                  <li key={a.id}>
                    <Link
                      to="/profile"
                      onClick={() => setSelected(null)}
                      className="flex items-center gap-3 px-1 py-3 transition hover:bg-neutral-50"
                    >
                      <Avatar className="h-10 w-10">
                        {a.avatar_url && <AvatarImage src={a.avatar_url} />}
                        <AvatarFallback className="bg-neutral-100 text-[11px] text-neutral-700">
                          {(a.display_name || a.username || "?").slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-neutral-900">
                          {a.display_name || a.username || "Unnamed artist"}
                        </div>
                        {a.bio && <div className="truncate text-xs text-neutral-500">{a.bio}</div>}
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