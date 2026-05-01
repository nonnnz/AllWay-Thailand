import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Route as RouteIcon,
  MapPin,
  Trash2,
  Calendar,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { PlacesMap } from "@/components/map/PlacesMap";
import { getRoutes, getItineraries, queryKeys } from "@/lib/api/client";
import { PLACES } from "@/lib/api/mockData";
import { Link } from "react-router-dom";

export default function Routes() {
  const routes = useQuery({ queryKey: queryKeys.routes, queryFn: getRoutes });
  const itineraries = useQuery({
    queryKey: queryKeys.itineraries,
    queryFn: getItineraries,
  });

  if (routes.isLoading || itineraries.isLoading) {
    return (
      <PageShell>
        <div className="container py-16 text-muted-foreground">
          Generating routes…
        </div>
      </PageShell>
    );
  }

  const hasItineraries = itineraries.data && itineraries.data.length > 0;

  return (
    <PageShell>
      <section className="container py-8 md:py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-[650] tracking-tight md:text-4xl">
            Routes & Itineraries
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-powered route suggestions and your personal travel plans.
          </p>
        </header>

        <div className="space-y-12">
          {/* PERSONAL ITINERARIES SECTION */}
          {hasItineraries && (
            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">My saved itineraries</h2>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {itineraries.data.map((it) => {
                  const items = it.items;
                  return (
                    <article
                      key={it.id}
                      className="group card-spotlight rounded-card border border-border bg-card shadow-sm transition-all hover:border-primary/20 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="p-5 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-lg font-[620]">
                                  {it.title}
                                </h3>
                                <p className="text-[10px] font-mono uppercase text-muted-foreground">
                                  Saved{" "}
                                  {new Date(it.createdISO).toLocaleDateString()}
                                </p>
                              </div>
                              <Link
                                to="/itinerary"
                                className="text-xs font-bold text-primary hover:underline"
                              >
                                Manage
                              </Link>
                            </div>
                            <ul className="space-y-2">
                              {items.slice(0, 4).map((item) => (
                                <li
                                  key={item.id}
                                  className="flex items-center justify-between gap-3 text-sm"
                                >
                                  <div className="flex items-center gap-2 truncate text-muted-foreground">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="truncate">
                                      {item.placeName}
                                    </span>
                                  </div>
                                  <TrustBadge
                                    score={item.trustSnapshot}
                                    size="sm"
                                  />
                                </li>
                              ))}
                              {items.length > 4 && (
                                <li className="text-[10px] text-muted-foreground pl-5">
                                  + {items.length - 4} more places
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                        <div className="h-64 md:h-full min-h-[260px]">
                          <PlacesMap
                            pins={items.map((item) => {
                              const p = PLACES.find(
                                (x) => x.id === item.placeId,
                              );
                              return {
                                id: item.placeId,
                                lat: p?.lat || 13.7563,
                                lng: p?.lng || 100.5018,
                                label: item.placeName,
                                trustScore: item.trustSnapshot,
                                kind: p?.kind,
                              };
                            })}
                            height="100%"
                            zoom={5}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* SMART ROUTES SECTION */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <RouteIcon className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Smart AI routes</h2>
            </div>

            <div className="space-y-8">
              {routes.data?.map((route) => {
                const allStops = route.stops.flat();
                return (
                  <article
                    key={route.id}
                    className="card-spotlight rounded-card border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
                    onMouseMove={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty(
                        "--mouse-x",
                        `${e.clientX - r.left}px`,
                      );
                      e.currentTarget.style.setProperty(
                        "--mouse-y",
                        `${e.clientY - r.top}px`,
                      );
                    }}
                  >
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              <RouteIcon className="h-3.5 w-3.5" /> {route.days}{" "}
                              days · {route.totalDistanceKm} km
                            </p>
                            <h2 className="mt-1 text-xl font-[620]">
                              {route.title}
                            </h2>
                          </div>
                          <TrustBadge score={route.trustAverage} />
                        </div>

                        <ol className="mt-5 space-y-5">
                          {route.stops.map((dayStops, dayIdx) => (
                            <li key={dayIdx}>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                                Day {dayIdx + 1}
                              </p>
                              <ul className="space-y-2">
                                {dayStops.map((s) => (
                                  <li
                                    key={s.placeId}
                                    className="flex items-start gap-3 rounded-md bg-surface-soft p-3"
                                  >
                                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground font-mono">
                                      {s.arriveISO.split(" ")[0]}
                                    </span>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="font-semibold">
                                          {s.name}
                                        </p>
                                        <TrustBadge
                                          score={s.trustScore}
                                          size="sm"
                                        />
                                      </div>
                                      <p className="text-xs text-muted-foreground font-mono">
                                        {s.arriveISO} · {s.durationMin} min
                                      </p>
                                      {s.warning && (
                                        <p className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-warning-soft px-2 py-1 text-xs text-warning">
                                          <AlertTriangle className="h-3 w-3" />{" "}
                                          {s.warning}
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
                            trustScore: s.trustScore,
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
        </div>
      </section>
    </PageShell>
  );
}
