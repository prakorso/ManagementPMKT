import type { DashboardData } from '@/types';

/**
 * The contract every storage backend must satisfy.
 *
 * The UI depends on this interface only — never on a concrete implementation.
 * That indirection is what makes the brief's "easy to migrate to a database"
 * requirement cheap: a future `SupabaseDataSource` / `PostgresDataSource` /
 * REST adapter just has to return `DashboardData` and the entire app keeps
 * working unchanged.
 *
 * Phase 1 is read-only (the Google Sheet itself is the data-entry surface).
 * When write support is needed, extend this interface with mutation methods
 * and add `capabilities.canWrite`.
 */
export interface DataSource {
  /** Human-readable name, surfaced in the UI as the active data source. */
  readonly name: string;

  /** Fetches the full dashboard dataset. */
  fetchAll(): Promise<DashboardData>;
}

export interface DataSourceCapabilities {
  canWrite: boolean;
}
