import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { MapPin } from "lucide-react";
import { BaltimoreMap } from "@/components/baltimore-map";

export const Route = createFileRoute("/neighborhoods")({
  component: NeighborhoodsPage,
  head: () => ({ meta: [{ title: "Neighborhoods — Planet Baltimore" }] }),
});

type N = { id: string; name: string; region: string };

function NeighborhoodsPage() {
  const auth = useAuthState();
  const [list, setList] = useState<N[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("neighborhoods").select("id, name, region").order("name");
    setList((data || []) as N[]);
  })(); }, []);

  if (auth.loading) return null;
  if (!auth.signedIn) {
    return (
      <PublicShell title="Neighborhoods" subtitle="Every corner of Baltimore — from Hampden to Highlandtown." signedIn={false}>
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
    <AppLayout title="Neighborhoods" subtitle="Explore Baltimore's communities — click a pin to discover what's happening nearby.">
      <div className="space-y-6">
        <BaltimoreMap />
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
              <div key={n.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:border-orange-300 hover:bg-orange-50/30">
                <MapPin className="h-4 w-4 text-orange-600" />
                <div>
                  <div className="font-semibold">{n.name}</div>
                  <div className="text-xs text-neutral-500">{n.region}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}