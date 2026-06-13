import { Link } from 'react-router-dom';
import { Banknote, HeartPulse, Megaphone, Target, TrendingUp, Users, Wallet } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { SegmentedDonut } from '@/components/charts/SegmentedDonut';
import { lgpPortfolio, teamHealthSnapshot } from '@/utils/calculations';
import { campaignTrackTone } from '@/utils/labels';
import { formatIDRCompact, formatNumber } from '@/utils/format';

const COLORS = { onTrack: '#10b981', atRisk: '#f59e0b', offTrack: '#f43f5e' };
const HEALTH_LABEL = { 'on-track': 'Healthy', 'at-risk': 'Warning', 'off-track': 'Critical' } as const;

export function ExecutiveDashboard() {
  const { data, loading, error } = useData();
  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const p = lgpPortfolio(data.lgpCampaigns);
  const team = teamHealthSnapshot(data.teamMembers);
  const attention = data.lgpCampaigns.slice().sort((a, b) => a.health.score - b.health.score).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Executive Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Business health across {p.count} campaigns — at a glance.</p>
      </div>

      {/* Business health */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Revenue (est)" value={formatIDRCompact(p.revenue)} icon={<Banknote size={18} />} iconTone="success" />
        <StatCard label="Spend" value={formatIDRCompact(p.spend)} icon={<Wallet size={18} />} iconTone="brand" />
        <StatCard label="ROAS" value={`${p.roas}×`} icon={<TrendingUp size={18} />} iconTone="success" />
        <StatCard label="Bookings" value={formatNumber(p.booking)} icon={<Target size={18} />} iconTone="info" />
        <StatCard label="CPA" value={formatIDRCompact(p.cpa)} icon={<Wallet size={18} />} iconTone="warning" />
        <StatCard label="Leads" value={formatNumber(p.leads)} icon={<Megaphone size={18} />} iconTone="neutral" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Campaign / project health */}
        <Card>
          <CardHeader title="Project Health" subtitle={`${p.count} campaigns`} icon={<HeartPulse size={16} />} />
          <div className="flex items-center gap-5">
            <SegmentedDonut
              centerValue={p.count}
              centerLabel="campaigns"
              segments={[
                { label: 'Healthy', value: p.onTrack, color: COLORS.onTrack },
                { label: 'Warning', value: p.atRisk, color: COLORS.atRisk },
                { label: 'Critical', value: p.offTrack, color: COLORS.offTrack },
              ]}
            />
            <ul className="space-y-2 text-sm">
              <Legend color={COLORS.onTrack} label="Healthy" value={p.onTrack} />
              <Legend color={COLORS.atRisk} label="Warning" value={p.atRisk} />
              <Legend color={COLORS.offTrack} label="Critical" value={p.offTrack} />
            </ul>
          </div>
        </Card>

        {/* Team health */}
        <Card>
          <CardHeader title="Team Health" subtitle={`${team.total} members`} icon={<Users size={16} />} />
          <ul className="space-y-2 text-sm">
            <Legend color={COLORS.onTrack} label="On Track" value={team.onTrack} />
            <Legend color={COLORS.atRisk} label="At Risk" value={team.atRisk} />
            <Legend color={COLORS.offTrack} label="Off Track" value={team.offTrack} />
          </ul>
          <Link to="/team" className="mt-4 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-300">
            View team →
          </Link>
        </Card>

        {/* Campaigns requiring attention */}
        <Card>
          <CardHeader title="Requiring Attention" subtitle="Lowest health first" icon={<HeartPulse size={16} />} />
          <ul className="space-y-2">
            {attention.map((c) => (
              <li key={c.name}>
                <Link
                  to={`/campaigns/${encodeURIComponent(c.name)}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/70 px-3 py-2 transition-colors hover:border-slate-300 dark:border-slate-700/60 dark:hover:border-slate-600"
                >
                  <span className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-200">{c.name}</span>
                  <Badge tone={campaignTrackTone[c.health.status]}>{HEALTH_LABEL[c.health.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="ml-auto font-semibold text-slate-800 dark:text-slate-100">{value}</span>
    </li>
  );
}
