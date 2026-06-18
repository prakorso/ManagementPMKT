import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { useChartColors } from '@/components/charts/useChartColors';
import { campaignTrackLabel, campaignTrackTone } from '@/utils/labels';
import { lgpPortfolio, portfolioContribution, portfolioFunnel, portfolioMonthly } from '@/utils/calculations';
import { formatIDRCompact, formatNumber, formatPercent } from '@/utils/format';
import type { LgpCampaign } from '@/types';

const FUNNEL_STAGES = [
  { key: 'raw', label: 'RAW Leads' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'interest', label: 'Interest' },
  { key: 'svs', label: 'SVA' },
  { key: 'svd', label: 'SPD' },
  { key: 'booking', label: 'Booking' },
] as const;

export function PerformanceReporting() {
  const { data, loading, error } = useData();
  const colors = useChartColors();

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const campaigns = data.lgpCampaigns;
  const p = lgpPortfolio(campaigns);
  const funnel = portfolioFunnel(campaigns);
  const contribution = portfolioContribution(campaigns);
  const monthly = portfolioMonthly(campaigns);

  const contribTotal = contribution.pmkt + contribution.organic + contribution.socmed + contribution.other || 1;
  const channels = [
    { label: 'PMKT', value: contribution.pmkt, tone: 'brand' as const },
    { label: 'Organic', value: contribution.organic, tone: 'success' as const },
    { label: 'Socmed', value: contribution.socmed, tone: 'info' as const },
    { label: 'Other', value: contribution.other, tone: 'neutral' as const },
  ];

  const ranked = [...campaigns].sort((a, b) => a.health.score - b.health.score);
  const needsAttention = ranked.slice(0, 5);
  const topPerformers = ranked.slice(-5).reverse();

  // Lead momentum: latest vs previous month.
  const last = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2];
  const leadDelta = last && prev && prev.raw > 0 ? Math.round(((last.raw - prev.raw) / prev.raw) * 100) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Performance"
        description="Overall performance across all campaigns — the whole business at a glance, synced from LGP."
      />

      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Spend" value={formatIDRCompact(p.spend)} />
        <StatCard label="Leads" value={formatNumber(p.leads)} />
        <StatCard label="Bookings" value={formatNumber(p.booking)} />
        <StatCard label="CPA" value={formatIDRCompact(p.cpa)} />
        <StatCard label="Conversion" value={formatPercent(p.conversion, 1)} />
        <StatCard label="Campaigns" value={formatNumber(p.count)} />
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader title="Business Funnel" subtitle="All campaigns combined · % of RAW leads" />
        <div className="space-y-2.5">
          {FUNNEL_STAGES.map((s) => {
            const value = funnel[s.key];
            const pct = funnel.raw > 0 ? (value / funnel.raw) * 100 : 0;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-24 flex-none text-xs font-medium text-slate-600 dark:text-slate-300">{s.label}</span>
                <ProgressBar value={pct} tone="brand" className="flex-1" />
                <span className="w-28 flex-none text-right text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {formatNumber(value)} <span className="text-xs font-normal text-muted">· {pct.toFixed(0)}%</span>
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Trends */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Leads per Month"
            subtitle={leadDelta === null ? 'Across all campaigns' : `${leadDelta >= 0 ? '+' : ''}${leadDelta}% vs last month`}
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="period" stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} width={48} />
                <Tooltip cursor={{ fill: colors.grid, opacity: 0.3 }} content={<ChartTooltip colors={colors} format={(v) => formatNumber(v)} />} />
                <Bar name="Leads" dataKey="raw" fill={colors.brand} radius={[4, 4, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Spend & CPL per Month" subtitle="Spend (bars not shown) — CPL trend, lower is better" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="period" stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke={colors.axis}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => formatIDRCompact(v).replace('Rp', '')}
                />
                <Tooltip content={<ChartTooltip colors={colors} format={(v) => formatIDRCompact(v)} />} />
                <Line name="CPL" type="monotone" dataKey="cpl" stroke={colors.brand} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Channel contribution */}
      <Card>
        <CardHeader title="Lead Contribution by Channel" subtitle="Share of total leads" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((c) => (
            <div key={c.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-300">{c.label}</span>
                <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatPercent((c.value / contribTotal) * 100, 0)}</span>
              </div>
              <ProgressBar value={(c.value / contribTotal) * 100} tone={c.tone} />
              <p className="mt-1 text-[11px] text-muted">{formatNumber(c.value)} leads</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Top / needs attention */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CampaignList title="Needs Attention" campaigns={needsAttention} worst />
        <CampaignList title="Top Performers" campaigns={topPerformers} />
      </div>
    </div>
  );
}

function CampaignList({ title, campaigns, worst }: { title: string; campaigns: LgpCampaign[]; worst?: boolean }) {
  return (
    <Card padded={false}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {worst ? <ArrowDownRight size={16} className="text-rose-500" /> : <ArrowUpRight size={16} className="text-emerald-500" />}
          {title}
        </h3>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
        {campaigns.map((c) => (
          <li key={c.name} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <Link to={`/campaigns/${encodeURIComponent(c.name)}`} className="block truncate text-sm font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-300">
                {c.name}
              </Link>
              <p className="text-xs text-muted">CPA {c.finance.cpa > 0 ? formatIDRCompact(c.finance.cpa) : '—'}</p>
            </div>
            <Badge tone={campaignTrackTone[c.health.status]}>{campaignTrackLabel[c.health.status]} · {c.health.score}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
