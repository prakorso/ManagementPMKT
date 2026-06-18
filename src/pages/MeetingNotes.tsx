import { useMemo, useState, type ReactNode } from 'react';
import { isBefore, parseISO, startOfDay } from 'date-fns';
import { CalendarDays, CalendarClock, Info, NotebookPen, Search } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { meetingCategoryLabel, meetingCategoryTone } from '@/utils/labels';
import { formatDate, relativeDays } from '@/utils/format';
import type { Meeting } from '@/types';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

export function MeetingNotes() {
  const { data, loading, error } = useData();
  const { session } = useSession();
  const [query, setQuery] = useState('');

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    data?.teamMembers.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [data]);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const isMember = session?.role === 'member';
  const myId = session?.memberId;
  const q = query.trim().toLowerCase();

  const visible = data.meetings
    // Members see their own meetings + team-wide ones (no specific member).
    .filter((m) => (isMember ? !m.teamMemberId || m.teamMemberId === myId : true))
    .filter((m) => {
      if (!q) return true;
      const hay = [m.title, m.summary, m.teamMemberId ? memberName.get(m.teamMemberId) ?? '' : '', (m.participants ?? []).join(' ')]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

  const today = startOfDay(new Date());
  const upcoming = visible.filter((m) => !isBefore(parseISO(m.date), today)).sort((a, b) => a.date.localeCompare(b.date));
  const past = visible.filter((m) => isBefore(parseISO(m.date), today)).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <PageHeader title="Meetings" description="Your meeting schedule — 1:1s, check-ins and team meetings." />

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
        <Info size={16} className="mt-0.5 flex-none" />
        <p>
          This schedule will sync with <strong>Google Calendar</strong> (live sync arrives with integrations, Phase E). For now it
          shows scheduled meetings — view-only, like a reminder.
        </p>
      </div>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search meetings or people…" className={inputClass} />
      </div>

      <MeetingGroup title="Upcoming" icon={<CalendarClock size={16} className="text-brand-500" />} meetings={upcoming} memberName={memberName} emptyText="No upcoming meetings scheduled." upcoming />
      <MeetingGroup title="Past" icon={<CalendarDays size={16} className="text-slate-400" />} meetings={past} memberName={memberName} emptyText="No past meetings." />
    </div>
  );
}

function MeetingGroup({
  title,
  icon,
  meetings,
  memberName,
  emptyText,
  upcoming,
}: {
  title: string;
  icon: ReactNode;
  meetings: Meeting[];
  memberName: Map<string, string>;
  emptyText: string;
  upcoming?: boolean;
}) {
  const now = new Date();
  return (
    <Card padded={false}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 p-5 dark:border-slate-700/60">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {icon} {title}
        </h3>
        <Badge tone={upcoming && meetings.length ? 'brand' : 'neutral'}>{meetings.length}</Badge>
      </div>
      {meetings.length === 0 ? (
        <div className="p-5">
          <EmptyState icon={<NotebookPen size={26} />} title={emptyText} description="" />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
          {meetings.map((m) => (
            <li key={m.id} className="flex items-start gap-3 px-5 py-3">
              {m.teamMemberId ? (
                <Avatar name={memberName.get(m.teamMemberId) ?? '?'} size="sm" />
              ) : (
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                  <NotebookPen size={14} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.title}</p>
                  <Badge tone={meetingCategoryTone[m.category]}>{meetingCategoryLabel[m.category]}</Badge>
                </div>
                {m.summary && <p className="mt-0.5 truncate text-xs text-muted">{m.summary}</p>}
              </div>
              <div className="flex-none text-right">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{formatDate(m.date)}</p>
                <p className="text-[11px] text-muted">{relativeDays(m.date, now)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
