# Cross-device sync (Supabase)

By default the app stores in-app changes (campaign **assignments**, tasks, weekly
updates, manager notes, members, roles) in the browser (localStorage) — so they
don't follow you to another laptop or mobile. Enabling Supabase makes that data
**sync across all devices** in real time. It's free and optional.

## One-time setup (~5 min)

1. Create a free project at **supabase.com** → New project.
2. In the project → **SQL Editor** → run:

   ```sql
   create table if not exists pmos_state (
     id text primary key,
     data jsonb not null default '{}',
     updated_at timestamptz default now()
   );
   alter table pmos_state enable row level security;
   create policy "pmos open access" on pmos_state for all using (true) with check (true);
   -- realtime updates across devices:
   alter publication supabase_realtime add table pmos_state;
   ```

3. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.
4. Set them as environment variables wherever you run the app:
   - **Local:** in `.env` → `VITE_SUPABASE_URL=…` and `VITE_SUPABASE_ANON_KEY=…`
   - **Netlify:** Site settings → Environment variables → add both → redeploy.
   - **GitHub Pages:** repo → Settings → Secrets and variables → Actions → add
     `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as **secrets** → re-run the
     Pages workflow.

That's it. Open the app on two devices — assign a campaign on one, it appears on
the other (realtime, and on window focus).

## How it works

The shared overlay is mirrored to a single `pmos_state` row as JSON. On change
it's pushed (debounced); a realtime subscription + on-focus pull keep every
device current. No env vars set → the app runs local-only, exactly as before.

## Security note (interim)

This interim sync uses the **anon key with open RLS** (anyone with the URL + key
can read/write). That's fine for an internal, trusted team, but on a **public**
GitHub Pages site the key ships in the client bundle — so treat the Pages URL as
semi-private, or enable sync only on Netlify. **Phase D** replaces this with real
Supabase **Auth + per-table RLS** (per-role privacy) — see `docs/PMOS-ROADMAP.md`.
