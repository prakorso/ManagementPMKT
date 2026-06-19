import { config } from '@/config';
import type { DataSource } from './DataSource';
import { SeedDataSource } from './SeedDataSource';
import { GoogleSheetsDataSource } from './GoogleSheetsDataSource';
import { SupabaseDataSource } from './SupabaseDataSource';

export type { DataSource } from './DataSource';

/** The base source for team/meetings/etc. (campaigns may be overlaid by Supabase). */
function createBaseSource(): DataSource {
  switch (config.dataSource) {
    case 'google-sheets':
      return new GoogleSheetsDataSource({
        sheetId: config.googleSheets.sheetId,
        tabs: config.googleSheets.tabs,
      });
    case 'seed':
    default:
      return new SeedDataSource();
  }
}

/**
 * Factory that returns the active data source based on runtime config.
 *
 * This is the single place that knows which backend is live. When the LGP
 * Supabase ("control center") is configured, its live campaign data is overlaid
 * on top of the base source (which still supplies team members, meetings, etc.).
 */
export function createDataSource(): DataSource {
  const base = createBaseSource();
  if (config.supabase.url && config.supabase.anonKey) {
    return new SupabaseDataSource(base, config.supabase);
  }
  return base;
}
