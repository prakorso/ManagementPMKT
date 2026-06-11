import { useState, type ReactNode } from 'react';
import type { HealthStatus, TeamMember } from '@/types';
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

const emptyForm = {
  name: '',
  role: '',
  strengths: '',
  developmentAreas: '',
  health: 'on-track' as HealthStatus,
  developmentProgress: '0',
  nextOneOnOne: '',
  coachingFocus: '',
  reportingUrl: '',
  oneOnOneDocUrl: '',
};

const splitList = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

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
    const progress = Math.max(0, Math.min(100, Number(form.developmentProgress) || 0));
    const member: TeamMember = {
      id: newLocalMemberId(form.name),
      name: form.name.trim(),
      role: form.role.trim() || 'Team Member',
      strengths: splitList(form.strengths),
      developmentAreas: splitList(form.developmentAreas),
      lastOneOnOne: null,
      nextOneOnOne: form.nextOneOnOne || null,
      developmentProgress: progress,
      health: form.health,
      coachingFocus: form.coachingFocus.trim() || undefined,
      reportingUrl: form.reportingUrl.trim() || undefined,
      oneOnOneDocUrl: form.oneOnOneDocUrl.trim() || undefined,
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
      description="Add a new direct report — e.g. a new recruit. Saved in this browser."
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Health">
            <select className={inputClass} value={form.health} onChange={(e) => set('health', e.target.value as HealthStatus)}>
              <option value="on-track">On Track</option>
              <option value="watch">Watch</option>
              <option value="at-risk">At Risk</option>
            </select>
          </Field>
          <Field label="Development Progress (%)">
            <input
              type="number"
              min={0}
              max={100}
              className={inputClass}
              value={form.developmentProgress}
              onChange={(e) => set('developmentProgress', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Strengths" hint="Separate with commas or new lines">
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={form.strengths}
            onChange={(e) => set('strengths', e.target.value)}
            placeholder="Meta Ads, Data analysis"
          />
        </Field>

        <Field label="Development Areas" hint="Separate with commas or new lines">
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={form.developmentAreas}
            onChange={(e) => set('developmentAreas', e.target.value)}
            placeholder="Campaign QA, Independence"
          />
        </Field>

        <Field label="Coaching Focus">
          <input
            className={inputClass}
            value={form.coachingFocus}
            onChange={(e) => set('coachingFocus', e.target.value)}
            placeholder="What to develop this cycle"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Next 1:1 date">
            <input type="date" className={inputClass} value={form.nextOneOnOne} onChange={(e) => set('nextOneOnOne', e.target.value)} />
          </Field>
          <Field label="Reporting sheet URL">
            <input className={inputClass} value={form.reportingUrl} onChange={(e) => set('reportingUrl', e.target.value)} placeholder="https://…" />
          </Field>
        </div>

        <Field label="1:1 doc URL">
          <input className={inputClass} value={form.oneOnOneDocUrl} onChange={(e) => set('oneOnOneDocUrl', e.target.value)} placeholder="https://docs.google.com/…" />
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
