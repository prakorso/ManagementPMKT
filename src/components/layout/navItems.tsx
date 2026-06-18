import {
  LayoutDashboard,
  Users,
  TrendingUp,
  NotebookPen,
  Gauge,
  ListChecks,
  Megaphone,
  BookOpen,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Exact match (used for the index route). */
  end?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  { items: [{ to: '/', label: 'Overview', icon: LayoutDashboard, end: true }] },
  {
    title: 'Performance',
    items: [
      { to: '/campaigns', label: 'Campaign Hub', icon: Megaphone },
      { to: '/performance', label: 'Business Performance', icon: TrendingUp },
    ],
  },
  {
    title: 'Team',
    items: [
      { to: '/team', label: 'Member Directory', icon: Users },
      { to: '/tasks', label: 'Tasks', icon: ListChecks },
      { to: '/notes', label: 'Meetings', icon: NotebookPen },
      { to: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
    ],
  },
  {
    title: 'Governance',
    items: [
      { to: '/readiness', label: 'Readiness Management', icon: Gauge },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];
