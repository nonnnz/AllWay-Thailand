import { Star, AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

interface Props {
  score: number; // 0..1
  size?: 'sm' | 'md';
  className?: string;
}

export function TrustBadge({ score, size = 'md', className }: Props) {
  const t = useT();
  const pct = Math.round(score * 100);
  const tier = pct >= 80 ? 'high' : pct >= 60 ? 'medium' : 'low';

  // Moodboard §12: Jade family for ≥90, plain jade-soft for 70–89, grey-jade for <70
  const styles = {
    high: 'bg-jade-soft text-jade',
    medium: 'bg-warning-soft text-warning',
    low: 'bg-destructive-soft text-destructive',
  }[tier];

  const Icon = tier === 'high' ? Star : tier === 'medium' ? AlertTriangle : ShieldAlert;
  const label = tier === 'high' ? t('trust.high') : tier === 'medium' ? t('trust.medium') : t('trust.low');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-[13px]',
        styles,
        className,
      )}
      aria-label={`${label}, ${pct}/100`}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
      <span>{label}</span>
      <span className="font-mono opacity-80">{pct}</span>
    </span>
  );
}
