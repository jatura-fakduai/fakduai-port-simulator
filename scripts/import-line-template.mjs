import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=process.argv[2];
if(!input)throw new Error('Usage: node scripts/import-line-template.mjs <LINE workflow.json>');
const w=JSON.parse(fs.readFileSync(input,'utf8'));
w.name='Fakduai Lab - Port & Freight Assistant - LINE';
w.active=false;w.settings={...(w.settings||{}),timezone:'Asia/Bangkok'};
for(const field of ['id','versionId','meta','pinData','tags','nodeGroups'])delete w[field];
w.nodes=w.nodes.filter(n=>n.name!=='Workshop Settings1');
for(const n of w.nodes){
  delete n.credentials;delete n.webhookId;
  if(n.name==='Workshop Settings')n.parameters.assignments.assignments.find(a=>a.name==='sheetId').value='YOUR_GOOGLE_SHEET_ID';
  if(n.name==='LINE Webhook')n.parameters.path='port-line-webhook';
  if(n.name==='Split Events')n.parameters.fieldToSplitOut='body.events';
  if(n.name==='Conversation Memory')n.parameters={sessionIdType:'customKey',sessionKey:"={{ $('Workshop Settings').first().json.sheetId + ':' + ($('Filter Text Messages').item.json.source.groupId || $('Filter Text Messages').item.json.source.roomId || 'direct') + ':' + ($('Filter Text Messages').item.json.source.userId || $('Filter Text Messages').item.json.message.id) }}",contextWindowLength:12};
  if(n.name==='Freight AI Agent')n.parameters.options.systemMessage+='\nรูปแบบคำตอบใน LINE: ใช้ข้อความธรรมดา ไม่ใช้ Markdown ตาราง ตัวหนา หรือ code fence; ตอบสั้น อ่านง่าย และคงรหัส Shipment/Event/Status ตามระบบ';
  if(n.name==='Setup Note')n.parameters.content='## Port & Freight LINE Workshop\n1. ตั้ง sheetId ที่ Workshop Settings ที่เดียว\n2. เลือก OpenAI + Google Sheets Credentials\n3. Reply to LINE: Header Auth Authorization = Bearer <channel access token>\n4. LINE Webhook: ตั้ง path ไม่ซ้ำ แล้วใช้ Production URL\n5. Code.gs 1.7 + Simulator Auto Sync\nImport จบ DELIVERED / Export จบ ARRIVED\nใช้ข้อมูลจำลองเท่านั้น: template ไม่ได้ตรวจ LINE webhook signature';
}
delete w.connections['Workshop Settings1'];
w.connections['LINE Webhook']={main:[[{node:'Split Events',type:'main',index:0}]]};
const json=JSON.stringify(w,null,2)+'\n';
fs.writeFileSync(path.join(root,'n8n/Fakduai-Freight-Full-Release.json'),json);
fs.writeFileSync(path.join(root,'n8n/Freight-System-Prompt.txt'),w.nodes.find(n=>n.name==='Freight AI Agent').parameters.options.systemMessage+'\n');
console.log('Imported LINE template: one Sheet configuration; credential references removed.');
