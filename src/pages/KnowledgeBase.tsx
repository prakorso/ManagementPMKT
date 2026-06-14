import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Lightbulb, Megaphone, Pencil, Search, Sparkles, Target, Users } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatIDRCompact, formatNumber, formatPercent } from '@/utils/format';
import { campaignTrackLabel, campaignTrackTone } from '@/utils/labels';
import type { KnowledgeEntry, LgpCampaign } from '@/types';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const bestCpl = (c: LgpCampaign) => {
  const cpls = [...(c.monthly ?? []), ...(c.weekly ?? [])].map((p) => p.cpl).filter((v) => v > 0);
  return cpls.length ? Math.min(...cpls) : c.cost.cpl;
};
const conversion = (c: LgpCampaign) => (c.funnel.raw > 0 ? (c.funnel.booking / c.funnel.raw) * 100 : 0);
const hasContent = (k?: KnowledgeEntry) => !!(k && (k.winningCreative || k.winningAudience || k.learnings || k.recommendations));

export function KnowledgeBase() {
  const { data, loading, error, assignments, knowledge, updateKnowledge } = useData();
  const { session } = useSession();
  const canManage = session?.role === 'manager' || session?.role === 'team-lead';
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<LgpCampaign | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    const campaigns = data?.lgpCampaigns ?? [];
    return campaigns
      .filter((c) => {
        if (!q) return true;
        const k = knowledge[c.name];
        const hay = [c.name, c.products, k?.winningCreative, k?.winningAudience, k?.learnings, k?.recommendations]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const ad = hasContent(knowledge[a.name]) ? 0 : 1;
        const bd = hasContent(knowledge[b.name]) ? 0 : 1;
        return ad - bd || a.name.localeCompare(b.name);
      });
  }, [data, knowledge, q]);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const members = data.teamMembers;
  const ownerName = (name: string) => {
    const id = assignments[name]?.ownerId;
    return id ? members.find((m) => m.id === id)?.name : undefined;
  };
  const documented = data.lgpCampaigns.filter((c) => hasContent(knowledge[c.name])).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Winning creative & audience, best costs, learnings and recommendations — retained per campaign, even when the team changes."
      >
        <Badge tone="info">{documented}/{data.lgpCampaigns.length} documented</Badge>
      </PageHeader>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className={`${inputClass} pl-9`}
          placeholder="Search campaign, creative, audience, learnings…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<BookOpen size={28} />} title="No campaigns found" description="Try a different search." />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((c) => {
            const k = knowledge[c.name];
            return (
              <Card key={c.name} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/campaigns/${encodeURIComponent(c.name)}`} className="font-semibold text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-300">
                      {c.name}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <Users size={12} /> {ownerName(c.name) ?? 'Unassigned'}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-1.5">
                    <Badge tone={campaignTrackTone[c.health.status]}>{campaignTrackLabel[c.health.status]}</Badge>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700/60 dark:hover:text-slate-200"
                        aria-label="Edit knowledge"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Auto metrics */}
                <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/40">
                  <Metric label="Best CPL" value={formatIDRCompact(bestCpl(c))} />
                  <Metric label="CPA" value={c.finance.cpa > 0 ? formatIDRCompact(c.finance.cpa) : '—'} />
                  <Metric label="Conv" value={formatPercent(conversion(c), 1)} />
                  <Metric label="Booking" value={formatNumber(c.funnel.booking)} />
                </div>

                {/* Knowledge */}
                <div className="mt-3 space-y-2.5">
                  <KbField icon={<Sparkles size={13} className="text-emerald-500" />} label="Winning Creative" value={k?.winningCreative} />
                  <KbField icon={<Target size={13} className="text-sky-500" />} label="Winning Audience" value={k?.winningAudience} />
                  <KbField icon={<Lightbulb size={13} className="text-amber-500" />} label="Learnings" value={k?.learnings} />
                  <KbField icon={<Megaphone size={13} className="text-brand-500" />} label="Recommendations" value={k?.recommendations} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <KbModal
          campaign={editing}
          entry={knowledge[editing.name]}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateKnowledge(editing.name, patch);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-center">
      <p className="truncate text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="truncate text-sm font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function KbField({ icon, label, value }: { icon: ReactNode; label: string; value?: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {icon} {label}
      </p>
      {value ? (
        <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">{value}</p>
      ) : (
        <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">—</p>
      )}
    </div>
  );
}

function KbModal({
  campaign,
  entry,
  onClose,
  onSave,
}: {
  campaign: LgpCampaign;
  entry?: KnowledgeEntry;
  onClose: () => void;
  onSave: (patch: Partial<KnowledgeEntry>) => void;
}) {
  const [f, setF] = useState({
    winningCreative: entry?.winningCreative ?? '',
    winningAudience: entry?.winningAudience ?? '',
    learnings: entry?.learnings ?? '',
    recommendations: entry?.recommendations ?? '',
  });
  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Knowledge"
      description={campaign.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() =>
              onSave({
                winningCreative: f.winningCreative.trim() || undefined,
                winningAudience: f.winningAudience.trim() || undefined,
                learnings: f.learnings.trim() || undefined,
                recommendations: f.recommendations.trim() || undefined,
              })
            }
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Winning Creative"><textarea className={`${inputClass} min-h-[60px] resize-y`} value={f.winningCreative} onChange={(e) => setF({ ...f, winningCreative: e.target.value })} placeholder="Format / hook / angle that worked best…" /></Field>
        <Field label="Winning Audience"><textarea className={`${inputClass} min-h-[60px] resize-y`} value={f.winningAudience} onChange={(e) => setF({ ...f, winningAudience: e.target.value })} placeholder="Best-performing audience / targeting…" /></Field>
        <Field label="Learnings"><textarea className={`${inputClass} min-h-[60px] resize-y`} value={f.learnings} onChange={(e) => setF({ ...f, learnings: e.target.value })} placeholder="What we learned running this campaign…" /></Field>
        <Field label="Recommendations"><textarea className={`${inputClass} min-h-[60px] resize-y`} value={f.recommendations} onChange={(e) => setF({ ...f, recommendations: e.target.value })} placeholder="What to do next time…" /></Field>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}
