import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, ListChecks, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { isTaskOverdue, taskRollup, unifiedTasks } from '@/utils/calculations';
import { formatDate, relativeDays } from '@/utils/format';
import { priorityLabel, priorityTone, taskStatusLabel, taskStatusTone } from '@/utils/labels';
import { newTaskId } from '@/data/localStore';
import type { CampaignTask, Priority, TaskStatus, TeamMember, UnifiedTask } from '@/types';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'blocked', 'completed', 'cancelled'];
type StatusFilter = 'all' | 'open' | 'overdue' | 'completed';

export function TaskManagement() {
  const { data, loading, error, assignments, standaloneTasks, updateAssignment, addStandaloneTask, updateStandaloneTask, removeStandaloneTask } = useData();
  const { session } = useSession();
  const role = session?.role;
  const canManage = role === 'manager' || role === 'team-lead';
  const myId = session?.memberId;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'campaign' | 'standalone'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignTask | null>(null);

  const now = new Date();

  const all = useMemo(() => {
    let tasks = unifiedTasks(assignments, standaloneTasks);
    if (role === 'member') tasks = tasks.filter((t) => t.ownerId === myId);
    return tasks;
  }, [assignments, standaloneTasks, role, myId]);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const members = data.teamMembers;
  const nm = (id?: string) => (id ? members.find((m) => m.id === id)?.name ?? '—' : '—');
  const roll = taskRollup(all, now);

  const filtered = all
    .filter((t) => {
      if (ownerFilter !== 'all') {
        if (ownerFilter === 'unassigned' ? !!t.ownerId : t.ownerId !== ownerFilter) return false;
      }
      if (sourceFilter === 'campaign' && !t.campaignName) return false;
      if (sourceFilter === 'standalone' && t.campaignName) return false;
      if (statusFilter === 'open' && (t.status === 'completed' || t.status === 'cancelled')) return false;
      if (statusFilter === 'overdue' && !isTaskOverdue(t, now)) return false;
      if (statusFilter === 'completed' && t.status !== 'completed') return false;
      return true;
    })
    .sort((a, b) => {
      const ao = isTaskOverdue(a, now);
      const bo = isTaskOverdue(b, now);
      if (ao !== bo) return ao ? -1 : 1;
      return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
    });

  const canEditStatus = (t: UnifiedTask) => canManage || (role === 'member' && t.ownerId === myId);

  const setStatus = (t: UnifiedTask, status: TaskStatus) => {
    if (t.campaignName) {
      const a = assignments[t.campaignName];
      updateAssignment(t.campaignName, { tasks: (a?.tasks ?? []).map((x) => (x.id === t.id ? { ...x, status } : x)) });
    } else {
      updateStandaloneTask(t.id, { status });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Every task in one place — campaign tasks and standalone work, with overdue tracking.">
        {canManage && (
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={16} /> New Task
          </Button>
        )}
      </PageHeader>

      {/* Roll-up */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open" value={roll.open} icon={<ListChecks size={18} />} iconTone="brand" />
        <StatCard label="Overdue" value={roll.overdue} icon={<AlertTriangle size={18} />} iconTone="danger" />
        <StatCard label="Due This Week" value={roll.dueThisWeek} icon={<Clock size={18} />} iconTone="warning" />
        <StatCard label="Completed" value={roll.completed} icon={<CheckCircle2 size={18} />} iconTone="success" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)} options={[
          { value: 'open', label: 'Open' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'completed', label: 'Completed' },
          { value: 'all', label: 'All' },
        ]} />
        <span className="flex-1" />
        {role !== 'member' && (
          <select className={`${inputClass} w-auto`} value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="all">All owners</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
        <select className={`${inputClass} w-auto`} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}>
          <option value="all">All sources</option>
          <option value="campaign">Campaign</option>
          <option value="standalone">Standalone</option>
        </select>
      </div>

      {/* Table */}
      <Card padded={false}>
        {filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<ListChecks size={28} />} title="No tasks" description="Nothing matches these filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 text-left text-xs uppercase tracking-wide text-muted dark:border-slate-700/60">
                  <th className="px-5 py-3 font-medium">Task</th>
                  <th className="px-3 py-3 font-medium">Source</th>
                  <th className="px-3 py-3 font-medium">Owner</th>
                  <th className="px-3 py-3 font-medium">Due</th>
                  <th className="px-3 py-3 font-medium">Priority</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const overdue = isTaskOverdue(t, now);
                  return (
                    <tr key={`${t.campaignName ?? 'standalone'}-${t.id}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{t.name}</td>
                      <td className="px-3 py-3">
                        {t.campaignName ? (
                          <Link to={`/campaigns/${encodeURIComponent(t.campaignName)}`} className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline dark:text-brand-300">
                            <Megaphone size={12} /> <span className="max-w-[140px] truncate">{t.campaignName}</span>
                          </Link>
                        ) : (
                          <Badge tone="neutral">Standalone</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{nm(t.ownerId)}</td>
                      <td className="px-3 py-3">
                        {t.dueDate ? (
                          <span className={overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}>
                            {formatDate(t.dueDate)}
                            {overdue && <span className="ml-1 text-[11px]">({relativeDays(t.dueDate, now)})</span>}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">{t.priority && <Badge tone={priorityTone[t.priority]}>{priorityLabel[t.priority]}</Badge>}</td>
                      <td className="px-3 py-3">
                        {canEditStatus(t) ? (
                          <select
                            value={t.status}
                            onChange={(e) => setStatus(t, e.target.value as TaskStatus)}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {STATUSES.map((s) => <option key={s} value={s}>{taskStatusLabel[s]}</option>)}
                          </select>
                        ) : (
                          <Badge tone={taskStatusTone[t.status]}>{taskStatusLabel[t.status]}</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {canManage && !t.campaignName && (
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => { setEditing(t); setModalOpen(true); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700/60 dark:hover:text-slate-200" aria-label="Edit task">
                              <Pencil size={14} />
                            </button>
                            <button type="button" onClick={() => removeStandaloneTask(t.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400" aria-label="Delete task">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalOpen && (
        <TaskModal
          members={members}
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSave={(task) => {
            if (editing) updateStandaloneTask(editing.id, task);
            else addStandaloneTask({ id: newTaskId(), ...task });
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === o.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TaskModal({ members, editing, onClose, onSave }: { members: TeamMember[]; editing: CampaignTask | null; onClose: () => void; onSave: (t: Omit<CampaignTask, 'id'>) => void }) {
  const [f, setF] = useState({
    name: editing?.name ?? '',
    ownerId: editing?.ownerId ?? '',
    dueDate: editing?.dueDate ?? '',
    priority: (editing?.priority ?? 'medium') as Priority,
    status: (editing?.status ?? 'todo') as TaskStatus,
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit Task' : 'New Task'}
      description="Standalone task — not tied to a campaign."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            if (!f.name.trim()) return;
            onSave({ name: f.name.trim(), ownerId: f.ownerId || undefined, dueDate: f.dueDate || undefined, priority: f.priority, status: f.status });
          }}>{editing ? 'Save' : 'Add'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Task name"><input className={inputClass} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Owner"><select className={inputClass} value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })}><option value="">—</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
          <Field label="Due date"><input type="date" className={inputClass} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
          <Field label="Priority"><select className={inputClass} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
          <Field label="Status"><select className={inputClass} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as TaskStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{taskStatusLabel[s]}</option>)}</select></Field>
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
