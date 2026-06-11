import { useLocation } from 'react-router-dom';
import { Menu, Moon, Sun } from 'lucide-react';
import { navItems } from './navItems';
import { useTheme } from '@/context/ThemeContext';
import { useData } from '@/context/DataContext';
import { Avatar } from '@/components/ui/Avatar';

interface TopbarProps {
  onOpenSidebar: () => void;
}

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { data } = useData();

  const current = navItems.find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to) && i.to !== '/'));
  const title = current?.label ?? 'Overview';
  const program = data?.program;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-surface-subtle/80 px-4 backdrop-blur dark:border-slate-700/60 dark:bg-surface-dark/80 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-700/60 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
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

        {program && (
          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-2 dark:border-slate-700 sm:pl-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold leading-tight text-slate-800 dark:text-slate-100">
                {program.managerName}
              </p>
              <p className="text-[11px] leading-tight text-muted">{program.currentRole}</p>
            </div>
            <Avatar name={program.managerName} size="sm" />
          </div>
        )}
      </div>
    </header>
  );
}
