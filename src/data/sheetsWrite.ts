import { config } from '@/config';
import type { TeamMember } from '@/types';

/**
 * Write-back to Google Sheets via a bound Apps Script Web App (see
 * apps-script/README.md). This keeps phase 1 backend-free: the dashboard POSTs
 * a row and the script appends it to the sheet.
 *
 * The POST is a "simple request" (text/plain) sent with `mode: 'no-cors'`, so it
 * is not blocked by CORS and needs no special response headers. The trade-off is
 * that the response is opaque — we can't read success/failure — so callers treat
 * it as fire-and-forget and re-read the sheet afterwards to confirm.
 */
const URL_KEY = 'mdd-sheets-write-url';

export function getWriteUrl(): string {
  try {
    const stored = localStorage.getItem(URL_KEY);
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return config.googleSheets.writeUrl || '';
}

export function setWriteUrl(url: string): void {
  try {
    const trimmed = url.trim();
    if (trimmed) localStorage.setItem(URL_KEY, trimmed);
    else localStorage.removeItem(URL_KEY);
  } catch {
    /* ignore */
  }
}

const HEALTH_LABEL: Record<TeamMember['health'], string> = {
  'on-track': 'On Track',
  watch: 'Watch',
  'at-risk': 'At Risk',
};

/** Flattens a member into sheet-friendly string values keyed by column header. */
export function memberToSheetRecord(m: TeamMember): Record<string, string> {
  return {
    id: m.id,
    name: m.name,
    role: m.role,
    strengths: m.strengths.join(' | '),
    developmentAreas: m.developmentAreas.join(' | '),
    lastOneOnOne: m.lastOneOnOne ?? '',
    nextOneOnOne: m.nextOneOnOne ?? '',
    developmentProgress: String(m.developmentProgress),
    health: HEALTH_LABEL[m.health],
    coachingFocus: m.coachingFocus ?? '',
    reportingUrl: m.reportingUrl ?? '',
    oneOnOneDocUrl: m.oneOnOneDocUrl ?? '',
  };
}

/** Appends a record to a sheet tab. Resolves once the request is sent. */
export async function appendRecord(tab: string, record: Record<string, string>): Promise<void> {
  const url = getWriteUrl();
  if (!url) throw new Error('No write-back URL configured');
  await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ tab, record }),
  });
}
