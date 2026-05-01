import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import type { PlaceCardVM } from '@/lib/api/types';
import { TrustBadge } from '@/components/trust/TrustBadge';
import { ScoreBar } from '@/components/trust/ScoreBar';
import { useT, pickLocalized } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface Props {
  place: PlaceCardVM;
  className?: string;
}

const fairPriceLabel: Record<PlaceCardVM['fairPrice']['label'], { en: string; th: string; tone: string }> = {
  'in-range': { en: 'Fair price', th: 'ราคาเหมาะสม', tone: 'bg-trust-soft text-trust' },
  'slightly_high': { en: 'Slightly high', th: 'ราคาสูงเล็กน้อย', tone: 'bg-warning-soft text-warning' },
  'high': { en: 'High vs area', th: 'สูงกว่าพื้นที่', tone: 'bg-destructive-soft text-destructive' },
  'low': { en: 'Lower than area', th: 'ต่ำกว่าพื้นที่', tone: 'bg-trust-soft text-trust' },
  'unknown': { en: 'Price unknown', th: 'ไม่ทราบราคา', tone: 'bg-surface-muted text-muted-foreground' },
};

export function PlaceCard({ place, className }: Props) {
  const t = useT();
  const fp = fairPriceLabel[place.fairPrice.label];
  const name = pickLocalized(place, 'name');
  const province = pickLocalized(place, 'provinceName');
  const reason = pickLocalized(place, 'reasonSnippet');

  return (
    <article
      className={cn(
        'card-spotlight group flex flex-col overflow-hidden rounded-card border border-border bg-card text-card-foreground transition-shadow duration-200 hover:shadow-[0_2px_24px_-12px_hsl(var(--primary)/0.25)]',
        className,
      )}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
      }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-muted">
        <img
          src={place.imageUrl}
          alt={`${name}, ${province}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-calm group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3">
          <TrustBadge score={place.trustScore} size="sm" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-[18px] font-[620] leading-tight tracking-tight">{name}</h3>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {province}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{reason}</p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <ScoreBar label={t('label.fit')} value={place.seasonFitScore} tone="primary" />
          <ScoreBar label={t('label.crowd')} value={place.crowdScore} tone="trust" invert helper="Lower is quieter" />
          <ScoreBar label={t('label.localValue')} value={place.localValueScore} tone="local-value" />
          <ScoreBar label={t('label.access')} value={place.accessibilityScore} tone="primary" />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', fp.tone)}>
            {pickLocalized({ x: fp.en, xTh: fp.th }, 'x')}
            <span className="ml-1.5 font-mono opacity-70">
              {place.fairPrice.deltaPct > 0 ? '+' : ''}{place.fairPrice.deltaPct}%
            </span>
          </span>
          {place.safetyTags.map((tag) => (
            <span key={tag} className="rounded-full bg-surface-soft px-2.5 py-0.5 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>

        <Link
          to={`/place/${encodeURIComponent(place.id)}`}
          className="mt-auto inline-flex items-center justify-between rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span>{t('cta.viewTrusted')}</span>
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
