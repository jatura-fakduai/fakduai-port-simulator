export const eventRules = {
  VESSEL_DEPARTURE: { direction:'IMPORT', before:['BOOKED'], status:'IN_TRANSIT', location:'South China Sea', step:3, animation:'SEA_ROUTE', words:['ออกเรือ','เรือออก','depart'] },
  TRANSSHIPMENT: { direction:'IMPORT', before:['IN_TRANSIT'], status:'TRANSSHIPMENT', location:'Singapore Port', step:4, animation:'SEA_ROUTE', words:['ถ่ายลำ','transshipment'] },
  PORT_ARRIVAL: { direction:'IMPORT', before:['IN_TRANSIT','TRANSSHIPMENT'], status:'ARRIVED', location:'Laem Chabang Berth 01', step:5, animation:'VESSEL_ARRIVAL', words:['ถึงท่า','เทียบท่า','arrival','arrive'] },
  DISCHARGE: { direction:'IMPORT', before:['ARRIVED'], status:'DISCHARGED', location:'Quay Transfer Area', step:5, animation:'CRANE_TO_AGV', words:['ยกตู้ลง','ขนตู้ลง','discharge'] },
  CUSTOMS_TRANSFER: { direction:'IMPORT', before:['DISCHARGED'], status:'CUSTOMS_HOLD', location:'Customs Area', step:6, animation:'AGV_TO_CUSTOMS', words:['ย้าย','customs transfer'] },
  CUSTOMS_RELEASE: { direction:'IMPORT', before:['CUSTOMS_HOLD'], status:'DELIVERED', location:'Outside Terminal', step:8, animation:'AGV_AND_TRUCK_GATE_OUT', docs:['Certificate of Origin','Import Declaration'], words:['ปล่อยตู้','ปล่อยสินค้า','ผ่านศุลกากร','customs release','release'] },
  GATE_OUT: { direction:'IMPORT', before:['RELEASED'], status:'DELIVERED', location:'Outside Terminal', step:8, animation:'TRUCK_GATE_OUT', words:['รถออก','นำตู้','gate out','gate-out'] },
  EXPORT_GATE_IN: { direction:'EXPORT', before:['BOOKED','DOCUMENTATION','ACTION_REQUIRED'], status:'YARD_RECEIVED', location:'Export Gate-in', step:2, animation:'TRUCK_GATE_IN', words:['รถเข้า','นำตู้','รับตู้','gate in','gate-in'] },
  EXPORT_YARD_TRANSFER: { direction:'EXPORT', before:['YARD_RECEIVED'], status:'READY_TO_LOAD', location:'Vessel Loading Lane', step:3, animation:'AGV_TO_QUAY', docs:['Packing List'], words:['ย้าย','loading yard','quay'] },
  EXPORT_LOAD: { direction:'EXPORT', before:['READY_TO_LOAD','LOADING'], status:'LOADED', location:'On board vessel', step:4, animation:'CRANE_TO_VESSEL', docs:['Export Declaration'], words:['ขึ้นเรือ','โหลด','load'] },
  EXPORT_DEPARTURE: { direction:'EXPORT', before:['LOADED'], status:'IN_TRANSIT', location:'International waters', step:4, animation:'EXPORT_SEA_ROUTE', words:['ออกเรือ','เรือออก','depart'] },
  EXPORT_ARRIVAL: { direction:'EXPORT', before:['IN_TRANSIT'], status:'ARRIVED', location:'Destination port', step:5, animation:'EXPORT_VESSEL_ARRIVAL', words:['ถึงที่หมาย','ถึงปลายทาง','ถึงท่า','เทียบท่า','arrival','arrive'] },
};

export function validateCommand({plan,chat,shipments,documents,events,errors=[],executionId,now}) {
  const reply = output => ({ route:'reply', output });
  if (errors.length) return reply('อ่าน Google Sheet ไม่สำเร็จ: '+errors.join('; ')+' — ตรวจ Credentials และสิทธิ์เข้าถึงชีท');
  if (!plan || typeof plan !== 'object') return reply('AI แปลคำสั่งไม่สำเร็จ กรุณาระบุ Shipment ID และคำสั่งอีกครั้ง');
  if (plan.action === 'lookup') return reply(String(plan.reply || 'กรุณาระบุ Shipment ID ที่ต้องการตรวจสอบ'));
  if (!['document','event'].includes(plan.action)) return reply('รองรับการค้นหา รับ/อนุมัติเอกสาร และสร้าง Event ของ Shipment');
  const id=String(plan.shipmentId||'').trim().toUpperCase(), matches=shipments.filter(s=>String(s['Shipment ID']).trim().toUpperCase()===id);
  if (!id || matches.length!==1) return reply('ไม่พบ Shipment ID ที่ตรงกันเพียงรายการเดียว กรุณาตรวจสอบรหัส');
  if (!String(chat).toUpperCase().includes(id)) return reply('กรุณาระบุ Shipment ID ในข้อความที่จะเปลี่ยนข้อมูล');
  if (!/^ยืนยัน(?:\s|:)/.test(String(chat).trim())) return reply('ยังไม่ได้เปลี่ยนข้อมูล หากต้องการดำเนินการ ให้พิมพ์คำสั่งเต็มขึ้นต้นด้วย “ยืนยัน” เช่น “ยืนยัน ปล่อยตู้ IMP-003”');
  const shipment=matches[0];
  if (plan.action==='document') {
    const docId=String(plan.documentId||'').trim(), docs=documents.filter(d=>String(d['Document ID']).trim()===docId&&String(d['Shipment ID']).trim()===id);
    if(docs.length!==1) return reply('ไม่พบ Document ID ที่ตรงกับ Shipment นี้เพียงรายการเดียว');
    const status=String(plan.documentStatus||'').toUpperCase();
    if(!['RECEIVED','APPROVED'].includes(status)) return reply('รุ่นทดลองนี้รับสถานะเอกสาร RECEIVED หรือ APPROVED เท่านั้น');
    if(!/(รับ|ได้รับ|อนุมัติ|receive|approve|update|อัปเดต)/i.test(chat)) return reply('กรุณาระบุว่ารับหรืออนุมัติเอกสารใด');
    if(status==='APPROVED'&&!/(อนุมัติ|approve)/i.test(chat)) return reply('การอนุมัติเอกสารต้องระบุคำว่า “อนุมัติ” ในคำสั่ง');
    if(String(docs[0].Status).toUpperCase()===status) return reply(`${docId} เป็น ${status} อยู่แล้ว ไม่ได้อัปเดตซ้ำ`);
    return {route:'document',shipmentId:id,documentId:docId,documentType:docs[0]['Document Type'],documentStatus:status,timestamp:now};
  }
  const type=String(plan.eventType||'').toUpperCase(),rule=eventRules[type];
  if(!rule) return reply('ไม่รองรับ Event Type นี้');
  if(!rule.words.some(word=>String(chat).toLowerCase().includes(word))&&!String(chat).toUpperCase().includes(type)) return reply('คำสั่งไม่ตรงกับ Event ที่ AI เสนอ กรุณาระบุ Event Type ให้ชัดเจน');
  if(String(shipment.Direction).toUpperCase()!==rule.direction) return reply('Event นี้ไม่ตรงกับทิศทาง IMPORT/EXPORT ของ Shipment');
  const active=events.find(e=>String(e['Shipment ID']).trim()===id&&['PENDING','PROCESSING'].includes(String(e['Event Status']).trim().toUpperCase()));
  if(active) return reply(`${id} มีงาน ${active['Event ID']} สถานะ ${active['Event Status']} อยู่ รอให้จบก่อนสร้างงานถัดไป`);
  if(events.some(e=>String(e['Shipment ID']).trim()===id&&String(e['Event Type']).toUpperCase()===type&&String(e['Event Status']).toUpperCase()==='COMPLETED')) return reply(`${id} ทำ ${type} จบแล้ว ไม่ได้สร้างงานซ้ำ`);
  if(!rule.before.includes(String(shipment.Status).trim().toUpperCase())) return reply(`${id} อยู่สถานะ ${shipment.Status} แต่ ${type} ต้องเริ่มจาก ${rule.before.join(' / ')} — หาก Event ก่อนหน้าจบแล้ว ให้รอส่วน Completion Sync อัปเดต Shipment`);
  const missing=(rule.docs||[]).filter(name=>!documents.some(d=>String(d['Shipment ID']).trim()===id&&d['Document Type']===name&&['RECEIVED','APPROVED'].includes(String(d.Status).toUpperCase())));
  if(missing.length) return reply(`ยังดำเนินการไม่ได้: ${id} ต้องมีเอกสาร ${missing.join(', ')} สถานะ RECEIVED หรือ APPROVED ก่อน`);
  const eventId=`N8N-${executionId}-${Date.parse(now)}`;
  return {route:'event',shipmentId:id,eventId,eventType:type,event:{'Event ID':eventId,Timestamp:now,'Shipment ID':id,'Event Type':type,'Event Status':'PENDING',Location:rule.location,Animation:rule.animation,Message:`${type} requested for ${id}`,Source:'N8N_CHAT','Processed At':''}};
}

export function sheetTime(value) {
  if(value===null||value===undefined||value==='') return NaN;
  if(typeof value==='number') return Math.round((value-25569)*86400000)-7*3600000;
  // Read nodes request serial dates, so strings here should be ISO timestamps.
  return /^\d{4}-\d{2}-\d{2}T/.test(String(value))?Date.parse(value):NaN;
}

export function completedShipmentUpdates(shipments,events) {
  const latest=new Map();
  for(const e of events){const type=String(e['Event Type']).toUpperCase(),rule=eventRules[type],time=sheetTime(e['Processed At']);
    if(!rule||String(e['Event Status']).toUpperCase()!=='COMPLETED'||!Number.isFinite(time))continue;
    const id=String(e['Shipment ID']).trim(),old=latest.get(id);if(!old||time>old.time)latest.set(id,{e,time,rule});
  }
  const result=[];
  for(const s of shipments){const id=String(s['Shipment ID']).trim(),entry=latest.get(id);if(!entry||entry.rule.direction!==String(s.Direction).toUpperCase())continue;
    if(shipments.filter(row=>String(row['Shipment ID']).trim()===id).length!==1)continue;
    const updated=sheetTime(s['Updated At']);if(Number.isFinite(updated)&&updated>=entry.time)continue;
    result.push({'Shipment ID':id,Status:entry.rule.status,'Current Location':entry.rule.location,'Current Step':entry.rule.step,'Updated At':new Date(entry.time).toISOString(),'Sync Version':(Number(s['Sync Version'])||0)+1});
  }
  return result;
}
