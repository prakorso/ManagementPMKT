import { useState } from 'react';
import { BookOpen, Lightbulb, Search } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { teamFindings } from '@/utils/calculations';
import { formatDate } from '@/utils/format';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export function KnowledgeBase() {
  const { data, loading, error, oneOnOnes } = useData();
  const [search, setSearch] = useState('');

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const findings = teamFindings(oneOnOnes, data.teamMembers);
  const q = search.trim().toLowerCase();
  const shown = q ? findings.filter((f) => `${f.finding} ${f.memberName}`.toLowerCase().includes(q)) : findings;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Team learnings & benchmarks — collected automatically from what members write in their 1:1 findings."
      >
        <Badge tone="info">{findings.length} findings</Badge>
      </PageHeader>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className={`${inputClass} pl-9`} placeholder="Search learnings or member…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen size={28} />}
            title={findings.length === 0 ? 'No findings yet' : 'No matches'}
            description={
              findings.length === 0
                ? 'Learnings members add in the Findings/Benchmark field of their 1:1 will appear here automatically.'
                : 'Try a different search.'
            }
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {shown.map((f) => (
            <li key={f.id}>
              <Card className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                  <Lightbulb size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">{f.finding}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <Avatar name={f.memberName} size="sm" />
                    <span className="font-medium text-slate-600 dark:text-slate-300">{f.memberName}</span>
                    <span>·</span>
                    <span>{formatDate(f.date)}</span>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
