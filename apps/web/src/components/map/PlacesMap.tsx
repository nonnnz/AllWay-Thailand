import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  imageUrl?: string;
  trustScore?: number;
  kind?: 'attraction' | 'restaurant' | 'accommodation' | 'experience';
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const createCustomIcon = (kind?: MapPin['kind']) => {
  let color = 'hsl(var(--primary))';
  if (kind === 'restaurant') color = '#f97316'; // orange-500
  if (kind === 'accommodation') color = '#3b82f6'; // blue-500
  if (kind === 'attraction') color = '#ef4444'; // red-500

  return L.divIcon({
    className: '',
    html: `<div class="group relative flex items-center justify-center">
      <div style="
        width:24px;height:24px;border-radius:9999px;
        background:${color};border:2px solid white;
        box-shadow:0 4px 10px rgba(0,0,0,0.2);
        transition: transform 0.2s;
      " class="marker-pin"></div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createUserLocationIcon = () => {
  return L.divIcon({
    className: '',
    html: `<div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
      <div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg relative z-10"></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface Props {
  pins: MapPin[];
  routePath?: [number, number][];
  height?: string;
  center?: [number, number];
  zoom?: number;
  userLocation?: { lat: number; lng: number } | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string) => void;
  onHoverEnd?: () => void;
}

export function PlacesMap({ 
  pins, routePath, height = '420px', center, zoom = 7, 
  userLocation, onSelect, onHover, onHoverEnd 
}: Props) {
  const fallbackCenter: [number, number] = pins[0]
    ? [pins[0].lat, pins[0].lng]
    : [13.7563, 100.5018]; // Bangkok

  const actualCenter = center ?? fallbackCenter;

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface-muted/30" style={{ height }}>
      <MapContainer
        center={actualCenter}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <ChangeView center={actualCenter} zoom={zoom} />
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
          <Marker 
            key={p.id} 
            position={[p.lat, p.lng]} 
            icon={createCustomIcon(p.kind)}
            eventHandlers={{
              click: () => onSelect?.(p.id),
              mouseover: () => onHover?.(p.id),
              mouseout: () => onHoverEnd?.()
            }}
          >
            <Popup minWidth={200} className="custom-popup">
              <div className="flex flex-col gap-2 p-1">
                {p.imageUrl && (
                  <div className="h-24 w-full overflow-hidden rounded-md bg-surface-muted">
                    <img src={p.imageUrl} alt={p.label} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-tight">{p.label}</h3>
                    {p.sublabel && <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">{p.sublabel}</p>}
                  </div>
                  {p.trustScore !== undefined && (
                    <div className="flex flex-col items-center rounded bg-trust/10 px-1.5 py-0.5 ring-1 ring-trust/20">
                      <span className="text-[10px] font-bold text-trust">{(p.trustScore * 100).toFixed(0)}</span>
                    </div>
                  )}
                </div>
                <a 
                  href={`/place/${encodeURIComponent(p.id)}`}
                  className="mt-1 inline-flex items-center justify-center rounded bg-primary px-2.5 py-1.5 text-center text-[11px] font-bold text-primary-foreground transition-all hover:bg-primary-hover active:scale-95"
                >
                  View Details
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]} 
            icon={createUserLocationIcon()}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="text-xs font-bold p-1">You are here</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
