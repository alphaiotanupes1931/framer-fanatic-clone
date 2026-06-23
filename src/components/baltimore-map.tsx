import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type N = { id: string; name: string; region: string; latitude: number | null; longitude: number | null };

const REGION_COLOR: Record<string, string> = {
  "North Baltimore": "#f59e0b",
  "South Baltimore": "#ef4444",
  "East Baltimore": "#10b981",
  "West Baltimore": "#6366f1",
  "Central Baltimore": "#f97316",
};

export function BaltimoreMap({ onSelect }: { onSelect?: (n: N) => void }) {
  const [mounted, setMounted] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<N[]>([]);
  const [Lib, setLib] = useState<any>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const [rl, leaflet] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
      ]);
      await import("leaflet/dist/leaflet.css");
      setLib({ ...rl, L: leaflet.default ?? leaflet });
    })();
    (async () => {
      const { data } = await supabase
        .from("neighborhoods")
        .select("id, name, region, latitude, longitude")
        .order("name");
      setNeighborhoods((data || []) as N[]);
    })();
  }, [mounted]);

  if (!mounted || !Lib) {
    return (
      <div className="aspect-[16/9] w-full animate-pulse rounded-2xl bg-neutral-100" />
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } = Lib;
  const points = neighborhoods.filter((n) => n.latitude != null && n.longitude != null);

  return (
    <div
      className="relative z-0 overflow-hidden rounded-2xl border border-neutral-200 shadow-sm"
      style={{ isolation: "isolate" }}
    >
      <MapContainer
        center={[39.299, -76.612]}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "clamp(320px, 55vh, 560px)", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {points.map((n) => (
          <CircleMarker
            key={n.id}
            center={[n.latitude!, n.longitude!]}
            radius={9}
            pathOptions={{
              color: REGION_COLOR[n.region] || "#f97316",
              fillColor: REGION_COLOR[n.region] || "#f97316",
              fillOpacity: 0.75,
              weight: 2,
            }}
            eventHandlers={{ click: () => onSelect?.(n) }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              <span className="text-xs font-semibold">{n.name}</span>
            </Tooltip>
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">{n.name}</div>
                <div className="text-xs text-neutral-500">{n.region}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}