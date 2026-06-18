import { differenceInCalendarDays, isBefore, isValid, parseISO } from 'date-fns';
import type {
  ActionItem,
  Assessment,
  CampaignAssignment,
  CampaignTask,
  DashboardData,
  LgpCampaign,
  MonthNumber,
  Objective,
  OneOnOneSession,
  PerformanceSnapshot,
  Project,
  ReadinessArea,
  ReadinessMetric,
  TaskStatus,
  TeamMember,
  UnifiedTask,
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
  inDays: number;
}

export interface FindingEntry {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  finding: string;
}

/** Team benchmark: learnings/findings collected automatically from 1:1 sessions. */
export function teamFindings(sessions: OneOnOneSession[], members: TeamMember[]): FindingEntry[] {
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown';
  return sessions
    .filter((s) => s.findings && s.findings.trim())
    .map((s) => ({ id: s.id, memberId: s.memberId, memberName: nameOf(s.memberId), date: s.date, finding: (s.findings ?? '').trim() }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Members whose most recent 1:1 session is flagged for escalation. */
export function escalatedMembers(sessions: OneOnOneSession[], members: TeamMember[]): TeamMember[] {
  return members.filter((m) => {
    const latest = sessions.filter((s) => s.memberId === m.id).sort((a, b) => b.date.localeCompare(a.date))[0];
    return !!latest?.escalate;
  });
}

/** Members with a next 1:1 scheduled from today onward, soonest first. */
export function upcomingOneOnOnes(members: TeamMember[], now: Date = new Date(), limit = 6): UpcomingOneOnOne[] {
  const items: UpcomingOneOnOne[] = [];
  members.forEach((m) => {
    if (!m.nextOneOnOne) return;
    const d = parseISO(m.nextOneOnOne);
    if (!isValid(d)) return;
    const inDays = differenceInCalendarDays(d, now);
    if (inDays < 0) return;
    items.push({ member: m, date: m.nextOneOnOne, inDays });
  });
  return items.sort((x, y) => x.inDays - y.inDays).slice(0, limit);
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

/** Marketing campaigns (kind !== 'project'). */
export function campaignsOf(projects: Project[]): Project[] {
  return projects.filter((p) => p.kind !== 'project');
}

/** Delegated projects (kind === 'project'). */
export function deliveryProjectsOf(projects: Project[]): Project[] {
  return projects.filter((p) => p.kind === 'project');
}

/** Delegated projects a member owns or supports. */
export function memberProjects(projects: Project[], memberId: string): Project[] {
  return deliveryProjectsOf(projects).filter(
    (p) => p.ownerIds.includes(memberId) || (p.assignedMemberIds ?? []).includes(memberId),
  );
}

// -----------------------------------------------------------------------------
// LGP campaigns
// -----------------------------------------------------------------------------

export interface LgpKpiTile {
  key: string;
  label: string;
  current: number;
  target: number;
  achievement: number; // %
  status: 'on-track' | 'at-risk' | 'off-track';
}

function tileStatus(achievement: number): LgpKpiTile['status'] {
  if (achievement >= 100) return 'on-track';
  if (achievement >= 80) return 'at-risk';
  return 'off-track';
}

/** Funnel KPI tiles for a campaign (current vs target; LGP thresholds for Sub/Int). */
export function lgpKpiTiles(c: LgpCampaign): LgpKpiTile[] {
  const f = c.funnel;
  const t = c.targets;
  const tile = (key: string, label: string, current: number, target: number): LgpKpiTile => {
    const achievement = target > 0 ? round((current / target) * 100) : 0;
    return { key, label, current, target, achievement, status: tileStatus(achievement) };
  };
  return [
    tile('raw', 'RAW Leads', f.raw, t.leads),
    tile('spam', 'Spam', f.spam, 0),
    tile('unqualified', 'Unqualified', f.unqualified, 0),
    tile('submitted', 'Submitted', f.submitted, Math.round(f.raw * 0.9)),
    tile('interest', 'Interest', f.interest, Math.round(f.raw * 0.25)),
    tile('svs', 'SVA', f.svs, Math.round(f.raw * 0.07)),
    tile('svd', 'SPD', f.svd, t.visit > 0 ? t.visit : Math.round(f.raw * 0.05)),
    tile('booking', 'Booking', f.booking, t.book),
  ];
}

/** Portfolio-level business KPIs across campaigns (Executive / Control Tower). */
export function lgpPortfolio(campaigns: LgpCampaign[]) {
  const s = (fn: (c: LgpCampaign) => number) => campaigns.reduce((sum, c) => sum + fn(c), 0);
  const spend = s((c) => c.ads.spend);
  const leads = s((c) => c.funnel.raw);
  const booking = s((c) => c.funnel.booking);
  return {
    count: campaigns.length,
    spend,
    leads,
    booking,
    cpl: leads > 0 ? round(spend / leads) : 0,
    cpa: booking > 0 ? round(spend / booking) : 0,
    conversion: leads > 0 ? Number(((booking / leads) * 100).toFixed(1)) : 0,
    onTrack: campaigns.filter((c) => c.health.status === 'on-track').length,
    atRisk: campaigns.filter((c) => c.health.status === 'at-risk').length,
    offTrack: campaigns.filter((c) => c.health.status === 'off-track').length,
  };
}

/** Funnel totals summed across all campaigns (Overall Business Performance). */
export function portfolioFunnel(campaigns: LgpCampaign[]) {
  const s = (fn: (c: LgpCampaign) => number) => campaigns.reduce((sum, c) => sum + fn(c), 0);
  return {
    raw: s((c) => c.funnel.raw),
    spam: s((c) => c.funnel.spam),
    unqualified: s((c) => c.funnel.unqualified),
    submitted: s((c) => c.funnel.submitted),
    interest: s((c) => c.funnel.interest),
    svs: s((c) => c.funnel.svs),
    svd: s((c) => c.funnel.svd),
    booking: s((c) => c.funnel.booking),
  };
}

/** Lead contribution by channel, summed across all campaigns. */
export function portfolioContribution(campaigns: LgpCampaign[]) {
  const s = (fn: (c: LgpCampaign) => number) => campaigns.reduce((sum, c) => sum + fn(c), 0);
  return {
    pmkt: s((c) => c.contribution.pmkt),
    organic: s((c) => c.contribution.organic),
    socmed: s((c) => c.contribution.socmed),
    other: s((c) => c.contribution.other),
  };
}

export interface PortfolioPeriod {
  period: string;
  raw: number;
  submitted: number;
  interest: number;
  svd: number;
  spend: number;
  cpl: number;
}

/** Monthly periods aggregated across all campaigns, oldest→newest. */
export function portfolioMonthly(campaigns: LgpCampaign[]): PortfolioPeriod[] {
  const map = new Map<string, { raw: number; submitted: number; interest: number; svd: number; spend: number }>();
  for (const c of campaigns) {
    for (const p of c.monthly ?? []) {
      const e = map.get(p.period) ?? { raw: 0, submitted: 0, interest: 0, svd: 0, spend: 0 };
      e.raw += p.raw;
      e.submitted += p.submitted;
      e.interest += p.interest;
      e.svd += p.svd;
      e.spend += p.spend;
      map.set(p.period, e);
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, e]) => ({ period, ...e, cpl: e.raw > 0 ? round(e.spend / e.raw) : 0 }));
}

/** Campaigns a member owns or supports (by assignment). */
export function memberAssignedCampaigns(
  campaigns: LgpCampaign[],
  assignments: Record<string, CampaignAssignment>,
  memberId: string,
): LgpCampaign[] {
  return campaigns.filter((c) => {
    const a = assignments[c.name];
    return !!a && (a.ownerId === memberId || (a.supportingIds ?? []).includes(memberId));
  });
}

/** Default campaign capacity per specialist (~80–100 campaigns / 5–6 specialists). */
export const CAMPAIGN_CAPACITY = 15;

export interface MemberWorkload {
  activeCampaigns: number;
  totalCampaigns: number;
  bookings: number;
  spend: number;
  cpa: number;
  conversion: number;
  capacity: number;
  utilizationPct: number;
}

/** Workload & capacity for one member across their assigned LGP campaigns. */
export function memberWorkload(
  member: TeamMember,
  campaigns: LgpCampaign[],
  assignments: Record<string, CampaignAssignment>,
  now: Date = new Date(),
  capacity = CAMPAIGN_CAPACITY,
): MemberWorkload {
  const mine = memberAssignedCampaigns(campaigns, assignments, member.id);
  const isActive = (c: LgpCampaign) => {
    if (!c.endDate) return true;
    const d = parseISO(c.endDate);
    return !isValid(d) || !isBefore(d, now);
  };
  const bookings = mine.reduce((s, c) => s + c.funnel.booking, 0);
  const spend = mine.reduce((s, c) => s + c.ads.spend, 0);
  const leads = mine.reduce((s, c) => s + c.funnel.raw, 0);
  return {
    activeCampaigns: mine.filter(isActive).length,
    totalCampaigns: mine.length,
    bookings,
    spend,
    cpa: bookings > 0 ? round(spend / bookings) : 0,
    conversion: leads > 0 ? Number(((bookings / leads) * 100).toFixed(1)) : 0,
    capacity,
    utilizationPct: capacity > 0 ? round((mine.length / capacity) * 100) : 0,
  };
}

export interface PerformanceBreakdown {
  campaignHealth: number;
  taskCompletion: number;
  weeklyUpdate: number;
  meetingAction: number;
}

export interface PerformanceScore {
  score: number;
  breakdown: PerformanceBreakdown;
}

const PERF_WEIGHTS = { campaignHealth: 0.45, taskCompletion: 0.25, weeklyUpdate: 0.15, meetingAction: 0.15 };

/**
 * Composite specialist performance score (0–100). PMOS PRD weighting, adapted:
 * the Objective component was dropped together with the Objective Tracker and its
 * weight redistributed, giving Campaign Health 45% · Task 25% · Weekly Update 15%
 * · Meeting Action 15%. Sub-metrics with no data default to 100 (no penalty).
 */
export function performanceScore(
  member: TeamMember,
  campaigns: LgpCampaign[],
  assignments: Record<string, CampaignAssignment>,
  actionItems: ActionItem[],
  now: Date = new Date(),
): PerformanceScore {
  const mine = memberAssignedCampaigns(campaigns, assignments, member.id);
  const myAssignments = mine.map((c) => assignments[c.name]).filter(Boolean) as CampaignAssignment[];

  // Campaign health: avg assigned-campaign health, fallback to development progress.
  const campaignHealth = mine.length ? round(avg(mine.map((c) => c.health.score))) : member.developmentProgress;

  // Task completion across the member's campaigns (their tasks + unassigned ones).
  const tasks = myAssignments.flatMap((a) => (a.tasks ?? []).filter((t) => !t.ownerId || t.ownerId === member.id));
  const taskCompletion = tasks.length
    ? round((tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100)
    : 100;

  // Weekly update freshness: any update in the last 7 days on the member's campaigns.
  const weeklyUpdate = myAssignments.some((a) =>
    (a.weeklyUpdates ?? []).some((u) => {
      const d = parseISO(u.date);
      return isValid(d) && differenceInCalendarDays(now, d) <= 7;
    }),
  )
    ? 100
    : 0;

  // Meeting action items closed.
  const myActions = actionItems.filter((i) => i.teamMemberId === member.id);
  const meetingAction = myActions.length
    ? round((myActions.filter((i) => i.status === 'done').length / myActions.length) * 100)
    : 100;

  const score = round(
    campaignHealth * PERF_WEIGHTS.campaignHealth +
      taskCompletion * PERF_WEIGHTS.taskCompletion +
      weeklyUpdate * PERF_WEIGHTS.weeklyUpdate +
      meetingAction * PERF_WEIGHTS.meetingAction,
  );

  return { score, breakdown: { campaignHealth, taskCompletion, weeklyUpdate, meetingAction } };
}

/** Team ranking by the formal performance score, using assigned-campaign data. */
export function teamRankingLgp(
  members: TeamMember[],
  campaigns: LgpCampaign[],
  assignments: Record<string, CampaignAssignment>,
  actionItems: ActionItem[],
  now: Date = new Date(),
): RankedMember[] {
  return members
    .map((member) => {
      const mine = memberAssignedCampaigns(campaigns, assignments, member.id);
      const campaignHealth = mine.length ? round(avg(mine.map((c) => c.health.score))) : null;
      const { score } = performanceScore(member, campaigns, assignments, actionItems, now);
      return { member, performanceScore: score, campaignHealth, campaignCount: mine.length };
    })
    .sort((a, b) => b.performanceScore - a.performanceScore);
}

export function lgpHealthSummary(campaigns: LgpCampaign[]) {
  return {
    total: campaigns.length,
    onTrack: campaigns.filter((c) => c.health.status === 'on-track').length,
    atRisk: campaigns.filter((c) => c.health.status === 'at-risk').length,
    offTrack: campaigns.filter((c) => c.health.status === 'off-track').length,
  };
}

export function projectAssignmentSummary(projects: Project[], now: Date = new Date()) {
  const items = deliveryProjectsOf(projects);
  const overdue = items.filter((p) => {
    if (p.projectStatus === 'completed' || p.projectStatus === 'cancelled') return false;
    const raw = p.dueDate ?? p.endDate;
    if (!raw) return false;
    const d = parseISO(raw);
    return isValid(d) && isBefore(d, now);
  }).length;
  return {
    total: items.length,
    active: items.filter((p) => p.projectStatus === 'in-progress' || p.projectStatus === 'not-started').length,
    blocked: items.filter((p) => p.projectStatus === 'blocked').length,
    completed: items.filter((p) => p.projectStatus === 'completed').length,
    overdue,
  };
}

const TRACK_SCORE: Record<string, number> = { 'on-track': 100, 'at-risk': 60, 'off-track': 20 };

/** Campaign health score (0–100) across a member's campaigns, or null if none. */
export function memberCampaignHealth(projects: Project[], memberId: string): number | null {
  const mine = campaignsOf(projectsForMember(projects, memberId));
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

/** A task is overdue when it has a past due date and isn't completed/cancelled. */
export function isTaskOverdue(task: { dueDate?: string; status: TaskStatus }, now: Date = new Date()): boolean {
  if (task.status === 'completed' || task.status === 'cancelled' || !task.dueDate) return false;
  const d = parseISO(task.dueDate);
  return isValid(d) && isBefore(d, now);
}

/** All tasks across the platform: campaign tasks (campaignName set) + standalone. */
export function unifiedTasks(
  assignments: Record<string, CampaignAssignment>,
  standalone: CampaignTask[],
): UnifiedTask[] {
  const fromCampaigns: UnifiedTask[] = Object.values(assignments).flatMap((a) =>
    (a.tasks ?? []).map((t) => ({ ...t, campaignName: a.campaignName })),
  );
  return [...fromCampaigns, ...standalone.map((t) => ({ ...t }))];
}

export interface TaskRollup {
  total: number;
  open: number;
  overdue: number;
  dueThisWeek: number;
  completed: number;
}

/** Due-date roll-up across a set of tasks. */
export function taskRollup(tasks: UnifiedTask[], now: Date = new Date()): TaskRollup {
  const active = (t: UnifiedTask) => t.status !== 'completed' && t.status !== 'cancelled';
  const dueWithin = (t: UnifiedTask, days: number) => {
    if (!active(t) || !t.dueDate) return false;
    const d = parseISO(t.dueDate);
    if (!isValid(d)) return false;
    const diff = differenceInCalendarDays(d, now);
    return diff >= 0 && diff <= days;
  };
  return {
    total: tasks.length,
    open: tasks.filter(active).length,
    overdue: tasks.filter((t) => isTaskOverdue(t, now)).length,
    dueThisWeek: tasks.filter((t) => dueWithin(t, 7)).length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };
}

export interface OverdueTaskItem {
  campaignName: string;
  task: CampaignTask;
  ownerName: string | null;
  daysOverdue: number;
}

/** Campaign tasks past their due date and not yet completed/cancelled, most overdue first. */
export function overdueTasks(
  assignments: Record<string, CampaignAssignment>,
  members: TeamMember[],
  now: Date = new Date(),
  limit = 6,
): OverdueTaskItem[] {
  const nameOf = (id?: string) => (id ? members.find((m) => m.id === id)?.name ?? null : null);
  const items: OverdueTaskItem[] = [];
  Object.values(assignments).forEach((a) => {
    (a.tasks ?? []).forEach((t) => {
      if (t.status === 'completed' || t.status === 'cancelled' || !t.dueDate) return;
      const d = parseISO(t.dueDate);
      if (!isValid(d) || !isBefore(d, now)) return;
      items.push({
        campaignName: a.campaignName,
        task: t,
        ownerName: nameOf(t.ownerId),
        daysOverdue: differenceInCalendarDays(now, d),
      });
    });
  });
  return items.sort((x, y) => y.daysOverdue - x.daysOverdue).slice(0, limit);
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
  data.projects.forEach((p) => {
    const done = p.kind === 'project' ? p.projectStatus === 'completed' : p.status === 'completed';
    const date = p.dueDate ?? p.endDate;
    if (done && date) items.push({ id: `act-prj-${p.id}`, date, kind: 'project', title: `${p.name} completed` });
  });
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
