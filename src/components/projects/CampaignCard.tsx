import { Trash2, Users } from 'lucide-react';
import type { CampaignTrack, Project, TeamMember } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { campaignTrackLabel, campaignTrackTone, projectStatusLabel } from '@/utils/labels';
import { deltaPct } from '@/utils/calculations';
import { formatDelta, formatIDR, formatNumber } from '@/utils/format';

interface CampaignCardProps {
  project: Project;
  members: TeamMember[];
  onUpdate: (id: string, patch: Partial<Project>) => void;
  onRemove?: (id: string) => void;
  /** Hide the owners row (e.g. on a member's own detail page). */
  hideOwners?: boolean;
}

export function CampaignCard({ project, members, onUpdate, onRemove, hideOwners }: CampaignCardProps) {
  const owners = project.ownerIds
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter(Boolean) as string[];

  const hasCpl = project.cpl != null && project.cplTarget != null;
  const hasLeads = project.leads != null && project.leadsTarget != null;

  return (
    <div className="rounded-xl border border-slate-200/70 p-4 transition-colors hover:border-slate-300 dark:border-slate-700/60 dark:hover:border-slate-600">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{project.name}</h4>
            {project.status && <Badge tone="neutral">{projectStatusLabel[project.status]}</Badge>}
            {project.local && <Badge tone="info">Local</Badge>}
          </div>
          {project.client && <p className="text-xs text-muted">{project.client}</p>}
        </div>
        <Badge tone={campaignTrackTone[project.track]}>{campaignTrackLabel[project.track]}</Badge>
      </div>

      {!hideOwners && owners.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <Users size={12} /> {owners.join(', ')}
        </p>
      )}

      {(hasCpl || hasLeads) && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {hasCpl && (
            <Metric
              label="CPL"
              value={formatIDR(project.cpl as number)}
              target={`Target ${formatIDR(project.cplTarget as number)}`}
              delta={deltaPct(project.cpl as number, project.cplTarget as number)}
              lowerBetter
            />
          )}
          {hasLeads && (
            <Metric
              label="Leads"
              value={formatNumber(project.leads as number)}
              target={`Target ${formatNumber(project.leadsTarget as number)}`}
              delta={deltaPct(project.leads as number, project.leadsTarget as number)}
            />
          )}
        </div>
      )}

      {project.notes && <p className="mt-3 text-xs text-muted">{project.notes}</p>}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700/50">
        <label className="flex items-center gap-2 text-xs text-muted">
          Status
          <select
            value={project.track}
            onChange={(e) => onUpdate(project.id, { track: e.target.value as CampaignTrack })}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="on-track">On Track</option>
            <option value="at-risk">At Risk</option>
            <option value="off-track">Off Track</option>
          </select>
        </label>
        {onRemove && project.local && (
          <button
            type="button"
            onClick={() => onRemove(project.id)}
            className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
          >
            <Trash2 size={13} /> Remove
          </button>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  target,
  delta,
  lowerBetter,
}: {
  label: string;
  value: string;
  target: string;
  delta: number;
  lowerBetter?: boolean;
}) {
  const good = lowerBetter ? delta <= 0 : delta >= 0;
  return (
    <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/40">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      <div className="mt-0.5 flex items-center justify-between">
        <span className="text-[11px] text-muted">{target}</span>
        <span className={`text-[11px] font-medium ${good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {formatDelta(delta)}
        </span>
      </div>
    </div>
  );
}
