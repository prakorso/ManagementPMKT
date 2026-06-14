import type { Role } from '@/types';

export const ROLE_LABEL: Record<Role, string> = {
  manager: 'Manager',
  'team-lead': 'Team Lead',
  member: 'Member',
  vp: 'VP',
};

export const ROLE_TAGLINE: Record<Role, string> = {
  manager: 'Welcome to the Performance Development Management Platform.',
  'team-lead': 'Coach your team and keep updates flowing.',
  member: 'Keep tracking your progress and objectives.',
  vp: 'Organisation readiness & governance at a glance.',
};

/**
 * Which roles may open each route. Used both to filter the navigation and to
 * guard the routes. Missing entries default to "everyone".
 *
 * Members are currently scoped to their own Overview; manager-shaped pages are
 * opened to members as those pages gain per-user scoping (see docs/PRD-v2.md).
 */
export const ROUTE_ACCESS: Record<string, Role[]> = {
  '/': ['manager', 'team-lead', 'member', 'vp'],
  '/campaigns': ['manager', 'team-lead', 'vp'],
  '/performance': ['manager', 'team-lead', 'vp'],
  '/objectives': ['manager', 'vp'],
  '/team': ['manager', 'team-lead', 'vp'],
  '/projects': ['manager', 'team-lead', 'member', 'vp'],
  '/tasks': ['manager', 'team-lead', 'member', 'vp'],
  '/notes': ['manager', 'team-lead', 'vp'],
  '/assessments': ['manager', 'vp'],
  '/readiness': ['manager', 'vp'],
  '/settings': ['manager', 'vp'],
};

export function rolesFor(path: string): Role[] {
  return ROUTE_ACCESS[path] ?? (['manager', 'team-lead', 'member', 'vp'] as Role[]);
}

export function canAccess(role: Role, path: string): boolean {
  return rolesFor(path).includes(role);
}
