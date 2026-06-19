import type { DashboardData, LgpCampaign, LgpPeriod, CampaignTrack } from '@/types';
import type { DataSource } from './DataSource';

/** Rows we read from Supabase (read-only). */
interface ProjectRow {
  id: string;
  name: string;
  developer_name: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  kpi_leads: number | null;
  kpi_visit: number | null;
  kpi_booking: number | null;
  kpi_booking_value: number | null;
}
interface PerfRow {
  project_id: string;
  date: string;
  spend: number | null;
  leads: number | null;
  submit: number | null;
  spam: number | null;
  unqualified: number | null;
  interest: number | null;
  sva: number | null;
  spd: number | null;
  booking: number | null;
}

const num = (v: unknown) => Number(v) || 0;
const round = (n: number) => Math.round(n);
const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const safeDiv = (a: number, b: number) => (b > 0 ? round(a / b) : 0);
const monthKey = (d: string) => d.slice(0, 7);

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((d.getTime() - firstThu.getTime()) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function health(raw: number, spend: number, submitted: number, interest: number, svd: number): { score: number; status: CampaignTrack } {
  if (raw === 0 && spend === 0) return { score: 50, status: 'at-risk' };
  if (raw === 0 && spend > 0) return { score: 25, status: 'off-track' };
  const submitRate = raw > 0 ? submitted / raw : 0;
  const score = round(clamp(45 + 40 * submitRate + (interest > 0 ? 10 : 0) + (svd > 0 ? 5 : 0)));
  const status: CampaignTrack = score >= 70 ? 'on-track' : score >= 45 ? 'at-risk' : 'off-track';
  return { score, status };
}

function aggPeriods(rows: PerfRow[], keyFn: (d: string) => string): LgpPeriod[] {
  const m = new Map<string, LgpPeriod>();
  for (const r of rows) {
    const k = keyFn(r.date);
    const e = m.get(k) ?? { period: k, raw: 0, submitted: 0, interest: 0, svs: 0, svd: 0, spend: 0, cpl: 0 };
    e.raw += num(r.leads);
    e.submitted += num(r.submit);
    e.interest += num(r.interest);
    e.svs += num(r.sva);
    e.svd += num(r.spd);
    e.spend += num(r.spend);
    m.set(k, e);
  }
  return [...m.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((e) => ({ ...e, spend: round(e.spend), cpl: safeDiv(e.spend, e.raw) }));
}

function toCampaigns(projects: ProjectRow[], perf: PerfRow[]): LgpCampaign[] {
  const byProject = new Map<string, PerfRow[]>();
  for (const r of perf) {
    const list = byProject.get(r.project_id) ?? [];
    list.push(r);
    byProject.set(r.project_id, list);
  }
  return projects
    .map((p): LgpCampaign => {
      const rows = byProject.get(p.id) ?? [];
      const sum = (f: keyof PerfRow) => rows.reduce((s, r) => s + num(r[f]), 0);
      const raw = sum('leads');
      const spend = round(sum('spend'));
      const submitted = sum('submit');
      const interest = sum('interest');
      const svd = sum('spd');
      const booking = sum('booking');
      const lastLead = rows.filter((r) => num(r.leads) > 0).map((r) => r.date).sort().pop() ?? null;
      return {
        name: p.name,
        ...(p.developer_name ? { products: p.developer_name } : {}),
        startDate: p.start_date ?? '',
        endDate: p.end_date ?? '',
        targets: { leads: num(p.kpi_leads), visit: num(p.kpi_visit), book: num(p.kpi_booking), bookingValue: num(p.kpi_booking_value) },
        funnel: { raw, spam: sum('spam'), unqualified: sum('unqualified'), submitted, interest, svs: sum('sva'), svd, booking },
        contribution: { pmkt: raw, organic: 0, socmed: 0, other: 0 },
        ads: { spend, meta: 0, google: 0, tiktok: 0 },
        cost: {
          cpl: safeDiv(spend, raw),
          cpSubmit: safeDiv(spend, submitted),
          cpInterest: safeDiv(spend, interest),
          cpSvd: safeDiv(spend, svd),
          cpBooking: safeDiv(spend, booking),
        },
        finance: { cpa: safeDiv(spend, booking) },
        health: health(raw, spend, submitted, interest, svd),
        lastLead,
        monthly: aggPeriods(rows, monthKey),
        weekly: aggPeriods(rows, isoWeek),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Reads LGP campaigns live from the Supabase control center (read-only) and
 * overlays them onto a base dataset from the inner source (Google Sheets/seed),
 * which still supplies team members, meetings, etc. The source is never mutated.
 */
export class SupabaseDataSource implements DataSource {
  readonly name: string;

  constructor(
    private readonly inner: DataSource,
    private readonly cfg: { url: string; anonKey: string },
  ) {
    this.name = `Supabase LGP + ${inner.name}`;
  }

  private async select<T>(table: string, columns: string): Promise<T[]> {
    const res = await fetch(`${this.cfg.url}/rest/v1/${table}?select=${columns}&limit=2000`, {
      headers: { apikey: this.cfg.anonKey, Authorization: `Bearer ${this.cfg.anonKey}` },
    });
    if (!res.ok) throw new Error(`Supabase ${table}: HTTP ${res.status}`);
    return (await res.json()) as T[];
  }

  async fetchAll(): Promise<DashboardData> {
    const base = await this.inner.fetchAll();
    const [projects, perf] = await Promise.all([
      this.select<ProjectRow>('projects', 'id,name,developer_name,status,start_date,end_date,kpi_leads,kpi_visit,kpi_booking,kpi_booking_value'),
      this.select<PerfRow>('performance_data', 'project_id,date,spend,leads,submit,spam,unqualified,interest,sva,spd,booking'),
    ]);
    const lgpCampaigns = toCampaigns(projects, perf);
    // If Supabase returned nothing (e.g. RLS blocks anon), keep the base campaigns.
    return lgpCampaigns.length > 0 ? { ...base, lgpCampaigns } : base;
  }
}
