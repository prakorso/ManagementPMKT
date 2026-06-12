import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FolderKanban, XCircle } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { AssignedCampaignCard } from '@/components/projects/AssignedCampaignCard';
import { lgpHealthSummary } from '@/utils/calculations';

export function ProjectAssignment() {
  const { data, loading, error, assignments } = useData();
  const { session } = useSession();

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const isMember = session?.role === 'member';
  const me = session?.memberId;

  // Assigned campaigns = LGP campaigns that have an owner. Members see only theirs.
  const assigned = data.lgpCampaigns.filter((c) => {
    const a = assignments[c.name];
    if (!a?.ownerId) return false;
    if (!isMember) return true;
    return a.ownerId === me || (a.supportingIds ?? []).includes(me ?? '');
  });

  const summary = lgpHealthSummary(assigned);
  const ownerName = (campaignName: string) => {
    const id = assignments[campaignName]?.ownerId;
    return id ? data.teamMembers.find((m) => m.id === id)?.name : undefined;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Assignment"
        description={
          isMember
            ? 'Campaigns assigned to you — open one to manage tasks, updates and KPIs.'
            : 'Campaigns assigned to the team. Assign more from the Campaign Hub.'
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned" value={summary.total} icon={<FolderKanban size={18} />} iconTone="brand" />
        <StatCard label="On Track" value={summary.onTrack} icon={<CheckCircle2 size={18} />} iconTone="success" />
        <StatCard label="At Risk" value={summary.atRisk} icon={<AlertTriangle size={18} />} iconTone="warning" />
        <StatCard label="Off Track" value={summary.offTrack} icon={<XCircle size={18} />} iconTone="danger" />
      </div>

      {assigned.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={28} />}
          title={isMember ? 'No campaigns assigned to you yet' : 'No campaigns assigned yet'}
          description={
            isMember ? 'Your manager will assign campaigns to you here.' : 'Open the Campaign Hub and assign a campaign to an owner.'
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {assigned.map((c) => (
            <AssignedCampaignCard key={c.name} campaign={c} owner={ownerName(c.name)} />
          ))}
        </div>
      )}

      {!isMember && (
        <p className="text-xs text-muted">
          Need to assign more?{' '}
          <Link to="/campaigns" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
            Go to Campaign Hub →
          </Link>
        </p>
      )}
    </div>
  );
}
