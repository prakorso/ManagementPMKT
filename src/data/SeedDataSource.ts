import type { DashboardData } from '@/types';
import type { DataSource } from './DataSource';
import { seedData } from './seedData';

/**
 * Default data source. Returns the bundled seed dataset so the dashboard is
 * fully functional with no configuration. A small artificial delay is added so
 * loading states are exercised exactly as they would be against a network
 * backend.
 */
export class SeedDataSource implements DataSource {
  readonly name = 'Seed data (demo)';

  async fetchAll(): Promise<DashboardData> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    // Deep clone so consumers can never mutate the shared seed object.
    return structuredClone(seedData);
  }
}
