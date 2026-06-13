import type { ActionItem, Assessment, CampaignAssignment, Objective, OneOnOneSession, Project, TeamMember } from '@/types';
import { pushSync } from './sync';

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
  pushSync();
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
  pushSync();
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
  pushSync();
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

const ACTIONITEMS_KEY = 'mdd-local-actionitems';
export const loadLocalActionItems = (): ActionItem[] => loadOverlay<ActionItem>(ACTIONITEMS_KEY);
export const saveLocalActionItems = (items: ActionItem[]): void => saveOverlay(ACTIONITEMS_KEY, items);

// --- One-on-one sessions overlay (Phase B) ----------------------------------
const ONEONONES_KEY = 'mdd-oneonones';
export const loadOneOnOnes = (): OneOnOneSession[] => loadOverlay<OneOnOneSession>(ONEONONES_KEY);
export const saveOneOnOnes = (items: OneOnOneSession[]): void => saveOverlay(ONEONONES_KEY, items);
export function newOneOnOneId(memberId: string): string {
  return `1on1-${memberId}-${Date.now().toString(36)}`;
}

// --- Soft-delete overlay: ids hidden from the UI (works for seed/sheet rows too) ---
export interface RemovedIds {
  objectives: string[];
  projects: string[];
  members: string[];
}

const REMOVED_KEY = 'mdd-removed';

export function loadRemoved(): RemovedIds {
  try {
    const raw = localStorage.getItem(REMOVED_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      objectives: Array.isArray(parsed.objectives) ? parsed.objectives : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      members: Array.isArray(parsed.members) ? parsed.members : [],
    };
  } catch {
    return { objectives: [], projects: [], members: [] };
  }
}

export function saveRemoved(value: RemovedIds): void {
  try {
    localStorage.setItem(REMOVED_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
  pushSync();
}

// --- Campaign assignment overlay (keyed by campaign name) -------------------
const ASSIGN_KEY = 'mdd-assignments';

export function loadAssignments(): Record<string, CampaignAssignment> {
  try {
    const raw = localStorage.getItem(ASSIGN_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveAssignments(map: Record<string, CampaignAssignment>): void {
  try {
    localStorage.setItem(ASSIGN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
  pushSync();
}
