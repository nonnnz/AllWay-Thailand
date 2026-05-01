import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { PlaceCard } from '@/components/place/PlaceCard';
import { PlacesMap } from '@/components/map/PlacesMap';
import { postDetour } from '@/lib/api/client';
import type { DetourResponse } from '@/lib/api/types';

export default function Recommendations() {
  const [params] = useSearchParams();
  const intent = params.get('q') ?? '';
  const vibe = useMemo(() => params.get('vibe')?.split(',').filter(Boolean) ?? [], [params]);

  const [data, setData] = useState<DetourResponse | null>(null);

  const mutation = useMutation({
    mutationFn: postDetour,
    onSuccess: (res) => setData(res),
  });

  useEffect(() => {
    mutation.mutate({
      intent: intent || 'Suggest a quiet, verified detour.',
      vibe,
      avoidCrowds: vibe.includes('Avoid crowds'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, vibe.join(',')]);

  return (
    <PageShell>
      <section className="container py-8 md:py-12">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detour recommendations</p>
          <h1 className="mt-1 text-3xl font-[650] tracking-tight md:text-4xl">
            Safer alternatives we found
          </h1>
          {intent && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Based on your intent: <span className="text-foreground">"{intent}"</span>
            </p>
          )}
        </header>

        {mutation.isPending && !data && (
          <div className="flex items-center gap-3 rounded-card border border-border bg-card p-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>Comparing verified places…</span>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-4 rounded-card border border-border bg-primary-soft p-4 text-sm text-foreground">
                <p className="font-semibold text-primary">Why these?</p>
                <p className="mt-1 text-muted-foreground">{data.rationale}</p>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {data.results.map((p) => <PlaceCard key={p.id} place={p} />)}
              </div>
            </div>
            <aside className="lg:sticky lg:top-24 lg:h-fit">
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Map preview</h2>
              <PlacesMap
                pins={data.results.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.name, sublabel: p.provinceName }))}
                height="480px"
              />
            </aside>
          </div>
        )}
      </section>
    </PageShell>
  );
}
