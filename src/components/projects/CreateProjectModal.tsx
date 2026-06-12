import { useState, type ReactNode } from 'react';
import type { CampaignTrack, Priority, Project, ProjectWorkStatus, TeamMember } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { newLocalProjectId } from '@/data/localStore';
import { projectWorkStatusLabel } from '@/utils/labels';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (project: Project) => void;
  members: TeamMember[];
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const STATUSES: ProjectWorkStatus[] = ['not-started', 'in-progress', 'blocked', 'completed', 'cancelled'];

function trackFor(status: ProjectWorkStatus): CampaignTrack {
  if (status === 'blocked' || status === 'cancelled') return 'off-track';
  if (status === 'completed') return 'on-track';
  return 'at-risk';
}

export function CreateProjectModal({ open, onClose, onCreate, members }: CreateProjectModalProps) {
  const blank = {
    name: '',
    description: '',
    ownerId: '',
    priority: 'medium' as Priority,
    projectStatus: 'not-started' as ProjectWorkStatus,
    progressPct: '0',
    dueDate: '',
    dependencies: '',
  };
  const [form, setForm] = useState({ ...blank });
  const [assigned, setAssigned] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof blank, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const toggleAssigned = (id: string) =>
    setAssigned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const close = () => {
    setForm({ ...blank });
    setAssigned([]);
    setError(null);
    onClose();
  };

  const submit = () => {
    if (!form.name.trim()) {
      setError('Project name is required.');
      return;
    }
    const project: Project = {
      id: newLocalProjectId(form.name),
      kind: 'project',
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      ownerIds: form.ownerId ? [form.ownerId] : [],
      assignedMemberIds: assigned,
      priority: form.priority,
      track: trackFor(form.projectStatus),
      projectStatus: form.projectStatus,
      progressPct: Math.max(0, Math.min(100, Number(form.progressPct) || 0)),
      dueDate: form.dueDate || undefined,
      dependencies: form.dependencies.trim() || undefined,
      updates: [],
      local: true,
    };
    onCreate(project);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create Project"
      description="Delegate a project and assign the member(s) responsible."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit}>Create</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>
        )}

        <Field label="Project name" required>
          <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Revamp QA Process" />
        </Field>

        <Field label="Description">
          <textarea className={`${inputClass} min-h-[60px] resize-y`} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Owner">
            <select className={inputClass} value={form.ownerId} onChange={(e) => set('ownerId', e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select className={inputClass} value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
        </div>

        <Field label="Supporting members">
          {members.length === 0 ? (
            <p className="text-xs text-muted">No team members.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => {
                const active = assigned.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleAssigned(m.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Status">
            <select className={inputClass} value={form.projectStatus} onChange={(e) => set('projectStatus', e.target.value as ProjectWorkStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {projectWorkStatusLabel[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Progress (%)">
            <input type="number" min={0} max={100} className={inputClass} value={form.progressPct} onChange={(e) => set('progressPct', e.target.value)} />
          </Field>
          <Field label="Due date">
            <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </Field>
        </div>

        <Field label="Dependencies">
          <input className={inputClass} value={form.dependencies} onChange={(e) => set('dependencies', e.target.value)} placeholder="What this depends on" />
        </Field>
      </div>
    </Modal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
