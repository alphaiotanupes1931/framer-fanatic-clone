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

export function BaltimoreMap({ onSelectEvent }: { onSelectEvent?: (e: EventPin) => void }) {
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<EventPin[]>([]);
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
        .from("events")
        .select("id, title, starts_at, location, image_url, latitude, longitude")
        .gte("starts_at", new Date().toISOString())
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("starts_at", { ascending: true });
      setEvents(((data || []) as any[]).filter((e) => e.latitude != null && e.longitude != null) as EventPin[]);
    })();
  }, [mounted]);

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