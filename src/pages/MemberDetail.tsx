import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Lightbulb,
  Mail,
  Megaphone,
  MessageSquareQuote,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { AssignedCampaignCard } from '@/components/projects/AssignedCampaignCard';
import { OneOnOnePanel } from '@/components/team/OneOnOnePanel';
import { formatDate, relativeDays } from '@/utils/format';
import { actionStatusLabel, actionStatusTone, healthLabel, healthTone, meetingCategoryLabel, meetingCategoryTone } from '@/utils/labels';

export function MemberDetail() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, assignments, removeTeamMember, oneOnOnes, addOneOnOne, updateOneOnOne, removeOneOnOne } = useData();
  const { session } = useSession();
  const isManager = session?.role === 'manager';
  const canEdit = session?.role === 'manager' || session?.role === 'team-lead';

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const member = data.teamMembers.find((m) => m.id === memberId);
  if (!member) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState message="That team member could not be found." />
      </div>
    );
  }

  const now = new Date();
  const assignedCampaigns = data.lgpCampaigns.filter((c) => {
    const a = assignments[c.name];
    return !!a && (a.ownerId === member.id || (a.supportingIds ?? []).includes(member.id));
  });
  const meetings = data.meetings.filter((m) => m.teamMemberId === member.id).sort((a, b) => b.date.localeCompare(a.date));
  const actionItems = data.actionItems.filter((i) => i.teamMemberId === member.id);
  const openItems = actionItems.filter((i) => i.status !== 'done');
  const memberSessions = oneOnOnes.filter((s) => s.memberId === member.id).sort((a, b) => b.date.localeCompare(a.date));
  const latestSession = memberSessions[0];
  const lastOneOnOneDate = latestSession?.date ?? member.lastOneOnOne;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <BackLink />
        {isManager && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              removeTeamMember(member.id);
              navigate('/team');
            }}
          >
            <Trash2 size={14} /> Delete member
          </Button>
        )}
      </div>

      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={member.name} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{member.name}</h1>
                <Badge tone={healthTone[member.health]}>{healthLabel[member.health]}</Badge>
                {latestSession?.escalate && (
                  <Badge tone="danger">
                    <ShieldAlert size={11} /> Escalation
                  </Badge>
                )}
                {member.local && <Badge tone="info">Local</Badge>}
              </div>
              <p className="text-sm text-muted">{member.role}</p>
              {member.email && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  <Mail size={12} /> {member.email}
                </p>
              )}
            </div>
          </div>
          <div className="sm:w-56">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-300">Development Progress</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{member.developmentProgress}%</span>
            </div>
            <ProgressBar value={member.developmentProgress} autoTone />
          </div>
        </div>

        {/* 1:1 schedule + links */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat icon={<CalendarCheck size={12} />} label="Last 1:1" value={formatDate(lastOneOnOneDate)} sub={relativeDays(lastOneOnOneDate, now)} />
          <MiniStat icon={<CalendarClock size={12} />} label="Next 1:1" value={formatDate(member.nextOneOnOne)} sub={relativeDays(member.nextOneOnOne, now)} />
          {member.reportingUrl && (
            <LinkTile href={member.reportingUrl} icon={<FileSpreadsheet size={14} />} label="Reporting Sheet" />
          )}
          {member.oneOnOneDocUrl && <LinkTile href={member.oneOnOneDocUrl} icon={<FileText size={14} />} label="1:1 Doc" />}
        </div>
      </Card>

      {/* Strengths / development / coaching */}
      {(member.strengths.length > 0 || member.developmentAreas.length > 0 || member.coachingFocus) && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader title="Strengths" icon={<Sparkles size={16} />} />
            <div className="flex flex-wrap gap-1.5">
              {member.strengths.length ? member.strengths.map((s) => <Badge key={s} tone="success">{s}</Badge>) : <span className="text-xs text-muted">—</span>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Development Areas" icon={<Lightbulb size={16} />} />
            <div className="flex flex-wrap gap-1.5">
              {member.developmentAreas.length ? member.developmentAreas.map((s) => <Badge key={s} tone="warning">{s}</Badge>) : <span className="text-xs text-muted">—</span>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Coaching Focus" icon={<MessageSquareQuote size={16} />} />
            <p className="text-sm text-slate-700 dark:text-slate-200">{member.coachingFocus ?? <span className="text-muted">Not set yet.</span>}</p>
          </Card>
        </div>
      )}

      {/* Assigned campaigns */}
      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
          <Megaphone size={16} className="text-brand-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assigned Campaigns</h3>
          <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {assignedCampaigns.length}
          </span>
        </div>
        <div className="p-5">
          {assignedCampaigns.length === 0 ? (
            <EmptyState
              icon={<Megaphone size={28} />}
              title="No campaigns assigned"
              description={`Assign a campaign to ${member.name} from the Campaign Hub.`}
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {assignedCampaigns.map((c) => (
                <AssignedCampaignCard key={c.name} campaign={c} owner={member.name} />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* One-on-one system */}
      <OneOnOnePanel
        memberId={member.id}
        memberName={member.name}
        sessions={memberSessions}
        canEdit={canEdit}
        author={session?.name ?? 'Manager'}
        onAdd={addOneOnOne}
        onUpdate={updateOneOnOne}
        onRemove={removeOneOnOne}
      />

      {/* Meetings + action items */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card padded={false}>
          <div className="border-b border-slate-200/80 p-5 dark:border-slate-700/60">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Meeting Updates</h3>
          </div>
          <div className="p-5">
            {meetings.length === 0 ? (
              <p className="text-sm text-muted">No meeting updates yet.</p>
            ) : (
              <ul className="space-y-3">
                {meetings.map((m) => (
                  <li key={m.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-700/40">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={meetingCategoryTone[m.category]}>{meetingCategoryLabel[m.category]}</Badge>
                      <span className="text-xs text-muted">{formatDate(m.date)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200">{m.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card padded={false}>
          <div className="flex items-center gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
            <ClipboardList size={16} className="text-brand-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Action Items</h3>
            <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {openItems.length} open
            </span>
          </div>
          <div className="p-5">
            {actionItems.length === 0 ? (
              <p className="text-sm text-muted">No action items.</p>
            ) : (
              <ul className="space-y-2.5">
                {actionItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-700 dark:text-slate-200">{item.title}</span>
                    <div className="flex flex-none items-center gap-2">
                      {item.dueDate && <span className="text-[11px] text-muted">{relativeDays(item.dueDate, now)}</span>}
                      <Badge tone={actionStatusTone[item.status]}>{actionStatusLabel[item.status]}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/team" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
      <ArrowLeft size={15} /> Back to Team
    </Link>
  );
}

function MiniStat({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
        {icon} {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function LinkTile({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
    >
      {icon} {label}
    </a>
  );
}
