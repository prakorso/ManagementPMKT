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

// Leadership first, then the rest — keeps the grid scannable.
const roleOrder: Record<Role, number> = { manager: 0, vp: 1, 'team-lead': 2, member: 3 };

export function LoginScreen() {
  const { profiles, login } = useSession();
  const ordered = [...profiles].sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.name.localeCompare(b.name));

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle p-4 dark:bg-surface-dark">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
              <rect x="4" y="12" width="3.2" height="7" rx="1" fill="currentColor" opacity="0.55" />
              <rect x="10.4" y="8" width="3.2" height="11" rx="1" fill="currentColor" opacity="0.8" />
              <rect x="16.8" y="5" width="3.2" height="14" rx="1" fill="currentColor" />
            </svg>
          </span>
          <h1 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">PMOS</h1>
          <p className="mt-1 text-sm text-muted">Choose your profile to continue</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ordered.map((p) => (
            <ProfileCard key={p.id} profile={p} onClick={() => login(p)} />
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted">
          Profile sign-in for preview. Secure per-account login with a password arrives with the Supabase backend (Phase D).
        </p>
      </div>
    </div>
  );
}

function ProfileCard({ profile, onClick }: { profile: SessionUser; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover dark:border-slate-700 dark:bg-surface-dark-elevated dark:hover:border-brand-500/40"
    >
      <Avatar name={profile.name} size="lg" />
      <p className="mt-1 w-full truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{profile.name}</p>
      <Badge tone={roleTone[profile.role]}>{ROLE_LABEL[profile.role]}</Badge>
    </button>
  );
}
