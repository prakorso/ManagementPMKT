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
  /** Live LGP campaign source (read-only). When set, overrides lgpCampaigns. */
  supabase: {
    url: string;
    anonKey: string;
  };
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

/**
 * LGP "control center" Supabase (project "PMKT | Rumah123"), read-only. The anon
 * key is public by design (safe in client bundles); Row-Level Security is the
 * real boundary. Override with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 */
const DEFAULT_SUPABASE_URL = 'https://sspfsbcgrzfknhxscvco.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcGZzYmNncnpma25oeHNjdmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODk2MDYsImV4cCI6MjA5Njc2NTYwNn0.0gCtX3aCjPar95HYuQZZqe_AM-6eAYdiijIBwaKB2t8';

function resolveSheetId(): string {
  return (env.VITE_GOOGLE_SHEET_ID ?? '').toString().trim() || DEFAULT_SHEET_ID;
}

function resolveDataSource(): DataSourceKind {
  const raw = (env.VITE_DATA_SOURCE ?? '').toString().toLowerCase().trim();
  // Google Sheets is opt-in only now. By default the app reads its baseline
  // (team, objectives, meetings…) from the bundled dataset and overlays live
  // LGP campaigns from Supabase — no Google Sheets involved.
  if (raw === 'google-sheets') return 'google-sheets';
  return 'seed';
}

export const config: AppConfig = {
  dataSource: resolveDataSource(),
  supabase: {
    // NB: the deploy passes empty strings for unset secrets, so fall back with
    // `|| DEFAULT` (|| catches '' ; ?? would keep the empty string).
    url: ((env.VITE_SUPABASE_URL ?? '') as string).toString().trim() || DEFAULT_SUPABASE_URL,
    anonKey: ((env.VITE_SUPABASE_ANON_KEY ?? '') as string).toString().trim() || DEFAULT_SUPABASE_ANON_KEY,
  },
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
