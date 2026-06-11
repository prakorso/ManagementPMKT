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
  PeriodType,
  ProgramInfo,
  ReadinessArea,
  ReadinessMetric,
  TeamMember,
} from '@/types';
import type { DataSource } from './DataSource';
import { parseCsvToRecords } from './csv';
import { seedData } from './seedData';

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

/**
 * Reads the dashboard dataset from a public Google Sheet using the read-only
 * CSV (gviz) export — no API key, no backend, works from a static Netlify build.
 *
 * Each entity lives on its own tab; row 1 holds the column headers. The expected
 * columns mirror the field names in `src/types`. See `docs/GOOGLE_SHEETS.md`.
 *
 * The spreadsheet is the data-entry surface in phase 1; this adapter only reads.
 * Swapping to a database later means writing a new `DataSource` with the same
 * `fetchAll()` contract — no UI changes required.
 */
export class GoogleSheetsDataSource implements DataSource {
  readonly name = 'Google Sheets';
  private readonly opts: GoogleSheetsOptions;

  constructor(opts: GoogleSheetsOptions) {
    this.opts = opts;
  }

  private tabUrl(tab: string): string {
    const id = encodeURIComponent(this.opts.sheetId);
    const sheet = encodeURIComponent(tab);
    return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${sheet}`;
  }

  private async fetchTab(tab: string): Promise<Row[]> {
    const res = await fetch(this.tabUrl(tab));
    if (!res.ok) {
      throw new Error(`Failed to load tab "${tab}" (HTTP ${res.status}). Is the sheet shared publicly?`);
    }
    const text = await res.text();
    return parseCsvToRecords(text);
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

    return {
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
    };
  }
}

// -----------------------------------------------------------------------------
// Cell coercion helpers
// -----------------------------------------------------------------------------

/** Reads a cell trying several header aliases (case/spacing tolerant). */
function pick(row: Row, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] != null && row[key] !== '') return row[key];
    // tolerant lookup: ignore case and non-alphanumerics
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
    strengths: list(row, 'strengths'),
    developmentAreas: list(row, 'developmentAreas', 'development areas'),
    lastOneOnOne: dateOrNull(row, 'lastOneOnOne', 'last 1:1', 'last1on1'),
    nextOneOnOne: dateOrNull(row, 'nextOneOnOne', 'next 1:1', 'next1on1'),
    developmentProgress: num(row, 'developmentProgress', 'development progress'),
    health: normalizeHealth(pick(row, 'health', 'health status')),
    coachingFocus: pick(row, 'coachingFocus', 'coaching focus') || undefined,
  };
}

function toObjective(row: Row): Objective {
  return {
    id: pick(row, 'id'),
    month: clampMonth(num(row, 'month')),
    title: pick(row, 'title'),
    description: pick(row, 'description') || undefined,
    status: normalizeObjectiveStatus(pick(row, 'status')),
    progress: num(row, 'progress'),
    dueDate: pick(row, 'dueDate', 'due date') || undefined,
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
  if (s === 'in-progress' || s === 'inprogress' || s === 'ongoing') return 'in-progress';
  return 'not-started';
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
