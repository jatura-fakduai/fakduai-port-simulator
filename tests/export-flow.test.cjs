const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sheetId='export-workshop-test-123456789';
const rows=[['Event ID','Event Status','Processed At','Shipment ID','Event Type','Animation']];
const shipmentRows=[['Shipment ID','Direction','Status','Current Location','Current Step','Updated At','Sync Version','Destination Name','Destination Code'],['EXP-004','EXPORT','ACTION_REQUIRED','Export Yard',1,'',0,'Hamburg','HAM']];
const docRows=[['Document ID','Shipment ID','Document Type','Status'],['D-PACK','EXP-004','Packing List','RECEIVED'],['D-EXPORT','EXP-004','Export Declaration','APPROVED']];
const sheets={Events:rows,Shipments:shipmentRows,Documents:docRows},properties=new Map();
let ticks=Date.parse('2026-10-06T12:00:00Z'),locked=false;
class TestDate extends Date {constructor(...args){super(...(args.length?args:[ticks+=1000]))}static now(){return ticks}}
const context={Date:TestDate,
  DriveApp:{getFileById:()=>({getMimeType:()=> 'application/vnd.google-apps.spreadsheet',getOwner:()=>({getEmail:()=> 'owner@example.test'})})},
  Session:{getEffectiveUser:()=>({getEmail:()=> 'owner@example.test'})},
  SpreadsheetApp:{openById:()=>({getId:()=>sheetId,getSheetByName:name=>({getDataRange:()=>({getValues:()=>sheets[name]}),getRange:(row,col)=>({setValue:value=>{sheets[name][row-1][col-1]=value}})})}),flush:()=>{}},
  LockService:{getScriptLock:()=>({waitLock:()=>locked=true,hasLock:()=>locked,releaseLock:()=>locked=false})},
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>properties.get(key),setProperty:(key,value)=>properties.set(key,value)})},
  ContentService:{createTextOutput:text=>({setMimeType:()=>JSON.parse(text)}),MimeType:{JSON:'json'}},
};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../google-apps-script/Code.gs'),'utf8'),context);
const stages=[
  ['EXPORT_GATE_IN','TRUCK_GATE_IN','YARD_RECEIVED','Export Gate-in',2],
  ['EXPORT_YARD_TRANSFER','AGV_TO_QUAY','READY_TO_LOAD','Vessel Loading Lane',3],
  ['EXPORT_LOAD','CRANE_TO_VESSEL','LOADED','On board vessel',4],
  ['EXPORT_DEPARTURE','EXPORT_SEA_ROUTE','IN_TRANSIT','International waters',4],
  ['EXPORT_ARRIVAL','EXPORT_VESSEL_ARRIVAL','ARRIVED','Hamburg (HAM)',5],
];
// Waiting jobs only resume when their own shipment's exact requirement is ready.
rows.push(['WAIT-PACK','WAITING_DOCUMENT','','EXP-004','EXPORT_YARD_TRANSFER','AGV_TO_QUAY']);
docRows[1][3]='PENDING';
const resume=()=>context.doPost({postData:{contents:JSON.stringify({action:'resumeWaitingEvents',sheetId})}});
assert.equal(resume().resumed,0);
assert.equal(rows[1][1],'WAITING_DOCUMENT');
docRows[1][3]='RECEIVED';
assert.equal(resume().resumed,1);
assert.equal(rows[1][1],'PENDING');
assert.equal(resume().resumed,0,'Repeated polling does not duplicate a job');
rows.push(['BLOCK-LOAD','PENDING','','EXP-004','EXPORT_LOAD','CRANE_TO_VESSEL']);
docRows[2][3]='RECEIVED';
const blocked=context.doPost({postData:{contents:JSON.stringify({action:'eventAck',sheetId,eventId:'BLOCK-LOAD',claimId:'export-test-claim-12345678',status:'PROCESSING'})}});
assert.equal(blocked.ok,false,'Received is not Approved for the declaration');
assert.equal(rows.at(-1)[1],'WAITING_DOCUMENT');
assert.equal(resume().resumed,0);
docRows[2][3]='APPROVED';
assert.equal(resume().resumed,1);
for(const [type,animation,status,location,step] of stages){
  const id='TEST-'+type;rows.push([id,'PENDING','','EXP-004',type,animation]);
  const post=state=>context.doPost({postData:{contents:JSON.stringify({action:'eventAck',sheetId,eventId:id,claimId:'export-test-claim-12345678',status:state})}});
  assert.equal(post('PROCESSING').ok,true,type);assert.equal(post('COMPLETED').ok,true,type);
  assert.equal(shipmentRows[1][2],status);assert.equal(shipmentRows[1][3],location);assert.equal(shipmentRows[1][4],step);
  assert.equal(rows.at(-1)[1],'COMPLETED');assert.ok(rows.at(-1)[2] instanceof TestDate);
  const version=shipmentRows[1][6];assert.equal(post('COMPLETED').ok,true);assert.equal(shipmentRows[1][6],version,'No duplicate completion');
}
assert.equal(shipmentRows[1][6],5);assert.equal(locked,false);
// Completed arrival is idempotent; a different arrival must not restart travel.
rows.push(['DUP-ARRIVAL','PENDING','','EXP-004','EXPORT_ARRIVAL','EXPORT_VESSEL_ARRIVAL']);
assert.equal(context.doPost({postData:{contents:JSON.stringify({action:'eventAck',sheetId,eventId:'DUP-ARRIVAL',claimId:'export-test-claim-12345678',status:'PROCESSING'})}}).ok,false);
assert.equal(rows.at(-1)[1],'PENDING');
const workflow=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../n8n/Fakduai-Freight-Full-Release.json'),'utf8'));
const node=workflow.nodes.find(n=>n.name==='Create Freight Event');
for(const [type,animation] of stages)assert.ok(node.parameters.columns.value.Animation.includes(JSON.stringify(type)+':'+JSON.stringify(animation)));
const prompt=workflow.nodes.find(n=>n.name==='Freight AI Agent').parameters.options.systemMessage;
assert.match(prompt,/EXPORT_LOAD:.*Export Declaration/);assert.match(prompt,/EXPORT_YARD_TRANSFER:.*Packing List/);
console.log('Export checks passed: four Apps Script transitions, completion timestamps, idempotent retries and generated n8n tool mappings. AI execution and live Google credentials are not tested.');
