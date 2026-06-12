import type {
  Assessment,
  DashboardData,
  ActionItem,
  ActionItemStatus,
  HealthStatus,
  Meeting,
  MeetingCategory,
  MonthNumber,
  Objective,
  ObjectiveStatus,
  PerformanceSnapshot,
  Priority,
  PeriodType,
  ProgramInfo,
  ReadinessArea,
  ReadinessMetric,
  TeamMember,
} from '@/types';
import type { DataSource } from './DataSource';
import { seedData } from './seedData';
import { lgpCampaigns } from './lgpData';

type Row = Record<string, string>;

interface GoogleSheetsOptions {
  sheetId: string;
  tabs: {
    teamMembers: string;
    objectives: string;
    actionItems: string;
    meetings: string;
    performance: string;
    assessments: string;
    readiness: string;
  };
}

// --- Minimal shape of a gviz response -------------------------------------
interface GvizCell {
  v: string | number | boolean | null;
  f?: string;
}
interface GvizResponse {
  status: string;
  errors?: { detailed_message?: string; message?: string }[];
  table: {
    cols: { id?: string; label?: string }[];
    rows: { c: (GvizCell | null)[] }[];
  };
}

/**
 * Reads the dashboard dataset from a public Google Sheet using the gviz
 * endpoint loaded as JSONP (a `<script>` tag with a `responseHandler`
 * callback). This deliberately avoids `fetch()` so there are **no CORS
 * constraints** — it works from any static host for any sheet shared
 * "Anyone with the link". No API key and no backend required.
 *
 * Each entity lives on its own tab; row 1 holds the column headers (matched
 * tolerantly to the field names in `src/types`). See `docs/GOOGLE_SHEETS.md`.
 *
 * The spreadsheet is the data-entry surface in phase 1; this adapter only
 * reads. Swapping to a database later means writing a new `DataSource` with the
 * same `fetchAll()` contract — no UI changes required.
 */
export class GoogleSheetsDataSource implements DataSource {
  readonly name = 'Google Sheets';
  private readonly opts: GoogleSheetsOptions;

  constructor(opts: GoogleSheetsOptions) {
    this.opts = opts;
  }

  private async fetchTab(tab: string): Promise<Row[]> {
    const id = encodeURIComponent(this.opts.sheetId);
    const sheet = encodeURIComponent(tab);
    const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?headers=1&sheet=${sheet}`;
    const response = await loadGvizJsonp(url);
    if (response.status === 'error') {
      const detail = response.errors?.[0]?.detailed_message ?? response.errors?.[0]?.message ?? 'unknown error';
      throw new Error(`Tab "${tab}" could not be read (${detail}). Is the sheet shared publicly and the tab named correctly?`);
    }
    return tableToRecords(response);
  }

  async fetchAll(): Promise<DashboardData> {
    const { tabs } = this.opts;
    const [teamRows, objRows, aiRows, mtgRows, perfRows, asmRows, rdyRows] = await Promise.all([
      this.fetchTab(tabs.teamMembers),
      this.fetchTab(tabs.objectives),
      this.fetchTab(tabs.actionItems),
      this.fetchTab(tabs.meetings),
      this.fetchTab(tabs.performance),
      this.fetchTab(tabs.assessments),
      this.fetchTab(tabs.readiness),
    ]);

    const data: DashboardData = {
      // Program profile is configuration, not tabular data — keep it from seed
      // until a settings surface exists.
      program: seedData.program as ProgramInfo,
      teamMembers: teamRows.map(toTeamMember),
      objectives: objRows.map(toObjective),
      actionItems: aiRows.map(toActionItem),
      meetings: mtgRows.map(toMeeting),
      performance: perfRows.map(toPerformance),
      assessments: asmRows.map(toAssessment),
      readiness: rdyRows.map(toReadiness),
      // Projects are managed in-app for now (created/assigned by the manager and
      // kept in a local overlay). A "Projects" sheet tab / DB table comes later.
      projects: [],
      lgpCampaigns,
    };

    // If every tab is empty, the sheet hasn't been populated yet — signal a
    // (recoverable) error so the app falls back to seed data with a clear hint.
    const isEmpty =
      data.teamMembers.length === 0 &&
      data.objectives.length === 0 &&
      data.actionItems.length === 0 &&
      data.meetings.length === 0 &&
      data.performance.length === 0 &&
      data.assessments.length === 0 &&
      data.readiness.length === 0;
    if (isEmpty) {
      throw new Error('The connected Google Sheet has no data yet — import your data into its tabs.');
    }

    return data;
  }
}

// -----------------------------------------------------------------------------
// JSONP loader + gviz table parsing
// -----------------------------------------------------------------------------

let jsonpCounter = 0;

/** Loads a gviz URL via a script tag and resolves the parsed response. */
function loadGvizJsonp(url: string): Promise<GvizResponse> {
  return new Promise((resolve, reject) => {
    const callbackName = `__gviz_cb_${Date.now()}_${jsonpCounter++}`;
    const script = document.createElement('script');

    const cleanup = () => {
      clearTimeout(timer);
      delete (window as unknown as Record<string, unknown>)[callbackName];
      script.remove();
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out loading the Google Sheet (check your connection / sheet sharing).'));
    }, 15000);

    (window as unknown as Record<string, unknown>)[callbackName] = (response: GvizResponse) => {
      cleanup();
      resolve(response);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Failed to load the Google Sheet. Make sure it is shared "Anyone with the link".'));
    };

    script.src = `${url}&tqx=responseHandler:${callbackName}`;
    document.body.appendChild(script);
  });
}

/** Converts a gviz response (with header row) into keyed string records. */
function tableToRecords(response: GvizResponse): Row[] {
  const { cols, rows } = response.table;
  const headers = cols.map((c, i) => {
    const label = (c.label ?? '').trim();
    return label || c.id || `col${i}`;
  });

  return rows
    .map((row) => {
      const record: Row = {};
      headers.forEach((header, i) => {
        const cell = row.c[i];
        const value = cell == null || cell.v == null ? '' : cell.v;
        record[header] = typeof value === 'string' ? value.trim() : String(value);
      });
      return record;
    })
    .filter((record) => Object.values(record).some((v) => v !== ''));
}

// -----------------------------------------------------------------------------
// Cell coercion helpers
// -----------------------------------------------------------------------------

/** Reads a cell trying several header aliases (case/spacing tolerant). */
function pick(row: Row, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] != null && row[key] !== '') return row[key];
    const norm = normKey(key);
    for (const actual of Object.keys(row)) {
      if (normKey(actual) === norm && row[actual] !== '') return row[actual];
    }
  }
  return '';
}

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function num(row: Row, ...keys: string[]): number {
  const raw = pick(row, ...keys);
  if (!raw) return 0;
  // strip thousands separators, currency symbols and stray spaces
  const cleaned = raw.replace(/[^0-9.\-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function bool(row: Row, ...keys: string[]): boolean {
  const raw = pick(row, ...keys).toLowerCase();
  return ['true', 'yes', '1', 'y', 'done', 'completed', 'complete'].includes(raw);
}

function list(row: Row, ...keys: string[]): string[] {
  const raw = pick(row, ...keys);
  if (!raw) return [];
  const sep = raw.includes('|') ? '|' : ',';
  return raw
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[\s_]+/g, '-');
}

function dateOrNull(row: Row, ...keys: string[]): string | null {
  const raw = pick(row, ...keys);
  return raw ? raw : null;
}

// -----------------------------------------------------------------------------
// Row → entity mappers
// -----------------------------------------------------------------------------

function toTeamMember(row: Row): TeamMember {
  return {
    id: pick(row, 'id') || `tm-${slug(pick(row, 'name'))}`,
    name: pick(row, 'name'),
    role: pick(row, 'role'),
    email: pick(row, 'email') || undefined,
    strengths: list(row, 'strengths'),
    developmentAreas: list(row, 'developmentAreas', 'development areas'),
    lastOneOnOne: dateOrNull(row, 'lastOneOnOne', 'last 1:1', 'last1on1'),
    nextOneOnOne: dateOrNull(row, 'nextOneOnOne', 'next 1:1', 'next1on1'),
    developmentProgress: num(row, 'developmentProgress', 'development progress'),
    health: normalizeHealth(pick(row, 'health', 'health status')),
    coachingFocus: pick(row, 'coachingFocus', 'coaching focus') || undefined,
    reportingUrl: pick(row, 'reportingUrl', 'reporting url', 'reporting sheet') || undefined,
    oneOnOneDocUrl: pick(row, 'oneOnOneDocUrl', 'one on one doc', '1:1 doc', '1on1 doc') || undefined,
  };
}

function toObjective(row: Row): Objective {
  const monthRaw = pick(row, 'month');
  return {
    id: pick(row, 'id'),
    month: monthRaw ? clampMonth(num(row, 'month')) : undefined,
    title: pick(row, 'title'),
    description: pick(row, 'description') || undefined,
    ownerId: pick(row, 'ownerId', 'owner id', 'owner') || undefined,
    status: normalizeObjectiveStatus(pick(row, 'status')),
    progress: num(row, 'progress'),
    priority: normalizePriority(pick(row, 'priority')),
    startDate: pick(row, 'startDate', 'start date') || undefined,
    dueDate: pick(row, 'dueDate', 'due date', 'endDate', 'end date') || undefined,
    successMetrics: pick(row, 'successMetrics', 'success metrics') || undefined,
    managerFeedback: pick(row, 'managerFeedback', 'manager feedback') || undefined,
    risks: pick(row, 'risks') || undefined,
    nextAction: pick(row, 'nextAction', 'next action') || undefined,
  };
}

function toActionItem(row: Row): ActionItem {
  return {
    id: pick(row, 'id'),
    title: pick(row, 'title'),
    owner: pick(row, 'owner'),
    teamMemberId: pick(row, 'teamMemberId', 'team member id') || undefined,
    status: normalizeActionStatus(pick(row, 'status')),
    dueDate: pick(row, 'dueDate', 'due date') || undefined,
    createdDate: pick(row, 'createdDate', 'created date') || undefined,
    source: pick(row, 'source') || undefined,
    delegated: bool(row, 'delegated'),
  };
}

function toMeeting(row: Row): Meeting {
  return {
    id: pick(row, 'id'),
    category: normalizeMeetingCategory(pick(row, 'category')),
    title: pick(row, 'title'),
    date: pick(row, 'date'),
    teamMemberId: pick(row, 'teamMemberId', 'team member id') || undefined,
    participants: list(row, 'participants'),
    summary: pick(row, 'summary'),
    notes: pick(row, 'notes') || undefined,
    tags: list(row, 'tags'),
  };
}

function toPerformance(row: Row): PerformanceSnapshot {
  return {
    id: pick(row, 'id'),
    periodType: normalizePeriodType(pick(row, 'periodType', 'period type')),
    period: pick(row, 'period'),
    label: pick(row, 'label'),
    leads: num(row, 'leads'),
    leadsTarget: num(row, 'leadsTarget', 'leads target'),
    cpl: num(row, 'cpl'),
    cplTarget: num(row, 'cplTarget', 'cpl target'),
    budget: num(row, 'budget'),
    budgetTarget: num(row, 'budgetTarget', 'budget target'),
    validRate: num(row, 'validRate', 'valid rate'),
    validRateTarget: num(row, 'validRateTarget', 'valid rate target'),
    conversionRate: num(row, 'conversionRate', 'conversion rate'),
    conversionRateTarget: num(row, 'conversionRateTarget', 'conversion rate target'),
    keyInsight: pick(row, 'keyInsight', 'key insight') || undefined,
    actionPlan: pick(row, 'actionPlan', 'action plan') || undefined,
    risk: pick(row, 'risk') || undefined,
  };
}

function toAssessment(row: Row): Assessment {
  return {
    id: pick(row, 'id'),
    projectName: pick(row, 'projectName', 'project name'),
    date: pick(row, 'date') || undefined,
    forecastCpl: num(row, 'forecastCpl', 'forecast cpl'),
    actualCpl: num(row, 'actualCpl', 'actual cpl'),
    forecastLeadVolume: num(row, 'forecastLeadVolume', 'forecast lead volume'),
    actualLeadVolume: num(row, 'actualLeadVolume', 'actual lead volume'),
    forecastInterestRate: num(row, 'forecastInterestRate', 'interest rate forecast', 'forecast interest rate'),
    actualInterestRate: num(row, 'actualInterestRate', 'actual interest rate'),
    completed: bool(row, 'completed'),
    notes: pick(row, 'notes') || undefined,
  };
}

function toReadiness(row: Row): ReadinessMetric {
  return {
    id: pick(row, 'id'),
    area: normalizeReadinessArea(pick(row, 'area')),
    name: pick(row, 'name'),
    month1: num(row, 'month1', 'month 1'),
    month2: num(row, 'month2', 'month 2'),
    month3: num(row, 'month3', 'month 3'),
    weight: num(row, 'weight') || undefined,
  };
}

// -----------------------------------------------------------------------------
// Enum normalizers — tolerant of human-typed values like "In Progress"
// -----------------------------------------------------------------------------

function clampMonth(n: number): MonthNumber {
  if (n <= 1) return 1;
  if (n >= 3) return 3;
  return 2;
}

function normalizeObjectiveStatus(value: string): ObjectiveStatus {
  const s = slug(value);
  if (s === 'completed' || s === 'complete' || s === 'done') return 'completed';
  if (s === 'on-track' || s === 'ontrack') return 'on-track';
  if (s === 'at-risk' || s === 'atrisk') return 'at-risk';
  if (s === 'off-track' || s === 'offtrack') return 'off-track';
  if (s === 'in-progress' || s === 'inprogress' || s === 'ongoing') return 'in-progress';
  return 'not-started';
}

function normalizePriority(value: string): Priority | undefined {
  const s = slug(value);
  if (s === 'high' || s === 'urgent' || s === 'p1') return 'high';
  if (s === 'low' || s === 'p3') return 'low';
  if (s === 'medium' || s === 'med' || s === 'p2') return 'medium';
  return undefined;
}

function normalizeActionStatus(value: string): ActionItemStatus {
  const s = slug(value);
  if (s === 'done' || s === 'completed' || s === 'complete' || s === 'closed') return 'done';
  if (s === 'in-progress' || s === 'inprogress' || s === 'ongoing') return 'in-progress';
  return 'open';
}

function normalizeHealth(value: string): HealthStatus {
  const s = slug(value);
  if (s === 'at-risk' || s === 'atrisk' || s === 'risk' || s === 'red') return 'at-risk';
  if (s === 'watch' || s === 'amber' || s === 'yellow') return 'watch';
  return 'on-track';
}

function normalizeMeetingCategory(value: string): MeetingCategory {
  const s = slug(value);
  if (s.includes('performance')) return 'performance-checkin';
  if (s.includes('client')) return 'client-meeting';
  if (s.includes('pmkt')) return 'pmkt-meeting';
  if (s.includes('assessment')) return 'assessment-discussion';
  return 'weekly-1on1';
}

function normalizeReadinessArea(value: string): ReadinessArea {
  const s = slug(value);
  if (s.includes('report')) return 'reporting';
  if (s.includes('assessment')) return 'assessment';
  if (s.includes('stakeholder')) return 'stakeholder-management';
  if (s.includes('delegat')) return 'delegation';
  return 'people-management';
}

function normalizePeriodType(value: string): PeriodType {
  return slug(value) === 'monthly' ? 'monthly' : 'weekly';
}
