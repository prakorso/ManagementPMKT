# Sheet write-back (Google Apps Script)

This lets the dashboard **write** to your Google Sheet (e.g. "Add Member" appends
a row to the `TeamMembers` tab), so new data is saved in the sheet and shared
with your team — all from a static Netlify site, no server required.

## One-time setup (~3 minutes)

1. Open your **Management PMKT** Google Sheet.
2. **Extensions → Apps Script**. A script project opens (it is *bound* to this sheet).
3. Delete any sample code, paste the contents of [`Code.gs`](./Code.gs), and **Save**.
4. **Deploy → New deployment**:
   - Type: **Web app**
   - Description: `Dashboard write-back`
   - **Execute as: Me**
   - **Who has access: Anyone**
   - Click **Deploy**, then **Authorize access** and allow the permissions.
5. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/AKfy…/exec`).

## Connect it to the dashboard

In the dashboard → **Team Management → Sheet sync** (button next to *Add Member*),
paste the Web app URL and **Save**. That's it — new members now append to your
`TeamMembers` tab automatically.

> The URL is stored in your browser. To make write-back the default for everyone
> (e.g. on the deployed site without each person pasting it), set it as a Netlify
> environment variable instead: `VITE_SHEETS_WRITE_URL=<your web app url>` and redeploy.

## How it works / notes

- The dashboard sends a JSON payload `{ tab, record }`. The script maps `record`
  onto the tab's header row, so column order doesn't matter and unknown columns
  are ignored. Adding `reportingUrl` / `oneOnOneDocUrl` columns later "just works".
- Duplicate `id`s are ignored (safe to retry).
- After adding a member, the dashboard re-reads the sheet so the new row shows up
  as normal sheet data (the temporary in-browser copy disappears).
- This endpoint only **appends**. Editing/removing existing rows is still done in
  the sheet directly (a fuller editing API can come with the database phase — see
  [`../ROADMAP.md`](../ROADMAP.md)).
- To revoke write access, delete the deployment in Apps Script.
