/**
 * Sync LGP data from the Supabase "control center" (read-only) into the compact
 * per-campaign summary PMOS consumes (src/data/lgpCampaigns.json).
 *
 * The Supabase project "PMKT | Rumah123" is the single source of truth — this
 * script only READS it (projects + performance_data) and never writes back.
 *
 * Usage:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_KEY=<anon-or-service-key> \
 *   node scripts/sync-supabase.mjs
 *
 * The anon/publishable key works if RLS allows reads; otherwise use the
 * service-role key for a one-off pull (never commit it).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env: set SUPABASE_URL and SUPABASE_KEY');
  process.exit(1);
}

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function fetchAll(table, select) {
  const pageSize = 1000;
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}`, {
      headers: { ...headers, Range: `${from}-${from + pageSize - 1}`, 'Range-Unit': 'items' },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} — ${await res.text()}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

const num = (v) => Number(v) || 0;
const round = (n) => Math.round(n);
const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const safeDiv = (a, b) => (b > 0 ? round(a / b) : 0);
const monthKey = (d) => d.slice(0, 7);

/** ISO week label, e.g. "2026-W20". */
function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day + 3); // Thursday of this week
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((d - firstThu) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Lightweight health from the available (sparse) data — refined once full history lands. */
function health(raw, spend, submitted, interest, svd) {
  if (raw === 0 && spend === 0) return { score: 50, status: 'at-risk' };
  if (raw === 0 && spend > 0) return { score: 25, status: 'off-track' };
  const submitRate = raw > 0 ? submitted / raw : 0;
  const score = round(clamp(45 + 40 * submitRate + (interest > 0 ? 10 : 0) + (svd > 0 ? 5 : 0)));
  const status = score >= 70 ? 'on-track' : score >= 45 ? 'at-risk' : 'off-track';
  return { score, status };
}

function aggPeriods(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r.date);
    const e = m.get(k) ?? { period: k, raw: 0, submitted: 0, interest: 0, svs: 0, svd: 0, spend: 0 };
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

const projects = await fetchAll(
  'projects',
  'id,name,developer_name,status,start_date,end_date,kpi_leads,kpi_visit,kpi_booking,kpi_booking_value',
);
const perf = await fetchAll('performance_data', 'project_id,date,spend,leads,submit,spam,unqualified,interest,sva,spd,booking');

const byProject = new Map();
for (const r of perf) {
  if (!byProject.has(r.project_id)) byProject.set(r.project_id, []);
  byProject.get(r.project_id).push(r);
}

const campaigns = projects
  .map((p) => {
    const rows = byProject.get(p.id) ?? [];
    const sum = (f) => rows.reduce((s, r) => s + num(r[f]), 0);
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
      // performance_data has no channel split — all leads are PMKT-sourced here.
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

const outPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/lgpCampaigns.json');
writeFileSync(outPath, JSON.stringify(campaigns, null, 2) + '\n');
console.log(`✓ Wrote ${campaigns.length} campaigns (${perf.length} performance rows, ${byProject.size} with data) → ${outPath}`);
