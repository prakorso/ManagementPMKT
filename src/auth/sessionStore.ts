import type { Role } from '@/types';

/**
 * Lightweight, browser-side session + role assignment store.
 *
 * This is the interim "auth" layer (a profile picker, not real authentication).
 * It is intentionally isolated so it can be swapped for Supabase Auth later
 * without touching the UI — the `SessionContext` is the seam.
 */
export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  /** Linked team member id when the user is a member. */
  memberId?: string;
  email?: string;
}

const SESSION_KEY = 'mdd-session';
const ROLES_KEY = 'mdd-role-assignments';

export function loadSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function saveSession(user: SessionUser | null): void {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Per-member role overrides set by the manager in Settings (id → role). */
export function loadRoleAssignments(): Record<string, Role> {
  try {
    const raw = localStorage.getItem(ROLES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Role>) : {};
  } catch {
    return {};
  }
}

export function saveRoleAssignments(map: Record<string, Role>): void {
  try {
    localStorage.setItem(ROLES_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
