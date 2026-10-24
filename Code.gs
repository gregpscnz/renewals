/**
 * Renewal portal receiver (Google Apps Script).
 * Bound to a Google Sheet. Receives the client's answers from the portal,
 * saves a copy in the sheet and emails them to you with the answers attached.
 *
 * Deploy: Deploy > New deployment > Web app
 *   Execute as: Me      Who has access: Anyone
 */
var SHEET_NAME = 'Responses';
var SEND_RECEIPT_TO_CLIENT = false;   // true = also email the client a short "we got it" note
var BROKER_NAME = 'Greg Swaney';
var MAX_BYTES = 400000;

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '';
    if (!raw || raw.length > MAX_BYTES) return out_({ ok: false, error: 'size' });
    var d = JSON.parse(raw);
    if (!d || d.v !== 1 || !d.code || String(d.code).indexOf('BEGIN RENEWAL DATA') < 0) return out_({ ok: false, error: 'format' });

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
      if (sh.getLastRow() === 0) sh.appendRow(['Received', 'Id', 'Client', 'Email', 'Summary', 'Data block']);
      var id = String(d.id || '');
      if (id && sh.getLastRow() > 1) {
        var ids = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return out_({ ok: true, dup: true });
      }
      var code = String(d.code);
      sh.appendRow([new Date(), id, clean_(d.name), clean_(d.email), String(d.summary || '').slice(0, 45000), code.length < 49000 ? code : '(too long for a cell, see the email attachment)']);
    } finally {
      lock.releaseLock();
    }

    var me = Session.getEffectiveUser().getEmail();
    var safe = clean_(d.name).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';
    MailApp.sendEmail({
      to: me,
      replyTo: clean_(d.email) || me,
      subject: 'Renewal answers received: ' + (clean_(d.name) || 'client'),
      body: String(d.summary || '') + '\n\nThe full answers are attached. In the Renewals Register choose Import client response, then Choose file, and select the attachment.',
      attachments: [Utilities.newBlob(String(d.code), 'text/plain', 'renewal-' + safe + '.txt')]
    });

    if (SEND_RECEIPT_TO_CLIENT && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean_(d.email))) {
      MailApp.sendEmail({
        to: clean_(d.email),
        subject: 'We have your renewal information',
        body: 'Thank you. We have received your renewal information and ' + BROKER_NAME + ' will be in touch.\n\nIf you need to add anything, just reply to this email.',
        replyTo: me,
        name: BROKER_NAME
      });
    }
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: 'server' });
  }
}

function doGet() {
  return out_({ ok: true, service: 'renewal portal receiver' });
}

function clean_(s) { return String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').slice(0, 200).trim(); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
