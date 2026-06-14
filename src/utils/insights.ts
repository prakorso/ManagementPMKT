import { differenceInCalendarDays, isValid, parseISO } from 'date-fns';
import { formatIDRCompact } from '@/utils/format';
import type { LgpCampaign, LgpPeriod } from '@/types';

export type InsightSeverity = 'critical' | 'warning' | 'opportunity' | 'good';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
}

/**
 * Rule-based campaign insights — the deterministic precursor to the Phase C AI
 * Command Center. Runs entirely client-side on the already-synced LGP metrics,
 * so it works offline and with no API key. Phase C swaps/augments this with the
 * full rule engine + optional narrative AI without changing the call site.
 */
export function campaignInsights(c: LgpCampaign, now: Date = new Date()): Insight[] {
  const out: Insight[] = [];
  const f = c.funnel;
  const conversion = f.raw > 0 ? (f.booking / f.raw) * 100 : 0;

  // No bookings despite meaningful lead volume → critical.
  if (f.booking === 0 && f.raw >= 20) {
    out.push({
      id: 'no-booking',
      severity: 'critical',
      title: 'Belum ada booking',
      detail: `${f.raw.toLocaleString('id-ID')} leads masuk tapi belum ada booking. Cek kualitas lead & follow-up.`,
    });
  }

  // No new leads for a while → warning (pacing / campaign paused?).
  if (c.lastLead) {
    const d = parseISO(c.lastLead);
    if (isValid(d)) {
      const days = differenceInCalendarDays(now, d);
      if (days >= 14) {
        out.push({
          id: 'stale-leads',
          severity: 'warning',
          title: 'Lead mandek',
          detail: `Gak ada lead baru sejak ${days} hari lalu. Cek status campaign / budget pacing.`,
        });
      }
    }
  }

  // Converting, but below a healthy rate → warning.
  if (f.raw >= 50 && f.booking > 0 && conversion < 1) {
    out.push({
      id: 'low-conversion',
      severity: 'warning',
      title: 'Konversi rendah',
      detail: `Konversi lead→booking ${conversion.toFixed(1)}% di bawah ekspektasi. Tinjau funnel SVA→SPD→Booking.`,
    });
  }

  // High spam share erodes spend efficiency → warning.
  if (f.raw >= 50 && f.spam / f.raw > 0.3) {
    out.push({
      id: 'high-spam',
      severity: 'warning',
      title: 'Spam tinggi',
      detail: `${Math.round((f.spam / f.raw) * 100)}% lead terdeteksi spam. Perketat targeting / form.`,
    });
  }

  // Health-based call to action.
  if (c.health.status === 'off-track') {
    out.push({
      id: 'health-off',
      severity: 'critical',
      title: 'Campaign off track',
      detail: `Health score ${c.health.score}/100. Butuh intervensi prioritas.`,
    });
  } else if (c.health.status === 'on-track' && conversion >= 2) {
    out.push({
      id: 'scale',
      severity: 'opportunity',
      title: 'Kandidat scale-up',
      detail: `Funnel sehat (konversi ${conversion.toFixed(1)}%, health ${c.health.score}). Pertimbangkan naikkan budget.`,
    });
  }

  if (out.length === 0) {
    out.push({
      id: 'ok',
      severity: 'good',
      title: 'Tidak ada isu',
      detail: 'Metrik dalam rentang wajar. Lanjut pantau seperti biasa.',
    });
  }
  return out;
}

// -----------------------------------------------------------------------------
// AI Command Center — portfolio-wide aggregation (Phase C)
// -----------------------------------------------------------------------------

export const SEVERITY_RANK: Record<InsightSeverity, number> = { critical: 0, warning: 1, opportunity: 2, good: 3 };

export interface PortfolioInsight extends Insight {
  campaignName: string;
  health: number;
}

function pctChange(curr: number, prev: number): number | null {
  if (prev <= 0) return null;
  return ((curr - prev) / prev) * 100;
}

/** Trend rules across the two most recent periods (weekly preferred, monthly fallback). */
function trendInsights(c: LgpCampaign): Insight[] {
  const out: Insight[] = [];
  const periods: LgpPeriod[] = c.weekly && c.weekly.length >= 2 ? c.weekly : c.monthly ?? [];
  if (periods.length < 2) return out;
  const last = periods[periods.length - 1];
  const prev = periods[periods.length - 2];

  const leadChange = pctChange(last.raw, prev.raw);
  if (leadChange !== null && leadChange <= -30) {
    out.push({
      id: 'lead-drop',
      severity: 'warning',
      title: 'Lead turun tajam',
      detail: `Lead ${Math.round(leadChange)}% vs periode sebelumnya (${prev.raw} → ${last.raw}). Cek budget pacing / creative fatigue.`,
    });
  }

  const spendChange = pctChange(last.spend, prev.spend);
  const svdChange = pctChange(last.svd, prev.svd);
  if (spendChange !== null && spendChange >= 20 && svdChange !== null && svdChange <= -20) {
    out.push({
      id: 'spend-up-results-down',
      severity: 'critical',
      title: 'Spend naik, hasil turun',
      detail: `Spend +${Math.round(spendChange)}% tapi SPD ${Math.round(svdChange)}% vs periode lalu. Efisiensi memburuk.`,
    });
  }
  return out;
}

/**
 * Portfolio-wide AI Command Center insights: per-campaign rules + trend rules +
 * a portfolio-relative CPA check, flattened and ranked by severity then health.
 */
export function portfolioInsights(campaigns: LgpCampaign[], now: Date = new Date()): PortfolioInsight[] {
  const cpas = campaigns.map((c) => c.finance.cpa).filter((v) => v > 0);
  const avgCpa = cpas.length ? cpas.reduce((a, b) => a + b, 0) / cpas.length : 0;

  const out: PortfolioInsight[] = [];
  for (const c of campaigns) {
    const base = campaignInsights(c, now).filter((i) => i.severity !== 'good');
    const extra: Insight[] = [...trendInsights(c)];
    if (avgCpa > 0 && c.funnel.booking > 0 && c.finance.cpa > avgCpa * 1.5) {
      extra.push({
        id: 'cpa-high',
        severity: 'warning',
        title: 'CPA di atas rata-rata',
        detail: `CPA ${formatIDRCompact(c.finance.cpa)} jauh di atas rata-rata portfolio (${formatIDRCompact(Math.round(avgCpa))}).`,
      });
    }
    for (const ins of [...base, ...extra]) {
      out.push({ ...ins, campaignName: c.name, health: c.health.score });
    }
  }
  out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.health - b.health);
  return out;
}

export interface InsightCounts {
  critical: number;
  warning: number;
  opportunity: number;
}

export function insightCounts(items: PortfolioInsight[]): InsightCounts {
  return {
    critical: items.filter((i) => i.severity === 'critical').length,
    warning: items.filter((i) => i.severity === 'warning').length,
    opportunity: items.filter((i) => i.severity === 'opportunity').length,
  };
}
