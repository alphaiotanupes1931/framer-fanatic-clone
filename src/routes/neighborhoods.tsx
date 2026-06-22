import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/neighborhoods")({
  component: NeighborhoodsPage,
  head: () => ({ meta: [{ title: "Neighborhoods — Planet Baltimore" }] }),
});

type N = { id: string; name: string; region: string };

function NeighborhoodsPage() {
  const [list, setList] = useState<N[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("neighborhoods").select("id, name, region").order("name");
    setList((data || []) as N[]);
  })(); }, []);

  return (
    <AppLayout title="Neighborhoods" subtitle="Explore Baltimore's communities — click a pin to discover what's happening nearby.">
      <div className="space-y-6">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-emerald-100 via-yellow-50 to-orange-100">
          <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
            <div className="text-center">
              <MapPin className="mx-auto mb-2 h-12 w-12 text-orange-500" />
              <div className="font-semibold">Baltimore Map</div>
              <div className="text-sm text-neutral-500">Interactive map coming soon</div>
            </div>
          </div>
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