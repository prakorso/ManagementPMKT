/**
 * Runtime configuration, resolved from Vite environment variables.
 *
 * Defaults are baked in so the deployed dashboard reads the connected Google
 * Sheet with no env setup. Any value can still be overridden via `.env`
 * (locally) or Netlify environment variables.
 */

export type DataSourceKind = 'seed' | 'google-sheets';

interface AppConfig {
  dataSource: DataSourceKind;
  googleSheets: {
    sheetId: string;
    /** Optional Apps Script Web App URL for write-back (append rows). */
    writeUrl: string;
    /** Tab names inside the spreadsheet, one per entity collection. */
    tabs: {
      teamMembers: string;
      objectives: string;
      actionItems: string;
      meetings: string;
      performance: string;
      assessments: string;
      readiness: string;
    };
  };
}

const env = import.meta.env;

/** The connected Google Sheet ("Management PMKT"). Override with VITE_GOOGLE_SHEET_ID. */
const DEFAULT_SHEET_ID = '1pNTvOYJ__opmJGUaiVe-fAFRzZwyt2jeqfBDfXha5-Y';

function resolveSheetId(): string {
  return (env.VITE_GOOGLE_SHEET_ID ?? '').toString().trim() || DEFAULT_SHEET_ID;
}

function resolveDataSource(): DataSourceKind {
  const raw = (env.VITE_DATA_SOURCE ?? '').toString().toLowerCase().trim();
  if (raw === 'seed') return 'seed';
  if (raw === 'google-sheets') return 'google-sheets';
  // No explicit choice: use Google Sheets whenever a sheet id is available.
  return resolveSheetId() ? 'google-sheets' : 'seed';
}

export const config: AppConfig = {
  dataSource: resolveDataSource(),
  googleSheets: {
    sheetId: resolveSheetId(),
    writeUrl: (env.VITE_SHEETS_WRITE_URL ?? '').toString().trim(),
    tabs: {
      teamMembers: env.VITE_TAB_TEAM_MEMBERS ?? 'TeamMembers',
      objectives: env.VITE_TAB_OBJECTIVES ?? 'Objectives',
      actionItems: env.VITE_TAB_ACTION_ITEMS ?? 'ActionItems',
      meetings: env.VITE_TAB_MEETINGS ?? 'Meetings',
      performance: env.VITE_TAB_PERFORMANCE ?? 'PerformanceKPIs',
      assessments: env.VITE_TAB_ASSESSMENTS ?? 'Assessments',
      readiness: env.VITE_TAB_READINESS ?? 'ReadinessMetrics',
    },
  },
};

export const APP_NAME = 'Manager Development Dashboard';
