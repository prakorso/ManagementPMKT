import { useState, type ReactNode } from 'react';
import type { TeamMember } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { newLocalMemberId } from '@/data/localStore';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (member: TeamMember) => void;
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const emptyForm = { name: '', role: '', email: '', nextOneOnOne: '' };

export function AddMemberModal({ open, onClose, onAdd }: AddMemberModalProps) {
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const close = () => {
    setForm({ ...emptyForm });
    setError(null);
    onClose();
  };

  const submit = () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    const member: TeamMember = {
      id: newLocalMemberId(form.name),
      name: form.name.trim(),
      role: form.role.trim() || 'Team Member',
      email: form.email.trim() || undefined,
      strengths: [],
      developmentAreas: [],
      lastOneOnOne: null,
      nextOneOnOne: form.nextOneOnOne || null,
      developmentProgress: 0,
      health: 'on-track',
      local: true,
    };
    onAdd(member);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add Team Member"
      description="Just the basics for a new recruit — strengths, development areas and progress come from your 1:1s and weekly updates."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit}>Add member</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}

        <Field label="Name" required>
          <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Sinta" />
        </Field>

        <Field label="Title / Role">
          <input
            className={inputClass}
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            placeholder="e.g. Performance Marketing Specialist"
          />
        </Field>

        <Field label="Email" hint="Used later to give them access to their own view">
          <input
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="name@company.com"
          />
        </Field>

        <Field label="Next 1:1 date">
          <input type="date" className={inputClass} value={form.nextOneOnOne} onChange={(e) => set('nextOneOnOne', e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        {label}
        {required && <span className="text-rose-500">*</span>}
        {hint && <span className="ml-auto font-normal text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
