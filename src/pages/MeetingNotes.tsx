import { useMemo, useState, type ReactNode } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { CalendarDays, NotebookPen, Search, Users } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { meetingCategoryLabel, meetingCategoryTone } from '@/utils/labels';
import { formatDate } from '@/utils/format';
import type { MeetingCategory } from '@/types';

type CategoryFilter = 'all' | MeetingCategory;
type PeriodFilter = 'all' | '7d' | '30d' | '90d';

const CATEGORIES: MeetingCategory[] = [
  'weekly-1on1',
  'performance-checkin',
  'client-meeting',
  'pmkt-meeting',
  'assessment-discussion',
];

const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const selectClass =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

export function MeetingNotes() {
  const { data, loading, error } = useData();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [memberId, setMemberId] = useState<string>('all');
  const [period, setPeriod] = useState<PeriodFilter>('all');

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    data?.teamMembers.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const periodDays: Record<PeriodFilter, number | null> = { all: null, '7d': 7, '30d': 30, '90d': 90 };
    const maxDays = periodDays[period];
    const q = query.trim().toLowerCase();

    return data.meetings
      .filter((m) => (category === 'all' ? true : m.category === category))
      .filter((m) => (memberId === 'all' ? true : m.teamMemberId === memberId))
      .filter((m) => {
        if (maxDays === null) return true;
        const d = parseISO(m.date);
        const diff = differenceInCalendarDays(now, d);
        return diff >= 0 && diff <= maxDays;
      })
      .filter((m) => {
        if (!q) return true;
        const haystack = [
          m.title,
          m.summary,
          m.notes ?? '',
          (m.tags ?? []).join(' '),
          (m.participants ?? []).join(' '),
          m.teamMemberId ? memberName.get(m.teamMemberId) ?? '' : '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data, category, memberId, period, query, memberName]);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meeting & Coaching Notes"
        description="A searchable repository of every 1:1, check-in, client meeting, PMKT stand-up and assessment discussion."
      />

      {/* Toolbar */}
      <Card>
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, people, tags…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-slate-400" />
              <select className={selectClass} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="all">All team members</option>
                {data.teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-slate-400" />
              <select className={selectClass} value={period} onChange={(e) => setPeriod(e.target.value as PeriodFilter)}>
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <span className="ml-auto text-xs text-muted">
              {filtered.length} {filtered.length === 1 ? 'note' : 'notes'}
            </span>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5">
            <CategoryChip active={category === 'all'} onClick={() => setCategory('all')}>
              All
            </CategoryChip>
            {CATEGORIES.map((c) => (
              <CategoryChip key={c} active={category === c} onClick={() => setCategory(c)}>
                {meetingCategoryLabel[c]}
              </CategoryChip>
            ))}
          </div>
        </div>
      </Card>

      {/* Notes */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<NotebookPen size={28} />}
          title="No notes match your filters"
          description="Try clearing the search or widening the date range."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((meeting) => (
            <Card key={meeting.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  {meeting.teamMemberId ? (
                    <Avatar name={memberName.get(meeting.teamMemberId) ?? '?'} size="md" />
                  ) : (
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                      <NotebookPen size={16} />
                    </span>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{meeting.title}</h3>
                      <Badge tone={meetingCategoryTone[meeting.category]}>{meetingCategoryLabel[meeting.category]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{meeting.summary}</p>
                    {meeting.notes && (
                      <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                        {meeting.notes}
                      </p>
                    )}
                    {(meeting.tags?.length || meeting.participants?.length) && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {meeting.participants?.map((p) => (
                          <span key={p} className="text-[11px] text-muted">
                            @{p}
                          </span>
                        ))}
                        {meeting.tags?.map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 dark:bg-slate-700/60 dark:text-slate-400"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className="flex-none text-xs font-medium text-muted">{formatDate(meeting.date)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-brand-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
