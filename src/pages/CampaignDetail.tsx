import { useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertOctagon, AlertTriangle, CheckCircle2, ClipboardList, MessageSquare, NotebookPen, Plus, Sparkles, TrendingUp, UserPlus } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Modal } from '@/components/ui/Modal';
import { lgpKpiTiles } from '@/utils/calculations';
import { campaignInsights, type InsightSeverity } from '@/utils/insights';
import { campaignTrackLabel, campaignTrackTone, priorityLabel, priorityTone, taskStatusLabel, taskStatusTone } from '@/utils/labels';
import { formatDate, formatIDR, formatIDRCompact, formatNumber, formatPercent } from '@/utils/format';
import type {
  CampaignAssignment,
  CampaignTask,
  CampaignWeeklyUpdate,
  LgpCampaign,
  LgpPeriod,
  Priority,
  TaskStatus,
  TeamMember,
} from '@/types';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
const statusTone = { 'on-track': 'success', 'at-risk': 'warning', 'off-track': 'danger' } as const;
const newId = (p: string) => `${p}-${Date.now().toString(36)}`;

const INSIGHT_STYLE: Record<InsightSeverity, { wrap: string; icon: ReactNode }> = {
  critical: { wrap: 'border-rose-400 bg-rose-50/60 dark:border-rose-500/50 dark:bg-rose-500/10', icon: <AlertOctagon size={16} className="text-rose-500" /> },
  warning: { wrap: 'border-amber-400 bg-amber-50/60 dark:border-amber-500/50 dark:bg-amber-500/10', icon: <AlertTriangle size={16} className="text-amber-500" /> },
  opportunity: { wrap: 'border-sky-400 bg-sky-50/60 dark:border-sky-500/50 dark:bg-sky-500/10', icon: <TrendingUp size={16} className="text-sky-500" /> },
  good: { wrap: 'border-emerald-400 bg-emerald-50/60 dark:border-emerald-500/50 dark:bg-emerald-500/10', icon: <CheckCircle2 size={16} className="text-emerald-500" /> },
};

export function CampaignDetail() {
  const { name } = useParams();
  const { data, loading, error, assignments, updateAssignment } = useData();
  const { session } = useSession();
  const canManage = session?.role === 'manager';

  const [assignOpen, setAssignOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);

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

  const a: CampaignAssignment = assignments[campaign.name] ?? { campaignName: campaign.name };
  const members = data.teamMembers;
  const nm = (id?: string) => (id ? members.find((m) => m.id === id)?.name ?? '—' : '—');
  const isOwner = !!session?.memberId && (a.ownerId === session.memberId || (a.supportingIds ?? []).includes(session.memberId));
  const canExecute = canManage || isOwner;

  // Members can only open campaigns assigned to them.
  if (session?.role === 'member' && !isOwner) return <Navigate to="/" replace />;

  const patch = (p: Partial<CampaignAssignment>) => updateAssignment(campaign.name, p);

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{campaign.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {campaign.products ? `${campaign.products} · ` : ''}
            {formatDate(a.startDate ?? campaign.startDate)} → {formatDate(a.endDate ?? campaign.endDate)}
          </p>
        </div>
        <Badge tone={campaignTrackTone[campaign.health.status]}>{campaignTrackLabel[campaign.health.status]} · {campaign.health.score}</Badge>
      </div>

      {/* Info + Health */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Campaign Information"
            action={canManage ? <Button variant="secondary" size="sm" onClick={() => setAssignOpen(true)}><UserPlus size={14} /> Assign</Button> : undefined}
          />
          <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-700/50">
            <Row label="Owner" value={nm(a.ownerId)} />
            <Row label="Supporting" value={(a.supportingIds ?? []).map(nm).join(', ') || '—'} />
            <Row label="Reviewer" value={nm(a.reviewerId)} />
            <Row label="Priority" value={a.priority ? priorityLabel[a.priority] : '—'} />
            <Row label="Target KPI" value={a.targetKpi || `${campaign.targets.book} Booking · ${formatNumber(campaign.targets.leads)} Leads`} />
            <Row label="Campaign Type" value={a.campaignType || '—'} />
            <Row label="Manager" value={data.program.managerName} />
          </dl>
        </Card>

        <Card className="flex flex-col items-center justify-center">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Campaign Health Score</p>
          <ScoreRing value={campaign.health.score} size={132} label="of 100" />
          <Badge tone={campaignTrackTone[campaign.health.status]} className="mt-2">{campaignTrackLabel[campaign.health.status]}</Badge>
          <div className="mt-4 w-full max-w-xs space-y-1.5 text-xs">
            <Weight label="Lead Achievement" pct={40} />
            <Weight label="Booking Achievement" pct={40} />
            <Weight label="Cost Efficiency" pct={20} />
          </div>
        </Card>
      </div>

      {/* Performance summary */}
      <Card>
        <CardHeader title="Campaign Performance Summary" subtitle="Synced from LGP" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {lgpKpiTiles(campaign).map((t) => (
            <div key={t.key} className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60">
              <p className="text-[11px] uppercase tracking-wide text-muted">{t.label}</p>
              <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
                {formatNumber(t.current)} <span className="text-xs font-normal text-muted">/ {formatNumber(t.target)}</span>
              </p>
              {t.target > 0 && (
                <div className="mt-1">
                  <Badge tone={statusTone[t.status]}>{formatPercent(t.achievement)}</Badge>
                </div>
              )}
            </div>
          ))}
          <Cost label="Spend" value={formatIDRCompact(campaign.ads.spend)} />
          <Cost label="CPL" value={formatIDR(campaign.cost.cpl)} />
          <Cost label="CP Submit" value={formatIDR(campaign.cost.cpSubmit)} />
          <Cost label="CP Interest" value={formatIDR(campaign.cost.cpInterest)} />
          <Cost label="CP SVD" value={formatIDR(campaign.cost.cpSvd)} />
          <Cost label="CP Booking" value={formatIDR(campaign.cost.cpBooking)} />
          <Cost label="CPA" value={formatIDR(campaign.finance.cpa)} />
          <Cost
            label="Conversion"
            value={formatPercent(campaign.funnel.raw > 0 ? (campaign.funnel.booking / campaign.funnel.raw) * 100 : 0, 1)}
          />
        </div>
      </Card>

      {/* Insights (rule-based — precursor to the Phase C AI Command Center) */}
      <Card>
        <CardHeader title="Insights" subtitle="Otomatis dari metrik LGP · pendahulu AI Command Center (Fase C)" icon={<Sparkles size={16} />} />
        <ul className="space-y-2">
          {campaignInsights(campaign).map((ins) => (
            <li key={ins.id} className={`flex items-start gap-3 rounded-xl border-l-4 px-3.5 py-2.5 ${INSIGHT_STYLE[ins.severity].wrap}`}>
              <span className="mt-0.5 flex-none">{INSIGHT_STYLE[ins.severity].icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{ins.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{ins.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="Monthly Breakdown" rows={campaign.monthly} />
        <Breakdown title="Weekly Breakdown" rows={campaign.weekly} />
      </div>

      {/* Tasks */}
      <Card padded={false}>
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><ClipboardList size={16} className="text-brand-500" /> Project Tasks</h3>
          {canExecute && <Button size="sm" onClick={() => setTaskOpen(true)}><Plus size={14} /> Create Task</Button>}
        </div>
        {(a.tasks ?? []).length === 0 ? (
          <p className="p-5 text-sm text-muted">No tasks yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 text-left text-xs uppercase tracking-wide text-muted dark:border-slate-700/60">
                  <th className="px-5 py-2.5 font-medium">Task</th><th className="px-3 py-2.5 font-medium">Owner</th><th className="px-3 py-2.5 font-medium">Due</th><th className="px-3 py-2.5 font-medium">Priority</th><th className="px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(a.tasks ?? []).map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/40">
                    <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{t.name}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{nm(t.ownerId)}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{t.dueDate ? formatDate(t.dueDate) : '—'}</td>
                    <td className="px-3 py-2.5">{t.priority && <Badge tone={priorityTone[t.priority]}>{priorityLabel[t.priority]}</Badge>}</td>
                    <td className="px-5 py-2.5">
                      {canExecute ? (
                        <select
                          value={t.status}
                          onChange={(e) => patch({ tasks: (a.tasks ?? []).map((x) => (x.id === t.id ? { ...x, status: e.target.value as TaskStatus } : x)) })}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {(['todo', 'in-progress', 'blocked', 'completed', 'cancelled'] as TaskStatus[]).map((s) => <option key={s} value={s}>{taskStatusLabel[s]}</option>)}
                        </select>
                      ) : (
                        <Badge tone={taskStatusTone[t.status]}>{taskStatusLabel[t.status]}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Weekly update */}
      <Card padded={false}>
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><NotebookPen size={16} className="text-brand-500" /> Weekly Update</h3>
          {canExecute && <Button size="sm" onClick={() => setUpdateOpen(true)}><Plus size={14} /> Add Update</Button>}
        </div>
        <div className="space-y-3 p-5">
          {(a.weeklyUpdates ?? []).length === 0 ? (
            <p className="text-sm text-muted">No weekly updates yet.</p>
          ) : (
            (a.weeklyUpdates ?? []).map((u) => (
              <div key={u.id} className="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700/60">
                <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{formatDate(u.date)} {u.author ? `· ${u.author}` : ''}</p>
                <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-700/50">
                  <Row label="Progress Summary" value={u.progressSummary} />
                  {u.achievement && <Row label="Achievement" value={u.achievement} />}
                  {u.challenge && <Row label="Challenge" value={u.challenge} />}
                  {u.risk && <Row label="Risk" value={u.risk} />}
                  {u.nextAction && <Row label="Next Action" value={u.nextAction} />}
                  {u.supportNeeded && <Row label="Support Needed" value={u.supportNeeded} />}
                </dl>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Manager notes */}
      <Card>
        <CardHeader title="Manager Notes" subtitle="Public is visible to the member; internal is manager-only" />
        {canManage ? (
          <div className="space-y-3">
            <NoteEditor label="Public note" value={a.managerNotesPublic ?? ''} onSave={(v) => patch({ managerNotesPublic: v })} />
            <NoteEditor label="Internal note (manager only)" value={a.managerNotesInternal ?? ''} onSave={(v) => patch({ managerNotesInternal: v })} />
          </div>
        ) : (
          <p className="text-sm text-slate-700 dark:text-slate-200">{a.managerNotesPublic || <span className="text-muted">No notes yet.</span>}</p>
        )}
      </Card>

      {/* Discussion */}
      <DiscussionSection
        comments={a.comments ?? []}
        author={session?.name ?? 'User'}
        canPost={canExecute}
        onAdd={(text) => patch({ comments: [...(a.comments ?? []), { id: newId('c'), date: new Date().toISOString().slice(0, 10), author: session?.name ?? 'User', text }] })}
      />

      {assignOpen && <AssignModal campaign={campaign} assignment={a} members={members} onClose={() => setAssignOpen(false)} onSave={patch} />}
      {taskOpen && <TaskModal members={members} onClose={() => setTaskOpen(false)} onAdd={(t) => patch({ tasks: [...(a.tasks ?? []), t] })} />}
      {updateOpen && <UpdateModal author={session?.name ?? 'User'} onClose={() => setUpdateOpen(false)} onAdd={(u) => patch({ weeklyUpdates: [u, ...(a.weeklyUpdates ?? [])] })} />}
    </div>
  );
}

// ── small pieces ──────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}
function Weight({ label, pct }: { label: string; pct: number }) {
  return <div className="flex items-center justify-between"><span className="text-muted">{label}</span><span className="font-semibold text-slate-700 dark:text-slate-200">{pct}%</span></div>;
}
function Cost({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40"><p className="text-[11px] uppercase tracking-wide text-muted">{label}</p><p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{value}</p></div>;
}
function Breakdown({ title, rows }: { title: string; rows: LgpPeriod[] }) {
  return (
    <Card padded={false}>
      <div className="border-b border-slate-200/80 p-5 dark:border-slate-700/60"><h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3></div>
      {rows.length === 0 ? <p className="p-5 text-sm text-muted">No data.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b border-slate-200/80 text-left text-xs uppercase tracking-wide text-muted dark:border-slate-700/60"><th className="px-5 py-2.5 font-medium">Period</th><th className="px-3 py-2.5 font-medium">RAW</th><th className="px-3 py-2.5 font-medium">Sub</th><th className="px-3 py-2.5 font-medium">Int</th><th className="px-3 py-2.5 font-medium">SVD</th><th className="px-3 py-2.5 font-medium">Spend</th><th className="px-5 py-2.5 font-medium">CPL</th></tr></thead>
            <tbody>{rows.slice().reverse().map((r) => (
              <tr key={r.period} className="border-b border-slate-100 last:border-0 dark:border-slate-700/40">
                <td className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200">{r.period}</td><td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatNumber(r.raw)}</td><td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatNumber(r.submitted)}</td><td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatNumber(r.interest)}</td><td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatNumber(r.svd)}</td><td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatIDRCompact(r.spend)}</td><td className="px-5 py-2.5 text-slate-600 dark:text-slate-300">{formatIDRCompact(r.cpl)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
function NoteEditor({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <textarea className={`${inputClass} min-h-[56px] resize-y`} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} />
    </div>
  );
}
function DiscussionSection({ comments, author, canPost, onAdd }: { comments: { id: string; date: string; author: string; text: string }[]; author: string; canPost: boolean; onAdd: (t: string) => void }) {
  const [text, setText] = useState('');
  return (
    <Card>
      <CardHeader title="Discussion & Collaboration" subtitle="Comments, mentions & activity" icon={<MessageSquare size={16} />} />
      {comments.length === 0 ? <p className="text-sm text-muted">No comments yet.</p> : (
        <ul className="space-y-3">{comments.map((c) => (
          <li key={c.id} className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/60"><p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.author} · {formatDate(c.date)}</p><p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{c.text}</p></li>
        ))}</ul>
      )}
      {canPost && (
        <div className="mt-3 flex gap-2">
          <input className={inputClass} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Comment as ${author}…`} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { onAdd(text.trim()); setText(''); } }} />
          <Button size="sm" onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(''); } }}><Plus size={14} /> Post</Button>
        </div>
      )}
    </Card>
  );
}

// ── modals ──────────────────────────────────────────────────────────────
function AssignModal({ campaign, assignment, members, onClose, onSave }: { campaign: LgpCampaign; assignment: CampaignAssignment; members: TeamMember[]; onClose: () => void; onSave: (p: Partial<CampaignAssignment>) => void }) {
  const [f, setF] = useState({
    ownerId: assignment.ownerId ?? '', reviewerId: assignment.reviewerId ?? '', priority: (assignment.priority ?? 'medium') as Priority,
    startDate: assignment.startDate ?? campaign.startDate, endDate: assignment.endDate ?? campaign.endDate,
    targetKpi: assignment.targetKpi ?? '', campaignType: assignment.campaignType ?? '',
  });
  const [supporting, setSupporting] = useState<string[]>(assignment.supportingIds ?? []);
  const toggle = (id: string) => setSupporting((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <Modal open onClose={onClose} title="Assign Campaign" description="Assign owner, supporting team, reviewer and targets."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { onSave({ ownerId: f.ownerId || undefined, reviewerId: f.reviewerId || undefined, priority: f.priority, startDate: f.startDate || undefined, endDate: f.endDate || undefined, targetKpi: f.targetKpi.trim() || undefined, campaignType: f.campaignType.trim() || undefined, supportingIds: supporting }); onClose(); }}>Save</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Owner"><select className={inputClass} value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })}><option value="">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
          <Field label="Reviewer"><select className={inputClass} value={f.reviewerId} onChange={(e) => setF({ ...f, reviewerId: e.target.value })}><option value="">—</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
        </div>
        <Field label="Supporting members">
          <div className="flex flex-wrap gap-1.5">{members.map((m) => { const on = supporting.includes(m.id); return <button key={m.id} type="button" onClick={() => toggle(m.id)} className={`rounded-full px-3 py-1 text-xs font-medium ${on ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300'}`}>{m.name}</button>; })}</div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Priority"><select className={inputClass} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
          <Field label="Campaign Type"><input className={inputClass} value={f.campaignType} onChange={(e) => setF({ ...f, campaignType: e.target.value })} placeholder="e.g. Meta Ads" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date"><input type="date" className={inputClass} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
          <Field label="End date"><input type="date" className={inputClass} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
        </div>
        <Field label="Target KPI"><input className={inputClass} value={f.targetKpi} onChange={(e) => setF({ ...f, targetKpi: e.target.value })} placeholder="e.g. 10 Booking · CPL < 100k" /></Field>
      </div>
    </Modal>
  );
}
function TaskModal({ members, onClose, onAdd }: { members: TeamMember[]; onClose: () => void; onAdd: (t: CampaignTask) => void }) {
  const [f, setF] = useState({ name: '', ownerId: '', dueDate: '', priority: 'medium' as Priority, status: 'todo' as TaskStatus });
  return (
    <Modal open onClose={onClose} title="Create Task"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { if (f.name.trim()) { onAdd({ id: newId('t'), name: f.name.trim(), ownerId: f.ownerId || undefined, dueDate: f.dueDate || undefined, priority: f.priority, status: f.status }); onClose(); } }}>Add</Button></>}>
      <div className="space-y-4">
        <Field label="Task name"><input className={inputClass} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Owner"><select className={inputClass} value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })}><option value="">—</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
          <Field label="Due date"><input type="date" className={inputClass} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
          <Field label="Priority"><select className={inputClass} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
          <Field label="Status"><select className={inputClass} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as TaskStatus })}>{(['todo', 'in-progress', 'blocked', 'completed', 'cancelled'] as TaskStatus[]).map((s) => <option key={s} value={s}>{taskStatusLabel[s]}</option>)}</select></Field>
        </div>
      </div>
    </Modal>
  );
}
function UpdateModal({ author, onClose, onAdd }: { author: string; onClose: () => void; onAdd: (u: CampaignWeeklyUpdate) => void }) {
  const [f, setF] = useState({ progressSummary: '', achievement: '', challenge: '', risk: '', nextAction: '', supportNeeded: '' });
  return (
    <Modal open onClose={onClose} title="Add Weekly Update"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { if (f.progressSummary.trim()) { onAdd({ id: newId('wu'), date: new Date().toISOString().slice(0, 10), author, progressSummary: f.progressSummary.trim(), achievement: f.achievement.trim() || undefined, challenge: f.challenge.trim() || undefined, risk: f.risk.trim() || undefined, nextAction: f.nextAction.trim() || undefined, supportNeeded: f.supportNeeded.trim() || undefined }); onClose(); } }}>Add</Button></>}>
      <div className="space-y-3">
        <Field label="Progress summary"><textarea className={`${inputClass} min-h-[56px] resize-y`} value={f.progressSummary} onChange={(e) => setF({ ...f, progressSummary: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Achievement"><input className={inputClass} value={f.achievement} onChange={(e) => setF({ ...f, achievement: e.target.value })} /></Field>
          <Field label="Challenge"><input className={inputClass} value={f.challenge} onChange={(e) => setF({ ...f, challenge: e.target.value })} /></Field>
          <Field label="Risk"><input className={inputClass} value={f.risk} onChange={(e) => setF({ ...f, risk: e.target.value })} /></Field>
          <Field label="Next action"><input className={inputClass} value={f.nextAction} onChange={(e) => setF({ ...f, nextAction: e.target.value })} /></Field>
        </div>
        <Field label="Support needed"><input className={inputClass} value={f.supportNeeded} onChange={(e) => setF({ ...f, supportNeeded: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>{children}</label>;
}
function BackLink() {
  return <Link to="/campaigns" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"><ArrowLeft size={15} /> Back to Campaigns</Link>;
}
