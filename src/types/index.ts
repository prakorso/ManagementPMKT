/**
 * Domain model for the Manager Development Dashboard.
 *
 * These types are the single source of truth shared by every data source
 * (seed data, Google Sheets, and — in the future — a database). Because the
 * application only ever consumes `DashboardData`, swapping the underlying
 * storage is a matter of writing a new `DataSource` that returns this shape.
 */

// -----------------------------------------------------------------------------
// Shared enums / unions
// -----------------------------------------------------------------------------

export type ObjectiveStatus = 'not-started' | 'in-progress' | 'completed';

export type MonthNumber = 1 | 2 | 3;

export type HealthStatus = 'on-track' | 'watch' | 'at-risk';

export type ActionItemStatus = 'open' | 'in-progress' | 'done';

export type MeetingCategory =
  | 'weekly-1on1'
  | 'performance-checkin'
  | 'client-meeting'
  | 'pmkt-meeting'
  | 'assessment-discussion';

export type ReadinessArea =
  | 'people-management'
  | 'reporting'
  | 'assessment'
  | 'stakeholder-management'
  | 'delegation';

export type PeriodType = 'weekly' | 'monthly';

// -----------------------------------------------------------------------------
// Program / profile
// -----------------------------------------------------------------------------

/** High-level information about the manager and the 3-month transition program. */
export interface ProgramInfo {
  managerName: string;
  previousRole: string;
  currentRole: string;
  /** ISO date marking the start of the transition (Month 1, Week 1). */
  programStartDate: string;
  team: string;
}

// -----------------------------------------------------------------------------
// Team management
// -----------------------------------------------------------------------------

export interface TeamMember {
  id: string;
  name: string;
  /** Job title / role shown under the member's name. */
  role: string;
  strengths: string[];
  developmentAreas: string[];
  /** ISO date of the most recent completed 1:1, or null if none yet. */
  lastOneOnOne: string | null;
  /** ISO date of the next scheduled 1:1, or null if unscheduled. */
  nextOneOnOne: string | null;
  /** Overall development progress for this report, 0–100. */
  developmentProgress: number;
  health: HealthStatus;
  coachingFocus?: string;
  /** Link to the member's reporting sheet (filled by the member/manager). */
  reportingUrl?: string;
  /** Link to the member's 1:1 doc (e.g. a shared Google Doc). */
  oneOnOneDocUrl?: string;
  /** True when added in-browser (not yet persisted to the sheet). */
  local?: boolean;
  /** Batch 2: projects this member is assigned to handle. */
  projectIds?: string[];
}

// -----------------------------------------------------------------------------
// Objectives (3-month development plan)
// -----------------------------------------------------------------------------

export interface Objective {
  id: string;
  month: MonthNumber;
  title: string;
  description?: string;
  status: ObjectiveStatus;
  /** Completion percentage 0–100. */
  progress: number;
  /** ISO due date (optional). */
  dueDate?: string;
}

// -----------------------------------------------------------------------------
// Action items
// -----------------------------------------------------------------------------

export interface ActionItem {
  id: string;
  title: string;
  owner: string;
  /** Links the item to a team member where relevant. */
  teamMemberId?: string;
  status: ActionItemStatus;
  dueDate?: string;
  createdDate?: string;
  /** Where this item originated, e.g. a 1:1 or check-in. */
  source?: string;
  /** True when this represents work the manager delegated to the team. */
  delegated?: boolean;
}

// -----------------------------------------------------------------------------
// Meetings & coaching notes
// -----------------------------------------------------------------------------

export interface Meeting {
  id: string;
  category: MeetingCategory;
  title: string;
  date: string;
  /** Linked team member for 1:1s / coaching sessions. */
  teamMemberId?: string;
  participants?: string[];
  summary: string;
  notes?: string;
  tags?: string[];
}

// -----------------------------------------------------------------------------
// Performance reporting (Dev Biz)
// -----------------------------------------------------------------------------

export interface PerformanceSnapshot {
  id: string;
  periodType: PeriodType;
  /** Sort key, e.g. "2026-W23" or "2026-06". */
  period: string;
  /** Human label, e.g. "Week 3" or "June". */
  label: string;
  leads: number;
  leadsTarget: number;
  /** Cost per lead (currency units). */
  cpl: number;
  cplTarget: number;
  budget: number;
  budgetTarget: number;
  /** Valid lead rate, percentage 0–100. */
  validRate: number;
  validRateTarget: number;
  /** Conversion rate, percentage 0–100. */
  conversionRate: number;
  conversionRateTarget: number;
  keyInsight?: string;
  actionPlan?: string;
  risk?: string;
}

// -----------------------------------------------------------------------------
// Assessment & forecasting
// -----------------------------------------------------------------------------

export interface Assessment {
  id: string;
  projectName: string;
  date?: string;
  forecastCpl: number;
  actualCpl: number;
  forecastLeadVolume: number;
  actualLeadVolume: number;
  /** Forecast interest/qualified rate, percentage 0–100. */
  forecastInterestRate: number;
  actualInterestRate: number;
  completed: boolean;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Manager readiness
// -----------------------------------------------------------------------------

export interface ReadinessMetric {
  id: string;
  area: ReadinessArea;
  name: string;
  /** Score 0–100 for each month of the program (trend over time). */
  month1: number;
  month2: number;
  month3: number;
  /** Relative weight inside its area (defaults to 1 when omitted). */
  weight?: number;
}

// -----------------------------------------------------------------------------
// Aggregate bundle
// -----------------------------------------------------------------------------

/** The complete dataset every page is rendered from. */
export interface DashboardData {
  program: ProgramInfo;
  teamMembers: TeamMember[];
  objectives: Objective[];
  actionItems: ActionItem[];
  meetings: Meeting[];
  performance: PerformanceSnapshot[];
  assessments: Assessment[];
  readiness: ReadinessMetric[];
}

// -----------------------------------------------------------------------------
// Batch 2 (planned) — multi-project support.
//
// These optional types let the schema grow toward per-project objective/
// performance tracking and a campaign overview without breaking phase-1 data.
// Team members get assigned `projectIds` (above); objectives, performance
// snapshots and assessments will gain an optional `projectId`. See ROADMAP.md.
// -----------------------------------------------------------------------------

export type ProjectStatus = 'active' | 'paused' | 'completed';

export interface Project {
  id: string;
  name: string;
  client?: string;
  status?: ProjectStatus;
  /** Team members handling this project. */
  ownerIds?: string[];
  startDate?: string;
  endDate?: string;
}
