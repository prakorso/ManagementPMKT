import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Optional cross-device sync via Supabase.
 *
 * When VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set, the local overlays
 * (campaign assignments, members, roles, tasks/updates inside assignments, etc.)
 * are mirrored to a single `pmos_state` row in Supabase and kept in sync across
 * devices (realtime + on focus). When the env vars are absent, the app behaves
 * exactly as before (localStorage only). See docs/DEVICE_SYNC.md.
 *
 * This is the interim sync that the Phase-D Supabase backend (auth + per-table
 * RLS) will formalise. The Supabase client is dynamically imported so it is only
 * bundled/loaded when sync is actually enabled.
 */
const URL = (import.meta.env.VITE_SUPABASE_URL ?? '').toString().trim();
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').toString().trim();
export const syncEnabled = !!(URL && ANON);

const TABLE = 'pmos_state';
const ROW_ID = 'overlay';

/** localStorage keys that make up the shared team overlay. */
const KEYS = [
  'mdd-assignments',
  'mdd-local-members',
  'mdd-role-assignments',
  'mdd-removed',
  'mdd-local-actionitems',
  'mdd-local-projects',
  'mdd-local-objectives',
];

let clientPromise: Promise<SupabaseClient> | null = null;
function getClient(): Promise<SupabaseClient> | null {
  if (!syncEnabled) return null;
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then((m) => m.createClient(URL, ANON, { auth: { persistSession: false } }));
  }
  return clientPromise;
}

function gather(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of KEYS) {
    const v = localStorage.getItem(k);
    if (v != null) out[k] = v;
  }
  return out;
}

/** Writes remote values into localStorage. Returns true if anything changed. */
function apply(data: Record<string, unknown>): boolean {
  let changed = false;
  for (const k of KEYS) {
    const raw = data[k];
    if (raw === undefined) continue;
    const v = typeof raw === 'string' ? raw : JSON.stringify(raw);
    if (localStorage.getItem(k) !== v) {
      localStorage.setItem(k, v);
      changed = true;
    }
  }
  return changed;
}

let lastSerialized = '';
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

/** Debounced push of the local overlay to Supabase. No-op when sync is off. */
export function pushSync(): void {
  if (!syncEnabled) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    const client = await getClient();
    if (!client) return;
    const data = gather();
    const json = JSON.stringify(data);
    if (json === lastSerialized) return;
    lastSerialized = json;
    await client.from(TABLE).upsert({ id: ROW_ID, data, updated_at: new Date().toISOString() });
  }, 800);
}

/**
 * Pulls the shared overlay, applies it, and subscribes to realtime + focus
 * updates. `onRemote` is called whenever remote data changes local state so the
 * UI can re-hydrate. Runs once.
 */
export async function initSync(onRemote: () => void): Promise<void> {
  if (!syncEnabled || started) return;
  started = true;
  const client = await getClient();
  if (!client) return;

  const pull = async () => {
    const { data, error } = await client.from(TABLE).select('data').eq('id', ROW_ID).maybeSingle();
    if (error) return;
    if (data?.data) {
      const changed = apply(data.data as Record<string, unknown>);
      lastSerialized = JSON.stringify(gather());
      if (changed) onRemote();
    } else {
      // First run: seed the remote row from this device's local overlay.
      const seed = gather();
      lastSerialized = JSON.stringify(seed);
      await client.from(TABLE).upsert({ id: ROW_ID, data: seed, updated_at: new Date().toISOString() });
    }
  };

  await pull();

  client
    .channel('pmos_state_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `id=eq.${ROW_ID}` }, (payload) => {
      const remote = (payload.new as { data?: Record<string, unknown> } | null)?.data;
      if (remote) {
        const changed = apply(remote);
        lastSerialized = JSON.stringify(gather());
        if (changed) onRemote();
      }
    })
    .subscribe();

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => void pull());
  }
}
