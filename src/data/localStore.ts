import type { Assessment, Objective, Project, TeamMember } from '@/types';

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

// --- Projects / campaigns overlay -------------------------------------------
const PROJECTS_KEY = 'mdd-local-projects';

export function loadLocalProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Project[]).map((p) => ({ ...p, local: true })) : [];
  } catch {
    return [];
  }
}

export function saveLocalProjects(projects: Project[]): void {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    /* ignore */
  }
}

export function newLocalProjectId(name: string): string {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `prj-local-${slug || 'campaign'}-${Date.now().toString(36)}`;
}

// --- Generic override overlays (objectives, assessments) --------------------
// These hold full copies of edited entities keyed by id; the DataContext merges
// them over the base data so in-app updates persist in the browser.

function loadOverlay<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function saveOverlay<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

const OBJECTIVES_KEY = 'mdd-local-objectives';
const ASSESSMENTS_KEY = 'mdd-local-assessments';

export const loadLocalObjectives = (): Objective[] => loadOverlay<Objective>(OBJECTIVES_KEY);
export const saveLocalObjectives = (items: Objective[]): void => saveOverlay(OBJECTIVES_KEY, items);

export function newLocalObjectiveId(title: string): string {
  const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `obj-local-${slug.slice(0, 24) || 'objective'}-${Date.now().toString(36)}`;
}

export const loadLocalAssessments = (): Assessment[] => loadOverlay<Assessment>(ASSESSMENTS_KEY);
export const saveLocalAssessments = (items: Assessment[]): void => saveOverlay(ASSESSMENTS_KEY, items);
