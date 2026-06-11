/**
 * Exports the dashboard dataset (src/data/seedData.ts) into Google Sheets
 * import files:
 *   - one CSV per tab in google-sheets-data/
 *   - a single Management-PMKT.xlsx workbook (only if the optional `xlsx`
 *     package is installed) for one-click "Import → Replace spreadsheet"
 *
 * Run with:  node scripts/export-sheets.mjs
 * (Node 22.18+ strips the TypeScript types from the imported seed module.)
 *
 * Values are written so they survive the round-trip through Google Sheets:
 * dates stay as text (YYYY-MM-DD), numbers stay numeric, enums use friendly
 * labels that the dashboard's importer normalises.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedData } from '../src/data/seedData.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'google-sheets-data');
mkdirSync(outDir, { recursive: true });

// --- label maps ---
const OBJ_STATUS = { 'not-started': 'Not Started', 'in-progress': 'In Progress', completed: 'Completed' };
const ACT_STATUS = { open: 'Open', 'in-progress': 'In Progress', done: 'Done' };
const HEALTH = { 'on-track': 'On Track', watch: 'Watch', 'at-risk': 'At Risk' };
const MEETING = {
  'weekly-1on1': 'Weekly 1:1',
  'performance-checkin': 'Performance Check-in',
  'client-meeting': 'Client Meeting',
  'pmkt-meeting': 'PMKT Meeting',
  'assessment-discussion': 'Assessment Discussion',
};
const AREA = {
  'people-management': 'People Management',
  reporting: 'Reporting',
  assessment: 'Assessment',
  'stakeholder-management': 'Stakeholder Management',
  delegation: 'Delegation',
};

const yn = (b) => (b ? 'TRUE' : 'FALSE');
const listc = (a) => (a && a.length ? a.join(' | ') : '');
const txt = (v) => (v == null ? '' : v);

// --- build each tab as an array-of-arrays (row 1 = headers) ---
const tabs = [
  {
    name: 'TeamMembers',
    headers: ['id', 'name', 'role', 'strengths', 'developmentAreas', 'lastOneOnOne', 'nextOneOnOne', 'developmentProgress', 'health', 'coachingFocus'],
    rows: seedData.teamMembers.map((m) => [
      m.id, m.name, m.role, listc(m.strengths), listc(m.developmentAreas),
      txt(m.lastOneOnOne), txt(m.nextOneOnOne), m.developmentProgress, HEALTH[m.health], txt(m.coachingFocus),
    ]),
  },
  {
    name: 'Objectives',
    headers: ['id', 'month', 'title', 'description', 'status', 'progress', 'dueDate'],
    rows: seedData.objectives.map((o) => [o.id, o.month, o.title, txt(o.description), OBJ_STATUS[o.status], o.progress, txt(o.dueDate)]),
  },
  {
    name: 'ActionItems',
    headers: ['id', 'title', 'owner', 'teamMemberId', 'status', 'dueDate', 'createdDate', 'source', 'delegated'],
    rows: seedData.actionItems.map((a) => [
      a.id, a.title, a.owner, txt(a.teamMemberId), ACT_STATUS[a.status], txt(a.dueDate), txt(a.createdDate), txt(a.source), yn(a.delegated),
    ]),
  },
  {
    name: 'Meetings',
    headers: ['id', 'category', 'title', 'date', 'teamMemberId', 'participants', 'summary', 'notes', 'tags'],
    rows: seedData.meetings.map((m) => [
      m.id, MEETING[m.category], m.title, m.date, txt(m.teamMemberId), listc(m.participants), m.summary, txt(m.notes), listc(m.tags),
    ]),
  },
  {
    name: 'PerformanceKPIs',
    headers: ['id', 'periodType', 'period', 'label', 'leads', 'leadsTarget', 'cpl', 'cplTarget', 'budget', 'budgetTarget', 'validRate', 'validRateTarget', 'conversionRate', 'conversionRateTarget', 'keyInsight', 'actionPlan', 'risk'],
    rows: seedData.performance.map((p) => [
      p.id, p.periodType, p.period, p.label, p.leads, p.leadsTarget, p.cpl, p.cplTarget, p.budget, p.budgetTarget,
      p.validRate, p.validRateTarget, p.conversionRate, p.conversionRateTarget, txt(p.keyInsight), txt(p.actionPlan), txt(p.risk),
    ]),
  },
  {
    name: 'Assessments',
    headers: ['id', 'projectName', 'date', 'forecastCpl', 'actualCpl', 'forecastLeadVolume', 'actualLeadVolume', 'forecastInterestRate', 'actualInterestRate', 'completed', 'notes'],
    rows: seedData.assessments.map((a) => [
      a.id, a.projectName, txt(a.date), a.forecastCpl, a.actualCpl, a.forecastLeadVolume, a.actualLeadVolume, a.forecastInterestRate, a.actualInterestRate, yn(a.completed), txt(a.notes),
    ]),
  },
  {
    name: 'ReadinessMetrics',
    headers: ['id', 'area', 'name', 'month1', 'month2', 'month3', 'weight'],
    rows: seedData.readiness.map((r) => [r.id, AREA[r.area], r.name, r.month1, r.month2, r.month3, txt(r.weight)]),
  },
];

// --- CSV output ---
const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (aoa) => aoa.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

for (const tab of tabs) {
  const aoa = [tab.headers, ...tab.rows];
  writeFileSync(join(outDir, `${tab.name}.csv`), toCsv(aoa), 'utf8');
  console.log(`✓ ${tab.name}.csv (${tab.rows.length} rows)`);
}

// --- Optional XLSX output (one workbook, all tabs) ---
try {
  const mod = await import('xlsx');
  const XLSX = mod.utils ? mod : mod.default;
  const wb = XLSX.utils.book_new();
  for (const tab of tabs) {
    const ws = XLSX.utils.aoa_to_sheet([tab.headers, ...tab.rows]);
    XLSX.utils.book_append_sheet(wb, ws, tab.name);
  }
  XLSX.writeFile(wb, join(outDir, 'Management-PMKT.xlsx'));
  console.log('✓ Management-PMKT.xlsx (all 7 tabs)');
} catch {
  console.log('• Skipped XLSX (install the "xlsx" package to also emit a workbook).');
}

console.log(`\nDone → ${outDir}`);
