import { useState } from 'react';
import { Archive, History, Plus } from 'lucide-react';
import type { Objective, ObjectiveStatus, TeamMember } from '@/types';
import { useData } from '@/context/DataContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { objectiveStatusLabel, objectiveStatusTone, priorityLabel, priorityTone } from '@/utils/labels';
import { formatDate } from '@/utils/format';

interface ObjectiveDetailModalProps {
  objective: Objective;
  members: TeamMember[];
  onClose: () => void;
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const STATUSES: ObjectiveStatus[] = ['not-started', 'in-progress', 'on-track', 'at-risk', 'off-track', 'completed'];

export function ObjectiveDetailModal({ objective, members, onClose }: ObjectiveDetailModalProps) {
  const { updateObjective } = useData();
  const owner = objective.ownerId ? members.find((m) => m.id === objective.ownerId) : undefined;

  const [status, setStatus] = useState<ObjectiveStatus>(objective.status);
  const [progress, setProgress] = useState(String(objective.progress));
  const [successMetrics, setSuccessMetrics] = useState(objective.successMetrics ?? '');
  const [managerFeedback, setManagerFeedback] = useState(objective.managerFeedback ?? '');
  const [risks, setRisks] = useState(objective.risks ?? '');
  const [nextAction, setNextAction] = useState(objective.nextAction ?? '');
  const [updateNote, setUpdateNote] = useState('');
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateObjective(objective.id, {
      status,
      progress: Math.max(0, Math.min(100, Number(progress) || 0)),
      successMetrics: successMetrics.trim() || undefined,
      managerFeedback: managerFeedback.trim() || undefined,
      risks: risks.trim() || undefined,
      nextAction: nextAction.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const addUpdate = () => {
    if (!updateNote.trim()) return;
    const entry = {
      id: `u-${Date.now().toString(36)}`,
      date: new Date().toISOString().slice(0, 10),
      note: updateNote.trim(),
      progress: Math.max(0, Math.min(100, Number(progress) || 0)),
      author: 'Manager',
    };
    updateObjective(objective.id, { updates: [entry, ...(objective.updates ?? [])] });
    setUpdateNote('');
  };

  const archive = () => {
    updateObjective(objective.id, { archived: true });
    onClose();
  };

  const updates = objective.updates ?? [];

  return (
    <Modal
      open
      onClose={onClose}
      title={objective.title}
      footer={
        <>
          <Button variant="danger" onClick={archive}>
            <Archive size={14} /> Archive
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={save}>{saved ? 'Saved ✓' : 'Save changes'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={objectiveStatusTone[objective.status]}>{objectiveStatusLabel[objective.status]}</Badge>
          {objective.priority && <Badge tone={priorityTone[objective.priority]}>{priorityLabel[objective.priority]} priority</Badge>}
          <Badge tone="neutral">{owner ? owner.name : 'Team / Manager'}</Badge>
          {(objective.startDate || objective.dueDate) && (
            <span className="text-xs text-muted">
              {formatDate(objective.startDate)} → {formatDate(objective.dueDate)}
            </span>
          )}
        </div>

        {objective.description && <p className="text-sm text-slate-600 dark:text-slate-300">{objective.description}</p>}

        {/* Editable controls */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Status</span>
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ObjectiveStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {objectiveStatusLabel[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Progress (%)</span>
            <input type="number" min={0} max={100} className={inputClass} value={progress} onChange={(e) => setProgress(e.target.value)} />
          </label>
        </div>
        <ProgressBar value={Number(progress) || 0} autoTone />

        <EditArea label="Success Metrics" value={successMetrics} onChange={setSuccessMetrics} />
        <EditArea label="Manager Feedback" value={managerFeedback} onChange={setManagerFeedback} />
        <EditArea label="Risks" value={risks} onChange={setRisks} />
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Next Action</span>
          <input className={inputClass} value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
        </label>

        {/* Progress updates / history */}
        <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <History size={13} /> Progress Updates &amp; History
          </p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={updateNote}
              onChange={(e) => setUpdateNote(e.target.value)}
              placeholder="Add a progress update…"
              onKeyDown={(e) => e.key === 'Enter' && addUpdate()}
            />
            <Button variant="secondary" size="sm" onClick={addUpdate}>
              <Plus size={14} /> Add
            </Button>
          </div>
          {updates.length > 0 && (
            <ul className="mt-3 space-y-2.5">
              {updates.map((u) => (
                <li key={u.id} className="border-l-2 border-brand-200 pl-3 dark:border-brand-500/30">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {formatDate(u.date)} {u.author ? `· ${u.author}` : ''}
                    </span>
                    {u.progress != null && <span className="text-[11px] text-muted">{u.progress}%</span>}
                  </div>
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

function EditArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <textarea
        className={`${inputClass} min-h-[56px] resize-y`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
