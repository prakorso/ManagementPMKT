# Roadmap

How this dashboard is planned to grow. Phase 1 is a personal, read-from-Sheets
manager dashboard; later phases add shared access for the team and multi-project
tracking — without throwing away the phase-1 work, because the UI only ever
depends on the `DataSource` interface (`src/data/DataSource.ts`).

---

## ✅ Phase 1 — Personal manager dashboard (shipped)

- 7 sections: Overview, Team Management, Objective Tracker, Performance,
  Assessment Tracker, Meeting & Coaching Notes, Manager Readiness.
- Reads a public Google Sheet (gviz JSONP — no API key, no CORS issues).
- Dark/light, responsive, Netlify-ready.
- **Add Team Member** from the UI (e.g. a new recruit), with title/role,
  strengths, development areas, 1:1 date and attachment links.
  - Stored in the browser (localStorage overlay) and merged on top of the
    sheet. A "Copy sheet row" button outputs a ready-to-paste row so it can be
    persisted into the shared sheet today.
- **Attachment links per member**: `reportingUrl` (reporting sheet) and
  `oneOnOneDocUrl` (1:1 Google Doc) — the foundation for the team-update flow.

---

## 🔜 Phase 1.5 — Shared access & write-back

Goal: the team can open the dashboard and **update their own 1:1 progress**,
attach their reporting sheet / 1:1 Google Doc, and have it persist for everyone
(not just in one browser).

Two ways to get there, smallest first:

1. **Google Apps Script write endpoint (lightest).**
   - Deploy a small Apps Script Web App bound to the same spreadsheet that
     accepts `POST` (append/update a row) and is called from the dashboard.
   - Swap the localStorage overlay in `src/data/localStore.ts` for calls to that
     endpoint. No new infra; data stays in the sheet everyone already shares.
   - Access control = who you share the dashboard URL + sheet with.

2. **Supabase / database + auth (robust, recommended long-term).**
   - Auth (Google sign-in) + Postgres + row-level security.
   - Roles: **Manager** (sees everything) and **Member** (sees & edits their own
     1:1s, reports, action items).
   - Implement a `SupabaseDataSource implements DataSource` and register it in
     `src/data/index.ts` — the pages don't change. Add mutation methods to the
     interface for writes.

Deliverables when we build this:
- Login + per-user identity, linked to a `TeamMember`.
- Member self-service: update 1:1 notes/links, mark action items done.
- Audit of who updated what.

---

## 🚀 Phase 2 — Multi-project & campaign overview

Goal: pull **all projects**, assign each to the team member(s) who handle it,
and let everyone see the dashboards for *their* projects while the manager sees
**all projects** plus an overall campaign overview.

Schema groundwork already in `src/types`:
- `Project` (id, name, client, status, ownerIds, dates).
- `TeamMember.projectIds` — projects a member handles.
- Planned: optional `projectId` on `Objective`, `PerformanceSnapshot`,
  `Assessment`, and `ActionItem` so each can be filtered by project.

Planned UX:
- A **project switcher** (All projects ▸ a specific project) that scopes the
  Objective Tracker, Performance and Assessment pages.
- A **Campaign Overview** page (manager view): every project's KPIs side by side,
  total spend/leads/CPL, and which member owns what.
- Members are scoped (via Phase 1.5 auth) to the projects assigned to them.

Recommended data source for this phase: the database from Phase 1.5, with a
`projects` table and project foreign keys on the other tables.

---

## Why this stays cheap to build

Every page reads a single `DashboardData` bundle from a `DataSource`. Adding a
backend means writing one new adapter and changing one line in
`src/data/index.ts`. Phases 1.5 and 2 are additive — the phase-1 UI keeps
working throughout.
