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

export type ObjectiveStatus =
  | 'not-started'
  | 'in-progress'
  | 'on-track'
  | 'at-risk'
  | 'off-track'
  | 'completed';

export type Priority = 'low' | 'medium' | 'high';

export type MonthNumber = 1 | 2 | 3;

export type HealthStatus = 'on-track' | 'watch' | 'at-risk';

export type ActionItemStatus = 'open' | 'in-progress' | 'done';

/** Access roles (RBAC). */
export type Role = 'manager' | 'team-lead' | 'member' | 'vp';

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
  /** Work email — used to match a signed-in user to this member (access control). */
  email?: string;
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

/** A timestamped progress update / history-log entry on an objective. */
export interface ObjectiveUpdate {
  id: string;
  date: string;
  note: string;
  progress?: number;
  author?: string;
}

export interface Objective {
  id: string;
  /** Legacy 3-month plan grouping (optional in v2). */
  month?: MonthNumber;
  title: string;
  description?: string;
  /** Assigned member id; undefined = manager/team-level objective. */
  ownerId?: string;
  status: ObjectiveStatus;
  /** Completion percentage 0–100. */
  progress: number;
  priority?: Priority;
  startDate?: string;
  /** ISO due/end date. */
  dueDate?: string;
  successMetrics?: string;
  managerFeedback?: string;
  risks?: string;
  nextAction?: string;
  /** Progress updates / history log (most recent appended). */
  updates?: ObjectiveUpdate[];
  archived?: boolean;
  /** True when created/edited in-browser (local overlay). */
  local?: boolean;
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
  /** Campaigns/projects assigned to team members. */
  projects: Project[];
  /** Campaign KPIs synced from the LGP analytics engine. */
  lgpCampaigns: LgpCampaign[];
}

// -----------------------------------------------------------------------------
// LGP campaign KPIs (synced from the LGP analytics engine — see docs/LGP_SYNC.md)
// -----------------------------------------------------------------------------

export interface LgpPeriod {
  period: string;
  raw: number;
  submitted: number;
  interest: number;
  svs: number;
  svd: number;
  spend: number;
  cpl: number;
}

export interface LgpCampaign {
  name: string;
  products?: string;
  startDate: string;
  endDate: string;
  targets: { leads: number; visit: number; book: number; bookingValue: number };
  funnel: { raw: number; spam: number; unqualified: number; submitted: number; interest: number; svs: number; svd: number; booking: number };
  contribution: { pmkt: number; organic: number; socmed: number; other: number };
  ads: { spend: number; meta: number; google: number; tiktok: number };
  cost: { cpl: number; cpSubmit: number; cpInterest: number; cpSvd: number; cpBooking: number };
  /** Cost per acquisition (spend ÷ booking). Property business uses CPA, not ROAS. */
  finance: { cpa: number };
  health: { score: number; status: CampaignTrack };
  lastLead?: string | null;
  monthly: LgpPeriod[];
  weekly: LgpPeriod[];
}

// -----------------------------------------------------------------------------
// Campaign assignment (the platform layer on top of an LGP campaign)
// -----------------------------------------------------------------------------

export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'completed' | 'cancelled';

export interface CampaignTask {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  dueDate?: string;
  priority?: Priority;
  status: TaskStatus;
}

export interface CampaignWeeklyUpdate {
  id: string;
  date: string;
  progressSummary: string;
  achievement?: string;
  challenge?: string;
  risk?: string;
  supportNeeded?: string;
  nextAction?: string;
  author?: string;
}

export interface CampaignComment {
  id: string;
  date: string;
  author: string;
  text: string;
}

/** Manager assignment + execution data for one campaign (kept in a local overlay). */
export interface CampaignAssignment {
  campaignName: string;
  ownerId?: string;
  supportingIds?: string[];
  reviewerId?: string;
  priority?: Priority;
  startDate?: string;
  endDate?: string;
  targetKpi?: string;
  campaignType?: string;
  tasks?: CampaignTask[];
  weeklyUpdates?: CampaignWeeklyUpdate[];
  managerNotesPublic?: string;
  managerNotesInternal?: string;
  comments?: CampaignComment[];
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

/** Whether a campaign is tracking to plan. */
export type CampaignTrack = 'on-track' | 'off-track' | 'at-risk';

/** Delivery status for a delegated project. */
export type ProjectWorkStatus = 'not-started' | 'in-progress' | 'blocked' | 'completed' | 'cancelled';

/** A timestamped update / activity-timeline entry on a project. */
export interface ProjectUpdate {
  id: string;
  date: string;
  note: string;
  author?: string;
}

/**
 * A `Project` is either a marketing **campaign** (with KPI metrics + on/off-track
 * status) or a delegated **project** (with delivery status, progress %, blockers,
 * dependencies). `kind` discriminates the two; undefined defaults to 'campaign'
 * for backward compatibility. Campaign-only and project-only fields are optional.
 */
export interface Project {
  id: string;
  /** 'campaign' (default) or 'project' (delegated work). */
  kind?: 'campaign' | 'project';
  name: string;
  client?: string;
  description?: string;
  status?: ProjectStatus;
  /** Owner(s) handling this item. */
  ownerIds: string[];
  /** Supporting/assigned members (project assignment). */
  assignedMemberIds?: string[];
  priority?: Priority;

  // --- Campaign fields ---
  /** Overall on/off-track status (campaigns). */
  track: CampaignTrack;
  leads?: number;
  leadsTarget?: number;
  cpl?: number;
  cplTarget?: number;
  spend?: number;
  spendTarget?: number;

  // --- Project (delegation) fields ---
  projectStatus?: ProjectWorkStatus;
  /** Delivery progress 0–100. */
  progressPct?: number;
  dependencies?: string;
  blockers?: string;
  managerNotes?: string;
  updates?: ProjectUpdate[];

  startDate?: string;
  endDate?: string;
  dueDate?: string;
  notes?: string;
  /** True when created in-browser (not yet persisted to the sheet). */
  local?: boolean;
}
