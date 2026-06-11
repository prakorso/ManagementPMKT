import {
  LayoutDashboard,
  Users,
  ListChecks,
  TrendingUp,
  Crosshair,
  NotebookPen,
  Gauge,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Exact match (used for the index route). */
  end?: boolean;
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/team', label: 'Team Management', icon: Users },
  { to: '/objectives', label: 'Objective Tracker', icon: ListChecks },
  { to: '/performance', label: 'Performance', icon: TrendingUp },
  { to: '/assessments', label: 'Assessment Tracker', icon: Crosshair },
  { to: '/notes', label: 'Meeting & Coaching', icon: NotebookPen },
  { to: '/readiness', label: 'Manager Readiness', icon: Gauge },
];
