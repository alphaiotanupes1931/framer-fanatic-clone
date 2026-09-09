import { useEffect, useState } from "react";

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

  const { MapContainer, TileLayer, Marker, Popup, L } = Lib;

  const icon = (active: boolean) =>
    L.divIcon({
      className: "",
      html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${
        active ? "#7a2f04" : "#d4580a"
      };border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 22],
    });

  const center = pins.length
    ? ([pins[0]!.latitude, pins[0]!.longitude] as [number, number])
    : ([39.2904, -76.6122] as [number, number]);

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={false}
      style={{ height: 420, width: "100%", borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.latitude, p.longitude]}
          icon={icon(p.id === activeId)}
          eventHandlers={{ click: () => onSelect?.(p.id) }}
        >
          <Popup>{p.title}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
