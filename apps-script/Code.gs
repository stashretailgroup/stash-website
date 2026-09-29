/**
 * STASH – Host a Machine inquiries → Google Sheet
 *
 * Paste this into Extensions > Apps Script in the STASH Business Prospects sheet,
 * then Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the Web app URL and send it to Claude.
 */

const SHEET_NAME = 'Inquiries'; // tab in STASH Business Prospects
const NOTIFY_EMAIL = 'stashretailgroup@gmail.com'; // set to '' to turn off email alerts

// Matches row 5 of the Inquiries tab (columns A–L).
const HEADERS = ['Received', 'Machine', 'Name', 'Business / Property', 'Address', 'Property Type',
                 'City', 'Email', 'Phone', 'Message', 'Source', 'Status'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const p = (e && e.parameter) || {};
    const sheet = getSheet_();
    const row = [
      new Date(),
      clean_(p.machine), clean_(p.name), clean_(p.business), clean_(p.address), clean_(p.type),
      clean_(p.city), clean_(p.email), clean_(p.phone), clean_(p.message),
      clean_(p.page), 'New'
    ];
    sheet.appendRow(row);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        replyTo: clean_(p.email) || NOTIFY_EMAIL,
        subject: 'New STASH inquiry: ' + (clean_(p.business) || clean_(p.name)),
        body: HEADERS.slice(1, 10).map((h, i) => h + ': ' + (row[i + 1] || '—')).join('\n')
      });
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('STASH inquiry endpoint is running.');
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Stops spreadsheet formula injection and trims long input.
function clean_(v) {
  v = String(v || '').trim().slice(0, 2000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
