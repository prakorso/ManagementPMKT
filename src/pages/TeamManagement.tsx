import {
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Lightbulb,
  MessageSquareQuote,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  actionItemCompletionRate,
  averageDevelopmentProgress,
  weeklyOneOnOneCompletion,
} from '@/utils/calculations';
import { formatDate, formatPercent, relativeDays } from '@/utils/format';
import { healthLabel, healthTone } from '@/utils/labels';
import type { ActionItem, Meeting, TeamMember } from '@/types';

export function TeamManagement() {
  const { data, loading, error } = useData();
  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const { teamMembers, actionItems, meetings } = data;
  const now = new Date();

  const oneOnOneCompletion = weeklyOneOnOneCompletion(teamMembers, now);
  const followUpCompletion = actionItemCompletionRate(actionItems);
  const avgDevelopment = averageDevelopmentProgress(teamMembers);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Management"
        description="Manage your direct reports — strengths, development areas, 1:1 cadence, follow-ups and coaching."
      />

      {/* Tracking */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Weekly 1:1 Completion"
          value={formatPercent(oneOnOneCompletion)}
          icon={<CalendarCheck size={18} />}
          iconTone="brand"
          hint="Reports with a 1:1 in the last 7 days"
          footer={<ProgressBar value={oneOnOneCompletion} autoTone size="sm" />}
        />
        <StatCard
          label="Follow-up Completion"
          value={formatPercent(followUpCompletion)}
          icon={<ClipboardList size={18} />}
          iconTone="info"
          hint="Action items closed across the team"
          footer={<ProgressBar value={followUpCompletion} autoTone size="sm" />}
        />
        <StatCard
          label="Avg Development Progress"
          value={formatPercent(avgDevelopment)}
          icon={<TrendingUp size={18} />}
          iconTone="success"
          hint="Mean development progress across reports"
          footer={<ProgressBar value={avgDevelopment} autoTone size="sm" />}
        />
      </div>

      {/* Member cards */}
      <div className="grid gap-4 xl:grid-cols-2">
        {teamMembers.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            actionItems={actionItems}
            meetings={meetings}
            now={now}
          />
        ))}
      </div>
    </div>
  );
}

function MemberCard({
  member,
  actionItems,
  meetings,
  now,
}: {
  member: TeamMember;
  actionItems: ActionItem[];
  meetings: Meeting[];
  now: Date;
}) {
  const openItems = actionItems.filter((i) => i.teamMemberId === member.id && i.status !== 'done');
  const latestNote = meetings
    .filter((m) => m.teamMemberId === member.id)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <Card className="flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={member.name} size="lg" />
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{member.name}</h3>
            <p className="text-xs text-muted">{member.role}</p>
          </div>
        </div>
        <Badge tone={healthTone[member.health]}>{healthLabel[member.health]}</Badge>
      </div>

      {/* Strengths & development areas */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Sparkles size={13} /> Strengths
          </p>
          <div className="flex flex-wrap gap-1.5">
            {member.strengths.map((s) => (
              <Badge key={s} tone="success">
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Lightbulb size={13} /> Development Areas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {member.developmentAreas.map((s) => (
              <Badge key={s} tone="warning">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* 1:1 schedule */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            <CalendarCheck size={12} /> Last 1:1
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{formatDate(member.lastOneOnOne)}</p>
          <p className="text-[11px] text-muted">{relativeDays(member.lastOneOnOne, now)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            <CalendarClock size={12} /> Next 1:1
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{formatDate(member.nextOneOnOne)}</p>
          <p className="text-[11px] text-muted">{relativeDays(member.nextOneOnOne, now)}</p>
        </div>
      </div>

      {/* Development progress */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600 dark:text-slate-300">Development Progress</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{member.developmentProgress}%</span>
        </div>
        <ProgressBar value={member.developmentProgress} autoTone />
      </div>

      {/* Open action items */}
      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <ClipboardList size={13} /> Open Action Items
          <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {openItems.length}
          </span>
        </p>
        {openItems.length === 0 ? (
          <p className="text-xs text-muted">No open items — all follow-ups closed.</p>
        ) : (
          <ul className="space-y-1.5">
            {openItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 flex-none rounded-full bg-amber-500" />
                  {item.title}
                </span>
                {item.dueDate && <span className="flex-none text-[11px] text-muted">{relativeDays(item.dueDate, now)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Coaching notes */}
      <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 p-3 dark:border-brand-500/20 dark:bg-brand-500/10">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
          <MessageSquareQuote size={13} /> Coaching Focus
        </p>
        {member.coachingFocus && (
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{member.coachingFocus}</p>
        )}
        {latestNote && (
          <p className="mt-2 border-t border-brand-100 pt-2 text-xs text-muted dark:border-brand-500/20">
            <span className="font-medium text-slate-600 dark:text-slate-300">Latest note ({formatDate(latestNote.date)}):</span>{' '}
            {latestNote.summary}
          </p>
        )}
      </div>
    </Card>
  );
}
