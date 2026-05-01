import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function AreaHeatmap({ pins, radiusKm }: { pins: MapPin[], radiusKm: number }) {
  const pinsWithPrice = pins.filter(p => p.priceAvg !== undefined);

  if (pinsWithPrice.length === 0) return null;

  return (
    <>
      {pinsWithPrice.map(p => {
        const price = p.priceAvg!;
        let color = '#10b981'; // Green
        if (price > 500) color = '#ef4444'; // Red
        else if (price > 200) color = '#f59e0b'; // Yellow

        return (
          <Circle 
            key={`heatmap-circle-${p.id}`}
            center={[p.lat, p.lng]} 
            radius={radiusKm * 1000} 
            pathOptions={{ 
              color: 'transparent', 
              fillColor: color, 
              fillOpacity: 0.15, // Very translucent so overlapping creates heatmap
              weight: 0 
            }}
          >
            <Popup>
              <div className="text-center p-1">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1">{p.label}</p>
                <p className="text-xl font-black text-foreground">฿{price.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{radiusKm}km influence area</p>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}

interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  imageUrl?: string;
  trustScore?: number;
  kind?: 'attraction' | 'restaurant' | 'accommodation' | 'experience';
  priceAvg?: number;
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    // Only set view if the center/zoom has actually changed from the current map state
    // to avoid "fighting" the user's manual navigation or re-rendering loops.
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    
    const centerMoved = Math.abs(currentCenter.lat - center[0]) > 0.0001 || 
                       Math.abs(currentCenter.lng - center[1]) > 0.0001;
    const zoomChanged = currentZoom !== zoom;

    if (centerMoved || zoomChanged) {
      map.setView(center, zoom);
    }
  }, [center[0], center[1], zoom, map]);
  return null;
}

const createCustomIcon = (kind?: MapPin['kind'], priceAvg?: number, showHeatmap?: boolean) => {
  let color = 'hsl(var(--primary))';
  let glow = '';
  let size = 24;

  if (showHeatmap && priceAvg !== undefined) {
    if (priceAvg < 200) { color = '#10b981'; glow = '0 0 15px 5px rgba(16, 185, 129, 0.4)'; } // Green (Cheap)
    else if (priceAvg < 500) { color = '#f59e0b'; glow = '0 0 15px 5px rgba(245, 158, 11, 0.4)'; } // Yellow (Medium)
    else { color = '#ef4444'; glow = '0 0 15px 5px rgba(239, 68, 68, 0.4)'; } // Red (Expensive)
    size = 32; // Make it a bit larger for heatmap
  } else {
    if (kind === 'restaurant') color = '#f97316'; // orange-500
    if (kind === 'accommodation') color = '#3b82f6'; // blue-500
    if (kind === 'attraction') color = '#ef4444'; // red-500
  }

  return L.divIcon({
    className: '',
    html: `<div class="group relative flex items-center justify-center">
      <div style="
        width:${size}px;height:${size}px;border-radius:9999px;
        background:${color};border:2px solid white;
        box-shadow:${glow || '0 4px 10px rgba(0,0,0,0.2)'};
        transition: transform 0.2s, box-shadow 0.2s;
        opacity: ${showHeatmap ? 0.8 : 1};
      " class="marker-pin"></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
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
  showPricingHeatmap?: boolean;
  areaHeatmapRadiusKm?: number;
  onSelect?: (id: string) => void;
  onHover?: (id: string) => void;
  onHoverEnd?: () => void;
}

export function PlacesMap({ 
  pins, routePath, height = '420px', center, zoom = 7, 
  userLocation, showPricingHeatmap, areaHeatmapRadiusKm, onSelect, onHover, onHoverEnd 
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
        {areaHeatmapRadiusKm && <AreaHeatmap pins={pins} radiusKm={areaHeatmapRadiusKm} />}
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
            icon={createCustomIcon(p.kind, p.priceAvg, showPricingHeatmap)}
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
