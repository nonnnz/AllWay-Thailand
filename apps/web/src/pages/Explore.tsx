import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Map as MapIcon, List } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { PlaceCard } from '@/components/place/PlaceCard';
import { PlacesMap } from '@/components/map/PlacesMap';
import { getPlaces, getProvinces, getFacilities, queryKeys } from '@/lib/api/client';
import { cn } from '@/lib/utils';

const KINDS = [
  { id: '', label: 'All' },
  { id: 'attraction', label: 'Attractions' },
  { id: 'restaurant', label: 'Food' },
  { id: 'accommodation', label: 'Stays' },
  { id: 'experience', label: 'Experiences' },
];

export default function Explore() {
  const [kind, setKind] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [sortBy, setSortBy] = useState<'relevance' | 'trust' | 'crowd'>('trust');

  const params = useMemo(() => ({ kind: kind || undefined, provinceId: provinceId || undefined, sortBy }), [kind, provinceId, sortBy]);
  const places = useQuery({ queryKey: queryKeys.places(params), queryFn: () => getPlaces(params) });
  const provinces = useQuery({ queryKey: queryKeys.provinces, queryFn: getProvinces });
  const facilities = useQuery({ queryKey: queryKeys.facilities, queryFn: getFacilities });

  return (
    <PageShell>
      <section className="container py-8 md:py-12">
        <header className="mb-6">
          <h1 className="text-3xl font-[650] tracking-tight md:text-4xl">Explore verified places</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Browse and filter without writing a prompt. All results carry trust and price hints.
          </p>
        </header>

        <div 
          className="card-spotlight flex flex-col gap-3 rounded-card border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between shadow-sm"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
            e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
          }}
        >
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  kind === k.id ? 'bg-primary text-primary-foreground' : 'bg-surface-soft text-muted-foreground hover:text-foreground',
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={provinceId} onChange={(e) => setProvinceId(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">All provinces</option>
              {provinces.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="trust">Sort: Trust</option>
              <option value="crowd">Sort: Quietest</option>
              <option value="relevance">Sort: Relevance</option>
            </select>
            <div className="flex rounded-md border border-border p-0.5">
              <button onClick={() => setView('list')} className={cn('inline-flex items-center gap-1 rounded px-3 py-1 text-xs font-semibold', view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                <List className="h-3.5 w-3.5" /> List
              </button>
              <button onClick={() => setView('map')} className={cn('inline-flex items-center gap-1 rounded px-3 py-1 text-xs font-semibold', view === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                <MapIcon className="h-3.5 w-3.5" /> Map
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {facilities.data?.map((f) => (
            <span key={f.id} className="rounded-full bg-surface-soft px-2.5 py-1">{f.name}</span>
          ))}
        </div>

        <div className="mt-6">
          {view === 'list' ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {places.data?.map((p) => <PlaceCard key={p.id} place={p} />)}
            </div>
          ) : (
            <PlacesMap
              pins={(places.data ?? []).map((p) => ({ 
                id: p.id, 
                lat: p.lat, 
                lng: p.lng, 
                label: p.name, 
                sublabel: p.provinceName,
                imageUrl: p.imageUrl,
                trustScore: p.trustScore
              }))}
              height="600px"
              zoom={6}
            />
          )}
        </div>
      </section>
    </PageShell>
  );
}
