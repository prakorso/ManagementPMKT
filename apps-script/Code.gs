/**
 * Manager Development Dashboard — Sheet write-back endpoint.
 *
 * Deploy this as a Web App bound to your "Management PMKT" spreadsheet so the
 * dashboard can append rows (e.g. a new team member) directly into a tab.
 * See apps-script/README.md for step-by-step deploy instructions.
 *
 * The dashboard sends a "simple" POST (Content-Type: text/plain) carrying JSON:
 *   { "tab": "TeamMembers", "record": { "id": "...", "name": "...", ... } }
 * The record is mapped onto the tab's header row (row 1), so column order and
 * extra/missing columns are handled automatically.
 */

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var tabName = body.tab;
    var record = body.record || {};
    if (!tabName) return json({ ok: false, error: 'Missing "tab".' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) return json({ ok: false, error: 'Tab not found: ' + tabName });

    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    // Optional: prevent duplicate ids (idempotent appends).
    if (record.id) {
      var idCol = -1;
      for (var i = 0; i < headers.length; i++) {
        if (String(headers[i]).trim().toLowerCase() === 'id') { idCol = i + 1; break; }
      }
      if (idCol > 0 && sheet.getLastRow() > 1) {
        var ids = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1).getValues();
        for (var r = 0; r < ids.length; r++) {
          if (String(ids[r][0]).trim() === String(record.id).trim()) {
            return json({ ok: true, duplicate: true });
          }
        }
      }
    }

    var row = headers.map(function (h) {
      var key = String(h).trim();
      return record[key] != null ? record[key] : '';
    });
    sheet.appendRow(row);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, status: 'ready' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
