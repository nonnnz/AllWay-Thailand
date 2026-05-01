import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import {
  getPreferences, patchPreferences, getMyReports, queryKeys,
} from '@/lib/api/client';
import type { TouristPreferences } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const VIBES = ['nature', 'food', 'quiet', 'culture', 'family', 'adventure'];

export default function Profile() {
  const qc = useQueryClient();
  const prefs = useQuery({ queryKey: queryKeys.preferences, queryFn: getPreferences });
  const reports = useQuery({ queryKey: queryKeys.reports, queryFn: getMyReports });

  const update = useMutation({
    mutationFn: patchPreferences,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.preferences }),
  });

  const { user } = useAppStore();

  if (!prefs.data) return <PageShell><div className="container py-16 text-muted-foreground">Loading…</div></PageShell>;
  const p = prefs.data;

  const setPrefs = (patch: Partial<TouristPreferences>) => update.mutate(patch);

  return (
    <PageShell>
      <section className="container max-w-3xl py-8 md:py-12">
        <header className="mb-8 flex items-center gap-6 animate-in fade-in slide-in-from-top-4">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/20">
            <User className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-3xl font-[650] tracking-tight">{user?.name}</h1>
            <p className="text-sm text-muted-foreground font-mono">{user?.email}</p>
            <p className="mt-1 inline-flex rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Verified Human</p>
          </div>
        </header>

        <div className="mb-6">
          <h2 className="text-xl font-[620] mb-2">Preferences</h2>
          <p className="text-sm text-muted-foreground">We use these to tune recommendations. You can change them anytime.</p>
        </div>

        <div 
          className="card-spotlight space-y-6 rounded-card border border-border bg-card p-6 shadow-sm mb-8"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
            e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
          }}
        >
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

        <div 
          className="card-spotlight mt-8 rounded-card border border-border bg-card p-6 shadow-sm"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
            e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
          }}
        >
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
