import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Crosshair, Gauge, Percent, Target } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge, type Tone } from '@/components/ui/Badge';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { useChartColors } from '@/components/charts/useChartColors';
import { assessmentMetrics, assessmentSummary } from '@/utils/calculations';
import { formatIDR, formatIDRCompact, formatNumber, formatPercent } from '@/utils/format';
import type { Assessment } from '@/types';

function accuracyTone(accuracy: number): Tone {
  if (accuracy >= 85) return 'success';
  if (accuracy >= 70) return 'warning';
  return 'danger';
}

export function AssessmentTracker() {
  const { data, loading, error } = useData();
  const colors = useChartColors();

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const { assessments } = data;
  const summary = assessmentSummary(assessments);

  const chartData = assessments
    .filter((a) => a.completed && a.actualCpl > 0)
    .map((a) => ({ label: a.projectName, forecast: a.forecastCpl, actual: a.actualCpl }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Tracker"
        description="Forecasting accuracy across projects — forecast vs actual CPL, lead volume and interest rate."
      />

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Forecast Accuracy"
          value={formatPercent(summary.forecastAccuracy)}
          icon={<Target size={18} />}
          iconTone="success"
          hint={`Across ${summary.measuredCount} measured assessments`}
        />
        <StatCard
          label="Average Variance"
          value={formatPercent(summary.averageVariance)}
          icon={<Percent size={18} />}
          iconTone="warning"
          hint="Mean absolute CPL variance"
        />
        <StatCard
          label="Assessment Success Rate"
          value={formatPercent(summary.successRate)}
          icon={<Gauge size={18} />}
          iconTone="brand"
          hint="On cost & on volume vs forecast"
        />
      </div>

      {/* Forecast vs actual chart */}
      <Card>
        <CardHeader title="Forecast vs Actual CPL" subtitle="Completed assessments" icon={<Crosshair size={16} />} />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis dataKey="label" stroke={colors.axis} fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-12} textAnchor="end" height={50} />
              <YAxis
                stroke={colors.axis}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v) => formatIDRCompact(v).replace('Rp ', '')}
              />
              <Tooltip
                cursor={{ fill: colors.grid, opacity: 0.3 }}
                content={<ChartTooltip colors={colors} format={(v) => formatIDR(v)} />}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: colors.axis }} />
              <Bar name="Forecast" dataKey="forecast" fill={colors.muted} radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar name="Actual" dataKey="actual" fill={colors.brand} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detail table */}
      <Card padded={false}>
        <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/60">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assessment Detail</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 text-left text-xs uppercase tracking-wide text-muted dark:border-slate-700/60">
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-3 py-3 font-medium">CPL (Forecast → Actual)</th>
                <th className="px-3 py-3 font-medium">Leads (F → A)</th>
                <th className="px-3 py-3 font-medium">Interest (F → A)</th>
                <th className="px-3 py-3 font-medium">CPL Variance</th>
                <th className="px-3 py-3 font-medium">Accuracy</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <AssessmentRow key={a.id} assessment={a} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AssessmentRow({ assessment: a }: { assessment: Assessment }) {
  const m = assessmentMetrics(a);
  const measured = m.accuracy !== null;

  const statusBadge = !a.completed ? (
    <Badge tone="info">In Progress</Badge>
  ) : m.success ? (
    <Badge tone="success">On Target</Badge>
  ) : (
    <Badge tone="danger">Missed</Badge>
  );

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
      <td className="px-5 py-3.5">
        <p className="font-medium text-slate-800 dark:text-slate-100">{a.projectName}</p>
        {a.notes && <p className="mt-0.5 max-w-xs text-xs text-muted">{a.notes}</p>}
      </td>
      <td className="px-3 py-3.5 text-slate-600 dark:text-slate-300">
        {formatIDR(a.forecastCpl)} <span className="text-slate-400">→</span>{' '}
        {measured ? <span className="font-medium text-slate-800 dark:text-slate-100">{formatIDR(a.actualCpl)}</span> : '—'}
      </td>
      <td className="px-3 py-3.5 text-slate-600 dark:text-slate-300">
        {formatNumber(a.forecastLeadVolume)} <span className="text-slate-400">→</span>{' '}
        {measured ? <span className="font-medium text-slate-800 dark:text-slate-100">{formatNumber(a.actualLeadVolume)}</span> : '—'}
      </td>
      <td className="px-3 py-3.5 text-slate-600 dark:text-slate-300">
        {formatPercent(a.forecastInterestRate)} <span className="text-slate-400">→</span>{' '}
        {measured ? <span className="font-medium text-slate-800 dark:text-slate-100">{formatPercent(a.actualInterestRate)}</span> : '—'}
      </td>
      <td className="px-3 py-3.5">
        {measured ? (
          <span className={`font-medium ${m.cplVariance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {m.cplVariance > 0 ? '+' : ''}
            {m.cplVariance.toFixed(1)}%
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-3.5">
        {measured ? <Badge tone={accuracyTone(m.accuracy as number)}>{m.accuracy}%</Badge> : <span className="text-muted">—</span>}
      </td>
      <td className="px-5 py-3.5">{statusBadge}</td>
    </tr>
  );
}
