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
| Project Dashboard (full funnel + AI) | 🟡 | Funnel/metrics done; **Spam, Unqualified, SVA, SPD, CPA, ROAS, AI section** new |
| Tasks (per campaign) | ✅ | Create/assign/status in the Workspace |
| Weekly Updates | ✅ | In the Workspace (member submits, manager sees) |
| Manager Notes (public/internal) | ✅ | In the Workspace |
| One-on-One System | 🟡 | Meetings module exists; **dedicated 1:1 fields + action-item/escalation tracking** new |
| Executive Dashboard (VP) | 🟡 | Control Tower exists; **Revenue/CPA/ROAS + business-health view** new |
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
LGP today gives: RAW(=Lead), Submitted(=Submit), Interest, SVS(≈SVA), SVD(≈SPD), Booking.
**To add in the sync:** Spam & Unqualified (from `contact_status` / `last_result`),
Revenue & Booking value (from `project_index.kpi_booking_value` / `lgp_value` + bookings),
then **CPA** (spend ÷ booking) and **ROAS** (revenue ÷ spend).

---

## Phased roadmap

### Phase A — Business KPIs & role-aware homepages  *(builds on Control Tower)*
- Extend `sync-lgp.mjs`: Spam, Unqualified, Revenue, Booking value → **CPA, ROAS,
  conversion rates** per campaign.
- **Executive Dashboard (VP):** Business Health card, Revenue/Booking/CPA/ROAS
  trends, Project Health (Healthy/Warning/Critical), Team Health summary.
- **Role-aware Homepage** ("What do I do today?"): VP = executive view · Manager =
  Control Tower + **Action Required Center** + Overdue Tasks + Upcoming 1:1 ·
  Specialist = My Dashboard.
- **Project Dashboard:** full 8-stage funnel + CPA/ROAS + a placeholder AI section.

### Phase B — Team management & 1:1  *(people layer)*
- **Team Dashboard:** project count, revenue, booking, CPA, achievement, **workload
  / capacity / utilization**, performance ranking, workload distribution.
- **Performance Score** per specialist: Campaign Health 40% + Task 25% + Weekly
  Update 15% + Meeting Action 10% + Objective 10%.
- **One-on-One System:** dedicated 1:1 (Wins, Challenges, Blockers, Support Needed,
  Action Plan, Next-Week Target) with history, action-item tracking, escalation.
- **Task Management:** unify campaign + standalone tasks; add **Overdue** status &
  due-date roll-ups.

### Phase C — Knowledge Base & AI Command Center  *(intelligence)*
- **Knowledge Base** per project: Winning Creative/Audience, Best CPA/CPL,
  Learnings, Recommendations — searchable, survives team changes.
- **AI Command Center (rule engine):** Booking = 0 for 14 days → Critical · CPA
  over target → Warning · Lead drop > 30% → Warning · Spend ↑20% & Booking ↓20% →
  Critical. Outputs Critical / Warning / Opportunity insights.
- Surface insights in **Homepage AI Priority** + each **Project AI section**.
- **Alerts & notifications**; simple **trend forecasting**.

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
