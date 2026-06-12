import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ListChecks, Plus, XCircle } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { CreateObjectiveModal } from '@/components/objectives/CreateObjectiveModal';
import { ObjectiveDetailModal } from '@/components/objectives/ObjectiveDetailModal';
import { objectiveStatusLabel, objectiveStatusTone, priorityLabel, priorityTone } from '@/utils/labels';
import { formatDate, relativeDays } from '@/utils/format';
import type { Objective, ObjectiveStatus } from '@/types';

type StatusFilter = 'all' | ObjectiveStatus;
type OwnerFilter = 'all' | 'team' | string;

const selectClass =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

const STATUSES: ObjectiveStatus[] = ['not-started', 'in-progress', 'on-track', 'at-risk', 'off-track', 'completed'];

export function ObjectiveTracker() {
  const { data, loading, error, addObjective } = useData();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [showArchived, setShowArchived] = useState(false);

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    data?.teamMembers.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [data]);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const all = data.objectives.filter((o) => (showArchived ? true : !o.archived));
  const counts = {
    onTrack: all.filter((o) => o.status === 'on-track' || o.status === 'in-progress').length,
    atRisk: all.filter((o) => o.status === 'at-risk').length,
    offTrack: all.filter((o) => o.status === 'off-track').length,
    completed: all.filter((o) => o.status === 'completed').length,
  };

  const filtered = all
    .filter((o) => (statusFilter === 'all' ? true : o.status === statusFilter))
    .filter((o) => {
      if (ownerFilter === 'all') return true;
      if (ownerFilter === 'team') return !o.ownerId;
      return o.ownerId === ownerFilter;
    })
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));

  const selected = selectedId ? data.objectives.find((o) => o.id === selectedId) ?? null : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Objective Tracker" description="Create, assign, track and review objectives across the team.">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Create Objective
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="On Track" value={counts.onTrack} icon={<CheckCircle2 size={18} />} iconTone="success" />
        <StatCard label="At Risk" value={counts.atRisk} icon={<AlertTriangle size={18} />} iconTone="warning" />
        <StatCard label="Off Track" value={counts.offTrack} icon={<XCircle size={18} />} iconTone="danger" />
        <StatCard label="Completed" value={counts.completed} icon={<ListChecks size={18} />} iconTone="brand" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {objectiveStatusLabel[s]}
            </option>
          ))}
        </select>
        <select className={selectClass} value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
          <option value="all">All owners</option>
          <option value="team">Team / Manager</option>
          {data.teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
        <span className="ml-auto text-xs text-muted">{filtered.length} objectives</span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={<ListChecks size={28} />} title="No objectives match" description="Adjust filters or create a new objective." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((obj) => (
            <ObjectiveCard key={obj.id} objective={obj} ownerName={obj.ownerId ? memberName.get(obj.ownerId) : undefined} onClick={() => setSelectedId(obj.id)} />
          ))}
        </div>
      )}

      <CreateObjectiveModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={addObjective} members={data.teamMembers} />
      {selected && <ObjectiveDetailModal key={selected.id} objective={selected} members={data.teamMembers} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function ObjectiveCard({ objective, ownerName, onClick }: { objective: Objective; ownerName?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card card-pad w-full text-left transition-shadow hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{objective.title}</p>
          <p className="mt-0.5 text-xs text-muted">{ownerName ?? 'Team / Manager'}</p>
        </div>
        <Badge tone={objectiveStatusTone[objective.status]}>{objectiveStatusLabel[objective.status]}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={objective.progress} autoTone size="sm" className="flex-1" />
        <span className="w-9 flex-none text-right text-xs font-semibold text-slate-700 dark:text-slate-200">{objective.progress}%</span>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        {objective.priority && <Badge tone={priorityTone[objective.priority]}>{priorityLabel[objective.priority]}</Badge>}
        {objective.archived && <Badge tone="neutral">Archived</Badge>}
        {objective.dueDate && <span className="ml-auto text-[11px] text-muted">Due {relativeDays(objective.dueDate)} · {formatDate(objective.dueDate)}</span>}
      </div>
    </button>
  );
}
