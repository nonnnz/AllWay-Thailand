import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: number; // 0..1
  tone?: 'primary' | 'trust' | 'local-value' | 'warning';
  helper?: string;
  invert?: boolean; // for crowd: lower is better visually
  className?: string;
}

const toneClasses: Record<NonNullable<Props['tone']>, string> = {
  primary: 'bg-primary',
  trust: 'bg-trust',
  'local-value': 'bg-local-value',
  warning: 'bg-warning',
};

export function ScoreBar({ label, value, tone = 'primary', helper, invert, className }: Props) {
  const pct = Math.round((invert ? 1 - value : value) * 100);
  return (
    <div className={cn('space-y-1', className)} title={helper}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground">{pct}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-calm', toneClasses[tone])}
          style={{ width: `${pct}%` }}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
          aria-label={label}
        />
      </div>
    </div>
  );
}
