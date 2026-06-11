import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';

/** Indonesian Rupiah, no decimals — e.g. 41200 → "Rp 41.200". */
export function formatIDR(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Compact Rupiah for tight spaces.
 *   48_504_000   → "Rp 48,5 jt"   (juta / million)
 *   1_200_000_000 → "Rp 1,2 M"     (miliar / billion)
 */
export function formatIDRCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `Rp ${formatDecimal(value / 1_000_000_000)} M`;
  }
  if (abs >= 1_000_000) {
    return `Rp ${formatDecimal(value / 1_000_000)} jt`;
  }
  return formatIDR(value);
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value);
}

/** Grouped integer — e.g. 1128 → "1.128". */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value);
}

/** Percentage with an optional fixed number of decimals — e.g. 82 → "82%". */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/** Signed percentage for deltas — e.g. 7.4 → "+7,4%". */
export function formatDelta(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

/** ISO date → "5 Jun 2026". Returns "—" for empty/invalid input. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = parseISO(iso);
  if (!isValid(date)) return '—';
  return format(date, 'd MMM yyyy');
}

/** ISO date → "Fri, 5 Jun". */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = parseISO(iso);
  if (!isValid(date)) return '—';
  return format(date, 'EEE, d MMM');
}

/**
 * Human relative label from today.
 *   today    → "Today"
 *   +1 day   → "Tomorrow"
 *   +n days  → "in n days"
 *   -n days  → "n days ago"
 */
export function relativeDays(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—';
  const date = parseISO(iso);
  if (!isValid(date)) return '—';
  const diff = differenceInCalendarDays(date, now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

/** Initials for an avatar chip — "Panji Prakorso" → "PP". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
