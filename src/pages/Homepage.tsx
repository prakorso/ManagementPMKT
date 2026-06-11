import { addDays, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  ListChecks,
  Target,
  Users,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  assessmentSummary,
  collectRisks,
  getProgramTiming,
  monthProgress,
  objectivesForMonth,
  openActionItems,
  overallObjectiveProgress,
  overallReadiness,
  previousMonthKey,
  readinessBand,
  teamHealthSummary,
  upcomingOneOnOnes,
} from '@/utils/calculations';
import type { MonthNumber } from '@/types';
import { formatDate, formatPercent, relativeDays } from '@/utils/format';
import { healthLabel, healthTone } from '@/utils/labels';

export function Homepage() {
  const { data, loading, error } = useData();
  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const { program, teamMembers, objectives, actionItems, assessments, readiness } = data;
  const now = new Date();

  const timing = getProgramTiming(program.programStartDate, now);
  const readinessScore = overallReadiness(readiness, timing.currentMonthKey);
  const prevKey = previousMonthKey(timing.currentMonthKey);
  const readinessDelta = prevKey ? readinessScore - overallReadiness(readiness, prevKey) : 0;
  const band = readinessBand(readinessScore);

  const overallProgress = overallObjectiveProgress(objectives);
  const upcoming = upcomingOneOnOnes(teamMembers, now);
  const openItems = openActionItems(actionItems);
  const risks = collectRisks(data, now);
  const health = teamHealthSummary(teamMembers);
  const forecast = assessmentSummary(assessments);

  const months: MonthNumber[] = [1, 2, 3];
  const nextReviewDate = formatDate(addDays(parseISO(program.programStartDate), timing.currentMonth * 30).toISOString());

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card padded={false} className="overflow-hidden">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-medium text-brand-600 dark:text-brand-300">Welcome back, {program.managerName}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Your manager development at a glance
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Transitioning from {program.previousRole} to {program.currentRole} · {program.team}
            </p>

            <div className="mt-5 max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  Month {timing.currentMonth} of 3 · Day {timing.dayInProgram} of {timing.totalDays}
                </span>
                <span className="text-muted">{formatPercent(timing.percentElapsed)} elapsed</span>
              </div>
              <ProgressBar value={timing.percentElapsed} tone="brand" />
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <Target size={14} className="text-brand-500" />
                Overall objective progress: <span className="font-semibold text-slate-700 dark:text-slate-200">{overallProgress}%</span>
              </div>
            </div>
          </div>

          <Link
            to="/readiness"
            className="flex flex-col items-center gap-2 rounded-2xl bg-slate-50 p-5 transition-shadow hover:shadow-card-hover dark:bg-slate-800/40"
          >
            <ScoreRing value={readinessScore} label="Readiness" />
            <Badge tone={band.tone}>{band.label}</Badge>
            {prevKey && (
              <span className={`text-xs font-medium ${readinessDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {readinessDelta >= 0 ? '▲' : '▼'} {Math.abs(readinessDelta)} pts vs last month
              </span>
            )}
          </Link>
        </div>
      </Card>

      {/* Month progress cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {months.map((month) => {
          const items = objectivesForMonth(objectives, month);
          const completed = items.filter((o) => o.status === 'completed').length;
          const progress = monthProgress(objectives, month);
          return (
            <Card key={month}>
              <CardHeader
                title={`Month ${month} Progress`}
                subtitle={`${completed} of ${items.length} objectives completed`}
                icon={<CalendarDays size={16} />}
              />
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{progress}%</span>
                {month === timing.currentMonth && <Badge tone="brand">Current</Badge>}
              </div>
              <ProgressBar value={progress} autoTone className="mt-3" />
            </Card>
          );
        })}
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Direct Reports"
          value={teamMembers.length}
          icon={<Users size={18} />}
          iconTone="brand"
          hint={`${health.onTrack} on track · ${health.atRisk} at risk`}
          to="/team"
        />
        <StatCard
          label="Upcoming 1:1 Sessions"
          value={upcoming.length}
          icon={<CalendarClock size={18} />}
          iconTone="info"
          hint={upcoming[0] ? `Next: ${upcoming[0].member.name}, ${relativeDays(upcoming[0].date, now)}` : 'None scheduled'}
          to="/team"
        />
        <StatCard
          label="Open Action Items"
          value={openItems.length}
          icon={<ClipboardList size={18} />}
          iconTone="warning"
          hint={`${actionItems.filter((i) => i.status === 'done').length} completed to date`}
          to="/notes"
        />
        <StatCard
          label="Forecast Accuracy"
          value={formatPercent(forecast.forecastAccuracy)}
          icon={<Target size={18} />}
          iconTone="success"
          hint={`${forecast.measuredCount} assessments measured`}
          to="/assessments"
        />
      </div>

      {/* Quick summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Team health */}
        <Card>
          <CardHeader title="Team Health Status" icon={<HeartPulse size={16} />} subtitle="Per-report status this cycle" />
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <HealthPill label="On Track" count={health.onTrack} tone="success" />
            <HealthPill label="Watch" count={health.watch} tone="warning" />
            <HealthPill label="At Risk" count={health.atRisk} tone="danger" />
          </div>
          <ul className="space-y-2.5">
            {teamMembers.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Avatar name={m.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{m.name}</span>
                    <Badge tone={healthTone[m.health]}>{healthLabel[m.health]}</Badge>
                  </div>
                  <ProgressBar value={m.developmentProgress} autoTone size="sm" className="mt-1.5" />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Outstanding risks */}
        <Card>
          <CardHeader title="Outstanding Risks" icon={<AlertTriangle size={16} />} subtitle={`${risks.length} flagged`} />
          {risks.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={28} />} title="No outstanding risks" description="Everything is on track right now." />
          ) : (
            <ul className="space-y-3">
              {risks.map((risk) => (
                <li key={risk.id} className="flex items-start gap-2.5">
                  <span
                    className={`mt-1.5 h-2 w-2 flex-none rounded-full ${risk.severity === 'high' ? 'bg-rose-500' : 'bg-amber-500'}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{risk.label}</p>
                    <p className="text-xs text-muted">{risk.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Upcoming reviews & 1:1s */}
        <Card>
          <CardHeader title="Upcoming Reviews & 1:1s" icon={<CalendarClock size={16} />} subtitle="Next on the calendar" />
          <div className="mb-4 rounded-xl bg-brand-50 p-3 dark:bg-brand-500/10">
            <div className="flex items-center gap-2">
              <ListChecks size={15} className="text-brand-600 dark:text-brand-300" />
              <span className="text-sm font-semibold text-brand-700 dark:text-brand-200">
                Month {timing.currentMonth} Review
              </span>
            </div>
            <p className="mt-1 text-xs text-brand-700/80 dark:text-brand-200/80">Target review date: {nextReviewDate}</p>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState title="No upcoming 1:1s" description="Schedule your next round of 1:1s." />
          ) : (
            <ul className="space-y-2.5">
              {upcoming.slice(0, 5).map(({ member, date }) => (
                <li key={member.id} className="flex items-center gap-3">
                  <Avatar name={member.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{member.name}</p>
                    <p className="text-xs text-muted">{formatDate(date)}</p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {relativeDays(date, now)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function HealthPill({ label, count, tone }: { label: string; count: number; tone: 'success' | 'warning' | 'danger' }) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  };
  return (
    <div className={`rounded-xl py-2 ${styles[tone]}`}>
      <p className="text-lg font-bold leading-none">{count}</p>
      <p className="mt-1 text-[11px] font-medium">{label}</p>
    </div>
  );
}
