const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const sheetId = '1ivkb_0aKUvLsaBgKaeEaRwURQbxG-cxBL0J0krG5PFE';
const rows = [['Event ID', 'Event Status', 'Processed At', 'Shipment ID', 'Event Type', 'Animation'], ['TEST-1', 'PENDING', '', 'IMP-003', 'CUSTOMS_RELEASE', 'AGV_TO_GATE_OUT'], ['BLOCKED', 'WAITING_DOCUMENT', '', 'IMP-003', 'CUSTOMS_RELEASE', 'AGV_TO_GATE_OUT']];
const shipmentRows = [['Shipment ID','Direction','Status','Current Location','Current Step','Updated At','Sync Version'], ['IMP-003','IMPORT','CUSTOMS_HOLD','Customs Area',6,'',4]];
const properties = new Map();
let locked = false;
const sheet = {
  getDataRange: () => ({ getValues: () => rows }),
  getRange: (row, column) => ({ setValue: value => { rows[row - 1][column - 1] = value; } }),
};
let failMarker = false;
const shipmentSheet = {
  getDataRange: () => ({ getValues: () => shipmentRows }),
  getRange: (row, column) => ({ setValue: value => {
    if (column === 6 && failMarker) { failMarker = false; throw new Error('Simulated interrupted shipment write'); }
    shipmentRows[row - 1][column - 1] = value;
  } }),
};
const context = {
  Date,
  DriveApp: {getFileById: id => ({getMimeType: () => 'application/vnd.google-apps.spreadsheet', getOwner: () => ({getEmail: () => id === sheetId ? 'owner@example.test' : 'other@example.test'})})},
  Session: {getEffectiveUser: () => ({getEmail: () => 'owner@example.test'})},
  SpreadsheetApp: { openById: () => ({ getId: () => sheetId, getSheetByName: name => name === 'Events' ? sheet : name === 'Documents' ? {getDataRange: () => ({getValues: () => [['Document ID','Shipment ID','Document Type','Status']]})} : shipmentSheet }), flush: () => {} },
  LockService: { getScriptLock: () => ({ waitLock: () => { locked = true; }, hasLock: () => locked, releaseLock: () => { locked = false; } }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties.get(key), setProperty: (key, value) => properties.set(key, value) }) },
  Utilities: { formatDate: value => value.toISOString() },
  ContentService: { createTextOutput: value => ({ setMimeType: () => JSON.parse(value) }), MimeType: { JSON: 'json' } },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../google-apps-script/Code.gs'), 'utf8'), context);
const claimId = 'claim-browser-one-123456';
const post = (status, options = {}) => context.doPost({ postData: { contents: JSON.stringify({ action: 'eventAck', sheetId, eventId: 'TEST-1', claimId, status, ...options }) } });

assert.equal(post('COMPLETED').ok, false, 'Cannot complete an unclaimed event');
assert.equal(post('PROCESSING').ok, true);
assert.equal(rows[1][1], 'PROCESSING');
assert.equal(post('PROCESSING', { claimId: 'claim-other-browser-12345' }).ok, false, 'Second browser cannot claim a running event');
assert.equal(post('COMPLETED', { claimId: 'claim-other-browser-12345' }).ok, false);
assert.equal(post('PROCESSING').ok, true, 'Retrying the same claim is idempotent');
assert.equal(post('COMPLETED').ok, true);
assert.equal(rows[1][1], 'COMPLETED');
assert.ok(rows[1][2] instanceof Date);
assert.equal(shipmentRows[1][2], 'RELEASED');
assert.equal(shipmentRows[1][3], 'Gate-out Staging');
assert.equal(shipmentRows[1][4], 7);
assert.equal(shipmentRows[1][5].getTime(), rows[1][2].getTime());
assert.equal(shipmentRows[1][6], 5);
const timestamp = rows[1][2];
assert.equal(post('COMPLETED').ok, true);
assert.equal(rows[1][2], timestamp, 'Retry must not change the completion time');
assert.equal(shipmentRows[1][6], 5, 'Retry must not increment Sync Version');
assert.equal(post('PROCESSING', { eventId: 'BLOCKED' }).ok, false);
assert.equal(post('PROCESSING', { sheetId: 'unknown-sheet-id-12345678' }).ok, false);
assert.equal(post('PROCESSING', { eventId: 'NOT-FOUND' }).ok, false);
const result = context.doGet({ parameter: { action: 'eventstate', sheetId, eventId: 'TEST-1', claimId } });
assert.equal(result.eventStatus, 'COMPLETED');
assert.equal(result.owned, true);
assert.equal(result.shipmentSynced, true);

// Reconcile an already completed legacy event without replaying or rewriting its time.
shipmentRows[1][2] = 'CUSTOMS_HOLD'; shipmentRows[1][5] = '';
assert.equal(post('COMPLETED').ok, true);
assert.equal(shipmentRows[1][2], 'RELEASED');
assert.equal(shipmentRows[1][6], 5);
// A late acknowledgement of an older event cannot move the Shipment backwards.
rows.push(['OLDER','COMPLETED',new Date('2000-01-01T00:00:00Z'),'IMP-003','CUSTOMS_TRANSFER']);
assert.equal(post('COMPLETED', {eventId:'OLDER'}).ok, true);
assert.equal(shipmentRows[1][2], 'RELEASED');
// Interrupted projection: retry uses the same completion time and version.
rows.push(['RETRY','PENDING','','IMP-003','CUSTOMS_RELEASE']);
shipmentRows[1][5] = '';
assert.equal(post('PROCESSING', {eventId:'RETRY'}).ok, true);
failMarker = true;
assert.equal(post('COMPLETED', {eventId:'RETRY'}).ok, false);
assert.equal(rows[4][1], 'PROCESSING');
const retryTime = rows[4][2];
assert.equal(post('COMPLETED', {eventId:'RETRY'}).ok, true);
assert.equal(rows[4][2], retryTime);
assert.equal(shipmentRows[1][6], 6);
// Direction mismatches fail without marking an event complete.
rows.push(['WRONG-DIRECTION','PENDING','','IMP-003','EXPORT_LOAD']);
assert.equal(post('PROCESSING', {eventId:'WRONG-DIRECTION'}).ok, false);
assert.equal(post('COMPLETED', {eventId:'WRONG-DIRECTION'}).ok, false);
assert.equal(rows[5][1], 'WAITING_DOCUMENT');
assert.equal(locked, false);
// A new full-release event completes both transport stages in one final result.
rows.push(['FULL-RELEASE','PENDING','','IMP-003','CUSTOMS_RELEASE','AGV_AND_TRUCK_GATE_OUT']);
shipmentRows[1][5] = new Date('2001-01-01T00:00:00Z');
assert.equal(post('PROCESSING', {eventId:'FULL-RELEASE'}).ok, true);
assert.equal(post('COMPLETED', {eventId:'FULL-RELEASE'}).ok, true);
assert.equal(shipmentRows[1][2], 'DELIVERED');
assert.equal(shipmentRows[1][3], 'Outside Terminal');
assert.equal(shipmentRows[1][4], 8);
const finalVersion = shipmentRows[1][6];
assert.equal(post('COMPLETED', {eventId:'FULL-RELEASE'}).ok, true);
assert.equal(shipmentRows[1][6], finalVersion);
// Older staging-only events must not regress a completed truck departure.
assert.equal(post('COMPLETED').ok, true);
assert.equal(shipmentRows[1][2], 'DELIVERED');
console.log('Event/Shipment completion tests passed: transitions, ownership, projection, legacy repair, stale events, interrupted-write retries, timestamps and owner authorization.');
