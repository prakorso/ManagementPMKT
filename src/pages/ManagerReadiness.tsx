import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDown, ArrowUp, Minus, Send } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Segmented } from '@/components/ui/Segmented';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { ProgressBar, scoreTone } from '@/components/ui/ProgressBar';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { useChartColors } from '@/components/charts/useChartColors';
import {
  delegationStats,
  getProgramTiming,
  overallReadiness,
  previousMonthKey,
  readinessBand,
  readinessBreakdown,
  readinessTrend,
  type MonthKey,
} from '@/utils/calculations';
import { readinessAreaLabel } from '@/utils/labels';
import { formatPercent } from '@/utils/format';
import type { ReadinessArea } from '@/types';

const shortAreaLabel: Record<ReadinessArea, string> = {
  'people-management': 'People',
  reporting: 'Reporting',
  assessment: 'Assessment',
  'stakeholder-management': 'Stakeholder',
  delegation: 'Delegation',
};

export function ManagerReadiness() {
  const { data, loading, error } = useData();
  const colors = useChartColors();
  const [selected, setSelected] = useState<MonthKey | null>(null);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const { program, readiness, actionItems } = data;
  const timing = getProgramTiming(program.programStartDate);
  const monthKey = selected ?? timing.currentMonthKey;
  const monthIndex = Number(monthKey.replace('month', ''));

  const score = overallReadiness(readiness, monthKey);
  const band = readinessBand(score);
  const prevKey = previousMonthKey(monthKey);
  const delta = prevKey ? score - overallReadiness(readiness, prevKey) : null;

  const breakdown = readinessBreakdown(readiness, monthKey);
  const trend = readinessTrend(readiness);
  const radarData = breakdown.map((b) => ({ area: shortAreaLabel[b.area], score: b.score }));
  const delegation = delegationStats(actionItems);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manager Readiness"
        description="Have you grown from specialist to manager? Track readiness across five areas and over time."
      >
        <Segmented
          value={monthKey}
          onChange={(v) => setSelected(v)}
          options={[
            { value: 'month1', label: 'Month 1' },
            { value: 'month2', label: 'Month 2' },
            { value: 'month3', label: 'Month 3' },
          ]}
        />
      </PageHeader>

      {/* Top row: score + trend + radar */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Overall score */}
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Readiness Score · Month {monthIndex}</p>
          <ScoreRing value={score} size={160} label="of 100" />
          <Badge tone={band.tone} className="mt-3">
            {band.label}
          </Badge>
          {delta !== null && (
            <p
              className={`mt-2 flex items-center gap-1 text-xs font-medium ${
                delta > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : delta < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500'
              }`}
            >
              {delta > 0 ? <ArrowUp size={13} /> : delta < 0 ? <ArrowDown size={13} /> : <Minus size={13} />}
              {Math.abs(delta)} pts vs previous month
            </p>
          )}
        </Card>

        {/* Trend */}
        <Card>
          <CardHeader title="Readiness Trend" subtitle="Overall score per month" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="label" stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} width={36} />
                <Tooltip content={<ChartTooltip colors={colors} format={(v) => `${v}/100`} />} />
                <Line
                  name="Readiness"
                  type="monotone"
                  dataKey="score"
                  stroke={colors.brand}
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Radar */}
        <Card>
          <CardHeader title="Area Balance" subtitle={`Month ${monthIndex} across areas`} />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke={colors.grid} />
                <PolarAngleAxis dataKey="area" tick={{ fill: colors.axis, fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: colors.muted, fontSize: 10 }} axisLine={false} />
                <Radar name="Score" dataKey="score" stroke={colors.brand} fill={colors.brand} fillOpacity={0.25} />
                <Tooltip content={<ChartTooltip colors={colors} format={(v) => `${v}/100`} />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Area breakdown */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {breakdown.map((area) => {
          const areaDelta = area.previousScore !== null ? area.score - area.previousScore : null;
          return (
            <Card key={area.area} className="flex flex-col">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{readinessAreaLabel[area.area]}</h3>
                <div className="text-right">
                  <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{area.score}</span>
                  {areaDelta !== null && (
                    <span
                      className={`ml-1 text-xs font-medium ${
                        areaDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {areaDelta >= 0 ? '+' : ''}
                      {areaDelta}
                    </span>
                  )}
                </div>
              </div>
              <ProgressBar value={area.score} autoTone />

              <ul className="mt-4 space-y-2.5">
                {area.metrics.map((metric) => (
                  <li key={metric.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300">{metric.name}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{metric.score}%</span>
                    </div>
                    <ProgressBar value={metric.score} tone={scoreTone(metric.score)} size="sm" />
                  </li>
                ))}
              </ul>

              {area.area === 'delegation' && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-muted dark:bg-slate-800/40">
                  <Send size={13} className="text-brand-500" />
                  <span>
                    {delegation.tasksCompletedByTeam}/{delegation.tasksDelegated} delegated tasks completed ·{' '}
                    {formatPercent(delegation.completionRate)}
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
