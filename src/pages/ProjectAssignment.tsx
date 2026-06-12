import { useState } from 'react';
import { CheckCircle2, FolderKanban, Loader, Plus } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { ProjectDetailModal } from '@/components/projects/ProjectDetailModal';
import { deliveryProjectsOf, projectAssignmentSummary } from '@/utils/calculations';

export function ProjectAssignment() {
  const { data, loading, error, addProject } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const projects = deliveryProjectsOf(data.projects);
  const summary = projectAssignmentSummary(data.projects);
  const selected = selectedId ? data.projects.find((p) => p.id === selectedId) ?? null : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Assignment"
        description="Delegate and track projects — assign owners, monitor progress, status and blockers."
      >
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Create Project
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Projects" value={summary.total} icon={<FolderKanban size={18} />} iconTone="brand" />
        <StatCard label="Active" value={summary.active} icon={<Loader size={18} />} iconTone="info" hint={`${summary.blocked} blocked`} />
        <StatCard label="Overdue" value={summary.overdue} icon={<FolderKanban size={18} />} iconTone="danger" hint="past due date" />
        <StatCard label="Completed" value={summary.completed} icon={<CheckCircle2 size={18} />} iconTone="success" />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={28} />}
          title="No projects yet"
          description="Create a project and assign the member(s) responsible to start tracking delegation."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} members={data.teamMembers} onClick={() => setSelectedId(project.id)} />
          ))}
        </div>
      )}

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={addProject} members={data.teamMembers} />
      {selected && <ProjectDetailModal key={selected.id} project={selected} members={data.teamMembers} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
