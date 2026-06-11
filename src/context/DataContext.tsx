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
import type { DashboardData, TeamMember } from '@/types';
import { createDataSource } from '@/data';
import { SeedDataSource } from '@/data/SeedDataSource';
import { config } from '@/config';
import { loadLocalMembers, saveLocalMembers } from '@/data/localStore';

interface DataContextValue {
  data: DashboardData | null;
  loading: boolean;
  /** Non-fatal warning, e.g. a Sheets failure that fell back to seed data. */
  warning: string | null;
  /** Fatal error when no data could be loaded at all. */
  error: string | null;
  sourceName: string;
  refresh: () => void;
  /** Adds a team member to the local overlay (persisted in this browser). */
  addTeamMember: (member: TeamMember) => void;
  /** Removes a locally-added team member (sheet members can't be removed here). */
  removeTeamMember: (id: string) => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [baseData, setBaseData] = useState<DashboardData | null>(null);
  const [localMembers, setLocalMembers] = useState<TeamMember[]>(() => loadLocalMembers());
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string>('');
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

  const addTeamMember = useCallback((member: TeamMember) => {
    setLocalMembers((prev) => {
      const next = [...prev, { ...member, local: true }];
      saveLocalMembers(next);
      return next;
    });
  }, []);

  const removeTeamMember = useCallback((id: string) => {
    setLocalMembers((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveLocalMembers(next);
      return next;
    });
  }, []);

  // Merge sheet/seed data with the local member overlay.
  const data = useMemo<DashboardData | null>(() => {
    if (!baseData) return null;
    if (localMembers.length === 0) return baseData;
    return { ...baseData, teamMembers: [...baseData.teamMembers, ...localMembers] };
  }, [baseData, localMembers]);

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
    }),
    [data, loading, warning, error, sourceName, load, addTeamMember, removeTeamMember],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
