import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { DashboardData, Project, TeamMember } from '@/types';
import { createDataSource } from '@/data';
import { SeedDataSource } from '@/data/SeedDataSource';
import { config } from '@/config';
import {
  loadLocalMembers,
  loadLocalProjects,
  saveLocalMembers,
  saveLocalProjects,
} from '@/data/localStore';
import { appendRecord, getWriteUrl, memberToSheetRecord, setWriteUrl } from '@/data/sheetsWrite';

interface DataContextValue {
  data: DashboardData | null;
  loading: boolean;
  /** Non-fatal warning, e.g. a Sheets failure that fell back to seed data. */
  warning: string | null;
  /** Fatal error when no data could be loaded at all. */
  error: string | null;
  sourceName: string;
  refresh: () => void;
  /** Adds a team member: writes to the sheet when write-back is configured. */
  addTeamMember: (member: TeamMember) => void;
  /** Removes a locally-held team member (sheet rows are edited in the sheet). */
  removeTeamMember: (id: string) => void;
  /** Creates a campaign/project (kept in the local overlay). */
  addProject: (project: Project) => void;
  /** Patches a campaign/project (works on seed/sheet ones via a local override). */
  updateProject: (id: string, patch: Partial<Project>) => void;
  /** Removes a locally-created campaign/project. */
  removeProject: (id: string) => void;
  /** True when an Apps Script write-back URL is configured. */
  writeEnabled: boolean;
  /** Saves/clears the write-back URL (persisted in this browser). */
  configureWriteUrl: (url: string) => void;
  writeUrl: string;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [baseData, setBaseData] = useState<DashboardData | null>(null);
  const [localMembers, setLocalMembers] = useState<TeamMember[]>(() => loadLocalMembers());
  const [localProjects, setLocalProjects] = useState<Project[]>(() => loadLocalProjects());
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string>('');
  const [writeUrl, setWriteUrlState] = useState<string>(() => getWriteUrl());
  const primarySource = useRef(createDataSource());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    const source = primarySource.current;
    setSourceName(source.name);
    try {
      const result = await source.fetchAll();
      setBaseData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (config.dataSource !== 'seed') {
        try {
          const fallback = new SeedDataSource();
          const result = await fallback.fetchAll();
          setBaseData(result);
          setSourceName(`${source.name} (offline → seed)`);
          setWarning(`Couldn't load ${source.name}: ${message}. Showing bundled seed data instead.`);
        } catch {
          setError(message);
        }
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Once a locally-added member shows up in the sheet data (same id), drop the
  // in-browser copy so it isn't rendered twice.
  useEffect(() => {
    if (!baseData) return;
    const sheetIds = new Set(baseData.teamMembers.map((m) => m.id));
    setLocalMembers((prev) => {
      const next = prev.filter((m) => !sheetIds.has(m.id));
      if (next.length !== prev.length) {
        saveLocalMembers(next);
        return next;
      }
      return prev;
    });
  }, [baseData]);

  const addTeamMember = useCallback(
    (member: TeamMember) => {
      // Optimistically show it right away.
      setLocalMembers((prev) => {
        const next = [...prev, { ...member, local: true }];
        saveLocalMembers(next);
        return next;
      });
      // Persist to the sheet when write-back is configured, then re-read so the
      // member becomes a normal sheet row.
      if (getWriteUrl()) {
        void appendRecord(config.googleSheets.tabs.teamMembers, memberToSheetRecord(member))
          .then(() => {
            setTimeout(() => void load(), 2500);
          })
          .catch(() => {
            /* stays as a local member; the "Copy sheet row" fallback remains */
          });
      }
    },
    [load],
  );

  const removeTeamMember = useCallback((id: string) => {
    setLocalMembers((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveLocalMembers(next);
      return next;
    });
  }, []);

  const addProject = useCallback((project: Project) => {
    setLocalProjects((prev) => {
      const next = [...prev, { ...project, local: true }];
      saveLocalProjects(next);
      return next;
    });
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setLocalProjects((prev) => {
      const existing = prev.find((p) => p.id === id);
      let next: Project[];
      if (existing) {
        next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      } else {
        const fromBase = baseData?.projects.find((p) => p.id === id);
        if (!fromBase) return prev;
        next = [...prev, { ...fromBase, ...patch, local: true }];
      }
      saveLocalProjects(next);
      return next;
    });
  }, [baseData]);

  const removeProject = useCallback((id: string) => {
    setLocalProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveLocalProjects(next);
      return next;
    });
  }, []);

  const configureWriteUrl = useCallback((url: string) => {
    setWriteUrl(url);
    setWriteUrlState(url.trim());
  }, []);

  // Merge sheet/seed data with the local overlays.
  const data = useMemo<DashboardData | null>(() => {
    if (!baseData) return null;
    const teamMembers =
      localMembers.length === 0 ? baseData.teamMembers : [...baseData.teamMembers, ...localMembers];

    // Projects: local entries override base ones by id (so edits stick), and
    // local-only projects are appended.
    let projects = baseData.projects;
    if (localProjects.length > 0) {
      const localById = new Map(localProjects.map((p) => [p.id, p]));
      const overridden = baseData.projects.map((p) => localById.get(p.id) ?? p);
      const extra = localProjects.filter((p) => !baseData.projects.some((b) => b.id === p.id));
      projects = [...overridden, ...extra];
    }

    return { ...baseData, teamMembers, projects };
  }, [baseData, localMembers, localProjects]);

  const value = useMemo(
    () => ({
      data,
      loading,
      warning,
      error,
      sourceName,
      refresh: () => void load(),
      addTeamMember,
      removeTeamMember,
      addProject,
      updateProject,
      removeProject,
      writeEnabled: !!writeUrl,
      configureWriteUrl,
      writeUrl,
    }),
    [
      data,
      loading,
      warning,
      error,
      sourceName,
      load,
      addTeamMember,
      removeTeamMember,
      addProject,
      updateProject,
      removeProject,
      writeUrl,
      configureWriteUrl,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
