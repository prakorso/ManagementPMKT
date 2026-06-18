import { Link } from 'react-router-dom';
import { AlertTriangle, Megaphone, ShieldAlert, Users } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Tone } from '@/components/ui/Badge';
import {
  escalatedMembers,
  lgpPortfolio,
  memberWorkload,
  performanceScore,
  teamHealthSnapshot,
} from '@/utils/calculations';
import { campaignTrackLabel, campaignTrackTone, healthLabel, healthTone } from '@/utils/labels';
import { formatIDRCompact, formatNumber, formatPercent } from '@/utils/format';

const round = (n: number) => Math.round(n);
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

export function ManagerReadiness() {
  const { data, loading, error, assignments, oneOnOnes } = useData();
  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const now = new Date();
  const { teamMembers, lgpCampaigns, actionItems } = data;

  const p = lgpPortfolio(lgpCampaigns);
  const team = teamHealthSnapshot(teamMembers);
  const avgPerf = round(avg(teamMembers.map((m) => performanceScore(m, lgpCampaigns, assignments, actionItems, now).score)));
  const avgUtil = round(avg(teamMembers.map((m) => memberWorkload(m, lgpCampaigns, assignments, now).utilizationPct)));
  const escalated = escalatedMembers(oneOnOnes, teamMembers);

  const escalations = teamMembers.flatMap((m) => {
    const latest = oneOnOnes
      .filter((s) => s.memberId === m.id && s.escalate)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return latest ? [{ member: m, reason: latest.escalationReason, date: latest.date }] : [];
  });

  const problemCampaigns = lgpCampaigns
    .filter((c) => c.health.status !== 'on-track')
    .sort((a, b) => a.health.score - b.health.score);

  const watchlist = teamMembers.filter((m) => m.health !== 'on-track');
  const ownerName = (name: string) => {
    const id = assignments[name]?.ownerId;
    return id ? teamMembers.find((m) => m.id === id)?.name : undefined;
  };

  const teamVerdict: { tone: Tone; label: string } =
    team.offTrack > 0 || escalated.length > 0
      ? { tone: 'danger', label: 'Needs attention' }
      : team.atRisk > 0
        ? { tone: 'warning', label: 'Watch' }
        : { tone: 'success', label: 'Healthy' };
  const portfolioVerdict: { tone: Tone; label: string } =
    p.offTrack > 0 ? { tone: 'danger', label: 'Needs attention' } : p.atRisk > 0 ? { tone: 'warning', label: 'Watch' } : { tone: 'success', label: 'Healthy' };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Readiness — Executive Overview"
        description="How the team and the whole portfolio are tracking — the quick answer to “how is the team, and which projects are at risk?”"
      />

      {/* Verdicts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Users size={16} className="text-brand-500" /> Team
            </h3>
            <Badge tone={teamVerdict.tone}>{teamVerdict.label}</Badge>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Metric label="Members" value={formatNumber(team.total)} />
            <Metric label="Avg Performance" value={String(avgPerf)} />
            <Metric label="Avg Load" value={`${avgUtil}%`} />
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <Legend color="#10b981" label="On Track" value={team.onTrack} />
            <Legend color="#f59e0b" label="Watch" value={team.atRisk} />
            <Legend color="#f43f5e" label="At Risk" value={team.offTrack} />
            <Legend color="#f43f5e" label="Escalations" value={escalated.length} />
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Megaphone size={16} className="text-brand-500" /> Portfolio
            </h3>
            <Badge tone={portfolioVerdict.tone}>{portfolioVerdict.label}</Badge>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Metric label="Bookings" value={formatNumber(p.booking)} />
            <Metric label="CPA" value={formatIDRCompact(p.cpa)} />
            <Metric label="Conversion" value={formatPercent(p.conversion, 1)} />
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <Legend color="#10b981" label="On Track" value={p.onTrack} />
            <Legend color="#f59e0b" label="At Risk" value={p.atRisk} />
            <Legend color="#f43f5e" label="Off Track" value={p.offTrack} />
            <Legend color="#64748b" label="Total Campaigns" value={p.count} />
          </ul>
        </Card>
      </div>

      {/* Spend headline */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Spend" value={formatIDRCompact(p.spend)} />
        <StatCard label="Total Leads" value={formatNumber(p.leads)} />
        <StatCard label="Campaigns At Risk" value={p.atRisk + p.offTrack} />
        <StatCard label="Escalations" value={escalated.length} />
      </div>

      {/* Projects needing attention */}
      <Card padded={false}>
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <AlertTriangle size={16} className="text-amber-500" /> Projects Needing Attention
          </h3>
          <Badge tone={problemCampaigns.length ? 'warning' : 'success'}>{problemCampaigns.length}</Badge>
        </div>
        {problemCampaigns.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<Megaphone size={26} />} title="All campaigns on track" description="" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 text-left text-xs uppercase tracking-wide text-muted dark:border-slate-700/60">
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-3 py-3 font-medium">Owner</th>
                  <th className="px-3 py-3 font-medium">CPA</th>
                  <th className="px-3 py-3 font-medium">Bookings</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {problemCampaigns.map((c) => (
                  <tr key={c.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
                    <td className="px-5 py-3">
                      <Link to={`/campaigns/${encodeURIComponent(c.name)}`} className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-300">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{ownerName(c.name) ?? 'Unassigned'}</td>
                    <td className="px-3 py-3 tabular-nums text-slate-600 dark:text-slate-300">{c.finance.cpa > 0 ? formatIDRCompact(c.finance.cpa) : '—'}</td>
                    <td className="px-3 py-3 tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(c.funnel.booking)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={campaignTrackTone[c.health.status]}>{campaignTrackLabel[c.health.status]} · {c.health.score}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Escalations + team watchlist */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card padded={false}>
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <ShieldAlert size={16} className="text-rose-500" /> Escalations
            </h3>
            <Badge tone={escalations.length ? 'danger' : 'success'}>{escalations.length}</Badge>
          </div>
          {escalations.length === 0 ? (
            <div className="p-5"><EmptyState icon={<ShieldAlert size={26} />} title="No escalations" description="" /></div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {escalations.map((e) => (
                <li key={e.member.id} className="flex items-start gap-3 px-5 py-3">
                  <Avatar name={e.member.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/team/${e.member.id}`} className="text-sm font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-300">
                      {e.member.name}
                    </Link>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{e.reason || 'Flagged for attention.'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padded={false}>
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Users size={16} className="text-amber-500" /> Team Watchlist
            </h3>
            <Badge tone={watchlist.length ? 'warning' : 'success'}>{watchlist.length}</Badge>
          </div>
          {watchlist.length === 0 ? (
            <div className="p-5"><EmptyState icon={<Users size={26} />} title="Whole team on track" description="" /></div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {watchlist.map((m) => {
                const wl = memberWorkload(m, lgpCampaigns, assignments, now);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={m.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/team/${m.id}`} className="block truncate text-sm font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-300">
                        {m.name}
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <ProgressBar value={wl.utilizationPct} tone={wl.utilizationPct > 100 ? 'danger' : 'brand'} size="sm" className="w-16" />
                        <span className="text-[11px] text-muted">{wl.totalCampaigns} campaigns</span>
                      </div>
                    </div>
                    <Badge tone={healthTone[m.health]}>{healthLabel[m.health]}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
      <p className="truncate text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="ml-auto font-semibold tabular-nums text-slate-800 dark:text-slate-100">{value}</span>
    </li>
  );
}
