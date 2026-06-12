import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { EmptyState } from '@/components/ui/EmptyState';
import { lgpKpiTiles } from '@/utils/calculations';
import { campaignTrackLabel, campaignTrackTone } from '@/utils/labels';
import { formatDate, formatIDR, formatIDRCompact, formatNumber, formatPercent } from '@/utils/format';
import type { LgpCampaign, LgpPeriod } from '@/types';

const TABS = ['overview', 'performance', 'tasks', 'updates', 'discussion', 'history'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  overview: 'Overview',
  performance: 'Performance',
  tasks: 'Tasks',
  updates: 'Updates',
  discussion: 'Discussion',
  history: 'History',
};
const statusTone = { 'on-track': 'success', 'at-risk': 'warning', 'off-track': 'danger' } as const;

export function CampaignDetail() {
  const { name } = useParams();
  const { data, loading, error } = useData();
  const [tab, setTab] = useState<Tab>('overview');

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const campaign = data.lgpCampaigns.find((c) => c.name === decodeURIComponent(name ?? ''));
  if (!campaign) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState message="Campaign not found." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{campaign.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {campaign.products ? `${campaign.products} · ` : ''}
            {formatDate(campaign.startDate)} → {formatDate(campaign.endDate)}
          </p>
        </div>
        <Badge tone={campaignTrackTone[campaign.health.status]}>{campaignTrackLabel[campaign.health.status]} · {campaign.health.score}</Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200/80 dark:border-slate-700/60">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'border-brand-500 text-brand-600 dark:text-brand-300'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab campaign={campaign} />}
      {tab === 'performance' && <PerformanceTab campaign={campaign} />}
      {tab === 'tasks' && <Stub label="Tasks" hint="Per-campaign task management connects here next." />}
      {tab === 'updates' && <Stub label="Weekly Updates" hint="Member weekly updates per campaign connect here next." />}
      {tab === 'discussion' && <Stub label="Discussion" hint="Comments, mentions & file attachments connect here next." />}
      {tab === 'history' && <Stub label="History" hint="Activity timeline (task/status/update events) connects here next." />}
    </div>
  );
}

function OverviewTab({ campaign }: { campaign: LgpCampaign }) {
  const tiles = lgpKpiTiles(campaign);
  const contrib = campaign.contribution;
  const totalContrib = contrib.pmkt + contrib.organic + contrib.socmed + contrib.other || 1;
  const cost = campaign.cost;

  return (
    <div className="space-y-6">
      {/* Health + funnel KPIs */}
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Campaign Health</p>
          <ScoreRing value={campaign.health.score} size={130} label="of 100" />
        </Card>
        <Card>
          <CardHeader title="Campaign Summary" subtitle="Funnel KPIs vs target (synced from LGP)" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiles.map((t) => (
              <div key={t.key} className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60">
                <p className="text-[11px] uppercase tracking-wide text-muted">{t.label}</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">{formatNumber(t.current)}</p>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-muted">/ {formatNumber(t.target)}</span>
                  {t.target > 0 && <Badge tone={statusTone[t.status]}>{formatPercent(t.achievement)}</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Cost cards */}
      <Card>
        <CardHeader title="Ads Performance" subtitle={`Spend across Meta/Google/TikTok`} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <CostCard label="Spend" value={formatIDRCompact(campaign.ads.spend)} />
          <CostCard label="CPL" value={formatIDR(cost.cpl)} />
          <CostCard label="CP Submit" value={formatIDR(cost.cpSubmit)} />
          <CostCard label="CP Interest" value={formatIDR(cost.cpInterest)} />
          <CostCard label="CP SVD" value={formatIDR(cost.cpSvd)} />
          <CostCard label="CP Booking" value={formatIDR(cost.cpBooking)} />
        </div>
      </Card>

      {/* Contribution */}
      <Card>
        <CardHeader title="Contribution Source" subtitle="Share of RAW leads" />
        <div className="flex h-3 overflow-hidden rounded-full">
          <span style={{ width: `${(contrib.pmkt / totalContrib) * 100}%` }} className="bg-brand-500" />
          <span style={{ width: `${(contrib.organic / totalContrib) * 100}%` }} className="bg-emerald-500" />
          <span style={{ width: `${(contrib.socmed / totalContrib) * 100}%` }} className="bg-amber-500" />
          <span style={{ width: `${(contrib.other / totalContrib) * 100}%` }} className="bg-slate-400" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <ContribLegend color="bg-brand-500" label="PMKT" value={contrib.pmkt} total={totalContrib} />
          <ContribLegend color="bg-emerald-500" label="Organic" value={contrib.organic} total={totalContrib} />
          <ContribLegend color="bg-amber-500" label="Social" value={contrib.socmed} total={totalContrib} />
          <ContribLegend color="bg-slate-400" label="Other" value={contrib.other} total={totalContrib} />
        </div>
      </Card>
    </div>
  );
}

function PerformanceTab({ campaign }: { campaign: LgpCampaign }) {
  return (
    <div className="space-y-6">
      <BreakdownTable title="Monthly Breakdown" rows={campaign.monthly} />
      <BreakdownTable title="Weekly Breakdown" rows={campaign.weekly} />
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: LgpPeriod[] }) {
  return (
    <Card padded={false}>
      <div className="border-b border-slate-200/80 p-5 dark:border-slate-700/60">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-muted">No data.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 text-left text-xs uppercase tracking-wide text-muted dark:border-slate-700/60">
                <th className="px-5 py-2.5 font-medium">Period</th>
                <th className="px-3 py-2.5 font-medium">RAW</th>
                <th className="px-3 py-2.5 font-medium">Submitted</th>
                <th className="px-3 py-2.5 font-medium">Interest</th>
                <th className="px-3 py-2.5 font-medium">SVD</th>
                <th className="px-3 py-2.5 font-medium">Spend</th>
                <th className="px-5 py-2.5 font-medium">CPL</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice().reverse().map((r) => (
                <tr key={r.period} className="border-b border-slate-100 last:border-0 dark:border-slate-700/40">
                  <td className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200">{r.period}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatNumber(r.raw)}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatNumber(r.submitted)}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatNumber(r.interest)}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatNumber(r.svd)}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatIDRCompact(r.spend)}</td>
                  <td className="px-5 py-2.5 text-slate-600 dark:text-slate-300">{formatIDRCompact(r.cpl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function CostCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function ContribLegend({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="ml-auto font-semibold text-slate-800 dark:text-slate-100">{formatPercent((value / total) * 100)}</span>
    </div>
  );
}

function Stub({ label, hint }: { label: string; hint: string }) {
  return <EmptyState title={label} description={hint} />;
}

function BackLink() {
  return (
    <Link to="/campaigns" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
      <ArrowLeft size={15} /> Back to Campaigns
    </Link>
  );
}
