import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Megaphone, Search, XCircle } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { lgpHealthSummary } from '@/utils/calculations';
import { campaignTrackLabel, campaignTrackTone } from '@/utils/labels';
import { formatIDRCompact, formatNumber, relativeDays } from '@/utils/format';
import type { LgpCampaign } from '@/types';

export function CampaignHub() {
  const { data, loading, error } = useData();
  const [query, setQuery] = useState('');

  const sorted = useMemo(() => {
    const list = data?.lgpCampaigns ?? [];
    const q = query.trim().toLowerCase();
    return list
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.products ?? '').toLowerCase().includes(q))
      .slice()
      .sort((a, b) => a.health.score - b.health.score); // worst first — attention needed
  }, [data, query]);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const summary = lgpHealthSummary(data.lgpCampaigns);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Execution Hub"
        description="Live campaign KPIs synced from LGP — monitor health, booking, spend and CPL without leaving the platform."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Campaigns" value={summary.total} icon={<Megaphone size={18} />} iconTone="brand" />
        <StatCard label="On Track" value={summary.onTrack} icon={<CheckCircle2 size={18} />} iconTone="success" />
        <StatCard label="At Risk" value={summary.atRisk} icon={<AlertTriangle size={18} />} iconTone="warning" />
        <StatCard label="Off Track" value={summary.offTrack} icon={<XCircle size={18} />} iconTone="danger" />
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search campaigns…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        />
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={<Megaphone size={28} />} title="No campaigns" description="No campaigns match your search." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {sorted.map((c) => (
            <CampaignHubCard key={c.name} campaign={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignHubCard({ campaign: c }: { campaign: LgpCampaign }) {
  const now = new Date();
  return (
    <Link
      to={`/campaigns/${encodeURIComponent(c.name)}`}
      className="card card-pad block transition-shadow hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{c.name}</p>
          {c.products && <p className="truncate text-xs text-muted">{c.products}</p>}
        </div>
        <Badge tone={campaignTrackTone[c.health.status]}>{campaignTrackLabel[c.health.status]}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Mini label="Booking" value={`${c.funnel.booking}/${c.targets.book || '—'}`} />
        <Mini label="Spend" value={formatIDRCompact(c.ads.spend)} />
        <Mini label="CPL" value={formatIDRCompact(c.cost.cpl)} />
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted">Health score</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{c.health.score}</span>
        </div>
        <ProgressBar value={c.health.score} autoTone size="sm" />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <span>RAW {formatNumber(c.funnel.raw)} · SVD {c.funnel.svd}</span>
        {c.lastLead && <span>Last lead {relativeDays(c.lastLead, now)}</span>}
      </div>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-1.5 dark:bg-slate-800/40">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
