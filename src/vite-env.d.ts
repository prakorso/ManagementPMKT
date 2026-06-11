/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: string;
  readonly VITE_GOOGLE_SHEET_ID?: string;
  readonly VITE_SHEETS_WRITE_URL?: string;
  readonly VITE_TAB_TEAM_MEMBERS?: string;
  readonly VITE_TAB_OBJECTIVES?: string;
  readonly VITE_TAB_ACTION_ITEMS?: string;
  readonly VITE_TAB_MEETINGS?: string;
  readonly VITE_TAB_PERFORMANCE?: string;
  readonly VITE_TAB_ASSESSMENTS?: string;
  readonly VITE_TAB_READINESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
