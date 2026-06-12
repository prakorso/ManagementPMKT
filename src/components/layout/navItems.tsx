import {
  LayoutDashboard,
  Users,
  ListChecks,
  TrendingUp,
  Crosshair,
  NotebookPen,
  Gauge,
  FolderKanban,
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
      { to: '/performance', label: 'Campaign Performance', icon: TrendingUp },
      { to: '/objectives', label: 'Objective Tracker', icon: ListChecks },
    ],
  },
  {
    title: 'Team',
    items: [
      { to: '/team', label: 'Member Directory', icon: Users },
      { to: '/projects', label: 'Project Assignment', icon: FolderKanban },
    ],
  },
  {
    items: [
      { to: '/notes', label: 'Meetings Update', icon: NotebookPen },
      { to: '/assessments', label: 'Assessment', icon: Crosshair },
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
