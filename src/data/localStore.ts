import type { TeamMember } from '@/types';

/**
 * Local overlay for team members added from the dashboard UI.
 *
 * Phase 1 reads from Google Sheets (read-only), so newly-added members are kept
 * in the browser via localStorage and merged on top of the sheet data. When
 * write-back / a database is added (see ROADMAP.md), this module is the single
 * place to swap for a server-backed store.
 */
const KEY = 'mdd-local-members';

export function loadLocalMembers(): TeamMember[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TeamMember[]).map((m) => ({ ...m, local: true })) : [];
  } catch {
    return [];
  }
}

export function saveLocalMembers(members: TeamMember[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(members));
  } catch {
    /* ignore storage failures (private mode / quota) */
  }
}

/** Generates a stable-ish id for a locally-added member. */
export function newLocalMemberId(name: string): string {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `tm-local-${slug || 'member'}-${Date.now().toString(36)}`;
}
