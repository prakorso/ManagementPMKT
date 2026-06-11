import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DashboardData } from '@/types';
import { createDataSource } from '@/data';
import { SeedDataSource } from '@/data/SeedDataSource';
import { config } from '@/config';

interface DataContextValue {
  data: DashboardData | null;
  loading: boolean;
  /** Non-fatal warning, e.g. a Sheets failure that fell back to seed data. */
  warning: string | null;
  /** Fatal error when no data could be loaded at all. */
  error: string | null;
  sourceName: string;
  refresh: () => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
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
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      // If the configured source isn't seed, fall back so the app still renders.
      if (config.dataSource !== 'seed') {
        try {
          const fallback = new SeedDataSource();
          const result = await fallback.fetchAll();
          setData(result);
          setSourceName(`${source.name} (offline → seed)`);
          setWarning(`Couldn't reach ${source.name}: ${message}. Showing bundled seed data instead.`);
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

  const value = useMemo(
    () => ({ data, loading, warning, error, sourceName, refresh: () => void load() }),
    [data, loading, warning, error, sourceName, load],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
