import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles, Compass } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { PlaceCard } from '@/components/place/PlaceCard';
import { getCurrentSeason, getPlaces, queryKeys } from '@/lib/api/client';
import { useT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const VIBE_CHIPS = [
  { en: 'Quiet coast', th: 'ทะเลเงียบ' },
  { en: 'Local food', th: 'อาหารท้องถิ่น' },
  { en: 'Family-friendly', th: 'เหมาะกับครอบครัว' },
  { en: 'Mountain & nature', th: 'ภูเขาและธรรมชาติ' },
  { en: 'Cultural', th: 'วัฒนธรรม' },
  { en: 'Avoid crowds', th: 'เลี่ยงคนเยอะ' },
];

export default function Index() {
  const t = useT();
  const lang = useAppStore((s) => s.language);
  const navigate = useNavigate();
  const [intent, setIntent] = useState('');
  const [activeChips, setActiveChips] = useState<string[]>([]);

  const { data: season } = useQuery({ queryKey: queryKeys.season, queryFn: getCurrentSeason });
  const { data: trending } = useQuery({
    queryKey: queryKeys.places({ sortBy: 'trust', limit: 6 }),
    queryFn: () => getPlaces({ sortBy: 'trust', limit: 6 }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (intent) q.set('q', intent);
    if (activeChips.length) q.set('vibe', activeChips.join(','));
    navigate(`/recommendations?${q.toString()}`);
  };

  return (
    <PageShell>
      <section className="grain-surface border-b border-border">
        <div className="container py-12 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-primary ring-1 ring-border">
              <Compass className="h-3.5 w-3.5" aria-hidden />
              {season ? `${season.label} · ${season.monthsRange}` : '—'}
            </p>
            <h1 className="text-4xl font-[650] leading-[1.08] tracking-[-0.03em] md:text-5xl lg:text-6xl">
              {t('app.tagline')}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
              {t('home.searchHelper')}
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="mx-auto mt-8 max-w-3xl rounded-card border border-border bg-card p-3 shadow-sm md:p-4"
          >
            <label htmlFor="intent" className="sr-only">Travel intent</label>
            <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
              <div className="flex flex-1 items-start gap-3 rounded-md bg-surface-soft px-4 py-3">
                <Search className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <textarea
                  id="intent"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder={t('home.searchPlaceholder')}
                  rows={2}
                  className="w-full resize-none bg-transparent text-base leading-snug text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('cta.findDetours')}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {VIBE_CHIPS.map((chip) => {
                const label = lang === 'th' ? chip.th : chip.en;
                const active = activeChips.includes(chip.en);
                return (
                  <button
                    key={chip.en}
                    type="button"
                    onClick={() =>
                      setActiveChips((prev) =>
                        prev.includes(chip.en) ? prev.filter((c) => c !== chip.en) : [...prev, chip.en],
                      )
                    }
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface-soft text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </form>

          {season && (
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm text-muted-foreground">
              <Sparkles className="mr-1 inline h-3.5 w-3.5 text-local-value" aria-hidden />
              {season.recommendation}
            </p>
          )}
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-[620] tracking-tight md:text-3xl">{t('home.trendingTitle')}</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trending?.map((p) => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
