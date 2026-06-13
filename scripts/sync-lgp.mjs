/**
 * LGP → Performance Platform sync layer.
 *
 * Reads the LGP analytics-engine exports (project_index.csv, ads.csv, leads.csv)
 * and aggregates them into a COMPACT per-campaign KPI summary the dashboard can
 * consume. We never ship the raw 53 MB leads.csv — only the small summary.
 *
 * Usage:  LGP_DIR=/path/to/lgp-dashboard node scripts/sync-lgp.mjs
 *         (defaults LGP_DIR to ./lgp-source)
 *
 * Funnel definitions are taken verbatim from the LGP dashboard:
 *   RAW       = every lead (date-scoped to the campaign's active period)
 *   Submitted = submit_date_to_developer present
 *   Interest  = feedback_call_pmkt OR last_contact_category contains "interest"
 *   SVS       = site_visit_status non-empty
 *   SVD       = site_visit_status contains today/done/won/booking
 *   Booking   = site_visit_status contains "booking" (approx; real bookings live
 *               in a separate pipeline not present in these CSVs)
 *   Source    = contribution_category → PMKT / Organic / Socmed / Other
 *
 * Architecture note: this script is the swappable data-sync seam. Today it reads
 * CSVs; later it can read Supabase/Postgres and emit the same summary shape.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const LGP_DIR = process.env.LGP_DIR || join(here, '..', 'lgp-source');
const OUT = join(here, '..', 'src', 'data', 'lgpCampaigns.json');
const TODAY = process.env.SYNC_TODAY || new Date().toISOString().slice(0, 10);
const RECENT_CUTOFF = '2025-06-01'; // only keep campaigns ending on/after this

// --- minimal quoted-CSV parser ---------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const num = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0; };
const classifySource = (s) => {
  const x = String(s || '').toLowerCase();
  if (x.includes('pmkt')) return 'pmkt';
  if (x.includes('organic')) return 'organic';
  if (x.includes('socmed')) return 'socmed';
  return 'other';
};
const isoWeek = (d) => {
  const dt = new Date(d + 'T00:00:00Z');
  const day = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((dt - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

// --- 1. project_index → active campaign per name ---------------------------
console.log('Reading project_index.csv …');
const piRows = parseCsv(readFileSync(join(LGP_DIR, 'project_index.csv'), 'utf8'));
const piHeader = piRows[0];
const col = (r, name) => r[piHeader.indexOf(name)] ?? '';

const byName = new Map(); // name -> chosen period row
for (let i = 1; i < piRows.length; i++) {
  const r = piRows[i];
  if (col(r, 'show_in_dashboard') !== 'YES') continue;
  const name = col(r, 'name');
  const start = col(r, 'start_date');
  const end = col(r, 'end_date');
  if (!name || end < RECENT_CUTOFF) continue;
  const prev = byName.get(name);
  // Prefer the period that contains today; otherwise the latest start_date.
  const contains = start <= TODAY && TODAY <= end;
  if (!prev) byName.set(name, { r, start, end, contains });
  else if (contains && !prev.contains) byName.set(name, { r, start, end, contains });
  else if (contains === prev.contains && start > prev.start) byName.set(name, { r, start, end, contains });
}

const campaigns = [];
const matchToCampaign = new Map(); // any lead/ads project_name -> campaign object
for (const [name, { r, start, end }] of byName) {
  const merge = col(r, 'merge_breakdown') === 'Merge';
  const lsq = col(r, 'lsq_project_name');
  const matchNames = merge && lsq ? lsq.split(',').map((s) => s.trim()).filter(Boolean) : [name];
  const c = {
    name,
    products: col(r, 'products') || undefined,
    startDate: start,
    endDate: end,
    targets: { leads: num(col(r, 'kpi_leads')), visit: num(col(r, 'kpi_visit')), book: num(col(r, 'kpi_book')), bookingValue: num(col(r, 'kpi_booking_value')) },
    lgpValue: num(col(r, 'lgp_value')),
    actCost: num(col(r, 'act_cost')),
    funnel: { raw: 0, spam: 0, unqualified: 0, submitted: 0, interest: 0, svs: 0, svd: 0, booking: 0 },
    contribution: { pmkt: 0, organic: 0, socmed: 0, other: 0 },
    ads: { spend: 0, meta: 0, google: 0, tiktok: 0 },
    _m: new Map(), // monthKey -> {raw,submitted,interest,svs,svd,spend}
    _w: new Map(),
    lastLead: '',
  };
  campaigns.push(c);
  for (const mn of matchNames) if (!matchToCampaign.has(mn)) matchToCampaign.set(mn, c);
}
console.log(`Active campaigns: ${campaigns.length}`);

const monthBucket = (c, mk) => { let b = c._m.get(mk); if (!b) { b = { raw: 0, submitted: 0, interest: 0, svs: 0, svd: 0, spend: 0 }; c._m.set(mk, b); } return b; };
const weekBucket = (c, wk) => { let b = c._w.get(wk); if (!b) { b = { raw: 0, submitted: 0, interest: 0, svs: 0, svd: 0, spend: 0 }; c._w.set(wk, b); } return b; };

// --- 2. leads.csv → funnel (date-scoped) -----------------------------------
console.log('Reading leads.csv (large) …');
const leadRows = parseCsv(readFileSync(join(LGP_DIR, 'leads.csv'), 'utf8'));
const lh = leadRows[0];
const L = (name) => lh.indexOf(name);
const Lproj = L('project_name'), Ldt = L('lead_datetime'), Lsvs = L('site_visit_status'),
  Lsub = L('submit_date_to_developer'), Lcat = L('last_contact_category'), Lfb = L('feedback_call_pmkt'),
  Lcontrib = L('contribution_category'), Lam = L('col_am');

for (let i = 1; i < leadRows.length; i++) {
  const r = leadRows[i];
  const c = matchToCampaign.get(r[Lproj]);
  if (!c) continue;
  const date = (r[Ldt] || '').slice(0, 10);
  if (!date || date < c.startDate || date > c.endDate) continue;
  const svs = (r[Lsvs] || '').toLowerCase();
  const submitted = (r[Lsub] || '') !== '';
  const interest = (r[Lfb] || '').toLowerCase().includes('interest') || (r[Lcat] || '').toLowerCase().includes('interest');
  const hasSvs = (r[Lsvs] || '').trim() !== '';
  const svd = svs.includes('today') || svs.includes('done') || svs.includes('won') || svs.includes('booking');
  const booking = svs.includes('booking');

  const am = (r[Lam] || '').toLowerCase();
  c.funnel.raw++;
  if (am.includes('spam')) c.funnel.spam++;
  if (am.includes('unqualified')) c.funnel.unqualified++;
  if (submitted) c.funnel.submitted++;
  if (interest) c.funnel.interest++;
  if (hasSvs) c.funnel.svs++;
  if (svd) c.funnel.svd++;
  if (booking) c.funnel.booking++;
  c.contribution[classifySource(r[Lcontrib])]++;
  if (r[Ldt] > c.lastLead) c.lastLead = r[Ldt];

  const mb = monthBucket(c, date.slice(0, 7));
  mb.raw++; if (submitted) mb.submitted++; if (interest) mb.interest++; if (hasSvs) mb.svs++; if (svd) mb.svd++;
  const wb = weekBucket(c, isoWeek(date));
  wb.raw++; if (submitted) wb.submitted++; if (interest) wb.interest++; if (hasSvs) wb.svs++; if (svd) wb.svd++;
}

// --- 3. ads.csv → spend (date-scoped) --------------------------------------
console.log('Reading ads.csv …');
const adsRows = parseCsv(readFileSync(join(LGP_DIR, 'ads.csv'), 'utf8'));
const ah = adsRows[0];
const Adate = ah.indexOf('date'), Aproj = ah.indexOf('project_name'), Aplat = ah.indexOf('platform'), Aspend = ah.indexOf('spend');
for (let i = 1; i < adsRows.length; i++) {
  const r = adsRows[i];
  const c = matchToCampaign.get(r[Aproj]);
  if (!c) continue;
  const date = (r[Adate] || '').slice(0, 10);
  if (!date || date < c.startDate || date > c.endDate) continue;
  const spend = num(r[Aspend]);
  c.ads.spend += spend;
  const plat = (r[Aplat] || '').toLowerCase();
  if (plat === 'meta') c.ads.meta += spend; else if (plat === 'google') c.ads.google += spend; else if (plat === 'tiktok') c.ads.tiktok += spend;
  const mb = monthBucket(c, date.slice(0, 7)); mb.spend += spend;
  const wb = weekBucket(c, isoWeek(date)); wb.spend += spend;
}

// --- 4. derive cost + health + status, finalise ----------------------------
const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const cp = (spend, n) => (n > 0 ? Math.round(spend / n) : 0);
const lastN = (map, n) => [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-n)
  .map(([period, v]) => ({ period, ...v, cpl: cp(v.spend, v.raw) }));

const out = campaigns.map((c) => {
  const f = c.funnel, a = c.ads;
  const cost = { cpl: cp(a.spend, f.raw), cpSubmit: cp(a.spend, f.submitted), cpInterest: cp(a.spend, f.interest), cpSvd: cp(a.spend, f.svd), cpBooking: cp(a.spend, f.booking) };
  // Health V1: lead 40% + booking 40% + cost efficiency 20%.
  const leadAch = c.targets.leads > 0 ? clamp(f.raw / c.targets.leads) : 0;
  const bookingAch = c.targets.book > 0 ? clamp(f.booking / c.targets.book) : (c.targets.visit > 0 ? clamp(f.svd / c.targets.visit) : leadAch);
  const targetCpl = c.targets.leads > 0 ? (c.actCost > 0 ? c.actCost : c.lgpValue) / c.targets.leads : 0;
  const costEff = targetCpl > 0 && cost.cpl > 0 ? clamp(targetCpl / cost.cpl) : 0.5;
  const score = Math.round((leadAch * 0.4 + bookingAch * 0.4 + costEff * 0.2) * 100);
  const status = score >= 80 ? 'on-track' : score >= 60 ? 'at-risk' : 'off-track';
  // Finance (estimates from project_index targets — refined when real booking/revenue data lands).
  const valuePerBooking = c.targets.book > 0 && c.targets.bookingValue > 0 ? c.targets.bookingValue / c.targets.book : 0;
  const revenue = Math.round(f.booking * valuePerBooking);
  const cpa = f.booking > 0 ? Math.round(a.spend / f.booking) : 0;
  const roas = a.spend > 0 ? Number((revenue / a.spend).toFixed(2)) : 0;
  return {
    name: c.name, products: c.products, startDate: c.startDate, endDate: c.endDate,
    targets: c.targets, funnel: f, contribution: c.contribution, ads: a, cost,
    finance: { revenue, cpa, roas },
    health: { score, status }, lastLead: c.lastLead ? c.lastLead.slice(0, 10) : null,
    monthly: lastN(c._m, 12), weekly: lastN(c._w, 12),
  };
}).filter((c) => c.funnel.raw > 0 || c.ads.spend > 0)
  .sort((a, b) => b.ads.spend - a.ads.spend);

writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), source: 'LGP CSV exports', count: out.length, campaigns: out }, null, 2));
console.log(`✓ Wrote ${out.length} campaigns → ${OUT}`);
const aerium = out.find((c) => c.name.includes('Aerium at Taman'));
if (aerium) console.log('Aerium check:', JSON.stringify({ raw: aerium.funnel.raw, svd: aerium.funnel.svd, booking: aerium.funnel.booking, spend: aerium.ads.spend, cpl: aerium.cost.cpl, health: aerium.health }));
