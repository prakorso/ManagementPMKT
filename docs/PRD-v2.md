# Performance Development Management Platform — PRD v2

The platform is evolving from a personal manager dashboard into a **team "Control
Tower"**: in < 5 minutes a Manager should see which campaigns are in trouble, who
needs coaching, which objectives are off-track, which projects are late, who
hasn't updated, and who is ready for promotion — without opening a spreadsheet.

## Roles (RBAC)

| Role | Sees |
| --- | --- |
| **Manager** | Everything: Overview, Performance, Team Management, Project Assignment, Meetings, Assessment, Readiness, Settings. Can create objectives/projects, assign tasks, add members, assess, manage readiness. |
| **Team Lead** *(future-ready)* | Only their team: members, coaching, updates. No org-wide readiness, no global settings. |
| **Member** | Only their own: objectives, campaigns handled, tasks, meeting updates, assessment. No other members' data, no readiness/settings. |
| **VP** | Readiness Management + Settings (governance), org view. |

Each user logs in; the system reads their role and renders the right experience.

## Menu structure

- **Overview**
- **Performance** → Campaign Performance · Team Performance · Objective Tracker
- **Team Management** → Member Directory · Member Profile · Development Notes
- **Project Assignment**
- **Meetings Update**
- **Assessment**
- **Readiness Management** *(Manager + VP only)*
- **Settings** *(Manager + VP only)*

## Modules (key fields)

- **Overview (Manager / Control Tower):** Team Summary cards (Total Members, Active
  Campaigns, Active Projects, On/Off-track Objectives, Pending Updates); Team Health
  snapshot chart (On Track / At Risk / Off Track %); Campaign Health summary; Team
  Ranking (member · performance score · objective completion · campaign health);
  Alert Center; Recent Activities timeline.
- **Overview (Member):** My Objectives, My Campaigns, My Projects, My Performance
  Score, Upcoming Meetings, Pending Tasks. No other members' data.
- **Campaign Performance:** name, owner, supporting member, status (On Track / At
  Risk / Off Track / Completed), performance score, last update → detail (overview,
  objective, KPI metrics, weekly progress, issues & risks, action plan, manager notes).
- **Team Performance:** member · performance score · objective completion · campaign
  health · project completion · assessment score → member profile.
- **Objective Tracker:** create / assign / edit / archive. Fields: title, description,
  owner, start, end, priority, status (Not Started / In Progress / On Track / At Risk
  / Off Track / Completed), success metrics → detail (success metrics, progress
  updates, manager feedback, risks, next action, history log).
- **Team Management → Member Directory:** photo, name, position, department, role,
  manager, status → **Member Profile** (general info, current objectives, campaign
  ownership, project assignment, weekly update history, assessment history, coaching
  notes). **Development Notes** (manager-only): strengths, development areas, coaching
  notes, career development, promotion readiness, action plan.
- **Project Assignment:** create / assign / track. Fields: name, description, owner,
  assigned member, priority, due date, status (Not Started / In Progress / Blocked /
  Completed / Cancelled), progress %, dependencies. Dashboard: total / active /
  overdue / completed → detail (overview, progress, updates, blockers, manager notes,
  activity timeline).
- **Meetings Update:** Manager sees all; Member sees own. Fields: date, type (Weekly
  Update / 1:1 / Performance Review / Project Discussion / Career Discussion),
  participants, discussion summary, achievements, challenges, action items, due date,
  follow-up status.
- **Assessment:** Manager creates; categories (Ownership, Accountability, Execution,
  Communication, Leadership, Problem Solving, Collaboration, Initiative) scored 1–5.
  Output: assessment score, category score, trend analysis, improvement area. Manager
  sees all; Member sees own.
- **Readiness Management** *(Manager + VP):* categories (Ready Now / < 6mo / < 12mo /
  Future Potential / Not Ready); 9-box Talent Matrix (performance × potential);
  succession planning (current → potential position, readiness level, target timeline,
  development plan); critical position risk, succession gap, promotion pipeline.
- **Settings** *(Manager + VP):* user management (create/edit/deactivate/assign role),
  role management, access control per role, notification settings (weekly update /
  objective / meeting / assessment reminders).

## Design principles

1. Executive-friendly (understand the team in < 5 min).
2. Drill-down — every number is clickable; no static-only metrics.
3. Action-oriented — every problem has an owner, status, action plan, due date.
4. Role-based experience — Manager sees the org, Member sees themselves.
5. Single source of truth.

## Architecture

Data is in Google Sheets today, but the layers stay separated (frontend / data
access / storage) so it can migrate to **Supabase / PostgreSQL / MySQL** without UI
changes — exactly what the existing `DataSource` interface (`src/data/`) provides.

---

## Build plan (kept vs. new)

**Kept (already built, will be reorganised into the above):** Team Management detail
& per-member drill-down, campaigns/projects with on/off-track + assign, performance
trends & KPI cards, meetings log, assessment & readiness pages, dark/light, Sheets
data layer + local overlays + Apps Script write-back.

**Phases:**
1. **Foundation (this phase):** roles + lightweight login/session + greeting header +
   role-based navigation + route gating + Settings (role management). Member vs
   Manager experience switch.
2. **Control Tower Overview** (manager) + **Member Overview** (scoped).
3. **Objective Tracker** create/assign/edit/archive + new status set + detail/history.
4. **Project Assignment** module (statuses, progress %, overdue, detail timeline).
5. **Meetings Update** structured fields + member scoping; **Assessment** 1–5
   categories + scores/trends; **Readiness** talent matrix + succession.
6. **Real auth + backend (Supabase)** replacing the lightweight session, enabling true
   per-user privacy — the `DataSource`/session seams are built for this swap.
