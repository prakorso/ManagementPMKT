import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { Tone } from './Badge';

const iconTones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  iconTone?: Tone;
  hint?: string;
  delta?: { value: string; good: boolean };
  footer?: ReactNode;
  to?: string;
}

export function StatCard({ label, value, icon, iconTone = 'brand', hint, delta, footer, to }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 truncate text-xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            {value}
          </p>
        </div>
        {icon && (
          <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${iconTones[iconTone]}`}>
            {icon}
          </span>
        )}
      </div>
      {(hint || delta) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {delta && (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold ${
                delta.good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {delta.good ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {delta.value}
            </span>
          )}
          {hint && <span className="text-muted">{hint}</span>}
        </div>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </>
  );

  const className = `card card-pad ${to ? 'transition-shadow hover:shadow-card-hover' : ''}`;

  if (to) {
    return (
      <Link to={to} className={`block ${className}`}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
