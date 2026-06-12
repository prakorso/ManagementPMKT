import { differenceInCalendarDays, isBefore, isValid, parseISO } from 'date-fns';
import type {
  ActionItem,
  Assessment,
  DashboardData,
  MonthNumber,
  Objective,
  PerformanceSnapshot,
  Project,
  ReadinessArea,
  ReadinessMetric,
  TeamMember,
} from '@/types';

export type MonthKey = 'month1' | 'month2' | 'month3';
export const MONTH_KEYS: MonthKey[] = ['month1', 'month2', 'month3'];

/** Days that make up one program "month". */
const PROGRAM_MONTH_DAYS = 30;
const PROGRAM_TOTAL_DAYS = PROGRAM_MONTH_DAYS * 3;

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n);
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

// -----------------------------------------------------------------------------
// Program timing
// -----------------------------------------------------------------------------

export interface ProgramTiming {
  currentMonth: MonthNumber;
  currentMonthKey: MonthKey;
  dayInProgram: number;
  totalDays: number;
  percentElapsed: number;
}

export function getProgramTiming(programStartDate: string, now: Date = new Date()): ProgramTiming {
  const start = parseISO(programStartDate);
  const daysSinceStart = isValid(start) ? Math.max(0, differenceInCalendarDays(now, start)) : 0;
  const monthIndex = Math.min(3, Math.floor(daysSinceStart / PROGRAM_MONTH_DAYS) + 1) as MonthNumber;
  return {
    currentMonth: monthIndex,
    currentMonthKey: (`month${monthIndex}` as MonthKey),
    dayInProgram: Math.min(daysSinceStart + 1, PROGRAM_TOTAL_DAYS),
    totalDays: PROGRAM_TOTAL_DAYS,
    percentElapsed: clamp((daysSinceStart / PROGRAM_TOTAL_DAYS) * 100),
  };
}

// -----------------------------------------------------------------------------
// Objectives
// -----------------------------------------------------------------------------

export function objectivesForMonth(objectives: Objective[], month: MonthNumber): Objective[] {
  return objectives.filter((o) => o.month === month);
}

/** Average completion (%) of a month's objectives. */
export function monthProgress(objectives: Objective[], month: MonthNumber): number {
  const items = objectivesForMonth(objectives, month);
  return round(avg(items.map((o) => o.progress)));
}

export function overallObjectiveProgress(objectives: Objective[]): number {
  return round(avg(objectives.map((o) => o.progress)));
}

export function objectiveStatusCounts(objectives: Objective[]) {
  return {
    total: objectives.length,
    completed: objectives.filter((o) => o.status === 'completed').length,
    inProgress: objectives.filter((o) => o.status === 'in-progress').length,
    notStarted: objectives.filter((o) => o.status === 'not-started').length,
  };
}

// -----------------------------------------------------------------------------
// Manager readiness
// -----------------------------------------------------------------------------

export const READINESS_AREAS: ReadinessArea[] = [
  'people-management',
  'reporting',
  'assessment',
  'stakeholder-management',
  'delegation',
];

function metricScore(metric: ReadinessMetric, key: MonthKey): number {
  return metric[key];
}

/** Weighted average score (0–100) for one area in a given month. */
export function areaScore(metrics: ReadinessMetric[], area: ReadinessArea, key: MonthKey): number {
  const items = metrics.filter((m) => m.area === area);
  if (!items.length) return 0;
  const totalWeight = items.reduce((sum, m) => sum + (m.weight ?? 1), 0);
  const weighted = items.reduce((sum, m) => sum + metricScore(m, key) * (m.weight ?? 1), 0);
  return round(totalWeight ? weighted / totalWeight : 0);
}

/** Overall readiness for a month = equal-weighted mean of the five area scores. */
export function overallReadiness(metrics: ReadinessMetric[], key: MonthKey): number {
  const areas = READINESS_AREAS.filter((a) => metrics.some((m) => m.area === a));
  return round(avg(areas.map((a) => areaScore(metrics, a, key))));
}

export interface AreaBreakdown {
  area: ReadinessArea;
  score: number;
  previousScore: number | null;
  metrics: { id: string; name: string; score: number }[];
}

export function readinessBreakdown(metrics: ReadinessMetric[], key: MonthKey): AreaBreakdown[] {
  const prevKey = previousMonthKey(key);
  return READINESS_AREAS.filter((a) => metrics.some((m) => m.area === a)).map((area) => ({
    area,
    score: areaScore(metrics, area, key),
    previousScore: prevKey ? areaScore(metrics, area, prevKey) : null,
    metrics: metrics
      .filter((m) => m.area === area)
      .map((m) => ({ id: m.id, name: m.name, score: metricScore(m, key) })),
  }));
}

export function readinessTrend(metrics: ReadinessMetric[]): { key: MonthKey; label: string; score: number }[] {
  return MONTH_KEYS.map((key, i) => ({
    key,
    label: `Month ${i + 1}`,
    score: overallReadiness(metrics, key),
  }));
}

export function previousMonthKey(key: MonthKey): MonthKey | null {
  const idx = MONTH_KEYS.indexOf(key);
  return idx > 0 ? MONTH_KEYS[idx - 1] : null;
}

/** Qualitative band for a readiness score. */
export function readinessBand(score: number): { label: string; tone: 'danger' | 'warning' | 'info' | 'success' } {
  if (score >= 80) return { label: 'Manager-ready', tone: 'success' };
  if (score >= 65) return { label: 'Emerging', tone: 'info' };
  if (score >= 50) return { label: 'Developing', tone: 'warning' };
  return { label: 'Early', tone: 'danger' };
}

// -----------------------------------------------------------------------------
// Team & 1:1s
// -----------------------------------------------------------------------------

export interface UpcomingOneOnOne {
  member: TeamMember;
  date: string;
}

export function upcomingOneOnOnes(members: TeamMember[], now: Date = new Date()): UpcomingOneOnOne[] {
  return members
    .filter((m) => m.nextOneOnOne)
    .map((m) => ({ member: m, date: m.nextOneOnOne as string }))
    .filter((x) => {
      const d = parseISO(x.date);
      return isValid(d) && differenceInCalendarDays(d, now) >= 0;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Share of reports who had a 1:1 within the last 7 days. */
export function weeklyOneOnOneCompletion(members: TeamMember[], now: Date = new Date()): number {
  if (!members.length) return 0;
  const done = members.filter((m) => {
    if (!m.lastOneOnOne) return false;
    const d = parseISO(m.lastOneOnOne);
    return isValid(d) && differenceInCalendarDays(now, d) <= 7 && differenceInCalendarDays(now, d) >= 0;
  }).length;
  return round((done / members.length) * 100);
}

export function teamHealthSummary(members: TeamMember[]) {
  return {
    total: members.length,
    onTrack: members.filter((m) => m.health === 'on-track').length,
    watch: members.filter((m) => m.health === 'watch').length,
    atRisk: members.filter((m) => m.health === 'at-risk').length,
  };
}

export function averageDevelopmentProgress(members: TeamMember[]): number {
  return round(avg(members.map((m) => m.developmentProgress)));
}

// -----------------------------------------------------------------------------
// Action items & delegation
// -----------------------------------------------------------------------------

export function openActionItems(items: ActionItem[]): ActionItem[] {
  return items.filter((i) => i.status !== 'done');
}

export function overdueActionItems(items: ActionItem[], now: Date = new Date()): ActionItem[] {
  return openActionItems(items).filter((i) => {
    if (!i.dueDate) return false;
    const d = parseISO(i.dueDate);
    return isValid(d) && differenceInCalendarDays(d, now) < 0;
  });
}

export function actionItemCompletionRate(items: ActionItem[]): number {
  if (!items.length) return 0;
  return round((items.filter((i) => i.status === 'done').length / items.length) * 100);
}

export function delegationStats(items: ActionItem[]) {
  const delegated = items.filter((i) => i.delegated);
  const completed = delegated.filter((i) => i.status === 'done');
  return {
    tasksDelegated: delegated.length,
    tasksCompletedByTeam: completed.length,
    completionRate: delegated.length ? round((completed.length / delegated.length) * 100) : 0,
  };
}

// -----------------------------------------------------------------------------
// Performance
// -----------------------------------------------------------------------------

export function monthlySeries(perf: PerformanceSnapshot[]): PerformanceSnapshot[] {
  return perf.filter((p) => p.periodType === 'monthly').sort((a, b) => a.period.localeCompare(b.period));
}

export function weeklySeries(perf: PerformanceSnapshot[]): PerformanceSnapshot[] {
  return perf.filter((p) => p.periodType === 'weekly').sort((a, b) => a.period.localeCompare(b.period));
}

export function latestMonthly(perf: PerformanceSnapshot[]): PerformanceSnapshot | null {
  const series = monthlySeries(perf);
  return series.length ? series[series.length - 1] : null;
}

/** Signed delta of actual vs target as a percentage of target. */
export function deltaPct(actual: number, target: number): number {
  if (!target) return 0;
  return ((actual - target) / target) * 100;
}

export type KpiDirection = 'higher-better' | 'lower-better';

export interface KpiResult {
  key: string;
  label: string;
  actual: number;
  target: number;
  /** Signed % delta vs target. */
  delta: number;
  /** True when the delta is favourable, accounting for direction. */
  good: boolean;
  direction: KpiDirection;
  format: 'number' | 'currency' | 'percent';
}

export function kpiResults(snapshot: PerformanceSnapshot): KpiResult[] {
  const build = (
    key: string,
    label: string,
    actual: number,
    target: number,
    direction: KpiDirection,
    fmt: KpiResult['format'],
  ): KpiResult => {
    const delta = deltaPct(actual, target);
    const good = direction === 'higher-better' ? actual >= target : actual <= target;
    return { key, label, actual, target, delta, good, direction, format: fmt };
  };

  return [
    build('leads', 'Leads', snapshot.leads, snapshot.leadsTarget, 'higher-better', 'number'),
    build('cpl', 'CPL', snapshot.cpl, snapshot.cplTarget, 'lower-better', 'currency'),
    build('budget', 'Budget', snapshot.budget, snapshot.budgetTarget, 'lower-better', 'currency'),
    build('validRate', 'Valid Rate', snapshot.validRate, snapshot.validRateTarget, 'higher-better', 'percent'),
    build(
      'conversionRate',
      'Conversion Rate',
      snapshot.conversionRate,
      snapshot.conversionRateTarget,
      'higher-better',
      'percent',
    ),
  ];
}

// -----------------------------------------------------------------------------
// Campaigns / projects
// -----------------------------------------------------------------------------

export function projectsForMember(projects: Project[], memberId: string): Project[] {
  return projects.filter((p) => p.ownerIds.includes(memberId));
}

export function campaignTrackSummary(projects: Project[]) {
  return {
    total: projects.length,
    onTrack: projects.filter((p) => p.track === 'on-track').length,
    offTrack: projects.filter((p) => p.track === 'off-track').length,
    atRisk: projects.filter((p) => p.track === 'at-risk').length,
  };
}

const TRACK_SCORE: Record<string, number> = { 'on-track': 100, 'at-risk': 60, 'off-track': 20 };

/** Campaign health score (0–100) across a member's campaigns, or null if none. */
export function memberCampaignHealth(projects: Project[], memberId: string): number | null {
  const mine = projectsForMember(projects, memberId);
  if (!mine.length) return null;
  return round(avg(mine.map((p) => TRACK_SCORE[p.track] ?? 60)));
}

/** Composite performance score blending development progress with campaign health. */
export function memberPerformanceScore(member: TeamMember, projects: Project[]): number {
  const ch = memberCampaignHealth(projects, member.id);
  if (ch === null) return member.developmentProgress;
  return round(0.5 * member.developmentProgress + 0.5 * ch);
}

export interface RankedMember {
  member: TeamMember;
  performanceScore: number;
  campaignHealth: number | null;
  campaignCount: number;
}

export function teamRanking(members: TeamMember[], projects: Project[]): RankedMember[] {
  return members
    .map((member) => ({
      member,
      performanceScore: memberPerformanceScore(member, projects),
      campaignHealth: memberCampaignHealth(projects, member.id),
      campaignCount: projectsForMember(projects, member.id).length,
    }))
    .sort((a, b) => b.performanceScore - a.performanceScore);
}

/** Maps member health to the On Track / At Risk / Off Track buckets. */
export function teamHealthSnapshot(members: TeamMember[]) {
  const total = members.length || 1;
  const onTrack = members.filter((m) => m.health === 'on-track').length;
  const atRisk = members.filter((m) => m.health === 'watch').length;
  const offTrack = members.filter((m) => m.health === 'at-risk').length;
  return {
    total: members.length,
    onTrack,
    atRisk,
    offTrack,
    onTrackPct: round((onTrack / total) * 100),
    atRiskPct: round((atRisk / total) * 100),
    offTrackPct: round((offTrack / total) * 100),
  };
}

function isObjectiveOverdue(o: Objective, now: Date): boolean {
  if (o.status === 'completed' || !o.dueDate) return false;
  const d = parseISO(o.dueDate);
  return isValid(d) && isBefore(d, now);
}

export function objectiveTrackCounts(objectives: Objective[], now: Date = new Date()) {
  const offTrack = objectives.filter((o) => isObjectiveOverdue(o, now)).length;
  const onTrack = objectives.filter((o) => o.status !== 'completed' && !isObjectiveOverdue(o, now)).length;
  const dueThisWeek = objectives.filter((o) => {
    if (o.status === 'completed' || !o.dueDate) return false;
    const diff = differenceInCalendarDays(parseISO(o.dueDate), now);
    return diff >= 0 && diff <= 7;
  }).length;
  return { onTrack, offTrack, dueThisWeek };
}

export function overdueProjects(projects: Project[], now: Date = new Date()): Project[] {
  return projects.filter((p) => {
    if (p.status === 'completed' || !p.endDate) return false;
    const d = parseISO(p.endDate);
    return isValid(d) && isBefore(d, now);
  });
}

/** Members with no 1:1 / weekly update in the last 7 days. */
export function pendingUpdateMembers(members: TeamMember[], now: Date = new Date()): TeamMember[] {
  return members.filter((m) => {
    if (!m.lastOneOnOne) return true;
    const d = parseISO(m.lastOneOnOne);
    return !isValid(d) || differenceInCalendarDays(now, d) > 7;
  });
}

export interface ActivityItem {
  id: string;
  date: string;
  kind: 'meeting' | 'project' | 'objective' | 'assessment';
  title: string;
  subtitle?: string;
}

export function recentActivities(data: DashboardData, limit = 8): ActivityItem[] {
  const items: ActivityItem[] = [];

  data.meetings.forEach((m) =>
    items.push({ id: `act-mtg-${m.id}`, date: m.date, kind: 'meeting', title: m.title, subtitle: m.summary }),
  );
  data.projects
    .filter((p) => p.status === 'completed' && p.endDate)
    .forEach((p) =>
      items.push({ id: `act-prj-${p.id}`, date: p.endDate as string, kind: 'project', title: `${p.name} completed` }),
    );
  data.objectives
    .filter((o) => o.status === 'completed' && o.dueDate)
    .forEach((o) =>
      items.push({ id: `act-obj-${o.id}`, date: o.dueDate as string, kind: 'objective', title: `${o.title} completed` }),
    );
  data.assessments
    .filter((a) => a.completed && a.date)
    .forEach((a) =>
      items.push({ id: `act-asm-${a.id}`, date: a.date as string, kind: 'assessment', title: `${a.projectName} assessed` }),
    );

  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

// -----------------------------------------------------------------------------
// Assessments & forecasting
// -----------------------------------------------------------------------------

export interface AssessmentMetrics {
  /** Signed CPL variance % (actual vs forecast). */
  cplVariance: number;
  leadVariance: number;
  interestVariance: number;
  /** 0–100 closeness of forecast to actual across the three measures. */
  accuracy: number | null;
  success: boolean | null;
}

function signedVariance(actual: number, forecast: number): number {
  if (!forecast) return 0;
  return ((actual - forecast) / forecast) * 100;
}

function pctError(actual: number, forecast: number): number {
  if (!forecast) return 0;
  return Math.abs(actual - forecast) / forecast;
}

export function assessmentMetrics(a: Assessment): AssessmentMetrics {
  const measurable = a.completed && a.actualCpl > 0;
  const accuracy = measurable
    ? clamp(
        100 -
          avg([
            pctError(a.actualCpl, a.forecastCpl),
            pctError(a.actualLeadVolume, a.forecastLeadVolume),
            pctError(a.actualInterestRate, a.forecastInterestRate),
          ]) *
            100,
      )
    : null;

  // Success = delivered on/under cost (within 10%) and on/over volume (within 10%).
  const success = measurable
    ? a.actualCpl <= a.forecastCpl * 1.1 && a.actualLeadVolume >= a.forecastLeadVolume * 0.9
    : null;

  return {
    cplVariance: measurable ? signedVariance(a.actualCpl, a.forecastCpl) : 0,
    leadVariance: measurable ? signedVariance(a.actualLeadVolume, a.forecastLeadVolume) : 0,
    interestVariance: measurable ? signedVariance(a.actualInterestRate, a.forecastInterestRate) : 0,
    accuracy: accuracy === null ? null : round(accuracy),
    success,
  };
}

export function assessmentSummary(assessments: Assessment[]) {
  const measured = assessments
    .map((a) => ({ a, m: assessmentMetrics(a) }))
    .filter((x) => x.m.accuracy !== null);

  const forecastAccuracy = round(avg(measured.map((x) => x.m.accuracy as number)));
  const averageVariance = round(avg(measured.map((x) => Math.abs(x.m.cplVariance))));
  const successCount = measured.filter((x) => x.m.success).length;
  const successRate = measured.length ? round((successCount / measured.length) * 100) : 0;

  return {
    forecastAccuracy,
    averageVariance,
    successRate,
    measuredCount: measured.length,
    totalCount: assessments.length,
  };
}

// -----------------------------------------------------------------------------
// Risks (homepage roll-up)
// -----------------------------------------------------------------------------

export interface RiskItem {
  id: string;
  label: string;
  detail: string;
  severity: 'high' | 'medium';
}

export function collectRisks(data: DashboardData, now: Date = new Date()): RiskItem[] {
  const risks: RiskItem[] = [];

  data.teamMembers
    .filter((m) => m.health === 'at-risk')
    .forEach((m) =>
      risks.push({
        id: `risk-member-${m.id}`,
        label: `${m.name} is at risk`,
        detail: m.coachingFocus ?? 'Needs closer support this cycle.',
        severity: 'high',
      }),
    );

  const overdue = overdueActionItems(data.actionItems, now);
  if (overdue.length) {
    risks.push({
      id: 'risk-overdue',
      label: `${overdue.length} overdue action item${overdue.length > 1 ? 's' : ''}`,
      detail: overdue.map((i) => i.title).slice(0, 2).join('; '),
      severity: overdue.length > 2 ? 'high' : 'medium',
    });
  }

  const latest = latestMonthly(data.performance);
  if (latest?.risk) {
    risks.push({
      id: 'risk-performance',
      label: 'Performance risk',
      detail: latest.risk,
      severity: 'medium',
    });
  }

  // Assessments that missed their forecast meaningfully.
  data.assessments.forEach((a) => {
    const m = assessmentMetrics(a);
    if (m.success === false) {
      risks.push({
        id: `risk-assessment-${a.id}`,
        label: `${a.projectName} missed forecast`,
        detail: `CPL variance ${m.cplVariance > 0 ? '+' : ''}${m.cplVariance.toFixed(1)}%`,
        severity: 'medium',
      });
    }
  });

  return risks;
}
