import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Trash2, StickyNote } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { TrustBadge } from '@/components/trust/TrustBadge';
import { getItineraries, removeItineraryItem, queryKeys } from '@/lib/api/client';

export default function ItineraryPage() {
  const qc = useQueryClient();
  const itineraries = useQuery({ queryKey: queryKeys.itineraries, queryFn: getItineraries });
  const removeItem = useMutation({
    mutationFn: ({ itineraryId, itemId }: { itineraryId: string; itemId: string }) =>
      removeItineraryItem(itineraryId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.itineraries });
    },
  });

  return (
    <PageShell>
      <section className="container py-8 md:py-12">
        <header className="mb-6">
          <h1 className="text-3xl font-[650] tracking-tight md:text-4xl">My itineraries</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your saved trips with the trust snapshot from the day you saved them.</p>
        </header>

        {itineraries.data?.length === 0 && (
          <div className="rounded-card border border-border bg-card p-6 text-sm text-muted-foreground">
            No saved itinerary yet. Use "Save to itinerary" on a place detail page.
          </div>
        )}

        {itineraries.data?.map((it) => {
          const byDay = it.items.reduce<Record<number, typeof it.items>>((acc, x) => {
            (acc[x.day] ||= []).push(x); return acc;
          }, {});
          return (
            <article key={it.id} className="rounded-card border border-border bg-card p-6">
              <header className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-[620]">{it.title}</h2>
                  <p className="text-xs text-muted-foreground font-mono">Created {new Date(it.createdISO).toLocaleDateString()}</p>
                </div>
              </header>
              <ol className="space-y-5">
                {Object.entries(byDay).map(([day, items]) => (
                  <li key={day}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Day {day}</p>
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-3 rounded-md bg-surface-soft p-3">
                          <div className="flex-1">
                            <Link to={`/place/${encodeURIComponent(item.placeId)}`} className="font-semibold hover:underline">
                              {item.placeName}
                            </Link>
                            {item.note && <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><StickyNote className="h-3 w-3" />{item.note}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <TrustBadge score={item.trustSnapshot} size="sm" />
                            <button
                              aria-label="Remove"
                              onClick={() => removeItem.mutate({ itineraryId: it.id, itemId: item.id })}
                              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
      </section>
    </PageShell>
  );
}
