# Connecting Google Sheets

The dashboard can read its data from a single Google Sheet — **no API key and no backend
required**. It reads via Google's gviz endpoint loaded as JSONP (a `<script>` tag), so there
are **no CORS issues** from a static host; the only requirement is that the sheet is shared
with *Anyone with the link* (Viewer is enough).

> **Already connected.** This project is pre-wired to the "Management PMKT" sheet
> (`1pNTvOYJ__opmJGUaiVe-fAFRzZwyt2jeqfBDfXha5-Y`). To use a *different* sheet, set
> `VITE_GOOGLE_SHEET_ID` (see step 3). The quickest way to populate the tabs is to import the
> generated workbook — see [`../google-sheets-data/README.md`](../google-sheets-data/README.md).

In this phase the spreadsheet is your **data-entry surface**: you maintain rows in the sheet,
and the dashboard reads and visualises them.

---

## 1. Create the sheet

Create one Google Sheet with **one tab per entity**. Default tab names (override via `.env`):

| Tab name | Contents |
| --- | --- |
| `TeamMembers` | Direct reports |
| `Objectives` | 3-month development objectives |
| `ActionItems` | Follow-ups & delegated tasks |
| `Meetings` | 1:1 / coaching / meeting notes |
| `PerformanceKPIs` | Dev Biz performance snapshots |
| `Assessments` | Forecasting projects |
| `ReadinessMetrics` | Manager readiness scores |

**Row 1 of every tab must be the header row** using the column names below. Column order
does not matter, and headers are matched case/spacing-insensitively (e.g. `Development Areas`
== `developmentAreas`).

## 2. Share it

`Share` → **General access** → *Anyone with the link* → **Viewer**.

## 3. Configure the app

Copy the spreadsheet ID from the URL
`https://docs.google.com/spreadsheets/d/`**`<THIS_IS_THE_ID>`**`/edit` into `.env`:

```bash
VITE_DATA_SOURCE=google-sheets
VITE_GOOGLE_SHEET_ID=<THIS_IS_THE_ID>
```

Restart `npm run dev` (or redeploy on Netlify with the env vars set).

---

## Column reference

> **Lists** (strengths, development areas, participants, tags) are **pipe-separated**:
> `Meta Ads|Data analysis|Ownership`.
> **Dates** are ISO `YYYY-MM-DD`. **Booleans** accept `TRUE/FALSE`, `yes/no`, `1/0`.
> **Percentages / scores** are plain numbers `0–100`. Currency is a plain number (no `Rp`).

### TeamMembers

| Column | Type | Example |
| --- | --- | --- |
| `id` | text (unique) | `tm-yolanda` |
| `name` | text | `Yolanda` |
| `role` | text | `Performance Marketing Specialist` |
| `email` | text (optional) | `yolanda@company.com` |
| `strengths` | list | `Meta Ads|Data analysis` |
| `developmentAreas` | list | `Strategic planning|Mentoring` |
| `lastOneOnOne` | date | `2026-06-05` |
| `nextOneOnOne` | date | `2026-06-12` |
| `developmentProgress` | 0–100 | `82` |
| `health` | `On Track` / `Watch` / `At Risk` | `On Track` |
| `coachingFocus` | text | `Stretch toward channel strategy` |
| `reportingUrl` | url (optional) | `https://docs.google.com/spreadsheets/d/…` |
| `oneOnOneDocUrl` | url (optional) | `https://docs.google.com/document/d/…` |

### Objectives

| Column | Type | Example |
| --- | --- | --- |
| `id` | text | `obj-m1-1` |
| `month` | `1` / `2` / `3` | `1` |
| `title` | text | `Weekly 1:1 with every direct report` |
| `description` | text | `Establish a weekly 1:1 cadence` |
| `status` | `Not Started` / `In Progress` / `Completed` | `Completed` |
| `progress` | 0–100 | `100` |
| `dueDate` | date | `2026-04-13` |

### ActionItems

| Column | Type | Example |
| --- | --- | --- |
| `id` | text | `ai-1` |
| `title` | text | `Share QA checklist with Rafif` |
| `owner` | text | `Panji Prakorso` |
| `teamMemberId` | text (→ TeamMembers.id) | `tm-rafif` |
| `status` | `Open` / `In Progress` / `Done` | `In Progress` |
| `dueDate` | date | `2026-06-13` |
| `createdDate` | date | `2026-06-06` |
| `source` | text | `1:1 with Rafif` |
| `delegated` | boolean | `FALSE` |

### Meetings

| Column | Type | Example |
| --- | --- | --- |
| `id` | text | `mtg-1` |
| `category` | `Weekly 1:1` / `Performance Check-in` / `Client Meeting` / `PMKT Meeting` / `Assessment Discussion` | `Weekly 1:1` |
| `title` | text | `Weekly 1:1 — Yolanda` |
| `date` | date | `2026-06-05` |
| `teamMemberId` | text (→ TeamMembers.id, optional) | `tm-yolanda` |
| `participants` | list (optional) | `Client — Dev Biz|Reivan` |
| `summary` | text | `Strong month on Meta…` |
| `notes` | text (optional) | `Wins: ROAS up 18%…` |
| `tags` | list (optional) | `strengths|stretch-goal` |

### PerformanceKPIs

| Column | Type | Example |
| --- | --- | --- |
| `id` | text | `perf-m-06` |
| `periodType` | `monthly` / `weekly` | `monthly` |
| `period` | sort key | `2026-06` (or `2026-06-09`) |
| `label` | text (chart label) | `Jun (MTD)` |
| `leads` / `leadsTarget` | number | `742` / `720` |
| `cpl` / `cplTarget` | number | `41500` / `43000` |
| `budget` / `budgetTarget` | number | `30793000` / `30960000` |
| `validRate` / `validRateTarget` | 0–100 | `83` / `82` |
| `conversionRate` / `conversionRateTarget` | 0–100 | `12.8` / `12` |
| `keyInsight` | text (optional) | `Lead volume & quality both up…` |
| `actionPlan` | text (optional) | `Shift 15% budget…` |
| `risk` | text (optional) | `Creative production is a SPOF…` |

> Tip: keep `period` sortable (`2026-06` for months, `2026-06-09` for weeks). The dashboard
> sorts charts by this field and shows `label` on the axis.

### Assessments

| Column | Type | Example |
| --- | --- | --- |
| `id` | text | `asm-1` |
| `projectName` | text | `Property Launch Q2` |
| `date` | date | `2026-04-30` |
| `forecastCpl` / `actualCpl` | number | `45000` / `41200` |
| `forecastLeadVolume` / `actualLeadVolume` | number | `1000` / `1085` |
| `forecastInterestRate` / `actualInterestRate` | 0–100 | `35` / `38` |
| `completed` | boolean | `TRUE` |
| `notes` | text (optional) | `Beat forecast on all fronts` |

Variance, forecast accuracy and success rate are **computed** from these — you don't enter them.

### ReadinessMetrics

| Column | Type | Example |
| --- | --- | --- |
| `id` | text | `rdy-1` |
| `area` | `People Management` / `Reporting` / `Assessment` / `Stakeholder Management` / `Delegation` | `People Management` |
| `name` | text | `Weekly 1:1 Completion` |
| `month1` / `month2` / `month3` | 0–100 | `80` / `90` / `95` |
| `weight` | number (optional) | `1` |

Suggested metrics per the development plan:

- **People Management** — Weekly 1:1 Completion, Coaching Completion, Action Item Completion
- **Reporting** — Report Submission, Report Quality
- **Assessment** — Forecast Accuracy, Assessment Participation
- **Stakeholder Management** — Client Meeting Participation, PMKT Presentation
- **Delegation** — Tasks Delegated, Tasks Completed by Team

---

## Troubleshooting

- **Empty / wrong data** — confirm row 1 holds the headers and the tab names match
  (or set `VITE_TAB_*` overrides in `.env`).
- **A warning banner appears** — the sheet couldn't be reached (sharing not public, wrong ID,
  or offline). The dashboard falls back to seed data so it always renders.
- **A tab is optional but you don't use it** — still create the tab with just the header row
  to avoid a load error.
