import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, BrainCircuit, CheckCircle2, Megaphone, TrendingUp } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { insightCounts, portfolioInsights, type InsightSeverity } from '@/utils/insights';

const STYLE: Record<InsightSeverity, { wrap: string; icon: ReactNode; label: string }> = {
  critical: { wrap: 'border-rose-400 bg-rose-50/60 dark:border-rose-500/50 dark:bg-rose-500/10', icon: <AlertOctagon size={16} className="text-rose-500" />, label: 'Critical' },
  warning: { wrap: 'border-amber-400 bg-amber-50/60 dark:border-amber-500/50 dark:bg-amber-500/10', icon: <AlertTriangle size={16} className="text-amber-500" />, label: 'Warning' },
  opportunity: { wrap: 'border-sky-400 bg-sky-50/60 dark:border-sky-500/50 dark:bg-sky-500/10', icon: <TrendingUp size={16} className="text-sky-500" />, label: 'Opportunity' },
  good: { wrap: 'border-emerald-400 bg-emerald-50/60', icon: <CheckCircle2 size={16} className="text-emerald-500" />, label: 'Good' },
};

type Filter = 'all' | 'critical' | 'warning' | 'opportunity';

export function AICommandCenter() {
  const { data, loading, error } = useData();
  const [filter, setFilter] = useState<Filter>('all');

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const now = new Date();
  const insights = portfolioInsights(data.lgpCampaigns, now);
  const counts = insightCounts(insights);
  const shown = filter === 'all' ? insights : insights.filter((i) => i.severity === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Command Center"
        description="Automatic Critical / Warning / Opportunity signals across every campaign — rule engine on the synced LGP metrics."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Critical" value={counts.critical} icon={<AlertOctagon size={18} />} iconTone="danger" />
        <StatCard label="Warning" value={counts.warning} icon={<AlertTriangle size={18} />} iconTone="warning" />
        <StatCard label="Opportunity" value={counts.opportunity} icon={<TrendingUp size={18} />} iconTone="info" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          options={[
            { value: 'all', label: `All (${insights.length})` },
            { value: 'critical', label: `Critical (${counts.critical})` },
            { value: 'warning', label: `Warning (${counts.warning})` },
            { value: 'opportunity', label: `Opportunity (${counts.opportunity})` },
          ]}
        />
      </div>

      <Card padded={false}>
        {shown.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<BrainCircuit size={28} />} title="All clear" description="No signals for this filter right now." />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
            {shown.map((ins) => {
              const s = STYLE[ins.severity];
              return (
                <li key={`${ins.campaignName}-${ins.id}`} className="flex items-start gap-3 p-4">
                  <span className={`mt-0.5 flex-none rounded-lg border-l-4 py-1 pl-2 ${s.wrap}`}>{s.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{ins.title}</p>
                      <Badge tone={ins.severity === 'critical' ? 'danger' : ins.severity === 'warning' ? 'warning' : 'info'}>{s.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{ins.detail}</p>
                    <Link
                      to={`/campaigns/${encodeURIComponent(ins.campaignName)}`}
                      className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
                    >
                      <Megaphone size={12} /> <span className="max-w-[220px] truncate">{ins.campaignName}</span>
                      <span className="text-muted">· health {ins.health}</span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
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
