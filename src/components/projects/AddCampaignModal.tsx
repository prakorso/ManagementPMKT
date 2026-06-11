import { useState, type ReactNode } from 'react';
import type { CampaignTrack, Project, ProjectStatus, TeamMember } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { newLocalProjectId } from '@/data/localStore';

interface AddCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (project: Project) => void;
  members: TeamMember[];
  /** Pre-select an owner (e.g. when adding from a member's detail page). */
  defaultOwnerId?: string;
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const numOrUndef = (v: string): number | undefined => {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) ? undefined : n;
};

export function AddCampaignModal({ open, onClose, onAdd, members, defaultOwnerId }: AddCampaignModalProps) {
  const blank = {
    name: '',
    client: '',
    track: 'on-track' as CampaignTrack,
    status: 'active' as ProjectStatus,
    leads: '',
    leadsTarget: '',
    cpl: '',
    cplTarget: '',
    notes: '',
  };
  const [form, setForm] = useState({ ...blank });
  const [owners, setOwners] = useState<string[]>(defaultOwnerId ? [defaultOwnerId] : []);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof blank, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const toggleOwner = (id: string) =>
    setOwners((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]));

  const close = () => {
    setForm({ ...blank });
    setOwners(defaultOwnerId ? [defaultOwnerId] : []);
    setError(null);
    onClose();
  };

  const submit = () => {
    if (!form.name.trim()) {
      setError('Campaign name is required.');
      return;
    }
    const project: Project = {
      id: newLocalProjectId(form.name),
      name: form.name.trim(),
      client: form.client.trim() || undefined,
      status: form.status,
      ownerIds: owners,
      track: form.track,
      leads: numOrUndef(form.leads),
      leadsTarget: numOrUndef(form.leadsTarget),
      cpl: numOrUndef(form.cpl),
      cplTarget: numOrUndef(form.cplTarget),
      notes: form.notes.trim() || undefined,
      local: true,
    };
    onAdd(project);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add Campaign"
      description="Create a campaign/project and assign the member(s) handling it."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit}>Add campaign</Button>
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
          <Field label="Campaign name" required>
            <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Year-End Sale" />
          </Field>
          <Field label="Client">
            <input className={inputClass} value={form.client} onChange={(e) => set('client', e.target.value)} placeholder="e.g. Dev Biz" />
          </Field>
        </div>

        <Field label="Assign to">
          {members.length === 0 ? (
            <p className="text-xs text-muted">No team members yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => {
                const active = owners.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleOwner(m.id)}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Track status">
            <select className={inputClass} value={form.track} onChange={(e) => set('track', e.target.value as CampaignTrack)}>
              <option value="on-track">On Track</option>
              <option value="at-risk">At Risk</option>
              <option value="off-track">Off Track</option>
            </select>
          </Field>
          <Field label="Lifecycle">
            <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value as ProjectStatus)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Leads">
            <input type="number" className={inputClass} value={form.leads} onChange={(e) => set('leads', e.target.value)} />
          </Field>
          <Field label="Leads target">
            <input type="number" className={inputClass} value={form.leadsTarget} onChange={(e) => set('leadsTarget', e.target.value)} />
          </Field>
          <Field label="CPL">
            <input type="number" className={inputClass} value={form.cpl} onChange={(e) => set('cpl', e.target.value)} />
          </Field>
          <Field label="CPL target">
            <input type="number" className={inputClass} value={form.cplTarget} onChange={(e) => set('cplTarget', e.target.value)} />
          </Field>
        </div>

        <Field label="Notes">
          <input className={inputClass} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" />
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
