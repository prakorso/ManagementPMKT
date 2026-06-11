# Manager Development Dashboard

A personal **management operating system** for a Junior Performance Marketing Manager.
It helps you monitor your own development during the first 3-month transition from
*Sr. Performance Marketing Specialist* → *Junior Performance Marketing Manager*, manage
your direct reports, track objectives, and evaluate your readiness as a manager.

> This is a **personal** dashboard — not a company-wide tool. Its purpose is to help you
> self-evaluate during the transition, and to be your evidence base for monthly reviews
> and appraisals.

---

## What it answers

| Question | Where |
| --- | --- |
| Am I coaching & running 1:1s consistently? | **Team Management** |
| How is each direct report performing/developing? | **Team Management** |
| How far am I against my Month 1 / 2 / 3 targets? | **Objective Tracker** |
| How is Dev Biz performance (Leads, CPL, Budget, Valid & Conversion rate)? | **Performance Reporting** |
| How accurate is my forecasting? | **Assessment Tracker** |
| Have I grown from specialist to manager? | **Manager Readiness** |

## Sections

1. **Overview** — readiness score, month progress, team health, outstanding risks, upcoming reviews & 1:1s.
2. **Team Management** — direct reports with strengths, development areas, 1:1 cadence, open action items, coaching notes, and tracking (weekly 1:1 completion, follow-up completion, development progress).
3. **Objective Tracker** — every objective from the development plan across Month 1/2/3 with live progress.
4. **Performance Reporting** — KPI cards + target-vs-actual and weekly/monthly trends, with key insight / action plan / risk notes.
5. **Assessment Tracker** — forecast vs actual CPL, lead volume and interest rate, with forecast accuracy, average variance and success rate.
6. **Meeting & Coaching Notes** — a searchable, filterable repository of every 1:1, check-in, client meeting, PMKT stand-up and assessment discussion.
7. **Manager Readiness** — a five-area scorecard (People Management, Reporting, Assessment, Stakeholder Management, Delegation) with a monthly trend.

---

## Tech stack

- **React 18 + TypeScript + Vite** — fast, static, deploys anywhere.
- **Tailwind CSS** — clean executive styling with **dark & light mode**.
- **React Router** — client-side routing with route-level code splitting.
- **Recharts** — trend, comparison and radar charts.
- **Pluggable data layer** — seed data by default, Google Sheets adapter included,
  ready to swap for a database later (see [Data layer](#data-layer--migrating-to-a-database)).

Design direction: clean, professional, minimalist, executive-dashboard style, responsive
(desktop first), usability over visual gimmicks.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

It runs immediately on bundled **seed data** — no configuration required.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Type-check only (`tsc --noEmit`) |

---

## Configuration / data sources

Copy `.env.example` to `.env` and choose a data source:

```bash
# "seed" (default) or "google-sheets"
VITE_DATA_SOURCE=seed
```

### Option A — Seed data (default)

Works out of the box. The dataset lives in [`src/data/seedData.ts`](src/data/seedData.ts).
Edit it directly to personalise the demo, or use it as the schema reference.

### Option B — Google Sheets (read-only, no backend)

1. Create one Google Sheet with one tab per entity.
2. Share it: **Anyone with the link → Viewer**.
3. Configure `.env`:

   ```bash
   VITE_DATA_SOURCE=google-sheets
   VITE_GOOGLE_SHEET_ID=<id-from-the-sheet-url>
   ```

4. Full tab/column reference: **[docs/GOOGLE_SHEETS.md](docs/GOOGLE_SHEETS.md)**.

In phase 1 the spreadsheet is your **data-entry surface** and the dashboard reads &
visualises it. If Sheets is unreachable, the app automatically falls back to seed data and
shows a warning banner, so the dashboard always renders.

---

## Deploy to Netlify

This repo is Netlify-ready ([`netlify.toml`](netlify.toml) sets the build command, publish
directory, SPA redirect and headers).

**Git-based deploy (recommended)**

1. Push this repo to GitHub.
2. Netlify → *Add new site* → *Import from Git* → pick the repo.
3. Build settings are auto-detected from `netlify.toml` (`npm run build`, publish `dist`).
4. (Optional) Add the `VITE_DATA_SOURCE` and `VITE_GOOGLE_SHEET_ID` environment variables
   under *Site settings → Environment variables*.

**Drag-and-drop deploy**

```bash
npm run build      # produces dist/
```

Then drag the `dist/` folder onto the Netlify dashboard.

---

## Project structure

```
src/
├─ main.tsx                # App entry (Theme + Data providers)
├─ App.tsx                 # Routes (lazy-loaded pages)
├─ config.ts               # Resolves data source from env
├─ types/                  # Domain model (single source of truth)
├─ data/                   # Data layer (see below)
│  ├─ DataSource.ts        # Interface every backend implements
│  ├─ SeedDataSource.ts    # Default — bundled demo data
│  ├─ GoogleSheetsDataSource.ts
│  ├─ seedData.ts          # The demo dataset
│  ├─ csv.ts               # CSV parsing utilities
│  └─ index.ts             # Factory that picks the active source
├─ context/                # Theme (dark/light) + Data providers
├─ utils/                  # calculations, formatting, labels
├─ components/
│  ├─ ui/                  # Card, StatCard, Badge, ProgressBar, ScoreRing, …
│  ├─ charts/              # Theme-aware chart helpers
│  └─ layout/              # Sidebar, Topbar, Layout, nav
└─ pages/                  # The 7 dashboard sections
```

---

## Data layer & migrating to a database

The UI depends only on the [`DataSource`](src/data/DataSource.ts) interface, which returns a
single `DashboardData` bundle. Storage is fully decoupled:

```
UI ──▶ DataContext ──▶ DataSource (interface)
                          ├─ SeedDataSource          (today)
                          ├─ GoogleSheetsDataSource   (today)
                          └─ <YourDbDataSource>       (future)
```

To move to a database (e.g. Supabase, Postgres + a REST/Edge function):

1. Implement a new class with `fetchAll(): Promise<DashboardData>`.
2. Register it in [`src/data/index.ts`](src/data/index.ts).
3. Done — **no page or component changes required**.

When you need write support, extend the interface with mutation methods (the types in
`src/types` already describe the full schema), and the same factory pattern applies.

---

## Future scalability

Phase 1 is focused on personal manager development + team management tracking. The structure
is ready to grow into team KPI monitoring, OKR tracking, stakeholder management, and a wider
department dashboard.
