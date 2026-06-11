import type { Tone } from './Badge';

const barColors: Record<Tone, string> = {
  neutral: 'bg-slate-400',
  brand: 'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
};

/** Maps a 0–100 score to a semantic tone (used for progress / readiness bars). */
export function scoreTone(value: number): Tone {
  if (value >= 80) return 'success';
  if (value >= 60) return 'brand';
  if (value >= 40) return 'warning';
  return 'danger';
}

interface ProgressBarProps {
  value: number;
  tone?: Tone;
  /** When true, picks the tone automatically from the value. */
  autoTone?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({ value, tone = 'brand', autoTone = false, size = 'md', className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const resolvedTone = autoTone ? scoreTone(clamped) : tone;
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/60 ${height} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${barColors[resolvedTone]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
