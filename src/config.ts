/**
 * Runtime configuration, resolved from Vite environment variables.
 *
 * Everything has a safe default so the app runs on bundled seed data with no
 * configuration at all. To connect Google Sheets, set the variables in `.env`
 * (see `.env.example`).
 */

export type DataSourceKind = 'seed' | 'google-sheets';

interface AppConfig {
  dataSource: DataSourceKind;
  googleSheets: {
    sheetId: string;
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

function resolveDataSource(): DataSourceKind {
  const raw = (env.VITE_DATA_SOURCE ?? '').toString().toLowerCase().trim();
  if (raw === 'google-sheets' && env.VITE_GOOGLE_SHEET_ID) {
    return 'google-sheets';
  }
  return 'seed';
}

export const config: AppConfig = {
  dataSource: resolveDataSource(),
  googleSheets: {
    sheetId: (env.VITE_GOOGLE_SHEET_ID ?? '').toString().trim(),
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
