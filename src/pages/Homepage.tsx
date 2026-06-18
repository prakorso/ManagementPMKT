import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Crosshair,
  ListChecks,
  Megaphone,
  NotebookPen,
  ShieldAlert,
  Target,
  UserX,
  Users,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedDonut } from '@/components/charts/SegmentedDonut';
import {
  escalatedMembers,
  lgpPortfolio,
  overdueTasks,
  pendingUpdateMembers,
  recentActivities,
  teamHealthSnapshot,
  upcomingOneOnOnes,
  type ActivityItem,
} from '@/utils/calculations';
import { portfolioInsights, type InsightSeverity } from '@/utils/insights';
import { formatDate, formatIDRCompact, formatNumber, formatPercent, relativeDays } from '@/utils/format';
import type { Tone } from '@/components/ui/Badge';

const COLORS = { onTrack: '#10b981', atRisk: '#f59e0b', offTrack: '#f43f5e' };
const SEVERITY_COLOR: Record<InsightSeverity, string> = {
  critical: '#f43f5e',
  warning: '#f59e0b',
  opportunity: '#0ea5e9',
  good: '#10b981',
};

export function Homepage() {
  const { data, loading, error, assignments, oneOnOnes } = useData();
  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const { teamMembers, lgpCampaigns } = data;
  const now = new Date();

  const p = lgpPortfolio(lgpCampaigns);
  const team = teamHealthSnapshot(teamMembers);
  const pending = pendingUpdateMembers(teamMembers, now);
  const unassigned = lgpCampaigns.filter((c) => !assignments[c.name]?.ownerId).length;
  const activities = recentActivities(data);
  const overdue = overdueTasks(assignments, teamMembers, now);
  const upcoming = upcomingOneOnOnes(teamMembers, now);
  const escalated = escalatedMembers(oneOnOnes, teamMembers);
  const aiPriority = portfolioInsights(lgpCampaigns, now).slice(0, 5);

  const alerts = [
    { id: 'a1', count: p.offTrack, label: 'Campaigns off track', tone: 'danger' as Tone, to: '/campaigns', icon: Megaphone },
    { id: 'a2', count: p.atRisk, label: 'Campaigns at risk', tone: 'warning' as Tone, to: '/campaigns', icon: AlertTriangle },
    { id: 'a3', count: unassigned, label: 'Campaigns unassigned', tone: 'info' as Tone, to: '/campaigns', icon: UserX },
    { id: 'a4', count: pending.length, label: 'Members missing weekly update', tone: 'warning' as Tone, to: '/team', icon: Users },
    { id: 'a5', count: escalated.length, label: 'Members flagged for escalation', tone: 'danger' as Tone, to: '/team', icon: ShieldAlert },
  ].filter((a) => a.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Control Tower</h1>
        <p className="mt-1 text-sm text-muted">Business health and what needs attention across {p.count} campaigns.</p>
      </div>

      {/* Business KPIs — clean, no icons, roomy on laptops (6-across only on very wide screens) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Spend" value={formatIDRCompact(p.spend)} />
        <StatCard label="Leads" value={formatNumber(p.leads)} to="/campaigns" />
        <StatCard label="Bookings" value={formatNumber(p.booking)} />
        <StatCard label="CPA" value={formatIDRCompact(p.cpa)} />
        <StatCard label="Conversion" value={formatPercent(p.conversion, 1)} />
        <StatCard label="Campaigns" value={formatNumber(p.count)} to="/campaigns" />
      </div>

      {/* Health + alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Campaign Health" subtitle={`${p.count} campaigns`} icon={<Megaphone size={16} />} />
          <div className="flex items-center gap-5">
            <SegmentedDonut
              centerValue={p.count}
              centerLabel="campaigns"
              segments={[
                { label: 'On Track', value: p.onTrack, color: COLORS.onTrack },
                { label: 'At Risk', value: p.atRisk, color: COLORS.atRisk },
                { label: 'Off Track', value: p.offTrack, color: COLORS.offTrack },
              ]}
            />
            <ul className="space-y-2 text-sm">
              <Legend color={COLORS.onTrack} label="On Track" value={p.onTrack} />
              <Legend color={COLORS.atRisk} label="At Risk" value={p.atRisk} />
              <Legend color={COLORS.offTrack} label="Off Track" value={p.offTrack} />
            </ul>
          </div>
        </Card>

        <Card>
          <CardHeader title="Team Health" subtitle={`${team.total} members`} icon={<Users size={16} />} />
          <ul className="space-y-2 text-sm">
            <Legend color={COLORS.onTrack} label="On Track" value={team.onTrack} />
            <Legend color={COLORS.atRisk} label="Watch" value={team.atRisk} />
            <Legend color={COLORS.offTrack} label="At Risk" value={team.offTrack} />
          </ul>
          <Link to="/team" className="mt-4 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-300">
            View team →
          </Link>
        </Card>

        <Card>
          <CardHeader title="Action Required" icon={<AlertTriangle size={16} />} subtitle={`${alerts.length} need attention`} />
          {alerts.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={28} />} title="All clear" description="Nothing needs attention right now." />
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.id}>
                    <Link
                      to={a.to}
                      className="flex items-center gap-3 rounded-xl border border-slate-200/70 px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/60 dark:hover:border-slate-600 dark:hover:bg-slate-800/40"
                    >
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                        <Icon size={16} />
                      </span>
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{a.label}</span>
                      <Badge tone={a.tone}>{a.count}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* AI Priority */}
      <Card padded={false}>
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <BrainCircuit size={16} className="text-brand-500" /> AI Priority
          </h3>
          <Link to="/insights" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300">
            View all →
          </Link>
        </div>
        {aiPriority.length === 0 ? (
          <p className="p-5 text-sm text-muted">No critical signals right now.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
            {aiPriority.map((ins) => (
              <li key={`${ins.campaignName}-${ins.id}`} className="flex items-center gap-3 px-5 py-3">
                <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: SEVERITY_COLOR[ins.severity] }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{ins.title}</p>
                  <Link to={`/campaigns/${encodeURIComponent(ins.campaignName)}`} className="truncate text-xs text-muted hover:text-brand-600 dark:hover:text-brand-300">
                    {ins.campaignName}
                  </Link>
                </div>
                <span className="flex-none text-xs text-muted">{ins.detail.length > 60 ? `${ins.detail.slice(0, 60)}…` : ins.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Overdue tasks + upcoming 1:1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card padded={false}>
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <ListChecks size={16} className="text-brand-500" /> Overdue Tasks
            </h3>
            <Badge tone={overdue.length ? 'danger' : 'neutral'}>{overdue.length}</Badge>
          </div>
          {overdue.length === 0 ? (
            <p className="p-5 text-sm text-muted">No overdue tasks.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {overdue.map((o) => (
                <li key={`${o.campaignName}-${o.task.id}`} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/campaigns/${encodeURIComponent(o.campaignName)}`}
                      className="block truncate text-sm font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-300"
                    >
                      {o.task.name}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {o.campaignName}
                      {o.ownerName ? ` · ${o.ownerName}` : ''}
                    </p>
                  </div>
                  <Badge tone="danger">{o.daysOverdue}d late</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padded={false}>
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <CalendarClock size={16} className="text-brand-500" /> Upcoming 1:1
            </h3>
            <Badge tone={upcoming.length ? 'info' : 'neutral'}>{upcoming.length}</Badge>
          </div>
          {upcoming.length === 0 ? (
            <p className="p-5 text-sm text-muted">No 1:1 scheduled.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {upcoming.map((u) => (
                <li key={u.member.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={u.member.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/team/${u.member.id}`}
                      className="block truncate text-sm font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-300"
                    >
                      {u.member.name}
                    </Link>
                    <p className="truncate text-xs text-muted">{formatDate(u.date)}</p>
                  </div>
                  <Badge tone={u.inDays === 0 ? 'warning' : 'info'}>{u.inDays === 0 ? 'Today' : `in ${u.inDays}d`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader title="Recent Activities" icon={<Activity size={16} />} />
        {activities.length === 0 ? (
          <p className="text-sm text-muted">No recent activity.</p>
        ) : (
          <ul className="space-y-3">
            {activities.map((act) => (
              <ActivityRow key={act.id} activity={act} now={now} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="ml-auto font-semibold tabular-nums text-slate-800 dark:text-slate-100">{value}</span>
    </li>
  );
}

const ACTIVITY_ICON = { meeting: NotebookPen, project: Megaphone, objective: Target, assessment: Crosshair } as const;

function ActivityRow({ activity, now }: { activity: ActivityItem; now: Date }) {
  const Icon = ACTIVITY_ICON[activity.kind];
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300">
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700 dark:text-slate-200">{activity.title}</p>
        <p className="text-[11px] text-muted">{relativeDays(activity.date, now)}</p>
      </div>
    </li>
  );
}
