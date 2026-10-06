(function(root){
  'use strict';
  const pairs=[
    ['Animated sea network and isometric container terminal','ภาพจำลองเส้นทางเดินเรือและลานตู้คอนเทนเนอร์ไอโซเมตริก'],
    ['Sea Network · vessel moves from SHA toward Singapore','เส้นทางเดินเรือ · เรือออกจาก SHA ไปสิงคโปร์'],['Sea Network · route position and milestone updated','เส้นทางเดินเรือ · อัปเดตตำแหน่งและขั้นตอน'],['Sea Network · vessel reaches LCH and Terminal becomes active','เส้นทางเดินเรือ · เรือถึง LCH และเริ่มงานที่ท่าเรือ'],['Sea Network · vessel leaves port; international voyage is still in progress','เส้นทางเดินเรือ · เรือออกจากท่าและกำลังเดินทางระหว่างประเทศ'],['Sea Network · vessel reaches the shipment destination','เส้นทางเดินเรือ · เรือถึงปลายทางของรายการขนส่ง'],
    ['Terminal · quay crane places the container on AGV-01','ท่าเรือ · เครนหน้าท่าวางตู้บน AGV-01'],['Terminal · AGV-01 transfers the container to Customs','ท่าเรือ · AGV-01 นำตู้ไปศุลกากร'],['Terminal · AGV → truck handover → Gate Out → DELIVERED','ท่าเรือ · AGV → ส่งตู้ขึ้นรถ → ประตูออก → DELIVERED'],['Terminal · truck delivers the container to Gate-in staging','ท่าเรือ · รถนำตู้มาส่งที่จุดพักประตูเข้า'],['Terminal · AGV-01 carries the export container from Gate-in to quay','ท่าเรือ · AGV-01 นำตู้ส่งออกจากประตูเข้าไปหน้าท่า'],['Terminal · quay crane loads the container from AGV-01 onto the vessel','ท่าเรือ · เครนยกตู้จาก AGV-01 ขึ้นเรือ'],
    ['Please enter a valid Google Sheet link.','กรุณาใส่ลิงก์ Google Sheet ที่ถูกต้อง'],['Update Code.gs and deploy to support this sheet.','กรุณาอัปเดต Code.gs และ Deploy ให้รองรับชีทนี้'],['No Shipments data found in this sheet.','ไม่พบข้อมูล Shipments ในชีทนี้'],
    ['Operations Simulator','ระบบจำลองการขนส่ง'],['OPERATIONS','การดำเนินงาน'],['Shipments','รายการขนส่ง'],
    ['EUROPE','ยุโรป'],['EAST ASIA','เอเชียตะวันออก'],['SOUTHEAST ASIA','เอเชียตะวันออกเฉียงใต้'],['EURASIA · SHIPPING NETWORK','ยูเรเชีย · เส้นทางเดินเรือ'],
    ['Sea Network','เส้นทางเดินเรือ'],['Syncing Google Sheet…','กำลังซิงก์ Google Sheet…'],
    ['Sea Network · vessel position updated','เส้นทางเดินเรือ · อัปเดตตำแหน่งเรือ'],['Sea Network · export vessel position updated','เส้นทางเดินเรือ · อัปเดตตำแหน่งเรือส่งออก'],['Sea Network · vessel arrived at port','เส้นทางเดินเรือ · เรือถึงท่าแล้ว'],['Sea Network · export vessel reaches destination','เส้นทางเดินเรือ · เรือส่งออกถึงปลายทาง'],
    ['Terminal · crane transfers container to AGV-01','ท่าเรือ · เครนส่งตู้ให้ AGV-01'],['Terminal · AGV-01 transfers container to Customs','ท่าเรือ · AGV-01 นำตู้ไปศุลกากร'],['Terminal · AGV → truck handover → Gate Out','ท่าเรือ · AGV → ส่งตู้ขึ้นรถ → ประตูออก'],['Terminal · AGV-01 transfers container to Gate-out','ท่าเรือ · AGV-01 นำตู้ไปประตูออก'],['Terminal · truck collects container and exits','ท่าเรือ · รถรับตู้และออกจากท่า'],['Terminal · export truck enters Gate-in','ท่าเรือ · รถส่งออกผ่านประตูเข้า'],['Terminal · AGV-01 transfers export container to quay','ท่าเรือ · AGV-01 นำตู้ส่งออกไปหน้าท่า'],['Terminal · crane loads container onto vessel','ท่าเรือ · เครนยกตู้ขึ้นเรือ'],
    ['Search shipment…','ค้นหารายการขนส่ง…'],['Search shipments','ค้นหารายการขนส่ง'],['Shipment filters','ตัวกรองรายการขนส่ง'],
    ['All','ทั้งหมด'],['Action','ต้องดำเนินการ'],['Delayed','ล่าช้า'],['In transit','ระหว่างเดินทาง'],['Need action','ต้องดำเนินการ'],
    ['Terminal','ท่าเรือ'],['Sea network','เส้นทางเดินเรือ'],['Simulation view','มุมมองการจำลอง'],['Freight simulation','การจำลองขนส่ง'],
    ['SEA NETWORK','เส้นทางเดินเรือ'],['CONTAINER TERMINAL','ลานตู้คอนเทนเนอร์'],['SIMULATION TIME','เวลาจำลอง'],
    ['Selected route','เส้นทางที่เลือก'],['Port','ท่าเรือ'],['Terminal zoom','ปรับขนาดท่าเรือ'],['Zoom out','ย่อ'],['Zoom in','ขยาย'],['Fit terminal','พอดีจอ'],
    ['PROCESS STATUS','สถานะการดำเนินงาน'],['Shipment timeline','ลำดับการขนส่ง'],['Shipment information','ข้อมูลการขนส่ง'],
    ['Overview','ภาพรวม'],['Documents','เอกสาร'],['History','ประวัติ'],['SELECTED SHIPMENT','รายการขนส่งที่เลือก'],
    ['Operation details','รายละเอียดการดำเนินงาน'],['LIVE','ข้อมูลปัจจุบัน'],['Container','ตู้คอนเทนเนอร์'],['Vessel','เรือ'],['Current location','ตำแหน่งปัจจุบัน'],['Incoterm','เงื่อนไขการส่งมอบ'],
    ['DOCUMENT CONTROL','การจัดการเอกสาร'],['Release requirements','เอกสารที่ต้องใช้'],['EVENT → SYSTEM EFFECT','เหตุการณ์ → ผลต่อระบบ'],['Operation history','ประวัติการดำเนินงาน'],
    ['WORKSHOP DATA','ข้อมูลเวิร์กช็อป'],['Connect Google Sheet','เชื่อมต่อ Google Sheet'],['Google Sheet URL','ลิงก์ Google Sheet'],['Disconnect','ยกเลิกการเชื่อมต่อ'],['Connect','เชื่อมต่อ'],['Close','ปิด'],
    ['Paste your group’s Google Sheet link to load Shipments, Documents and Events.','วางลิงก์ Google Sheet ของกลุ่มคุณ เพื่อโหลด Shipments, Documents และ Events'],
    ['Use a workshop sheet owned by the deployment account · Auto Sync every 5 seconds.','ใช้ชีทเวิร์กช็อปที่บัญชี Deploy เป็นเจ้าของ · Auto Sync ทุก 5 วินาที'],
    ['Start Auto Sync','เริ่มซิงก์อัตโนมัติ'],['Stop Auto Sync','หยุดซิงก์อัตโนมัติ'],['Refresh Google Sheet data','รีเฟรชข้อมูล Google Sheet'],['Connect Google Sheet','เชื่อมต่อ Google Sheet'],['Reset simulation','รีเซ็ตการจำลอง'],['International Freight home','หน้าหลัก International Freight'],
    ['Demo data','ข้อมูลตัวอย่าง'],['No shipments found','ไม่พบรายการขนส่ง'],['Run next event','เริ่มเหตุการณ์ถัดไป'],['Event running…','กำลังจำลองเหตุการณ์…'],['Scenario completed','จบการจำลอง'],
    ['Documents cleared','เอกสารพร้อมแล้ว'],['No document blocker for the next operational event.','เอกสารพร้อมสำหรับขั้นตอนถัดไป'],['Document risk detected','พบเอกสารที่ยังไม่พร้อม'],['All required documents received','เอกสารที่ต้องใช้ครบแล้ว'],
    ['Update document via n8n','อัปเดตเอกสารผ่าน n8n'],['Documents synced from Sheet','ข้อมูลเอกสารจากชีท'],['Waiting for Sheet event','รอเหตุการณ์จากชีท'],['Route completed','เดินทางถึงปลายทางแล้ว'],
    ['Departed · voyage in progress (position illustrative)','ออกเรือแล้ว · อยู่ระหว่างเดินทาง (ตำแหน่งจำลอง)'],['Preview · Laem Chabang terminal','ภาพตัวอย่าง · ท่าเรือแหลมฉบัง'],
    ['Booking','จองการขนส่ง'],['Gate-in','ผ่านประตูเข้า'],['Loading yard','ลานรอโหลด'],['Loaded','โหลดขึ้นเรือ'],['Departure','ออกเดินทาง'],['Arrival','ถึงปลายทาง'],['Departed','ออกเดินทาง'],['Transshipment','ถ่ายลำ'],['Arrived','ถึงท่า'],['Customs','ศุลกากร'],['Released','ปล่อยสินค้า'],['Delivered','ส่งมอบแล้ว'],
    ['Vessel departure','เรือออกเดินทาง'],['Singapore transshipment','ถ่ายลำที่สิงคโปร์'],['Port arrival','เรือถึงท่า'],['Discharge container','ยกตู้ลงจากเรือ'],['Move to Customs','ย้ายไปศุลกากร'],['Release & truck gate-out','ปล่อยสินค้าและนำรถออก'],['Truck gate-in','รถผ่านประตูเข้า'],['Move to loading yard','ย้ายไปลานรอโหลด'],['Load export vessel','โหลดตู้ขึ้นเรือ'],['Arrive at destination','เรือถึงปลายทาง'],
    ['Commercial Invoice','ใบกำกับสินค้า'],['Packing List','บัญชีบรรจุหีบห่อ'],['Bill of Lading','ใบตราส่งสินค้า'],['Certificate of Origin','หนังสือรับรองถิ่นกำเนิดสินค้า'],['Import Declaration','ใบขนสินค้าขาเข้า'],['Export Declaration','ใบขนสินค้าขาออก'],
    ['Received','ได้รับแล้ว'],['Approved','อนุมัติแล้ว'],['Pending','รอดำเนินการ'],['Missing','ยังไม่ได้รับ'],['Draft','ฉบับร่าง'],
    ['Google Sheet refreshed','รีเฟรชข้อมูลชีทแล้ว'],['Google Sheet connected','เชื่อมต่อชีทแล้ว'],['Disconnected · demo data restored','ยกเลิกการเชื่อมต่อ · ใช้ข้อมูลตัวอย่าง'],['Document updated — next requirement cleared','อัปเดตเอกสารแล้ว'],['Scenario reset to Booking','รีเซ็ตการจำลองกลับไปขั้นจอง'],['Cannot continue: required document is not ready','ยังดำเนินการต่อไม่ได้: เอกสารที่ต้องใช้ยังไม่พร้อม'],['Event running · refresh after completion','กำลังทำงาน · รีเฟรชหลังงานจบ'],
    ['Waiting for queue confirmation…','กำลังรอยืนยันคิว…'],['Confirming Google Sheet save…','กำลังตรวจยืนยันการบันทึกชีท…'],['Waiting for confirmation · retry','กำลังรอยืนยัน · จะลองใหม่'],['Google returned a non-JSON response','Google ตอบกลับไม่ใช่ JSON'],['Google Sheet response timed out','หมดเวลารอข้อมูลจาก Google Sheet'],['Document queue confirmation pending','กำลังรอยืนยันคิวเอกสาร'],
    ['Wait for the event to finish before changing shipment.','รอ Event จบก่อนเปลี่ยน Shipment'],['Wait for the event to finish before changing view.','รอ Event จบก่อนเปลี่ยนมุมมอง'],['Wait for the event status to be saved before disconnecting.','รอบันทึกสถานะ Event เสร็จก่อน Disconnect'],['Please wait for Sync or animation to finish, then try again.','รอการซิงก์หรือ Animation จบสักครู่ แล้วลองอีกครั้ง'],['Checking sheet…','กำลังตรวจสอบชีท…'],
    ['CUSTOMS_HOLD · waiting for required document','CUSTOMS_HOLD · รอเอกสารที่ต้องใช้'],['GATE_OUT · ready for truck collection','GATE_OUT · พร้อมให้รถรับตู้'],['DELIVERED · truck has exited the terminal','DELIVERED · รถออกจากท่าเรือแล้ว'],['ARRIVED · vessel at destination port','ARRIVED · เรือถึงท่าปลายทางแล้ว'],['IN_TRANSIT · vessel sailing to destination','IN_TRANSIT · เรือกำลังเดินทางไปปลายทาง'],['EXPORT FLOW · truck → AGV → vessel','ขั้นตอนส่งออก · รถ → AGV → เรือ'],['TERMINAL READY · waiting for the next event','ท่าเรือพร้อม · รอเหตุการณ์ถัดไป'],
    ['RELEASE · AGV moving container to transfer bay','RELEASE · AGV กำลังนำตู้ไปจุดส่งต่อ'],['RELEASE · transferring container onto truck','RELEASE · กำลังส่งตู้ขึ้นรถ'],['RELEASE · truck passing Gate Out','RELEASE · รถกำลังผ่านประตูออก'],['DELIVERED · truck exited terminal','DELIVERED · รถออกจากท่าเรือแล้ว']
  ];
  const th=Object.fromEntries(pairs),en=Object.fromEntries(pairs.map(([a,b])=>[b,a]));
  function translate(value,lang){
    const raw=String(value),text=raw.trim(),canonical=en[text]||text;
    if(lang==='en')return raw.replace(text,canonical);
    if(th[canonical])return raw.replace(text,th[canonical]);
    const patterns=[
      [/^Run: (.+)$/,(a)=>'เริ่ม: '+translate(a,'th')],[/^Next event · (.+)$/,(a)=>'ขั้นตอนถัดไป · '+translate(a,'th')],
      [/^(.+) blocked$/,(a)=>translate(a,'th')+' ยังดำเนินการไม่ได้'],
      [/^(.+) must be ready before “(.+)”\.$/,(a,b)=>translate(a,'th')+' ต้องพร้อมก่อน “'+translate(b,'th')+'”'],
      [/^(.+) will block the next document-controlled event\.$/,(a)=>translate(a,'th')+' ยังไม่พร้อมสำหรับขั้นตอนที่ต้องตรวจเอกสาร'],
      [/^(Receive|Approve) (.+)$/,(a,b)=>(a==='Approve'?'อนุมัติ':'รับ')+' '+translate(b,'th')],
      [/^(\d+\/\d+) ready$/,(a)=>a+' พร้อม'],
      [/^(Running|Starting|Saving|Completed|Queued|Waiting to start|Confirming save|Check event) · (.+)$/,(a,b)=>({'Running':'กำลังทำงาน','Starting':'กำลังเริ่มงาน','Saving':'กำลังบันทึก','Completed':'เสร็จแล้ว','Queued':'รอคิว','Waiting to start':'รอยืนยันเริ่มงาน','Confirming save':'รอยืนยันการบันทึก','Check event':'ตรวจเหตุการณ์'}[a])+' · '+b.replace(/check (\d+)\/(\d+)/,'ตรวจรอบ $1/$2')],
      [/^Confirmation pending · (.+) · checking again on Sync$/,(a)=>'ยังรอยืนยัน · '+a+' · จะตรวจอีกครั้งเมื่อซิงก์'],
      [/^Reading Sheet · (.+)$/,(a)=>'กำลังอ่านชีท · '+a.replace('last ','ล่าสุด ')],
      [/^Reconnecting · (.+)$/,(a)=>'กำลังเชื่อมต่อใหม่ · '+a.replace('retry in ','ลองใหม่ใน ').replace('last ','ล่าสุด ')],
      [/^(Auto Sync|Auto paused) · (.+)$/,(a,b)=>(a==='Auto Sync'?'ซิงก์อัตโนมัติ':'หยุดซิงก์แล้ว')+' · '+b],
      [/^(.+) · COMPLETED saved to Sheet$/,(a)=>a+' · บันทึกผลสำเร็จลงชีทแล้ว'],
      [/^(.+) completed$/,(a)=>translate(a,'th')+' เสร็จแล้ว'],
      [/^Check Sheet · (.+)$/,(a)=>'ตรวจการตั้งค่าชีท · '+a],
      [/^(.+) · (Sea Network|Terminal) · (.+)$/,(a,b,c)=>a+' · '+translate(b+' · '+c,'th')]
    ];
    for(const [pattern,format] of patterns){const match=canonical.match(pattern);if(match)return raw.replace(text,format(...match.slice(1)))}
    return raw;
  }
  const api={translate};
  if(typeof module==='object'&&module.exports){module.exports=api;return}
  root.FreightI18n=api;
  let lang=localStorage.getItem('freight-language')==='en'?'en':'th';
  const sources=new WeakMap();
  function update(node,attribute){
    const current=attribute?node.getAttribute(attribute):node.nodeValue;if(!current?.trim())return;
    let records=sources.get(node);if(!records){records={};sources.set(node,records)}
    const key=attribute||'text',record=records[key];
    const source=record&&current===record.output?record.source:current;
    const output=translate(source,lang);records[key]={source,output};
    if(current!==output){if(attribute)node.setAttribute(attribute,output);else node.nodeValue=output}
  }
  function apply(){
    document.documentElement.lang=lang;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let node;while(node=walker.nextNode()){if(!node.parentElement?.closest('script,style,#language-select,textarea,input'))update(node)}
    document.querySelectorAll('[title],[placeholder],[aria-label]').forEach(el=>{if(el.id==='language-select')return;for(const attr of ['title','placeholder','aria-label'])if(el.hasAttribute(attr))update(el,attr)});
    const select=document.getElementById('language-select');if(select)select.value=lang;
  }
  let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;apply()})});
  document.getElementById('language-select').addEventListener('change',e=>{lang=e.target.value==='en'?'en':'th';localStorage.setItem('freight-language',lang);apply();window.dispatchEvent(new Event('freight-language-change'))});
  apply();observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label']});
})(typeof window==='object'?window:globalThis);
