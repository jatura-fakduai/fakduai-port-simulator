const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.resolve(__dirname, '../google-apps-script/Code.gs'), 'utf8');
const ids = ['workshop-copy-new-123456789', 'another-workshop-copy-123456789'];
let owner = 'owner@example.test', effective = owner, mime = 'application/vnd.google-apps.spreadsheet';
let missingTab = '', missingHeader = '', opens = 0, inaccessible = false;
const headers = {
  Shipments: ['Shipment ID','Direction','Status','Current Location','Current Step','Updated At'],
  Documents: ['Document ID','Shipment ID','Document Type','Status'],
  Events: ['Event ID','Shipment ID','Event Type','Event Status','Animation','Processed At'],
};
const sheets = name => missingTab === name ? null : {
  getLastRow: () => 1,
  getDataRange: () => ({getValues: () => [headers[name].filter(header => header !== missingHeader)], getDisplayValues: () => [headers[name]]}),
};
const context = {
  DriveApp: {getFileById: () => {
    if (inaccessible) throw new Error('Drive access denied');
    return {getMimeType: () => mime, getOwner: () => owner === null ? null : {getEmail: () => owner}};
  }},
  Session: {getEffectiveUser: () => ({getEmail: () => effective})},
  SpreadsheetApp: {openById: id => {opens++; return {getId: () => id, getSheetByName: sheets};}},
  LockService: {getScriptLock: () => ({waitLock: () => {}, hasLock: () => false})},
  ContentService: {createTextOutput: text => ({setMimeType: () => JSON.parse(text)}), MimeType: {JSON: 'json'}},
};
vm.createContext(context);vm.runInContext(source, context);
for (const id of ids) {
  const snapshot = context.doGet({parameter: {sheetId: id}});
  assert.equal(snapshot.ok, true, 'A new owner-held copy works without registering its ID');
  assert.equal(snapshot.eventAckSupported, true);
  assert.equal(snapshot.spreadsheetId, id);
  assert.equal(snapshot.version, '1.7.0');
  assert.equal(snapshot.fullReleaseSupported, true);
}
owner = 'OWNER@EXAMPLE.TEST';
assert.equal(context.doGet({parameter: {sheetId: ids[0]}}).ok, true);
owner = ' LOUISZZICO@gmail.com ';
for (const id of ids) {
  for (const action of ['snapshot', 'health', 'shipments', 'documents', 'events']) {
    assert.equal(context.doGet({parameter: {sheetId: id, action}}).ok, true, 'Additional owner can use multiple copies');
  }
  assert.equal(context.openAuthorizedSpreadsheet_(id).getId(), id, 'Shared authorization guard allows the write target');
}
inaccessible = true;
const beforeDenied = opens;
assert.equal(context.doGet({parameter: {sheetId: ids[0]}}).error, 'Drive access denied');
assert.equal(opens, beforeDenied, 'Owner allowlist cannot bypass Drive permissions');
inaccessible = false;
for (const identity of ['other@example.test', '', null]) {
  owner = identity;
  for (const action of ['snapshot', 'health', 'shipments', 'documents', 'events', 'eventstate']) {
    const before = opens;
    assert.equal(context.doGet({parameter: {sheetId: ids[0], action}}).ok, false);
    assert.equal(opens, before, 'Rejected ownership must not read a spreadsheet');
  }
  const before = opens;
  assert.equal(context.doPost({postData: {contents: JSON.stringify({action: 'eventAck', sheetId: ids[0], eventId: 'EVT-1', claimId: 'claim-browser-12345678', status: 'PROCESSING'})}}).ok, false);
  assert.equal(opens, before, 'Rejected ownership must not access the write target');
}
owner = 'louiszzico@gmail.com';effective = '';
assert.equal(context.doGet({parameter: {sheetId: ids[0]}}).ok, false);
effective = owner;mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
assert.equal(context.doGet({parameter: {sheetId: ids[0]}}).ok, false);
mime = 'application/vnd.google-apps.spreadsheet';
for (const name of Object.keys(headers)) {missingTab = name;assert.equal(context.doGet({parameter: {sheetId: ids[0]}}).ok, false);}
missingTab = '';missingHeader = 'Animation';
assert.equal(context.doGet({parameter: {sheetId: ids[0]}}).ok, false);
assert.equal(context.doGet({parameter: {sheetId: '../bad-id'}}).ok, false);
console.log('Sheet authorization checks passed: new copies, all read actions, writes, other owners, unavailable identity, file type and template validation.');
