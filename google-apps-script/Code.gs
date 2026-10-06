const CONFIG = Object.freeze({
  spreadsheetId: '1ivkb_0aKUvLsaBgKaeEaRwURQbxG-cxBL0J0krG5PFE',
  // Any compatible workshop sheet OWNED by the deployment account is supported.
  // Sharing a sheet with that account is not sufficient; no per-file allowlist.
  sheets: Object.freeze({
    shipments: 'Shipments',
    documents: 'Documents',
    events: 'Events',
  }),
  version: '1.7.0',
});

const EVENT_RESULTS = Object.freeze({
  VESSEL_DEPARTURE: { direction: 'IMPORT', status: 'IN_TRANSIT', location: 'South China Sea', step: 3 },
  TRANSSHIPMENT: { direction: 'IMPORT', status: 'TRANSSHIPMENT', location: 'Singapore Port', step: 4 },
  PORT_ARRIVAL: { direction: 'IMPORT', status: 'ARRIVED', location: 'Laem Chabang Berth 01', step: 5 },
  DISCHARGE: { direction: 'IMPORT', status: 'DISCHARGED', location: 'Quay Transfer Area', step: 5 },
  CUSTOMS_TRANSFER: { direction: 'IMPORT', status: 'CUSTOMS_HOLD', location: 'Customs Area', step: 6 },
  CUSTOMS_RELEASE: { direction: 'IMPORT', status: 'DELIVERED', location: 'Outside Terminal', step: 8 },
  GATE_OUT: { direction: 'IMPORT', status: 'DELIVERED', location: 'Outside Terminal', step: 8 },
  EXPORT_GATE_IN: { direction: 'EXPORT', status: 'YARD_RECEIVED', location: 'Export Gate-in', step: 2 },
  EXPORT_YARD_TRANSFER: { direction: 'EXPORT', status: 'READY_TO_LOAD', location: 'Vessel Loading Lane', step: 3 },
  EXPORT_LOAD: { direction: 'EXPORT', status: 'LOADED', location: 'On board vessel', step: 4 },
  EXPORT_DEPARTURE: { direction: 'EXPORT', status: 'IN_TRANSIT', location: 'International waters', step: 4 },
  EXPORT_ARRIVAL: { direction: 'EXPORT', status: 'ARRIVED', location: 'Destination port', step: 5 },
});

/**
 * n8n reads Sheets, updates documents and creates Events. The simulator
 * acknowledges Events; completion updates Shipments in the same request.
 *
 * Examples:
 *   ?action=health
 *   ?action=snapshot
 *   ?action=shipments
 *   ?action=documents&shipmentId=IMP-003
 *   ?action=events&shipmentId=IMP-003
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = String(params.action || 'snapshot').toLowerCase();
    const shipmentId = String(params.shipmentId || '').trim();
    const spreadsheetId = String(params.sheetId || CONFIG.spreadsheetId).trim();
    const spreadsheet = openAuthorizedSpreadsheet_(spreadsheetId);

    if (action === 'eventstate') {
      const event = findEvent_(spreadsheet, params.eventId);
      const claim = readClaim_(spreadsheetId, params.eventId);
      return json_({ ok: true, spreadsheetId: spreadsheetId,
        eventId: String(params.eventId || ''), eventStatus: event.status,
        processedAt: serialize_(event.values[event.processedColumn]),
        shipmentSynced: event.status === 'COMPLETED' && shipmentResultCurrent_(spreadsheet, event),
        owned: !!claim && claim.id === String(params.claimId || ''),
      });
    }

    if (action === 'health') {
      return json_({
        ok: true,
        service: 'fakduai-freight-sheet-api',
        version: CONFIG.version,
        serverTime: new Date(),
        spreadsheetId: spreadsheet.getId(),
        sheets: sheetCounts_(spreadsheet),
      });
    }

    if (action === 'shipments') {
      return json_({ ok: true, spreadsheetId: spreadsheet.getId(), shipments: filterByShipment_(readSheet_(CONFIG.sheets.shipments, spreadsheet), shipmentId) });
    }

    if (action === 'documents') {
      return json_({ ok: true, spreadsheetId: spreadsheet.getId(), documents: filterByShipment_(readSheet_(CONFIG.sheets.documents, spreadsheet), shipmentId) });
    }

    if (action === 'events') {
      const events = filterByShipment_(readSheet_(CONFIG.sheets.events, spreadsheet), shipmentId);
      events.sort((a, b) => String(a.Timestamp || '').localeCompare(String(b.Timestamp || '')));
      return json_({ ok: true, spreadsheetId: spreadsheet.getId(), events: events });
    }

    if (action !== 'snapshot') {
      return json_({ ok: false, error: 'Unknown action: ' + action });
    }

    return json_({
      ok: true,
      version: CONFIG.version,
      eventAckSupported: true,
      shipmentCompletionSupported: true,
      fullReleaseSupported: true,
      documentQueueSupported: true,
      exportArrivalSupported: true,
      spreadsheetId: spreadsheet.getId(),
      serverTime: new Date(),
      shipments: filterByShipment_(readSheet_(CONFIG.sheets.shipments, spreadsheet), shipmentId),
      documents: filterByShipment_(readSheet_(CONFIG.sheets.documents, spreadsheet), shipmentId),
      events: filterByShipment_(readSheet_(CONFIG.sheets.events, spreadsheet), shipmentId),
    });
  } catch (error) {
    return json_({
      ok: false,
      error: error && error.message ? error.message : String(error),
    });
  }
}

// Event acknowledgements also project the fixed result onto the matching Shipment.
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const params = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (params.action === 'resumeWaitingEvents') {
      lock.waitLock(10000);
      const spreadsheet = openAuthorizedSpreadsheet_(String(params.sheetId || '').trim());
      const resumed = resumeWaitingEvents_(spreadsheet);
      SpreadsheetApp.flush();
      return json_({ ok: true, resumed: resumed });
    }
    if (params.action !== 'eventAck') throw new Error('Unknown write action');
    const sheetId = String(params.sheetId || '').trim();
    const eventId = String(params.eventId || '').trim();
    const claimId = String(params.claimId || '').trim();
    const status = String(params.status || '').toUpperCase();
    if (!eventId || !/^[\w-]{16,100}$/.test(claimId)) throw new Error('Invalid event acknowledgement');
    if (status !== 'PROCESSING' && status !== 'COMPLETED') throw new Error('Invalid status');
    lock.waitLock(10000);
    const spreadsheet = openAuthorizedSpreadsheet_(sheetId);
    const event = findEvent_(spreadsheet, eventId);
    const claim = readClaim_(sheetId, eventId);
    const own = claim && claim.id === claimId;
    if (event.status === 'COMPLETED') {
      if (status === 'COMPLETED') applyShipmentResult_(spreadsheet, event);
      SpreadsheetApp.flush();
      return json_({ ok: true, eventStatus: 'COMPLETED' });
    }
    if (status === 'PROCESSING') {
      if (event.status !== 'PENDING' && event.status !== 'PROCESSING') throw new Error('Event is not ready');
      const typeColumn = event.sheet.getDataRange().getValues()[0].indexOf('Event Type');
      if (String(event.values[typeColumn]) === 'EXPORT_ARRIVAL') {
        const target = shipmentResult_(spreadsheet, event);
        if (String(target.values[target.columns.Status]).toUpperCase() !== 'IN_TRANSIT') throw new Error('Export arrival requires IN_TRANSIT');
      }
      if (event.status === 'PROCESSING' && claim && !own && claim.expires > Date.now()) throw new Error('Event is running in another browser');
      if (!exportDocumentsReady_(spreadsheet, event)) {
        event.sheet.getRange(event.row, event.statusColumn + 1).setValue('WAITING_DOCUMENT');
        SpreadsheetApp.flush();
        throw new Error('Required export documents are not ready');
      }
      PropertiesService.getScriptProperties().setProperty(claimKey_(sheetId, eventId), JSON.stringify({ id: claimId, expires: Date.now() + 120000 }));
      event.sheet.getRange(event.row, event.statusColumn + 1).setValue('PROCESSING');
    } else {
      if (event.status !== 'PROCESSING' || !own) throw new Error('Event claim does not match');
      // Save a stable completion time before projection so retries are idempotent.
      let completedAt = event.values[event.processedColumn];
      if (!Number.isFinite(timeValue_(completedAt))) {
        completedAt = new Date();
        event.sheet.getRange(event.row, event.processedColumn + 1).setValue(completedAt);
        event.values[event.processedColumn] = completedAt;
      }
      applyShipmentResult_(spreadsheet, event);
      event.sheet.getRange(event.row, event.statusColumn + 1).setValue('COMPLETED');
    }
    SpreadsheetApp.flush();
    return json_({ ok: true, eventStatus: status });
  } catch (error) {
    return json_({ ok: false, error: error.message || String(error) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// Re-check waiting jobs when the simulator polls. No onEdit trigger is required:
// n8n writes via the Sheets API, which does not invoke spreadsheet onEdit.
function exportDocumentsReady_(spreadsheet, event) {
  const headers = event.sheet.getDataRange().getValues()[0].map(String);
  const type = String(event.values[headers.indexOf('Event Type')] || '').trim().toUpperCase();
  const required = { EXPORT_YARD_TRANSFER: ['Packing List'], EXPORT_LOAD: ['Export Declaration'] }[type];
  if (!required) return true;
  const shipmentId = String(event.values[headers.indexOf('Shipment ID')] || '').trim();
  const rows = spreadsheet.getSheetByName(CONFIG.sheets.documents).getDataRange().getValues();
  const columns = rows[0].map(value => String(value).trim());
  const docs = rows.slice(1).map(row => Object.fromEntries(columns.map((name, i) => [name, row[i]])));
  return required.every(name => docs.some(doc =>
    String(doc['Shipment ID']).trim() === shipmentId &&
    String(doc['Document Type']).trim() === name &&
    (name === 'Export Declaration' ? String(doc.Status).toUpperCase() === 'APPROVED' :
      ['RECEIVED', 'APPROVED'].includes(String(doc.Status).toUpperCase()))));
}

function resumeWaitingEvents_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(CONFIG.sheets.events);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(value => String(value).trim());
  const statusColumn = headers.indexOf('Event Status');
  let resumed = 0;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][statusColumn]).toUpperCase() !== 'WAITING_DOCUMENT') continue;
    const type = String(values[i][headers.indexOf('Event Type')] || '').toUpperCase();
    // Only jobs with explicit requirements may be automatically unblocked.
    if (!['EXPORT_YARD_TRANSFER', 'EXPORT_LOAD'].includes(type)) continue;
    if (exportDocumentsReady_(spreadsheet, {sheet: sheet, values: values[i]})) {
      sheet.getRange(i + 1, statusColumn + 1).setValue('PENDING');
      resumed++;
    }
  }
  return resumed;
}

function timeValue_(value) {
  if (value === '' || value === null || value === undefined) return NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return Math.round((value - 25569) * 86400000) - 7 * 3600000;
  return /^\d{4}-\d{2}-\d{2}T/.test(String(value)) ? Date.parse(value) : NaN;
}
function shipmentResult_(spreadsheet, event) {
  const eventHeaders = event.sheet.getDataRange().getValues()[0].map(value => String(value).trim());
  const shipmentId = String(event.values[eventHeaders.indexOf('Shipment ID')] || '').trim();
  const type = String(event.values[eventHeaders.indexOf('Event Type')] || '').trim().toUpperCase();
  let result = EVENT_RESULTS[type];
  // Existing release-only events must not be reinterpreted as truck departures.
  if (type === 'CUSTOMS_RELEASE') {
    const animation = String(event.values[eventHeaders.indexOf('Animation')] || '').trim().toUpperCase();
    if (animation !== 'AGV_AND_TRUCK_GATE_OUT') {
      result = { direction: 'IMPORT', status: 'RELEASED', location: 'Gate-out Staging', step: 7 };
    }
  }
  if (!shipmentId || !result) throw new Error('Unknown Shipment or Event Type');
  const sheet = spreadsheet.getSheetByName(CONFIG.sheets.shipments);
  if (!sheet) throw new Error('Shipments sheet not found');
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(value => String(value).trim());
  const columns = {};
  ['Shipment ID', 'Direction', 'Status', 'Current Location', 'Current Step', 'Updated At', 'Sync Version'].forEach(name => {
    columns[name] = headers.indexOf(name);
    if (columns[name] < 0) throw new Error('Missing Shipments column: ' + name);
  });
  const matches = [];
  for (let i = 1; i < values.length; i++) if (String(values[i][columns['Shipment ID']]).trim() === shipmentId) matches.push(i);
  if (matches.length !== 1) throw new Error('Shipment ID must exist and be unique');
  const row = matches[0];
  if (String(values[row][columns.Direction]).trim().toUpperCase() !== result.direction) throw new Error('Event direction does not match Shipment');
  if (type === 'EXPORT_ARRIVAL') {
    const name = String(values[row][headers.indexOf('Destination Name')] || '').trim();
    const code = String(values[row][headers.indexOf('Destination Code')] || '').trim();
    if (!name && !code) throw new Error('Shipment destination is missing');
    result = Object.assign({}, result, { location: name && code ? name + ' (' + code + ')' : name || code });
  }
  return { sheet: sheet, row: row + 1, values: values[row], columns: columns, result: result, eventId: String(event.values[eventHeaders.indexOf('Event ID')]), completedAt: timeValue_(event.values[event.processedColumn]) };
}
function shipmentResultCurrent_(spreadsheet, event) {
  const target = shipmentResult_(spreadsheet, event);
  return Number.isFinite(target.completedAt) && timeValue_(target.values[target.columns['Updated At']]) >= target.completedAt;
}
function applyShipmentResult_(spreadsheet, event) {
  const target = shipmentResult_(spreadsheet, event);
  if (!Number.isFinite(target.completedAt)) throw new Error('Completed event has no Processed At');
  // A later result takes precedence over retries of an older event.
  if (timeValue_(target.values[target.columns['Updated At']]) >= target.completedAt) return;
  const changes = {
    Status: target.result.status,
    'Current Location': target.result.location,
    'Current Step': target.result.step,
  };
  const properties = PropertiesService.getScriptProperties();
  const versionKey = 'freight-result-version:' + spreadsheet.getId() + ':' + target.eventId;
  let version = Number(properties.getProperty(versionKey));
  if (!version) {
    version = (Number(target.values[target.columns['Sync Version']]) || 0) + 1;
    properties.setProperty(versionKey, String(version));
  }
  changes['Sync Version'] = version;
  Object.keys(changes).forEach(name => target.sheet.getRange(target.row, target.columns[name] + 1).setValue(changes[name]));
  // Commit marker last: interrupted projection can safely be retried.
  target.sheet.getRange(target.row, target.columns['Updated At'] + 1).setValue(new Date(target.completedAt));
}

function claimKey_(sheetId, eventId) { return 'freight-claim:' + sheetId + ':' + eventId; }
function readClaim_(sheetId, eventId) {
  const raw = PropertiesService.getScriptProperties().getProperty(claimKey_(sheetId, eventId));
  return raw ? JSON.parse(raw) : null;
}
function findEvent_(spreadsheet, eventId) {
  const sheet = spreadsheet.getSheetByName(CONFIG.sheets.events);
  if (!sheet) throw new Error('Events sheet not found');
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(value => String(value).trim());
  const idColumn = headers.indexOf('Event ID'), statusColumn = headers.indexOf('Event Status'), processedColumn = headers.indexOf('Processed At');
  if (idColumn < 0 || statusColumn < 0 || processedColumn < 0) throw new Error('Events columns do not match the template');
  const matches = [];
  for (let i = 1; i < values.length; i++) if (String(values[i][idColumn]).trim() === String(eventId || '').trim()) matches.push(i);
  if (matches.length !== 1) throw new Error('Event ID must exist and be unique');
  const index = matches[0];
  return { sheet: sheet, row: index + 1, values: values[index], statusColumn: statusColumn, processedColumn: processedColumn, status: String(values[index][statusColumn]).trim().toUpperCase() };
}

// Fail closed: never allow missing identity, shared-drive ownership or another owner.
// Apply the same check to reads and writes, not only event acknowledgements.
function openAuthorizedSpreadsheet_(sheetId) {
  const id = String(sheetId || '').trim();
  if (!/^[\w-]{20,}$/.test(id)) throw new Error('Invalid Sheet ID');
  const file = DriveApp.getFileById(id);
  if (file.getMimeType() !== 'application/vnd.google-apps.spreadsheet') {
    throw new Error('ไฟล์นี้ต้องเป็น Google Sheets ไม่ใช่ Excel หรือไฟล์ประเภทอื่น');
  }
  const owner = file.getOwner();
  const ownerEmail = owner ? String(owner.getEmail() || '').trim().toLowerCase() : '';
  const effectiveEmail = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  if (!ownerEmail || !effectiveEmail) {
    throw new Error('ตรวจสอบเจ้าของชีทไม่ได้ ใช้ชีทใน My Drive และ Deploy แบบ Execute as Me');
  }
  if (ownerEmail !== effectiveEmail) {
    throw new Error('ชีทนี้ต้องเป็นของบัญชีที่ Deploy ระบบกลาง ให้บัญชีนั้น Make a copy แล้วใช้ลิงก์สำเนา');
  }
  const spreadsheet = SpreadsheetApp.openById(id);
  validateWorkshopStructure_(spreadsheet);
  return spreadsheet;
}

function validateWorkshopStructure_(spreadsheet) {
  const required = {
    Shipments: ['Shipment ID', 'Direction', 'Status', 'Current Location', 'Current Step', 'Updated At'],
    Documents: ['Document ID', 'Shipment ID', 'Document Type', 'Status'],
    Events: ['Event ID', 'Shipment ID', 'Event Type', 'Event Status', 'Animation', 'Processed At'],
  };
  Object.keys(required).forEach(name => {
    const sheet = spreadsheet.getSheetByName(name);
    if (!sheet) throw new Error('ไม่พบแท็บ ' + name + ' กรุณาใช้ Freight Workshop Template');
    const values = sheet.getDataRange().getValues();
    const headers = (values[0] || []).map(value => String(value).trim());
    const missing = required[name].filter(header => headers.indexOf(header) === -1);
    if (missing.length) throw new Error(name + ' ขาดคอลัมน์: ' + missing.join(', '));
  });
}

// Run once in the editor after replacing Code.gs to approve the new Drive scope.
function authorizeFreightApi() {
  const spreadsheet = openAuthorizedSpreadsheet_(CONFIG.spreadsheetId);
  return 'Freight API ' + CONFIG.version + ' ready: ' + spreadsheet.getName();
}

function readSheet_(sheetName, spreadsheet) {
  spreadsheet = spreadsheet || openAuthorizedSpreadsheet_(CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  const range = sheet.getDataRange();
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  if (values.length < 2) return [];

  const headers = values[0].map(header => String(header).trim());

  return values.slice(1)
    .map((row, rowIndex) => {
      if (!row.some((value, columnIndex) => value !== '' || displayValues[rowIndex + 1][columnIndex] !== '')) return null;
      const record = {};
      headers.forEach((header, index) => {
        const rawValue = row[index];
        const displayValue = displayValues[rowIndex + 1][index];
        record[header] = rawValue === '' && displayValue !== '' ? displayValue : serialize_(rawValue);
      });
      return record;
    }).filter(record => record !== null);
}

function filterByShipment_(records, shipmentId) {
  if (!shipmentId) return records;
  return records.filter(record => String(record['Shipment ID'] || '') === shipmentId);
}

function sheetCounts_(spreadsheet) {
  spreadsheet = spreadsheet || openAuthorizedSpreadsheet_(CONFIG.spreadsheetId);
  const result = {};

  Object.keys(CONFIG.sheets).forEach(key => {
    const sheetName = CONFIG.sheets[key];
    const sheet = spreadsheet.getSheetByName(sheetName);
    result[key] = sheet ? Math.max(0, sheet.getLastRow() - 1) : null;
  });

  return result;
}

function serialize_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Bangkok', "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return value;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run this once in the editor to verify access before deployment. */
function testSnapshot() {
  const result = {
    shipments: readSheet_(CONFIG.sheets.shipments).length,
    documents: readSheet_(CONFIG.sheets.documents).length,
    events: readSheet_(CONFIG.sheets.events).length,
  };
  console.log(JSON.stringify(result));
  return result;
}
