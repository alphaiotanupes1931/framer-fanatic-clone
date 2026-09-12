import { useEffect, useMemo, useState } from "react";

export type FestivalPin = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
};

/**
 * Small leaflet map used on the Festivals page. Only renders pins for the
 * festivals passed in, so it always reflects what the page is showing.
 */
export function FestivalMap({
  pins,
  activeId,
  onSelect,
}: {
  pins: FestivalPin[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const [Lib, setLib] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rl, leaflet] = await Promise.all([import("react-leaflet"), import("leaflet")]);
      await import("leaflet/dist/leaflet.css");
      if (!cancelled) setLib({ ...rl, L: leaflet.default ?? leaflet });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Lib) {
    return <div className="h-[420px] w-full animate-pulse rounded-xl bg-muted" />;
  }

  const { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } = Lib;
  const firstPin = pins[0];
  const center: [number, number] = firstPin
    ? [firstPin.latitude, firstPin.longitude]
    : [39.299, -76.612];

  function KeepPinsInView() {
    const map = useMap();
    const signature = useMemo(
      () => pins.map((pin) => `${pin.latitude},${pin.longitude}`).join("|"),
      [],
    );
    useEffect(() => {
      if (pins.length === 0) return;
      if (pins.length === 1) {
        const pin = pins[0];
        if (pin) map.setView([pin.latitude, pin.longitude], 12);
        return;
      }
      map.fitBounds(pins.map((pin) => [pin.latitude, pin.longitude]), { padding: [32, 32], maxZoom: 13 });
    }, [map, signature]);
    return null;
  }

  return (
    <div className="relative z-0 overflow-hidden rounded-lg border border-border shadow-sm [isolation:isolate]">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "clamp(320px, 55vh, 560px)", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <KeepPinsInView />
        {pins.map((pin) => {
          const active = pin.id === activeId;
          return (
            <CircleMarker
              key={pin.id}
              center={[pin.latitude, pin.longitude]}
              radius={active ? 16 : 13}
              pathOptions={{
                color: "var(--map-accent)",
                fillColor: "var(--map-accent)",
                fillOpacity: active ? 1 : 0.85,
                weight: active ? 4 : 2,
              }}
              eventHandlers={{ click: () => onSelect?.(pin.id) }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                <span className="text-xs font-semibold">{pin.title}</span>
              </Tooltip>
              <Popup>
                <div className="min-w-[180px] font-semibold">{pin.title}</div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
