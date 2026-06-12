import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Crosshair,
  FolderKanban,
  ListChecks,
  Megaphone,
  NotebookPen,
  Trophy,
  Users,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedDonut } from '@/components/charts/SegmentedDonut';
import {
  campaignsOf,
  campaignTrackSummary,
  objectiveTrackCounts,
  pendingUpdateMembers,
  projectAssignmentSummary,
  recentActivities,
  teamHealthSnapshot,
  teamRanking,
  type ActivityItem,
} from '@/utils/calculations';
import { formatDate, formatPercent, relativeDays } from '@/utils/format';
import type { Tone } from '@/components/ui/Badge';

const COLORS = { onTrack: '#10b981', atRisk: '#f59e0b', offTrack: '#f43f5e' };

export function Homepage() {
  const { data, loading, error } = useData();
  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const { teamMembers, objectives, projects } = data;
  const now = new Date();

  const health = teamHealthSnapshot(teamMembers);
  const campaigns = campaignTrackSummary(campaignsOf(projects));
  const objCounts = objectiveTrackCounts(objectives, now);
  const ranking = teamRanking(teamMembers, projects);
  const pending = pendingUpdateMembers(teamMembers, now);
  const projectSummary = projectAssignmentSummary(projects, now);
  const activities = recentActivities(data);
  const activeCampaigns = campaignsOf(projects).filter((p) => p.status === 'active').length;

  const alerts = [
    { id: 'a1', count: campaigns.offTrack, label: 'Campaigns off track', tone: 'danger' as Tone, to: '/performance', icon: Megaphone },
    { id: 'a2', count: pending.length, label: 'Members missing weekly update', tone: 'warning' as Tone, to: '/team', icon: Users },
    { id: 'a3', count: objCounts.dueThisWeek, label: 'Objectives due this week', tone: 'info' as Tone, to: '/objectives', icon: ListChecks },
    { id: 'a4', count: projectSummary.overdue, label: 'Projects overdue', tone: 'danger' as Tone, to: '/projects', icon: FolderKanban },
    { id: 'a5', count: projectSummary.blocked, label: 'Projects blocked', tone: 'danger' as Tone, to: '/projects', icon: FolderKanban },
  ].filter((a) => a.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Control Tower</h1>
        <p className="mt-1 text-sm text-muted">Your whole team at a glance — what needs attention right now.</p>
      </div>

      {/* Team summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Team Members" value={teamMembers.length} icon={<Users size={18} />} iconTone="brand" to="/team" />
        <StatCard label="Active Campaigns" value={activeCampaigns} icon={<Megaphone size={18} />} iconTone="info" to="/performance" />
        <StatCard label="Active Projects" value={projectSummary.active} icon={<FolderKanban size={18} />} iconTone="brand" to="/projects" />
        <StatCard label="On-Track Objectives" value={objCounts.onTrack} icon={<CheckCircle2 size={18} />} iconTone="success" to="/objectives" />
        <StatCard label="Off-Track Objectives" value={objCounts.offTrack} icon={<AlertTriangle size={18} />} iconTone="danger" to="/objectives" />
        <StatCard label="Pending Updates" value={pending.length} icon={<CalendarClock size={18} />} iconTone="warning" to="/team" />
      </div>

      {/* Health + campaign + alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Team health snapshot */}
        <Card>
          <CardHeader title="Team Health Snapshot" subtitle="Per-member status" />
          <div className="flex items-center gap-5">
            <SegmentedDonut
              centerValue={health.total}
              centerLabel="members"
              segments={[
                { label: 'On Track', value: health.onTrack, color: COLORS.onTrack },
                { label: 'At Risk', value: health.atRisk, color: COLORS.atRisk },
                { label: 'Off Track', value: health.offTrack, color: COLORS.offTrack },
              ]}
            />
            <ul className="space-y-2 text-sm">
              <Legend color={COLORS.onTrack} label="On Track" value={health.onTrack} pct={health.onTrackPct} />
              <Legend color={COLORS.atRisk} label="At Risk" value={health.atRisk} pct={health.atRiskPct} />
              <Legend color={COLORS.offTrack} label="Off Track" value={health.offTrack} pct={health.offTrackPct} />
            </ul>
          </div>
        </Card>

        {/* Campaign health */}
        <Card>
          <CardHeader title="Campaign Health" subtitle={`${campaigns.total} campaigns`} icon={<Megaphone size={16} />} />
          <div className="space-y-3">
            <HealthBar label="On Track" value={campaigns.onTrack} total={campaigns.total} color={COLORS.onTrack} />
            <HealthBar label="At Risk" value={campaigns.atRisk} total={campaigns.total} color={COLORS.atRisk} />
            <HealthBar label="Off Track" value={campaigns.offTrack} total={campaigns.total} color={COLORS.offTrack} />
          </div>
          <Link to="/performance" className="mt-4 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-300">
            View campaign performance →
          </Link>
        </Card>

        {/* Alert center */}
        <Card>
          <CardHeader title="Alert Center" icon={<AlertTriangle size={16} />} subtitle={`${alerts.length} need attention`} />
          {alerts.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={28} />} title="All clear" description="No alerts right now." />
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

      {/* Ranking + activities */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Team ranking */}
        <Card padded={false} className="lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
            <Trophy size={16} className="text-brand-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Team Ranking</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 text-left text-xs uppercase tracking-wide text-muted dark:border-slate-700/60">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-3 py-3 font-medium">Member</th>
                  <th className="px-3 py-3 font-medium">Performance</th>
                  <th className="px-3 py-3 font-medium">Campaigns</th>
                  <th className="px-5 py-3 font-medium">Campaign Health</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.member.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
                    <td className="px-5 py-3 font-semibold text-slate-400">{i + 1}</td>
                    <td className="px-3 py-3">
                      <Link to={`/team/${r.member.id}`} className="flex items-center gap-2.5 hover:text-brand-600 dark:hover:text-brand-300">
                        <Avatar name={r.member.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800 dark:text-slate-100">{r.member.name}</p>
                          <p className="truncate text-xs text-muted">{r.member.role}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={r.performanceScore} autoTone size="sm" className="w-16" />
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{r.performanceScore}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{r.campaignCount}</td>
                    <td className="px-5 py-3">
                      {r.campaignHealth === null ? (
                        <span className="text-xs text-muted">—</span>
                      ) : (
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{r.campaignHealth}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent activities */}
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
    </div>
  );
}

function Legend({ color, label, value, pct }: { color: string; label: string; value: number; pct: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="ml-auto font-semibold text-slate-800 dark:text-slate-100">
        {value} <span className="text-xs font-normal text-muted">({formatPercent(pct)})</span>
      </span>
    </li>
  );
}

function HealthBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-semibold text-slate-800 dark:text-slate-100">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/60">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

const ACTIVITY_ICON = {
  meeting: NotebookPen,
  project: FolderKanban,
  objective: ListChecks,
  assessment: Crosshair,
} as const;

function ActivityRow({ activity, now }: { activity: ActivityItem; now: Date }) {
  const Icon = ACTIVITY_ICON[activity.kind];
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300">
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700 dark:text-slate-200">{activity.title}</p>
        <p className="text-[11px] text-muted">{relativeDays(activity.date, now)} · {formatDate(activity.date)}</p>
      </div>
    </li>
  );
}
