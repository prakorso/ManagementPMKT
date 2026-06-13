import { useState, type ReactNode } from 'react';
import { CheckSquare, NotebookPen, Pencil, Plus, ShieldAlert, Square, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/utils/format';
import { newOneOnOneId } from '@/data/localStore';
import type { OneOnOneActionItem, OneOnOneSession } from '@/types';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const today = () => new Date().toISOString().slice(0, 10);
const newActionId = () => `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

interface FormState {
  date: string;
  wins: string;
  challenges: string;
  blockers: string;
  supportNeeded: string;
  actionPlan: string;
  nextWeekTarget: string;
  escalate: boolean;
  escalationReason: string;
  actions: OneOnOneActionItem[];
}

const emptyForm = (): FormState => ({
  date: today(),
  wins: '',
  challenges: '',
  blockers: '',
  supportNeeded: '',
  actionPlan: '',
  nextWeekTarget: '',
  escalate: false,
  escalationReason: '',
  actions: [],
});

const formFrom = (s: OneOnOneSession): FormState => ({
  date: s.date,
  wins: s.wins ?? '',
  challenges: s.challenges ?? '',
  blockers: s.blockers ?? '',
  supportNeeded: s.supportNeeded ?? '',
  actionPlan: s.actionPlan ?? '',
  nextWeekTarget: s.nextWeekTarget ?? '',
  escalate: !!s.escalate,
  escalationReason: s.escalationReason ?? '',
  actions: (s.actions ?? []).map((a) => ({ ...a })),
});

export function OneOnOnePanel({
  memberId,
  memberName,
  sessions,
  canEdit,
  author,
  onAdd,
  onUpdate,
  onRemove,
}: {
  memberId: string;
  memberName: string;
  sessions: OneOnOneSession[];
  canEdit: boolean;
  author: string;
  onAdd: (s: OneOnOneSession) => void;
  onUpdate: (id: string, patch: Partial<OneOnOneSession>) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OneOnOneSession | null>(null);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (s: OneOnOneSession) => {
    setEditing(s);
    setOpen(true);
  };

  const toggleAction = (s: OneOnOneSession, actionId: string) =>
    onUpdate(s.id, { actions: (s.actions ?? []).map((a) => (a.id === actionId ? { ...a, done: !a.done } : a)) });

  return (
    <Card padded={false}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <NotebookPen size={16} className="text-brand-500" /> 1:1 Sessions
          <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {sessions.length}
          </span>
        </h3>
        {canEdit && (
          <Button size="sm" onClick={openNew}>
            <Plus size={14} /> Log 1:1
          </Button>
        )}
      </div>

      <div className="space-y-4 p-5">
        {sessions.length === 0 ? (
          <EmptyState
            icon={<NotebookPen size={28} />}
            title="No 1:1s logged yet"
            description={canEdit ? `Log your first 1:1 with ${memberName}.` : 'No sessions recorded yet.'}
          />
        ) : (
          sessions.map((s) => (
            <article key={s.id} className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700/60">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatDate(s.date)}</p>
                  {s.author && <span className="text-[11px] text-muted">· {s.author}</span>}
                  {s.escalate && (
                    <Badge tone="danger">
                      <ShieldAlert size={11} /> Escalate
                    </Badge>
                  )}
                </div>
                {canEdit && (
                  <div className="flex flex-none items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700/60 dark:hover:text-slate-200"
                      aria-label="Edit 1:1"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(s.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                      aria-label="Delete 1:1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                <SessionField label="Wins" value={s.wins} />
                <SessionField label="Challenges" value={s.challenges} />
                <SessionField label="Blockers" value={s.blockers} />
                <SessionField label="Support Needed" value={s.supportNeeded} />
                <SessionField label="Action Plan" value={s.actionPlan} />
                <SessionField label="Next-Week Target" value={s.nextWeekTarget} />
              </dl>

              {s.escalate && s.escalationReason && (
                <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                  <span className="font-semibold">Escalation:</span> {s.escalationReason}
                </p>
              )}

              {(s.actions ?? []).length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700/40">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Action Items</p>
                  <ul className="space-y-1.5">
                    {(s.actions ?? []).map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-sm">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => toggleAction(s, a.id)}
                          className={`flex-none ${canEdit ? 'cursor-pointer' : 'cursor-default'} ${
                            a.done ? 'text-emerald-500' : 'text-slate-400'
                          }`}
                          aria-label={a.done ? 'Mark not done' : 'Mark done'}
                        >
                          {a.done ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        <span className={a.done ? 'text-muted line-through' : 'text-slate-700 dark:text-slate-200'}>{a.text}</span>
                        {a.dueDate && <span className="ml-auto flex-none text-[11px] text-muted">{formatDate(a.dueDate)}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))
        )}
      </div>

      {open && (
        <SessionModal
          author={author}
          editing={editing}
          onClose={() => setOpen(false)}
          onSave={(form) => {
            const base = {
              date: form.date || today(),
              wins: form.wins.trim() || undefined,
              challenges: form.challenges.trim() || undefined,
              blockers: form.blockers.trim() || undefined,
              supportNeeded: form.supportNeeded.trim() || undefined,
              actionPlan: form.actionPlan.trim() || undefined,
              nextWeekTarget: form.nextWeekTarget.trim() || undefined,
              escalate: form.escalate,
              escalationReason: form.escalate ? form.escalationReason.trim() || undefined : undefined,
              actions: form.actions.filter((a) => a.text.trim()).map((a) => ({ ...a, text: a.text.trim() })),
            };
            if (editing) onUpdate(editing.id, base);
            else onAdd({ id: newOneOnOneId(memberId), memberId, author, ...base });
            setOpen(false);
          }}
        />
      )}
    </Card>
  );
}

function SessionField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">{value}</dd>
    </div>
  );
}

function SessionModal({
  author,
  editing,
  onClose,
  onSave,
}: {
  author: string;
  editing: OneOnOneSession | null;
  onClose: () => void;
  onSave: (form: FormState) => void;
}) {
  const [f, setF] = useState<FormState>(editing ? formFrom(editing) : emptyForm());
  const set = (patch: Partial<FormState>) => setF((prev) => ({ ...prev, ...patch }));

  const addAction = () => set({ actions: [...f.actions, { id: newActionId(), text: '', done: false }] });
  const setAction = (id: string, patch: Partial<OneOnOneActionItem>) =>
    set({ actions: f.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const removeAction = (id: string) => set({ actions: f.actions.filter((a) => a.id !== id) });

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit 1:1' : 'Log 1:1'}
      description={`Structured 1:1 with your report · logged as ${author}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(f)}>{editing ? 'Save' : 'Add'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Date">
          <input type="date" className={inputClass} value={f.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Wins">
            <textarea className={`${inputClass} min-h-[52px] resize-y`} value={f.wins} onChange={(e) => set({ wins: e.target.value })} />
          </Field>
          <Field label="Challenges">
            <textarea className={`${inputClass} min-h-[52px] resize-y`} value={f.challenges} onChange={(e) => set({ challenges: e.target.value })} />
          </Field>
          <Field label="Blockers">
            <textarea className={`${inputClass} min-h-[52px] resize-y`} value={f.blockers} onChange={(e) => set({ blockers: e.target.value })} />
          </Field>
          <Field label="Support Needed">
            <textarea
              className={`${inputClass} min-h-[52px] resize-y`}
              value={f.supportNeeded}
              onChange={(e) => set({ supportNeeded: e.target.value })}
            />
          </Field>
          <Field label="Action Plan">
            <textarea className={`${inputClass} min-h-[52px] resize-y`} value={f.actionPlan} onChange={(e) => set({ actionPlan: e.target.value })} />
          </Field>
          <Field label="Next-Week Target">
            <textarea
              className={`${inputClass} min-h-[52px] resize-y`}
              value={f.nextWeekTarget}
              onChange={(e) => set({ nextWeekTarget: e.target.value })}
            />
          </Field>
        </div>

        {/* Action items */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Action Items</span>
            <Button variant="secondary" size="sm" onClick={addAction}>
              <Plus size={13} /> Add
            </Button>
          </div>
          {f.actions.length === 0 ? (
            <p className="text-xs text-muted">No action items.</p>
          ) : (
            <ul className="space-y-2">
              {f.actions.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <input
                    className={inputClass}
                    placeholder="Action…"
                    value={a.text}
                    onChange={(e) => setAction(a.id, { text: e.target.value })}
                  />
                  <input
                    type="date"
                    className="w-40 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    value={a.dueDate ?? ''}
                    onChange={(e) => setAction(a.id, { dueDate: e.target.value || undefined })}
                  />
                  <button
                    type="button"
                    onClick={() => removeAction(a.id)}
                    className="flex-none rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                    aria-label="Remove action"
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Escalation */}
        <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={f.escalate} onChange={(e) => set({ escalate: e.target.checked })} className="h-4 w-4 rounded" />
            <ShieldAlert size={15} className="text-rose-500" /> Flag for escalation
          </label>
          {f.escalate && (
            <textarea
              className={`${inputClass} mt-2 min-h-[52px] resize-y`}
              placeholder="Why does this need leadership attention?"
              value={f.escalationReason}
              onChange={(e) => set({ escalationReason: e.target.value })}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}
