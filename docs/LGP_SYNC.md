# LGP → Platform sync layer

The LGP dashboard is the **analytics engine** (LeadSquared → BigQuery → Supabase →
`leads.csv` / `ads.csv` / `project_index.csv`). This platform is the **operating
system**. We don't copy LGP — we pull only the management KPIs per campaign.

## How it works

`scripts/sync-lgp.mjs` reads the three LGP exports and aggregates them into a
compact per-campaign summary at `src/data/lgpCampaigns.json` (the raw 53 MB
`leads.csv` is **never** shipped — only the ~375 KB summary).

```bash
LGP_DIR=/path/to/lgp-dashboard SYNC_TODAY=2026-06-12 node scripts/sync-lgp.mjs
```

Per campaign (latest active period from `project_index`, date-scoped), it computes:

- **Funnel:** RAW, Submitted, Interest, SVS, SVD, Booking — using the LGP
  definitions verbatim (Submitted = `submit_date_to_developer` present; Interest =
  feedback/last-category contains "interest"; SVS = `site_visit_status` non-empty;
  SVD = status contains today/done/won/booking; Booking ≈ status contains
  "booking").
- **Contribution:** PMKT / Organic / Socmed / Other (`contribution_category`).
- **Spend** from `ads.csv` (+ platform split) → **CPL, CP Submit/Interest/SVD/Booking**.
- **Targets** from `project_index` (kpi_leads, kpi_visit, kpi_book).
- **Campaign Health Score (V1):** `lead 40% + booking 40% + cost-efficiency 20%`
  → 0–100 → On Track (≥80) / At Risk (60–79) / Off Track (<60).
- **Monthly & weekly breakdown** (last 12 each).

Merged campaigns (`merge_breakdown = Merge`) pull leads/ads from every name in
`lsq_project_name` (e.g. Aerium = "Aerium at Taman Permata Buana, Aerium Residence").

> Booking actual is approximate here — real bookings live in LGP's separate
> bookings pipeline, not in these three CSVs. Wire that source in when available.

## Swappable by design

This script is the **data-sync seam**. Today it reads CSVs; tomorrow it can read
Supabase/Postgres and emit the same `lgpCampaigns.json` shape — the UI doesn't
change. Schedule it (cron / GitHub Action) to refresh daily, mirroring LGP.
