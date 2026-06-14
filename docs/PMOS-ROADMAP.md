# PMOS — Performance Marketing Operating System · Phase Map

Maps the PMOS PRD onto a sequenced, buildable roadmap that **continues** the
existing platform (most of the foundation is already shipped) rather than
restarting. Status legend: ✅ done · 🟡 partial · 🔵 new.

---

## Architecture recommendation (read first)

The PRD lists Next.js / Supabase / Vercel. The platform today is **React + Vite**
(deployed on Netlify / GitHub Pages) with a pluggable `DataSource` and a local
overlay for writes. Recommendation:

- **Keep the React/Vite frontend.** Do not rewrite to Next.js — Vite runs on
  Vercel/Netlify/Pages just fine and a rewrite buys nothing. (If SSR/SEO is ever
  needed, revisit; an internal tool doesn't need it.)
- **Add Supabase as the backend** (Auth + Postgres + Row-Level Security). This is
  the single enabler for real multi-user, persistence, audit logs, Knowledge Base
  and stored AI insights. The `DataSource` interface + local overlays were built
  precisely so this swap is additive — no UI rewrite.
- **AI layer = rule engine first** (deterministic, runs client-side / edge),
  **OpenAI optional later** for narrative recommendations.
- **LGP stays the analytics engine**; the sync layer (`scripts/sync-lgp.mjs`)
  feeds PMOS. Later it writes into Supabase on a schedule instead of a JSON file.

Role mapping: PRD **Specialist** = current **member** role. VP/Manager already exist.

---

## Module status vs PMOS PRD

| PMOS module | Status | Where it stands |
| --- | --- | --- |
| RBAC (VP / Manager / Specialist) | ✅ | Roles, login/session, role-based nav & route guards |
| Campaign/Project (one entity, from Hub) | ✅ | Campaign Hub + Project Assignment + Workspace |
| Campaign KPIs from LGP | ✅ | Funnel (RAW→SVD), Spend, CPL, CP*, contribution, breakdown, health score |
| Project Dashboard (full funnel + AI) | 🟡 | Funnel (incl. Spam, Unqualified, SVA, SPD), CPA & Conversion done; **AI section** new |
| Tasks (per campaign) | ✅ | Create/assign/status in the Workspace |
| Weekly Updates | ✅ | In the Workspace (member submits, manager sees) |
| Manager Notes (public/internal) | ✅ | In the Workspace |
| One-on-One System | 🟡 | Meetings module exists; **dedicated 1:1 fields + action-item/escalation tracking** new |
| Executive Dashboard (VP) | ✅ | Merged into the shared Manager/VP home (Control Tower + business KPIs: Spend, Leads, Bookings, CPA, Conversion + campaign/team health) |
| Team Dashboard (workload/capacity) | 🟡 | Team mgmt + ranking exist; **workload/capacity/utilization** new |
| Performance Score | 🔵 | Formula defined, not yet computed |
| Knowledge Base | 🔵 | New module |
| AI Command Center | 🔵 | New (rule engine + insights) |
| Notifications / Alerts | 🔵 | New |
| Audit logs | 🔵 | New (arrives with Supabase) |
| Forecasting | 🔵 | New |
| Supabase backend (auth + DB + RLS) | 🔵 | New — the persistence/multi-user enabler |
| Meta / Calendar / CRM integrations | 🔵 | New (PRD data-source Phase 2) |

---

## Funnel & KPI mapping (LGP → PMOS)

PMOS funnel: **Lead → Submit → Spam → Unqualified → Interest → SVA → SPD → Booking**.
LGP gives: RAW(=Lead), Submitted(=Submit), Interest, SVS(≈SVA), SVD(≈SPD), Booking,
plus Spam & Unqualified (from `contact_status` / `last_result`). Headline economics:
**CPA** (spend ÷ booking) and **Conversion** (booking ÷ leads).

> **No ROAS/Revenue.** This is a property business — deals close off-platform over
> long cycles, so spend-efficiency (CPA) and funnel Conversion are the meaningful,
> project-agnostic metrics. Revenue/ROAS were dropped on purpose.

---

## Phased roadmap

### Phase A — Business KPIs & role-aware homepages  *(builds on Control Tower)*
- ✅ Extend `sync-lgp.mjs`: Spam, Unqualified → 8-stage funnel + **CPA & Conversion**
  per campaign (Revenue/ROAS intentionally dropped — see KPI note above).
- ✅ **Executive Dashboard:** merged into the shared Manager/VP home — business KPIs
  (Spend, Leads, Bookings, CPA, Conversion), Campaign Health, Team Health, Action
  Required center, Team Ranking, Recent Activity.
- ✅ **Role-aware Homepage** ("What do I do today?"): Manager + VP = combined Control
  Tower + Executive · Specialist = My Dashboard (MemberOverview).
- ✅ **Project Dashboard:** full 8-stage funnel + CPA + Conversion in the Campaign
  Workspace, plus a rule-based **Insights** section (`src/utils/insights.ts`) — the
  deterministic precursor to the Phase C AI Command Center.
- ✅ **Manager home widgets:** **Overdue Tasks** + **Upcoming 1:1**.

> **Phase A complete.** Only the cross-device **sync** belongs to Fase A by the
> user's wish but is deliberately deferred to **Phase D** (Supabase) until data
> sign-off from another division; the sync layer already exists (dormant) and can
> be pulled forward at any time.

### Phase B — Team management & 1:1  *(people layer)*
- ✅ **Team Dashboard** (`/team`): per-member campaigns (active/total), bookings, CPA,
  campaign health, **workload / capacity / utilization** (capacity 15/member), plus
  team totals (active campaigns, avg load, over-capacity count).
- ✅ **Performance Score** per specialist — Campaign Health 45% · Task 25% · Weekly
  Update 15% · Meeting Action 15% (Objective component dropped with the Objective
  Tracker). Drives both the Team Dashboard and the home Team Ranking.
- ✅ **One-on-One System** (in Member detail): structured 1:1 — Wins, Challenges,
  Blockers, Support Needed, Action Plan, Next-Week Target — with full history,
  per-session **action items** (checkable) and an **escalation** flag that surfaces
  on the member header and the home Action Required center. Stored in a local
  overlay (`oneOnOnes`), sync-ready for Phase D.
- ✅ **Task Management** (`/tasks`): unified view of campaign tasks + standalone
  tasks, with **Overdue** detection (past due-date), due-date **roll-ups** (Open /
  Overdue / Due This Week / Completed), status filters and inline status editing.
  Members see only their own tasks; manager/team-lead manage all.

> **Phase B complete.**

### Phase C — Knowledge Base & AI Command Center  *(intelligence)*
- ✅ **AI Command Center** (`/insights`): portfolio-wide rule engine
  (`portfolioInsights`) — per-campaign rules (no booking, stale leads, low
  conversion, high spam, off-track, scale-up) + **trend rules** (lead drop >30%,
  spend ↑20% & results ↓20%) + **CPA above portfolio average**. Ranks
  Critical / Warning / Opportunity, with severity filters.
- ✅ Surfaced in **Homepage "AI Priority"** panel + per-campaign **Insights** section.
- ✅ **Knowledge Base** (`/knowledge`): per-campaign Winning Creative/Audience,
  Learnings, Recommendations (editable overlay) + auto metrics (Best CPL, CPA,
  Conversion, Bookings). Full-text search, keyed by campaign so it survives team
  changes; "documented" coverage counter.
- 🔵 **Alerts & notifications**; simple **trend forecasting** (carried to a later pass).

> **Phase C structure complete** (AI Command Center + Knowledge Base). Alerts/
> notifications & forecasting fold into the final polish pass.

### Phase D — Supabase backend  *(persistence & real multi-user)*
- Supabase **Auth** (replaces the interim profile login) + **Postgres** + **RLS**.
- Schema: `users, projects, project_assignments, performance_data,
  one_on_one_sessions, one_on_one_notes, tasks, knowledge_base, ai_insights,
  notifications, audit_logs`.
- Swap local overlays → Supabase via a new `DataSource` (UI unchanged). LGP sync
  writes into Supabase on a schedule. **Audit logs** + true per-role privacy.
  > Can be pulled earlier as a thin "auth + core tables" slice if real login is
  > needed before all features are built.

### Phase E — External integrations  *(PRD data-source Phase 2)*
- **Meta Ads API** (live spend/results), **Google Calendar API** (1:1 scheduling),
  **CRM API** (bookings/revenue). Replace CSV/manual import with live pulls.

---

## Suggested order

A → B → C, then **D (Supabase)** once feature shape is stable (or a thin auth
slice earlier), then **E**. CSV upload / Sheets import stay available throughout
as the manual fallback (PRD data-source Phase 1).

## Definition of done (from the PRD)

VP understands business health in < 30s · Manager knows daily priorities without a
spreadsheet · Specialist sees their KPIs & tasks without asking · 1:1s fully
documented · knowledge retained across turnover · automatic risk recommendations.
