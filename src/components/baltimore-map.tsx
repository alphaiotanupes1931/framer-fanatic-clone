import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";

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

  const groups = new Map<string, EventPin[]>();
  for (const e of events) {
    const key = `${e.latitude.toFixed(4)}|${e.longitude.toFixed(4)}`;
    const arr = groups.get(key) || [];
    arr.push(e);
    groups.set(key, arr);
  }
  const eventGroups = Array.from(groups.entries()).map(([key, list]) => ({
    key,
    latitude: list[0].latitude,
    longitude: list[0].longitude,
    list,
  }));

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
        {eventGroups.map((g) => (
          <CircleMarker
            key={g.key}
            center={[g.latitude, g.longitude]}
            radius={g.list.length > 1 ? 12 : 10}
            pathOptions={{
              color: "#d4580a",
              fillColor: "#d4580a",
              fillOpacity: 0.85,
              weight: 2,
            }}
            eventHandlers={{ click: () => onSelectEvent?.(g.list[0]) }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              <span className="text-xs font-semibold">
                {g.list.length > 1 ? `${g.list.length} events here` : g.list[0].title}
              </span>
            </Tooltip>
            <Popup maxWidth={280} minWidth={240}>
              <EventPopup list={g.list} onSelectEvent={onSelectEvent} />
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

function EventPopup({
  list,
  onSelectEvent,
}: {
  list: EventPin[];
  onSelectEvent?: (e: EventPin) => void;
}) {
  const [idx, setIdx] = useState(0);
  const e = list[idx];
  const multi = list.length > 1;
  const prev = () => setIdx((i) => (i - 1 + list.length) % list.length);
  const next = () => setIdx((i) => (i + 1) % list.length);
  return (
    <div className="w-[240px]">
      {e.image_url && (
        <div className="relative -mx-3 -mt-3 mb-2 h-28 overflow-hidden rounded-t-md bg-neutral-100">
          <img src={e.image_url} alt={e.title} className="h-full w-full object-cover" />
          {multi && (
            <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
              {idx + 1} / {list.length}
            </div>
          )}
        </div>
      )}
      <div className="space-y-1.5">
        {!e.image_url && multi && (
          <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            {idx + 1} of {list.length} events
          </div>
        )}
        <Link
          to="/e/$id"
          params={{ id: e.id }}
          onClick={() => onSelectEvent?.(e)}
          className="block text-sm font-semibold leading-snug text-neutral-900 hover:underline"
        >
          {e.title}
        </Link>
        <div className="flex items-start gap-1.5 text-xs text-neutral-600">
          <Calendar className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            {new Date(e.starts_at).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
        {e.location && (
          <div className="flex items-start gap-1.5 text-xs text-neutral-500">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-2">{e.location}</span>
          </div>
        )}
      </div>
      {multi && (
        <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2">
          <button
            type="button"
            onClick={prev}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            aria-label="Previous event"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-4 bg-[#d4580a]" : "w-1.5 bg-neutral-300"
                }`}
                aria-label={`Go to event ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            aria-label="Next event"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}