import { CircleDashed, CircleDot, CheckCircle2, Target } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  monthProgress,
  objectiveStatusCounts,
  objectivesForMonth,
  overallObjectiveProgress,
} from '@/utils/calculations';
import { objectiveStatusLabel, objectiveStatusTone } from '@/utils/labels';
import { formatPercent } from '@/utils/format';
import type { MonthNumber, Objective, ObjectiveStatus } from '@/types';

const MONTH_THEMES: Record<MonthNumber, { title: string; focus: string }> = {
  1: { title: 'Month 1', focus: 'Foundations & cadence' },
  2: { title: 'Month 2', focus: 'Scaling habits' },
  3: { title: 'Month 3', focus: 'Independent operation' },
};

const statusIcon: Record<ObjectiveStatus, typeof CircleDot> = {
  'not-started': CircleDashed,
  'in-progress': CircleDot,
  completed: CheckCircle2,
};

export function ObjectiveTracker() {
  const { data, loading, error } = useData();
  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const { objectives } = data;
  const counts = objectiveStatusCounts(objectives);
  const overall = overallObjectiveProgress(objectives);
  const months: MonthNumber[] = [1, 2, 3];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Objective Tracker"
        description="Every objective from your 3-month development plan, with live progress across Month 1, 2 and 3."
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Overall Progress"
          value={formatPercent(overall)}
          icon={<Target size={18} />}
          iconTone="brand"
          footer={<ProgressBar value={overall} autoTone size="sm" />}
        />
        <StatCard label="Completed" value={`${counts.completed}/${counts.total}`} icon={<CheckCircle2 size={18} />} iconTone="success" hint="objectives done" />
        <StatCard label="In Progress" value={counts.inProgress} icon={<CircleDot size={18} />} iconTone="warning" hint="currently active" />
        <StatCard label="Not Started" value={counts.notStarted} icon={<CircleDashed size={18} />} iconTone="neutral" hint="not yet begun" />
      </div>

      {/* Month columns */}
      <div className="grid gap-4 lg:grid-cols-3">
        {months.map((month) => {
          const items = objectivesForMonth(objectives, month);
          const progress = monthProgress(objectives, month);
          const theme = MONTH_THEMES[month];
          return (
            <Card key={month} className="flex flex-col" padded={false}>
              <div className="border-b border-slate-200/80 p-5 dark:border-slate-700/60">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{theme.title}</h3>
                    <p className="text-xs text-muted">{theme.focus}</p>
                  </div>
                  <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{progress}%</span>
                </div>
                <ProgressBar value={progress} autoTone className="mt-3" />
              </div>

              <ul className="flex-1 space-y-3 p-5">
                {items.map((obj) => (
                  <ObjectiveItem key={obj.id} objective={obj} />
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ObjectiveItem({ objective }: { objective: Objective }) {
  const Icon = statusIcon[objective.status];
  const iconColor =
    objective.status === 'completed'
      ? 'text-emerald-500'
      : objective.status === 'in-progress'
        ? 'text-amber-500'
        : 'text-slate-400';

  return (
    <li className="rounded-xl border border-slate-200/70 p-3.5 transition-colors hover:border-slate-300 dark:border-slate-700/60 dark:hover:border-slate-600">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Icon size={16} className={`mt-0.5 flex-none ${iconColor}`} />
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{objective.title}</p>
            {objective.description && <p className="mt-0.5 text-xs text-muted">{objective.description}</p>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={objective.progress} autoTone size="sm" className="flex-1" />
        <span className="w-9 flex-none text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
          {objective.progress}%
        </span>
      </div>
      <div className="mt-2.5">
        <Badge tone={objectiveStatusTone[objective.status]}>{objectiveStatusLabel[objective.status]}</Badge>
      </div>
    </li>
  );
}
