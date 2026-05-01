import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, MapPin, Phone, ChevronDown, Flag } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { TrustBadge } from '@/components/trust/TrustBadge';
import { ScoreBar } from '@/components/trust/ScoreBar';
import { PlacesMap } from '@/components/map/PlacesMap';
import { ExplainGraph } from '@/components/graph/ExplainGraph';
import {
  getPlace, getTrust, getFairPrice, getCulturalContext, getGraph, postReport, savePlaceToItinerary, queryKeys,
} from '@/lib/api/client';
import { useT, pickLocalized } from '@/lib/i18n';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function PlaceDetail() {
  const qc = useQueryClient();
  const { id = '' } = useParams();
  const placeId = decodeURIComponent(id);
  const t = useT();
  const [showReasons, setShowReasons] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const place = useQuery({ queryKey: queryKeys.place(placeId), queryFn: () => getPlace(placeId) });
  const trust = useQuery({ queryKey: queryKeys.trust(placeId), queryFn: () => getTrust(placeId) });
  const fair = useQuery({ queryKey: queryKeys.fairPrice(placeId), queryFn: () => getFairPrice(placeId) });
  const culture = useQuery({ queryKey: queryKeys.cultural(placeId), queryFn: () => getCulturalContext(placeId) });
  const graph = useQuery({ queryKey: queryKeys.graph(placeId), queryFn: () => getGraph(placeId) });

  const reportMutation = useMutation({
    mutationFn: postReport,
    onSuccess: () => {
      toast.success('Report submitted. Thank you for keeping travelers safe.');
      setReportOpen(false);
    },
  });
  const saveMutation = useMutation({
    mutationFn: () => savePlaceToItinerary({ id: placeId, name: p?.name || 'Saved place', trustScore: p?.trustScore || 0.7 }),
    onSuccess: () => {
      toast.success('Saved to itinerary.');
      qc.invalidateQueries({ queryKey: queryKeys.itineraries });
    },
  });

  if (place.isLoading) return <PageShell><div className="container py-16 text-muted-foreground">Loading…</div></PageShell>;
  if (!place.data) return <PageShell><div className="container py-16">Place not found.</div></PageShell>;

  const p = place.data;
  const name = pickLocalized(p, 'name');
  const province = pickLocalized(p, 'provinceName');
  const description = pickLocalized(p, 'description');

  return (
    <PageShell>
      <div className="container py-6 md:py-10">
        <Link to="/recommendations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to recommendations
        </Link>

        <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1.35fr_1fr]">
          {/* LEFT */}
          <div className="space-y-6">
            <div 
              className="card-spotlight overflow-hidden rounded-card border border-border bg-card shadow-md transition-all duration-500 animate-in fade-in slide-in-from-left-4"
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
              }}
            >
              <div className="aspect-[16/9] bg-surface-muted">
                <img src={p.imageUrl} alt={name} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {province}
                    </p>
                    <h1 className="mt-1 text-3xl font-[650] tracking-tight md:text-4xl">{name}</h1>
                  </div>
                  <TrustBadge score={p.trustScore} />
                </div>

                <p className="text-base leading-relaxed text-muted-foreground">{description}</p>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <ScoreBar label={t('label.trust')} value={p.trustScore} tone="trust" />
                  <ScoreBar label={t('label.crowd')} value={p.crowdScore} tone="primary" invert />
                  <ScoreBar label={t('label.fit')} value={p.seasonFitScore} tone="primary" />
                  <ScoreBar label={t('label.localValue')} value={p.localValueScore} tone="local-value" />
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{p.hours}</span>
                  {p.contact && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{p.contact}</span>}
                </div>
              </div>
            </div>

            {/* Trust panel */}
            {trust.data && (
              <section 
                className="card-spotlight rounded-card border border-border bg-card p-6 shadow-sm transition-all duration-500 delay-100 animate-in fade-in slide-in-from-left-4"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
                }}
              >
                <header className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-[620]">Why this trust score</h2>
                  <span className="text-xs text-muted-foreground">Updated {new Date(trust.data.lastUpdatedISO).toLocaleString()}</span>
                </header>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-md bg-trust-soft p-4">
                    <p className="text-sm font-semibold text-trust">Positive signals</p>
                    <ul className="mt-2 space-y-1 text-sm text-foreground">
                      {trust.data.reasonsPositive.map((r) => (<li key={r}>• {r}</li>))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-warning-soft p-4">
                    <p className="text-sm font-semibold text-warning">Things to know</p>
                    <ul className="mt-2 space-y-1 text-sm text-foreground">
                      {trust.data.reasonsNegative.length === 0
                        ? <li className="text-muted-foreground">No notable concerns in last 90 days.</li>
                        : trust.data.reasonsNegative.map((r) => (<li key={r}>• {r}</li>))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => setShowReasons((s) => !s)}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  Source signals <ChevronDown className={cn('h-4 w-4 transition-transform', showReasons && 'rotate-180')} />
                </button>
                {showReasons && (
                  <table className="mt-3 w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground">
                      <tr><th className="py-2 font-medium">Source</th><th className="font-medium">Signal</th><th className="font-medium font-mono">Weight</th></tr>
                    </thead>
                    <tbody>
                      {trust.data.sources.map((s, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="py-2">{s.source}</td>
                          <td className="text-muted-foreground">{s.signal}</td>
                          <td className="font-mono">{(s.weight * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}

            {/* Fair price */}
            {fair.data && (
              <section 
                className="card-spotlight rounded-card border border-border bg-card p-6 shadow-sm transition-all duration-500 delay-150 animate-in fade-in slide-in-from-left-4"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
                }}
              >
                <h2 className="mb-2 text-xl font-[620]">{t('label.fairPrice')}</h2>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <Stat label="Observed" value={`฿${fair.data.observed.toFixed(0)}`} />
                  <Stat label="Area average" value={`฿${fair.data.areaAvg}`} />
                  <Stat label="Range" value={`฿${fair.data.areaMin} – ฿${fair.data.areaMax}`} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{fair.data.notes}</p>
              </section>
            )}

            {/* Cultural */}
            {culture.data && (
              <section 
                className="card-spotlight rounded-card border border-border bg-card p-6 shadow-sm transition-all duration-500 delay-200 animate-in fade-in slide-in-from-left-4"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
                }}
              >
                <h2 className="mb-3 text-xl font-[620]">Cultural context</h2>
                <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {culture.data.tips.map((tip) => (
                    <li key={tip.text} className="rounded-md bg-surface-soft p-3 text-sm">{pickLocalized(tip, 'text')}</li>
                  ))}
                </ul>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Best time: {culture.data.bestTime}
                </p>
              </section>
            )}

            {/* Graph */}
            {graph.data && (
              <section 
                className="card-spotlight rounded-card border border-border bg-card p-6 shadow-sm transition-all duration-500 delay-250 animate-in fade-in slide-in-from-left-4"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
                }}
              >
                <h2 className="mb-3 text-xl font-[620]">Connections</h2>
                <p className="mb-3 text-sm text-muted-foreground">Why this place fits — local food, culture, nature, and routes around it.</p>
                <ExplainGraph data={graph.data} />
              </section>
            )}
          </div>

          {/* RIGHT (sticky) */}
          <aside className="lg:sticky lg:top-24 lg:h-fit space-y-4">
            <PlacesMap 
              pins={[{ 
                id: p.id, 
                lat: p.lat, 
                lng: p.lng, 
                label: p.name, 
                sublabel: p.provinceName,
                imageUrl: p.imageUrl,
                trustScore: p.trustScore,
                kind: p.kind
              }]} 
              height="320px" 
              zoom={9} 
            />
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Saving...' : t('cta.saveItinerary')}
            </button>
            <button
              onClick={() => setReportOpen((s) => !s)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card py-3 text-sm font-semibold text-foreground hover:bg-surface-soft"
            >
              <Flag className="h-4 w-4 text-destructive" /> {t('cta.report')}
            </button>

            {reportOpen && (
              <ReportForm
                onCancel={() => setReportOpen(false)}
                onSubmit={(input) => reportMutation.mutate({ ...input, placeId })}
                pending={reportMutation.isPending}
              />
            )}
          </aside>
        </div>
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-soft p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-base font-semibold">{value}</p>
    </div>
  );
}

function ReportForm({ onCancel, onSubmit, pending }: { onCancel: () => void; onSubmit: (i: { category: any; severity: any; description: string }) => void; pending: boolean }) {
  const [category, setCategory] = useState<'overcharge' | 'safety' | 'misleading' | 'closed' | 'other'>('safety');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [description, setDescription] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit({ category, severity, description }); }}
      className="space-y-3 rounded-card border border-border bg-card p-4"
    >
      <p className="text-sm font-semibold">Submit a report</p>
      <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
        <option value="safety">Safety concern</option>
        <option value="overcharge">Overcharging</option>
        <option value="misleading">Misleading info</option>
        <option value="closed">Permanently closed</option>
        <option value="other">Other</option>
      </select>
      <div className="flex gap-2">
        {(['low', 'medium', 'high'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSeverity(s)}
            className={cn(
              'flex-1 rounded-md border px-3 py-2 text-xs font-semibold capitalize',
              severity === s ? 'border-primary bg-primary-soft text-primary' : 'border-border text-muted-foreground',
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Describe what happened. Stay factual."
        required
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-md border border-border py-2 text-sm">Cancel</button>
        <button type="submit" disabled={pending} className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {pending ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </form>
  );
}
