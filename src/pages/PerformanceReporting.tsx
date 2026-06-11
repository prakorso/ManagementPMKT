import { useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Lightbulb, Megaphone, Plus, XCircle } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Segmented } from '@/components/ui/Segmented';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { useChartColors } from '@/components/charts/useChartColors';
import { CampaignCard } from '@/components/projects/CampaignCard';
import { AddCampaignModal } from '@/components/projects/AddCampaignModal';
import {
  campaignTrackSummary,
  kpiResults,
  latestMonthly,
  monthlySeries,
  weeklySeries,
  type KpiResult,
} from '@/utils/calculations';
import { formatDelta, formatIDR, formatIDRCompact, formatNumber, formatPercent } from '@/utils/format';
import type { PerformanceSnapshot } from '@/types';

type TrendView = 'monthly' | 'weekly';

export function PerformanceReporting() {
  const { data, loading, error, addProject, updateProject, removeProject } = useData();
  const colors = useChartColors();
  const [view, setView] = useState<TrendView>('monthly');
  const [campaignModal, setCampaignModal] = useState(false);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const { performance, projects, teamMembers } = data;
  const latest = latestMonthly(performance);
  const series = view === 'monthly' ? monthlySeries(performance) : weeklySeries(performance);
  const campaigns = campaignTrackSummary(projects);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Reporting"
        description="Campaign health and Dev Biz KPIs — how many campaigns are on/off-track, plus Leads, CPL & rates vs target."
      >
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'weekly', label: 'Weekly' },
          ]}
        />
      </PageHeader>

      {/* Campaigns — on/off-track */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Megaphone size={16} className="text-brand-500" /> Campaigns
          </h2>
          <Button size="sm" onClick={() => setCampaignModal(true)}>
            <Plus size={15} /> Add Campaign
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="On Track" value={campaigns.onTrack} icon={<CheckCircle2 size={18} />} iconTone="success" hint={`of ${campaigns.total} campaigns`} />
          <StatCard label="At Risk" value={campaigns.atRisk} icon={<AlertTriangle size={18} />} iconTone="warning" hint="need attention" />
          <StatCard label="Off Track" value={campaigns.offTrack} icon={<XCircle size={18} />} iconTone="danger" hint="behind target" />
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<Megaphone size={28} />}
            title="No campaigns yet"
            description="Add a campaign and assign the member(s) handling it to track on/off-track here."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <CampaignCard
                key={project.id}
                project={project}
                members={teamMembers}
                onUpdate={updateProject}
                onRemove={removeProject}
              />
            ))}
          </div>
        )}
      </div>

      {/* KPI cards (latest month) */}
      {latest && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {kpiResults(latest).map((kpi) => (
            <KpiCard key={kpi.key} kpi={kpi} />
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Leads target vs actual */}
        <Card className="lg:col-span-2">
          <CardHeader title="Leads — Target vs Actual" subtitle={`${view === 'monthly' ? 'Monthly' : 'Weekly'} trend`} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="label" stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  cursor={{ fill: colors.grid, opacity: 0.3 }}
                  content={<ChartTooltip colors={colors} format={(v) => formatNumber(v)} />}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: colors.axis }} />
                <Bar name="Actual" dataKey="leads" fill={colors.brand} radius={[4, 4, 0, 0]} maxBarSize={42} />
                <Line
                  name="Target"
                  type="monotone"
                  dataKey="leadsTarget"
                  stroke={colors.warning}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* CPL trend */}
        <Card>
          <CardHeader title="CPL Trend" subtitle="Cost per lead vs target (lower is better)" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="label" stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke={colors.axis}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => formatIDRCompact(v).replace('Rp ', '')}
                  domain={['dataMin - 2000', 'dataMax + 2000']}
                />
                <Tooltip content={<ChartTooltip colors={colors} format={(v) => formatIDR(v)} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: colors.axis }} />
                <Line name="Actual CPL" type="monotone" dataKey="cpl" stroke={colors.brand} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line
                  name="Target CPL"
                  type="monotone"
                  dataKey="cplTarget"
                  stroke={colors.muted}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quality trend */}
        <Card>
          <CardHeader title="Quality Trend" subtitle="Valid rate & conversion rate (%)" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="label" stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} width={40} unit="%" />
                <Tooltip content={<ChartTooltip colors={colors} format={(v) => formatPercent(v, 1)} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: colors.axis }} />
                <Line name="Valid Rate" type="monotone" dataKey="validRate" stroke={colors.success} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line name="Conversion Rate" type="monotone" dataKey="conversionRate" stroke={colors.info} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Notes */}
      {latest && <PerformanceNotes snapshot={latest} />}

      <AddCampaignModal
        open={campaignModal}
        onClose={() => setCampaignModal(false)}
        onAdd={addProject}
        members={teamMembers}
      />
    </div>
  );
}

function KpiCard({ kpi }: { kpi: KpiResult }) {
  const formatValue = (value: number) =>
    kpi.format === 'currency'
      ? kpi.key === 'budget'
        ? formatIDRCompact(value)
        : formatIDR(value)
      : kpi.format === 'percent'
        ? formatPercent(value, 1)
        : formatNumber(value);

  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{kpi.label}</p>
      <p className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{formatValue(kpi.actual)}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted">Target: {formatValue(kpi.target)}</span>
        <Badge tone={kpi.good ? 'success' : 'danger'}>{formatDelta(kpi.delta)}</Badge>
      </div>
    </Card>
  );
}

function PerformanceNotes({ snapshot }: { snapshot: PerformanceSnapshot }) {
  const notes = [
    { icon: Lightbulb, title: 'Key Insight', body: snapshot.keyInsight, tone: 'info' as const },
    { icon: ClipboardCheck, title: 'Action Plan', body: snapshot.actionPlan, tone: 'success' as const },
    { icon: AlertTriangle, title: 'Risk', body: snapshot.risk, tone: 'danger' as const },
  ].filter((n) => n.body);

  if (notes.length === 0) return null;

  const accent = {
    info: 'text-sky-600 dark:text-sky-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    danger: 'text-rose-600 dark:text-rose-400',
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {notes.map(({ icon: Icon, title, body, tone }) => (
        <Card key={title}>
          <p className={`flex items-center gap-2 text-sm font-semibold ${accent[tone]}`}>
            <Icon size={16} /> {title}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{body}</p>
        </Card>
      ))}
    </div>
  );
}
