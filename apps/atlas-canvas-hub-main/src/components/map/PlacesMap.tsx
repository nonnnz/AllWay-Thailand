import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icon paths (Leaflet expects assets at known URLs).
const icon = L.divIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;border-radius:9999px;
    background:hsl(var(--primary));border:2px solid hsl(var(--primary-foreground));
    box-shadow:0 0 0 2px hsl(var(--primary)/0.25);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
}

interface Props {
  pins: MapPin[];
  routePath?: [number, number][];
  height?: string;
  center?: [number, number];
  zoom?: number;
}

export function PlacesMap({ pins, routePath, height = '420px', center, zoom = 7 }: Props) {
  const fallbackCenter: [number, number] = pins[0]
    ? [pins[0].lat, pins[0].lng]
    : [13.7563, 100.5018]; // Bangkok

  return (
    <div className="overflow-hidden rounded-card border border-border" style={{ height }}>
      <MapContainer
        center={center ?? fallbackCenter}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution=""
        />
        {routePath && routePath.length > 1 && (
          <Polyline
            positions={routePath}
            pathOptions={{ color: 'hsl(var(--map-route))', weight: 4, opacity: 0.85 }}
          />
        )}
        {pins.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={icon}>
            <Popup>
              <div className="font-sans">
                <div className="font-semibold text-foreground">{p.label}</div>
                {p.sublabel && <div className="text-xs text-muted-foreground">{p.sublabel}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
