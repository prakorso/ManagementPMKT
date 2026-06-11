import type { Tone } from './Badge';
import { scoreTone } from './ProgressBar';

const strokeColors: Record<Tone, string> = {
  neutral: 'stroke-slate-400',
  brand: 'stroke-brand-500',
  success: 'stroke-emerald-500',
  warning: 'stroke-amber-500',
  danger: 'stroke-rose-500',
  info: 'stroke-sky-500',
};

interface ScoreRingProps {
  /** 0–100. */
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  autoTone?: boolean;
  tone?: Tone;
}

export function ScoreRing({
  value,
  size = 140,
  strokeWidth = 12,
  label,
  autoTone = true,
  tone = 'brand',
}: ScoreRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const resolvedTone = autoTone ? scoreTone(clamped) : tone;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-slate-200 dark:stroke-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`fill-none transition-all duration-700 ease-out ${strokeColors[resolvedTone]}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{Math.round(clamped)}</span>
        {label && <span className="mt-0.5 text-xs font-medium text-muted">{label}</span>}
      </div>
    </div>
  );
}
