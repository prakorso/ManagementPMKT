import { Link } from 'react-router-dom';
import type { LgpCampaign } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { campaignTrackLabel, campaignTrackTone } from '@/utils/labels';
import { formatIDRCompact, formatNumber, relativeDays } from '@/utils/format';

/** Card for a campaign that's been assigned to an owner (Project Assignment / member view). */
export function AssignedCampaignCard({ campaign: c, owner }: { campaign: LgpCampaign; owner?: string }) {
  const now = new Date();
  return (
    <Link to={`/campaigns/${encodeURIComponent(c.name)}`} className="card card-pad block transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{c.name}</p>
          <p className="truncate text-xs text-muted">{owner ? `Owner: ${owner}` : 'Unassigned'}</p>
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
