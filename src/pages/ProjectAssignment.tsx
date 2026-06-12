import { useState } from 'react';
import { isBefore, parseISO } from 'date-fns';
import { CheckCircle2, FolderKanban, Loader, Plus } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CampaignCard } from '@/components/projects/CampaignCard';
import { AddCampaignModal } from '@/components/projects/AddCampaignModal';

export function ProjectAssignment() {
  const { data, loading, error, addProject, updateProject, removeProject } = useData();
  const { session } = useSession();
  const isManager = session?.role === 'manager';
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const { projects, teamMembers } = data;
  const now = new Date();
  const active = projects.filter((p) => p.status === 'active').length;
  const completed = projects.filter((p) => p.status === 'completed').length;
  const overdue = projects.filter((p) => {
    if (p.status === 'completed' || !p.endDate) return false;
    const d = parseISO(p.endDate);
    return isBefore(d, now);
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Assignment"
        description="Delegate and track projects/campaigns — assign owners, monitor status and completion."
      >
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Create Project
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Projects" value={projects.length} icon={<FolderKanban size={18} />} iconTone="brand" />
        <StatCard label="Active" value={active} icon={<Loader size={18} />} iconTone="info" />
        <StatCard label="Completed" value={completed} icon={<CheckCircle2 size={18} />} iconTone="success" />
        <StatCard label="Overdue" value={overdue} icon={<FolderKanban size={18} />} iconTone="danger" hint="past end date" />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={28} />}
          title="No projects yet"
          description="Create a project and assign the member(s) responsible to start tracking delegation."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <CampaignCard key={project.id} project={project} members={teamMembers} onUpdate={updateProject} onRemove={removeProject} canDelete={isManager} />
          ))}
        </div>
      )}

      <AddCampaignModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addProject} members={teamMembers} />
    </div>
  );
}
