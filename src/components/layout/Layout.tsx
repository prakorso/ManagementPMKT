import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useData } from '@/context/DataContext';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { warning } = useData();

  return (
    <div className="min-h-screen bg-surface-subtle dark:bg-surface-dark">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-slate-200/80 dark:border-slate-700/60 lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-72">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 shadow-xl animate-fade-in">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute -right-11 top-3 rounded-lg p-2 text-white/90 hover:bg-white/10"
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-72">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

        {warning && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 sm:px-6">
            <div className="mx-auto flex max-w-[1400px] items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-none" />
              <p>{warning}</p>
            </div>
          </div>
        )}

        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
