import { Megaphone } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { AssignedCampaignCard } from '@/components/projects/AssignedCampaignCard';
import { OneOnOnePanel } from '@/components/team/OneOnOnePanel';
import { formatDate, formatPercent, relativeDays } from '@/utils/format';
import { meetingCategoryLabel, meetingCategoryTone } from '@/utils/labels';

export function MemberOverview() {
  const { data, loading, error, assignments, oneOnOnes, addOneOnOne, updateOneOnOne, removeOneOnOne } = useData();
  const { session } = useSession();

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const member = data.teamMembers.find((m) => m.id === session?.memberId);
  if (!member) {
    return <ErrorState message="Your member profile could not be found. Ask your manager to add you." />;
  }

  const now = new Date();
  const myCampaigns = data.lgpCampaigns.filter((c) => {
    const a = assignments[c.name];
    return !!a && (a.ownerId === member.id || (a.supportingIds ?? []).includes(member.id));
  });
  const meetings = data.meetings.filter((m) => m.teamMemberId === member.id).sort((a, b) => b.date.localeCompare(a.date));
  const mySessions = oneOnOnes.filter((s) => s.memberId === member.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Your Overview</h1>
        <p className="mt-1 text-sm text-muted">Your campaigns, 1:1 reports and meeting schedule.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="My Performance" value={formatPercent(member.developmentProgress)} />
        <StatCard label="My Campaigns" value={myCampaigns.length} />
        <StatCard label="Next 1:1" value={member.nextOneOnOne ? relativeDays(member.nextOneOnOne, now) : '—'} />
      </div>

      {/* My campaigns */}
      <Card padded={false}>
        <div className="border-b border-slate-200/80 p-5 dark:border-slate-700/60">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Megaphone size={16} className="text-brand-500" /> My Campaigns
          </h3>
        </div>
        <div className="p-5">
          {myCampaigns.length === 0 ? (
            <EmptyState icon={<Megaphone size={28} />} title="No campaigns assigned yet" description="Your manager will assign campaigns to you." />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {myCampaigns.map((c) => (
                <AssignedCampaignCard key={c.name} campaign={c} owner={member.name} />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* My 1:1 — the member writes their own report; the manager reviews it. */}
      <OneOnOnePanel
        memberId={member.id}
        memberName={member.name}
        sessions={mySessions}
        canEdit
        author={session?.name ?? member.name}
        onAdd={addOneOnOne}
        onUpdate={updateOneOnOne}
        onRemove={removeOneOnOne}
      />

      {/* My meetings */}
      <Card>
        <CardHeader title="My Meetings" subtitle="Schedule & updates" />
        {meetings.length === 0 ? (
          <p className="text-sm text-muted">No meetings yet.</p>
        ) : (
          <ul className="space-y-3">
            {meetings.slice(0, 6).map((m) => (
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
  );
}
