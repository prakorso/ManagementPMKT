import { LogIn } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { Tone } from '@/components/ui/Badge';
import { ROLE_LABEL } from '@/auth/roles';
import type { Role } from '@/types';
import type { SessionUser } from '@/auth/sessionStore';

const roleTone: Record<Role, Tone> = {
  manager: 'brand',
  'team-lead': 'info',
  member: 'neutral',
  vp: 'success',
};

export function LoginScreen() {
  const { profiles, login } = useSession();
  const leads = profiles.filter((p) => p.role === 'manager' || p.role === 'vp');
  const members = profiles.filter((p) => p.role === 'member' || p.role === 'team-lead');

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle p-4 dark:bg-surface-dark">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
              <rect x="4" y="12" width="3.2" height="7" rx="1" fill="currentColor" opacity="0.55" />
              <rect x="10.4" y="8" width="3.2" height="11" rx="1" fill="currentColor" opacity="0.8" />
              <rect x="16.8" y="5" width="3.2" height="14" rx="1" fill="currentColor" />
            </svg>
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight text-slate-900 dark:text-white">
              Performance Development Management
            </h1>
            <p className="text-xs text-muted">Sign in to continue</p>
          </div>
        </div>

        <div className="card card-pad">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Leadership</p>
          <div className="space-y-2">
            {leads.map((p) => (
              <ProfileButton key={p.id} profile={p} onClick={() => login(p)} />
            ))}
          </div>

          {members.length > 0 && (
            <>
              <p className="mb-3 mt-5 text-xs font-medium uppercase tracking-wide text-muted">Team Members</p>
              <div className="space-y-2">
                {members.map((p) => (
                  <ProfileButton key={p.id} profile={p} onClick={() => login(p)} />
                ))}
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-muted">
          Interim profile sign-in. Real per-account login (Supabase) replaces this in a later phase.
        </p>
      </div>
    </div>
  );
}

function ProfileButton({ profile, onClick }: { profile: SessionUser; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-700 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10"
    >
      <Avatar name={profile.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{profile.name}</p>
        {profile.email && <p className="truncate text-[11px] text-muted">{profile.email}</p>}
      </div>
      <Badge tone={roleTone[profile.role]}>{ROLE_LABEL[profile.role]}</Badge>
      <LogIn size={15} className="text-slate-300 transition-colors group-hover:text-brand-500" />
    </button>
  );
}
