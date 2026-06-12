import { CalendarClock, ClipboardList, Megaphone, TrendingUp } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { CampaignCard } from '@/components/projects/CampaignCard';
import { campaignTrackSummary, projectsForMember } from '@/utils/calculations';
import { formatDate, formatPercent, relativeDays } from '@/utils/format';
import { actionStatusLabel, actionStatusTone, meetingCategoryLabel, meetingCategoryTone } from '@/utils/labels';

export function MemberOverview() {
  const { data, loading, error, updateProject } = useData();
  const { session } = useSession();

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const member = data.teamMembers.find((m) => m.id === session?.memberId);
  if (!member) {
    return <ErrorState message="Your member profile could not be found. Ask your manager to add you." />;
  }

  const now = new Date();
  const campaigns = projectsForMember(data.projects, member.id);
  const campaignSummary = campaignTrackSummary(campaigns);
  const actionItems = data.actionItems.filter((i) => i.teamMemberId === member.id);
  const openTasks = actionItems.filter((i) => i.status !== 'done');
  const meetings = data.meetings.filter((m) => m.teamMemberId === member.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Your Overview</h1>
        <p className="mt-1 text-sm text-muted">Your objectives, campaigns and tasks at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My Performance"
          value={formatPercent(member.developmentProgress)}
          icon={<TrendingUp size={18} />}
          iconTone="brand"
          hint="Development progress"
        />
        <StatCard
          label="My Campaigns"
          value={campaigns.length}
          icon={<Megaphone size={18} />}
          iconTone="info"
          hint={`${campaignSummary.onTrack} on track · ${campaignSummary.offTrack} off track`}
        />
        <StatCard
          label="Pending Tasks"
          value={openTasks.length}
          icon={<ClipboardList size={18} />}
          iconTone="warning"
          hint={`${actionItems.length - openTasks.length} done`}
        />
        <StatCard
          label="Next 1:1"
          value={member.nextOneOnOne ? relativeDays(member.nextOneOnOne, now) : '—'}
          icon={<CalendarClock size={18} />}
          iconTone="success"
          hint={member.nextOneOnOne ? formatDate(member.nextOneOnOne) : 'Not scheduled'}
        />
      </div>

      {/* My campaigns */}
      <Card padded={false}>
        <div className="border-b border-slate-200/80 p-5 dark:border-slate-700/60">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Megaphone size={16} className="text-brand-500" /> My Campaigns
          </h3>
        </div>
        <div className="p-5">
          {campaigns.length === 0 ? (
            <EmptyState icon={<Megaphone size={28} />} title="No campaigns assigned yet" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {campaigns.map((project) => (
                <CampaignCard key={project.id} project={project} members={data.teamMembers} onUpdate={updateProject} hideOwners />
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tasks */}
        <Card>
          <CardHeader title="My Tasks" icon={<ClipboardList size={16} />} subtitle={`${openTasks.length} pending`} />
          {actionItems.length === 0 ? (
            <p className="text-sm text-muted">No tasks assigned.</p>
          ) : (
            <ul className="space-y-2.5">
              {actionItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-700 dark:text-slate-200">{item.title}</span>
                  <div className="flex flex-none items-center gap-2">
                    {item.dueDate && <span className="text-[11px] text-muted">{relativeDays(item.dueDate, now)}</span>}
                    <Badge tone={actionStatusTone[item.status]}>{actionStatusLabel[item.status]}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Meetings */}
        <Card>
          <CardHeader title="My Meeting Updates" subtitle="Most recent first" />
          {meetings.length === 0 ? (
            <p className="text-sm text-muted">No meeting updates yet.</p>
          ) : (
            <ul className="space-y-3">
              {meetings.slice(0, 5).map((m) => (
                <li key={m.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-700/40">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={meetingCategoryTone[m.category]}>{meetingCategoryLabel[m.category]}</Badge>
                    <span className="text-xs text-muted">{formatDate(m.date)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200">{m.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
