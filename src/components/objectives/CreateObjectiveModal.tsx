import { useState, type ReactNode } from 'react';
import type { Objective, ObjectiveStatus, Priority, TeamMember } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { newLocalObjectiveId } from '@/data/localStore';
import { objectiveStatusLabel } from '@/utils/labels';

interface CreateObjectiveModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (objective: Objective) => void;
  members: TeamMember[];
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const STATUSES: ObjectiveStatus[] = ['not-started', 'in-progress', 'on-track', 'at-risk', 'off-track', 'completed'];

export function CreateObjectiveModal({ open, onClose, onCreate, members }: CreateObjectiveModalProps) {
  const blank = {
    title: '',
    description: '',
    ownerId: '',
    priority: 'medium' as Priority,
    status: 'not-started' as ObjectiveStatus,
    startDate: '',
    dueDate: '',
    successMetrics: '',
  };
  const [form, setForm] = useState({ ...blank });
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof blank, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const close = () => {
    setForm({ ...blank });
    setError(null);
    onClose();
  };

  const submit = () => {
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    const objective: Objective = {
      id: newLocalObjectiveId(form.title),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      ownerId: form.ownerId || undefined,
      status: form.status,
      progress: form.status === 'completed' ? 100 : 0,
      priority: form.priority,
      startDate: form.startDate || undefined,
      dueDate: form.dueDate || undefined,
      successMetrics: form.successMetrics.trim() || undefined,
      updates: [],
      local: true,
    };
    onCreate(objective);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create Objective"
      description="Define an objective and assign an owner."
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
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}

        <Field label="Title" required>
          <input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Lift retargeting ROAS to 4.0" />
        </Field>

        <Field label="Description">
          <textarea className={`${inputClass} min-h-[60px] resize-y`} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Owner">
            <select className={inputClass} value={form.ownerId} onChange={(e) => set('ownerId', e.target.value)}>
              <option value="">Team / Manager</option>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value as ObjectiveStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {objectiveStatusLabel[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input type="date" className={inputClass} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </Field>
          <Field label="End date">
            <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </Field>
        </div>

        <Field label="Success metrics">
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={form.successMetrics}
            onChange={(e) => set('successMetrics', e.target.value)}
            placeholder="How success is measured"
          />
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
