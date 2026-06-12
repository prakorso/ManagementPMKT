import { AlertOctagon, Users } from 'lucide-react';
import type { Project, TeamMember } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { priorityLabel, priorityTone, projectWorkStatusLabel, projectWorkStatusTone } from '@/utils/labels';
import { formatDate } from '@/utils/format';

export function ProjectCard({
  project,
  members,
  onClick,
}: {
  project: Project;
  members: TeamMember[];
  onClick: () => void;
}) {
  const status = project.projectStatus ?? 'not-started';
  const progress = project.progressPct ?? 0;
  const owners = project.ownerIds
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <button type="button" onClick={onClick} className="card card-pad w-full text-left transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{project.name}</p>
          {project.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{project.description}</p>}
        </div>
        <Badge tone={projectWorkStatusTone[status]}>{projectWorkStatusLabel[status]}</Badge>
      </div>

      {owners.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <Users size={12} /> {owners.join(', ')}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={progress} autoTone size="sm" className="flex-1" />
        <span className="w-9 flex-none text-right text-xs font-semibold text-slate-700 dark:text-slate-200">{progress}%</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        {project.priority && <Badge tone={priorityTone[project.priority]}>{priorityLabel[project.priority]}</Badge>}
        {project.blockers && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
            <AlertOctagon size={12} /> Blocked
          </span>
        )}
        {project.dueDate && <span className="ml-auto text-[11px] text-muted">Due {formatDate(project.dueDate)}</span>}
      </div>
    </button>
  );
}
