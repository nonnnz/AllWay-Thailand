import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import {
  getPreferences, patchPreferences, getMyReports, queryKeys,
} from '@/lib/api/client';
import type { TouristPreferences } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const VIBES = ['nature', 'food', 'quiet', 'culture', 'family', 'adventure'];

export default function Profile() {
  const qc = useQueryClient();
  const prefs = useQuery({ queryKey: queryKeys.preferences, queryFn: getPreferences });
  const reports = useQuery({ queryKey: queryKeys.reports, queryFn: getMyReports });

  const update = useMutation({
    mutationFn: patchPreferences,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.preferences }),
  });

  if (!prefs.data) return <PageShell><div className="container py-16 text-muted-foreground">Loading…</div></PageShell>;
  const p = prefs.data;

  const setPrefs = (patch: Partial<TouristPreferences>) => update.mutate(patch);

  return (
    <PageShell>
      <section className="container max-w-3xl py-8 md:py-12">
        <header className="mb-6">
          <h1 className="text-3xl font-[650] tracking-tight md:text-4xl">Your preferences</h1>
          <p className="mt-2 text-sm text-muted-foreground">We use these to tune recommendations. You can change them anytime.</p>
        </header>

        <div className="space-y-6 rounded-card border border-border bg-card p-6">
          <div>
            <p className="mb-2 text-sm font-semibold">Budget</p>
            <div className="flex gap-2">
              {(['low', 'mid', 'high'] as const).map((b) => (
                <button key={b} onClick={() => setPrefs({ budget: b })}
                  className={cn('flex-1 rounded-md border py-2 text-sm font-semibold capitalize', p.budget === b ? 'border-primary bg-primary-soft text-primary' : 'border-border text-muted-foreground')}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Vibe</p>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((v) => {
                const active = p.vibe.includes(v);
                return (
                  <button key={v} onClick={() => setPrefs({ vibe: active ? p.vibe.filter((x) => x !== v) : [...p.vibe, v] })}
                    className={cn('rounded-full px-3 py-1.5 text-xs font-semibold capitalize', active ? 'bg-primary text-primary-foreground' : 'bg-surface-soft text-muted-foreground')}>
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <p className="font-semibold">Crowd tolerance</p>
              <p className="font-mono text-muted-foreground">{Math.round(p.crowdTolerance * 100)}</p>
            </div>
            <input
              type="range" min={0} max={100} value={p.crowdTolerance * 100}
              onChange={(e) => setPrefs({ crowdTolerance: Number(e.target.value) / 100 })}
              className="w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>Quiet only</span><span>OK with crowds</span></div>
          </div>

          <label className="flex items-center justify-between rounded-md bg-surface-soft p-3">
            <span className="text-sm font-semibold">Need accessibility features</span>
            <input type="checkbox" checked={p.accessibility} onChange={(e) => setPrefs({ accessibility: e.target.checked })} className="h-4 w-4 accent-primary" />
          </label>

          <div>
            <p className="mb-2 text-sm font-semibold">Consents</p>
            <div className="space-y-2">
              {(Object.keys(p.consents) as (keyof typeof p.consents)[]).map((k) => (
                <label key={k} className="flex items-center justify-between rounded-md bg-surface-soft p-3 text-sm capitalize">
                  <span>{k}</span>
                  <input type="checkbox" checked={p.consents[k]} onChange={(e) => setPrefs({ consents: { ...p.consents, [k]: e.target.checked } })} className="h-4 w-4 accent-primary" />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-card border border-border bg-card p-6">
          <h2 className="mb-3 text-xl font-[620]">Your reports</h2>
          {reports.data && reports.data.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2 font-medium">Date</th><th className="font-medium">Category</th><th className="font-medium">Severity</th><th className="font-medium">Status</th></tr>
              </thead>
              <tbody>
                {reports.data.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{new Date(r.submittedISO).toLocaleDateString()}</td>
                    <td className="capitalize">{r.category}</td>
                    <td className="capitalize">{r.severity}</td>
                    <td><span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs capitalize">{r.status.replace('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">No reports yet.</p>
          )}
        </div>
      </section>
    </PageShell>
  );
}
