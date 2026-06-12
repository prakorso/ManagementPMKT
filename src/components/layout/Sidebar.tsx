import { NavLink } from 'react-router-dom';
import { Database } from 'lucide-react';
import { navSections } from './navItems';
import { useData } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { canAccess } from '@/auth/roles';

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { sourceName } = useData();
  const { session } = useSession();
  const role = session?.role ?? 'member';

  const sections = navSections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccess(role, item.to)) }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-surface-dark-elevated">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 px-5 py-5 dark:border-slate-700/60">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <rect x="4" y="12" width="3.2" height="7" rx="1" fill="currentColor" opacity="0.55" />
            <rect x="10.4" y="8" width="3.2" height="11" rx="1" fill="currentColor" opacity="0.8" />
            <rect x="16.8" y="5" width="3.2" height="14" rx="1" fill="currentColor" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold leading-tight text-slate-900 dark:text-white">
            Performance Development Management
          </p>
          <p className="truncate text-xs text-muted">Team Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {sections.map((section, i) => (
          <div key={section.title ?? `sec-${i}`}>
            {section.title && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/50 dark:hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={18}
                          className={
                            isActive
                              ? 'text-brand-600 dark:text-brand-300'
                              : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                          }
                        />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Data source footer */}
      <div className="border-t border-slate-200/80 px-5 py-4 dark:border-slate-700/60">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Database size={14} />
          <span className="truncate" title={sourceName}>
            {sourceName || 'Data source'}
          </span>
        </div>
      </div>
    </div>
  );
}
