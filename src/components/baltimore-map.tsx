import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type EventPin = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  image_url: string | null;
  latitude: number;
  longitude: number;
};

type NeighborhoodPin = {
  id: string;
  name: string;
  region: string | null;
  latitude: number;
  longitude: number;
};

export function BaltimoreMap({
  onSelectEvent,
  onSelectNeighborhood,
  showNeighborhoods = true,
}: {
  onSelectEvent?: (e: EventPin) => void;
  onSelectNeighborhood?: (n: NeighborhoodPin) => void;
  showNeighborhoods?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<EventPin[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodPin[]>([]);
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
      const [{ data: evData }, { data: nData }] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, starts_at, location, image_url, latitude, longitude, neighborhood")
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true }),
        supabase
          .from("neighborhoods")
          .select("name, latitude, longitude")
          .not("latitude", "is", null)
          .not("longitude", "is", null),
      ]);
      const nMap = new Map<string, { lat: number; lng: number }>();
      for (const n of (nData || []) as any[]) {
        if (n?.name) nMap.set(String(n.name).toLowerCase(), { lat: n.latitude, lng: n.longitude });
      }
      const resolved: EventPin[] = [];
      for (const e of (evData || []) as any[]) {
        let lat = e.latitude, lng = e.longitude;
        if ((lat == null || lng == null) && e.neighborhood) {
          const hit = nMap.get(String(e.neighborhood).toLowerCase());
          if (hit) { lat = hit.lat; lng = hit.lng; }
        }
        if (lat != null && lng != null) {
          resolved.push({ id: e.id, title: e.title, starts_at: e.starts_at, location: e.location, image_url: e.image_url, latitude: lat, longitude: lng });
        }
      }
      setEvents(resolved);
    })();
    if (showNeighborhoods) {
      (async () => {
        const { data } = await supabase
          .from("neighborhoods")
          .select("id, name, region, latitude, longitude")
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .order("name");
        setNeighborhoods(((data || []) as any[]).filter((n) => n.latitude != null && n.longitude != null) as NeighborhoodPin[]);
      })();
    }
  }, [mounted, showNeighborhoods]);

  if (!mounted || !Lib) {
    return (
      <div className="aspect-[16/9] w-full animate-pulse rounded-2xl bg-neutral-100" />
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } = Lib;

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
        {showNeighborhoods && neighborhoods.map((n) => (
          <CircleMarker
            key={`n-${n.id}`}
            center={[n.latitude, n.longitude]}
            radius={5}
            pathOptions={{
              color: "#1e3a5f",
              fillColor: "#3b82f6",
              fillOpacity: 0.7,
              weight: 1.5,
            }}
            eventHandlers={{ click: () => onSelectNeighborhood?.(n) }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              <span className="text-xs font-semibold">{n.name}</span>
            </Tooltip>
            <Popup>
              <div className="space-y-1 min-w-[160px]">
                <div className="font-semibold">{n.name}</div>
                {n.region && <div className="text-xs text-neutral-500">{n.region}</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
        {events.map((e) => (
          <CircleMarker
            key={e.id}
            center={[e.latitude, e.longitude]}
            radius={10}
            pathOptions={{
              color: "#d4580a",
              fillColor: "#d4580a",
              fillOpacity: 0.8,
              weight: 2,
            }}
            eventHandlers={{ click: () => onSelectEvent?.(e) }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              <span className="text-xs font-semibold">{e.title}</span>
            </Tooltip>
            <Popup>
              <div className="space-y-1 min-w-[180px]">
                <div className="font-semibold">{e.title}</div>
                <div className="text-xs text-neutral-600">
                  {new Date(e.starts_at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
                {e.location && <div className="text-xs text-neutral-500">{e.location}</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
        {events.length === 0 && null}
      </MapContainer>
      {events.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-neutral-500">
          No upcoming events on the map yet. Create one from the Events page.
        </div>
      )}
    </div>
  );
}