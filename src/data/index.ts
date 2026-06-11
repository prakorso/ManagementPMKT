import { config } from '@/config';
import type { DataSource } from './DataSource';
import { SeedDataSource } from './SeedDataSource';
import { GoogleSheetsDataSource } from './GoogleSheetsDataSource';

export type { DataSource } from './DataSource';

/**
 * Factory that returns the active data source based on runtime config.
 *
 * This is the single place that knows which backend is live. Adding a database
 * later is a one-line change here plus a new `DataSource` implementation — the
 * rest of the app is untouched.
 */
export function createDataSource(): DataSource {
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
