import { useState } from 'react';
import { Bell, Database, ShieldCheck, RefreshCw, Users } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { SheetSyncModal } from '@/components/team/SheetSyncModal';
import { navSections } from '@/components/layout/navItems';
import { ROLE_LABEL, rolesFor } from '@/auth/roles';
import type { Role } from '@/types';

const assignableRoles: Role[] = ['member', 'team-lead'];

const selectClass =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

export function Settings() {
  const { data, loading, error, sourceName, writeEnabled } = useData();
  const { roleAssignments, setRole } = useSession();
  const [syncOpen, setSyncOpen] = useState(false);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;

  const menuItems = navSections.flatMap((s) => s.items);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="User & role management, access control, data and notifications." />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        Role assignments are saved in this browser as configuration. They take full effect (with secure per-account login)
        when the backend auth phase lands — see <code>docs/PRD-v2.md</code>.
      </div>

      {/* Role management */}
      <Card padded={false}>
        <div className="border-b border-slate-200/80 p-5 dark:border-slate-700/60">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Users size={16} className="text-brand-500" /> User & Role Management
          </h3>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {data.teamMembers.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={m.name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{m.name}</p>
                  <p className="truncate text-xs text-muted">{m.email ?? m.role}</p>
                </div>
              </div>
              <select
                className={selectClass}
                value={roleAssignments[m.id] ?? 'member'}
                onChange={(e) => setRole(m.id, e.target.value as Role)}
              >
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </Card>

      {/* Access control */}
      <Card>
        <CardHeader title="Access Control" icon={<ShieldCheck size={16} />} subtitle="Which roles can open each menu" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <tbody>
              {menuItems.map((item) => (
                <tr key={item.to} className="border-b border-slate-100 last:border-0 dark:border-slate-700/40">
                  <td className="py-2.5 pr-4 font-medium text-slate-700 dark:text-slate-200">{item.label}</td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {rolesFor(item.to).map((r) => (
                        <Badge key={r} tone="neutral">
                          {ROLE_LABEL[r]}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Data / write-back */}
        <Card>
          <CardHeader title="Data & Sync" icon={<Database size={16} />} subtitle={sourceName} />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw size={15} className="text-brand-500" />
              <span className="text-slate-700 dark:text-slate-200">Sheet write-back</span>
              <Badge tone={writeEnabled ? 'success' : 'neutral'}>{writeEnabled ? 'Connected' : 'Not set'}</Badge>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSyncOpen(true)}>
              Configure
            </Button>
          </div>
        </Card>

        {/* Notifications (placeholder) */}
        <Card>
          <CardHeader title="Notification Settings" icon={<Bell size={16} />} subtitle="Reminders (coming with backend)" />
          <ul className="space-y-2 text-sm text-muted">
            {['Weekly update reminder', 'Objective update reminder', 'Meeting update reminder', 'Assessment reminder'].map(
              (label) => (
                <li key={label} className="flex items-center justify-between">
                  <span>{label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-700/60">Soon</span>
                </li>
              ),
            )}
          </ul>
        </Card>
      </div>

      <SheetSyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />
    </div>
  );
}
