import { LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useSession } from '@/context/SessionContext';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { Tone } from '@/components/ui/Badge';
import { ROLE_LABEL, ROLE_TAGLINE } from '@/auth/roles';
import type { Role } from '@/types';

const roleTone: Record<Role, Tone> = {
  manager: 'brand',
  'team-lead': 'info',
  member: 'neutral',
  vp: 'success',
};

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

interface TopbarProps {
  onOpenSidebar: () => void;
}

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { session, logout } = useSession();

  const firstName = session?.name.split(' ')[0] ?? '';
  const role = session?.role ?? 'member';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-surface-subtle/80 px-4 backdrop-blur dark:border-slate-700/60 dark:bg-surface-dark/80 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-700/60 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {greetingFor(new Date())}, {firstName} 👋
          </p>
          <p className="hidden truncate text-[11px] text-muted sm:block">{ROLE_TAGLINE[role]}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-700/60"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {session && (
          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-2 dark:border-slate-700 sm:pl-3">
            <Badge tone={roleTone[role]} className="hidden sm:inline-flex">
              {ROLE_LABEL[role]}
            </Badge>
            <Avatar name={session.name} size="sm" />
            <button
              type="button"
              onClick={logout}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-200/70 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-rose-400"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
