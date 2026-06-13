import { differenceInCalendarDays, isValid, parseISO } from 'date-fns';
import type { LgpCampaign } from '@/types';

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
