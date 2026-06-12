import { useState } from 'react';
import { History, Plus, Trash2 } from 'lucide-react';
import type { CampaignTrack, Project, ProjectWorkStatus, TeamMember } from '@/types';
import { useData } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { priorityLabel, priorityTone, projectWorkStatusLabel } from '@/utils/labels';
import { formatDate } from '@/utils/format';

interface ProjectDetailModalProps {
  project: Project;
  members: TeamMember[];
  onClose: () => void;
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const STATUSES: ProjectWorkStatus[] = ['not-started', 'in-progress', 'blocked', 'completed', 'cancelled'];

function trackFor(status: ProjectWorkStatus): CampaignTrack {
  if (status === 'blocked' || status === 'cancelled') return 'off-track';
  if (status === 'completed') return 'on-track';
  return 'at-risk';
}

export function ProjectDetailModal({ project, members, onClose }: ProjectDetailModalProps) {
  const { updateProject, removeProject } = useData();
  const { session } = useSession();
  const canManage = session?.role === 'manager';
  const isOwner =
    !!session?.memberId &&
    (project.ownerIds.includes(session.memberId) || (project.assignedMemberIds ?? []).includes(session.memberId));
  const canEdit = canManage || isOwner;

  const names = (ids: string[]) => ids.map((id) => members.find((m) => m.id === id)?.name).filter(Boolean).join(', ');

  const [status, setStatus] = useState<ProjectWorkStatus>(project.projectStatus ?? 'not-started');
  const [progress, setProgress] = useState(String(project.progressPct ?? 0));
  const [dependencies, setDependencies] = useState(project.dependencies ?? '');
  const [blockers, setBlockers] = useState(project.blockers ?? '');
  const [managerNotes, setManagerNotes] = useState(project.managerNotes ?? '');
  const [updateNote, setUpdateNote] = useState('');
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateProject(project.id, {
      projectStatus: status,
      track: trackFor(status),
      progressPct: Math.max(0, Math.min(100, Number(progress) || 0)),
      dependencies: dependencies.trim() || undefined,
      blockers: blockers.trim() || undefined,
      ...(canManage ? { managerNotes: managerNotes.trim() || undefined } : {}),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const addUpdate = () => {
    if (!updateNote.trim()) return;
    const entry = {
      id: `pu-${Date.now().toString(36)}`,
      date: new Date().toISOString().slice(0, 10),
      note: updateNote.trim(),
      author: session?.name ?? 'Manager',
    };
    updateProject(project.id, { updates: [entry, ...(project.updates ?? [])] });
    setUpdateNote('');
  };

  const del = () => {
    removeProject(project.id);
    onClose();
  };

  const updates = project.updates ?? [];

  return (
    <Modal
      open
      onClose={onClose}
      title={project.name}
      footer={
        <>
          {canManage && (
            <Button variant="danger" onClick={del}>
              <Trash2 size={14} /> Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {canEdit && <Button onClick={save}>{saved ? 'Saved ✓' : 'Save changes'}</Button>}
        </>
      }
    >
      <div className="space-y-5">
        {/* Overview */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{projectWorkStatusLabel[project.projectStatus ?? 'not-started']}</Badge>
          {project.priority && <Badge tone={priorityTone[project.priority]}>{priorityLabel[project.priority]} priority</Badge>}
          {project.dueDate && <span className="text-xs text-muted">Due {formatDate(project.dueDate)}</span>}
        </div>
        {project.description && <p className="text-sm text-slate-600 dark:text-slate-300">{project.description}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Info label="Owner" value={names(project.ownerIds) || '—'} />
          <Info label="Supporting" value={names(project.assignedMemberIds ?? []) || '—'} />
        </div>

        {/* Progress + status */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Status</span>
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ProjectWorkStatus)} disabled={!canEdit}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {projectWorkStatusLabel[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Progress (%)</span>
            <input type="number" min={0} max={100} className={inputClass} value={progress} onChange={(e) => setProgress(e.target.value)} disabled={!canEdit} />
          </label>
        </div>
        <ProgressBar value={Number(progress) || 0} autoTone />

        <Area label="Dependencies" value={dependencies} onChange={setDependencies} disabled={!canEdit} />
        <Area label="Blockers" value={blockers} onChange={setBlockers} disabled={!canEdit} />
        {canManage ? (
          <Area label="Manager Notes" value={managerNotes} onChange={setManagerNotes} />
        ) : (
          <Info label="Manager Notes" value={project.managerNotes || '—'} />
        )}

        {/* Updates / timeline */}
        <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <History size={13} /> Updates &amp; Activity Timeline
          </p>
          {canEdit && (
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={updateNote}
                onChange={(e) => setUpdateNote(e.target.value)}
                placeholder="Add an update…"
                onKeyDown={(e) => e.key === 'Enter' && addUpdate()}
              />
              <Button variant="secondary" size="sm" onClick={addUpdate}>
                <Plus size={14} /> Add
              </Button>
            </div>
          )}
          {updates.length > 0 && (
            <ul className="mt-3 space-y-2.5">
              {updates.map((u) => (
                <li key={u.id} className="border-l-2 border-brand-200 pl-3 dark:border-brand-500/30">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {formatDate(u.date)} {u.author ? `· ${u.author}` : ''}
                  </span>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{u.note}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <p className="text-sm text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

function Area({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <textarea
        className={`${inputClass} min-h-[56px] resize-y`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}
