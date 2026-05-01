import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Route as RouteIcon } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { TrustBadge } from '@/components/trust/TrustBadge';
import { PlacesMap } from '@/components/map/PlacesMap';
import { getRoutes, queryKeys } from '@/lib/api/client';

export default function Routes() {
  const routes = useQuery({ queryKey: queryKeys.routes, queryFn: getRoutes });

  return (
    <PageShell>
      <section className="container py-8 md:py-12">
        <header className="mb-6">
          <h1 className="text-3xl font-[650] tracking-tight md:text-4xl">Smart routes</h1>
          <p className="mt-2 text-sm text-muted-foreground">Multi-stop options with trust and accessibility warnings.</p>
        </header>

        <div className="space-y-8">
          {routes.data?.map((route) => {
            const allStops = route.stops.flat();
            return (
              <article 
                key={route.id} 
                className="card-spotlight rounded-card border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
                }}
              >
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <RouteIcon className="h-3.5 w-3.5" /> {route.days} days · {route.totalDistanceKm} km
                        </p>
                        <h2 className="mt-1 text-xl font-[620]">{route.title}</h2>
                      </div>
                      <TrustBadge score={route.trustAverage} />
                    </div>

                    <ol className="mt-5 space-y-5">
                      {route.stops.map((dayStops, dayIdx) => (
                        <li key={dayIdx}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Day {dayIdx + 1}</p>
                          <ul className="space-y-2">
                            {dayStops.map((s) => (
                              <li key={s.placeId} className="flex items-start gap-3 rounded-md bg-surface-soft p-3">
                                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground font-mono">
                                  {s.arriveISO.split(' ')[0]}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-semibold">{s.name}</p>
                                    <TrustBadge score={s.trustScore} size="sm" />
                                  </div>
                                  <p className="text-xs text-muted-foreground font-mono">{s.arriveISO} · {s.durationMin} min</p>
                                  {s.warning && (
                                    <p className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-warning-soft px-2 py-1 text-xs text-warning">
                                      <AlertTriangle className="h-3 w-3" /> {s.warning}
                                    </p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <PlacesMap
                      pins={allStops.map((s) => ({ 
                        id: s.placeId, 
                        lat: s.lat, 
                        lng: s.lng, 
                        label: s.name,
                        imageUrl: s.imageUrl,
                        trustScore: s.trustScore
                      }))}
                      routePath={allStops.map((s) => [s.lat, s.lng])}
                      height="480px"
                      zoom={6}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
