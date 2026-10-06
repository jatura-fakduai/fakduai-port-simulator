# Fakduai Port Simulator

Isometric terminal + sea network สำหรับ AI Logistics Workshop ของ Fakduai Lab ใช้ข้อมูลจำลองเท่านั้น

## เริ่มใช้งาน

ต้องมี Node.js 22+ และ Python 3 สำหรับ local server

```sh
npm test
npm run build
npm run serve
```

Simulator: http://127.0.0.1:4174/?demo=1
Codelab: http://127.0.0.1:4174/codelab/

## Workshop

1 วัน 09:00–16:30 · iPad · 160/80/80 คน · 8 คนต่อกลุ่ม (20/10/10 กลุ่ม)
Guided Workshop: Learn → Try → Modify → Challenge → Showcase
ใช้ LINE Template เดียว ไม่ Build from Scratch; แต่ละกลุ่มมี LINE OA และ Google Sheet อย่างละ 1 ชุด

LINE → n8n AI Agent → Google Sheets (Documents/Events) → Simulator → Apps Script (ack + Shipment completion)

- [ตั้งค่าระบบ](docs/SETUP.md)
- [โครงสร้างข้อมูล](docs/DATA-SCHEMA.md)
- [คำสั่งทดสอบ](docs/TEST-PROMPTS.md)
- [Deploy](docs/DEPLOY.md)

## ข้อจำกัดและความปลอดภัย

Template ไม่มีการตรวจ LINE webhook signature หรือป้องกัน replay จึงยังไม่เหมาะกับ production
ห้ามใส่ข้อมูลลูกค้า เอกสารจริง หรือ token ใน repo/prompt/screenshot
Workflow ลบ credential references แล้ว ผู้ใช้ต้องเลือก credentials ใน n8n เอง
Simulator มีค่าเริ่มต้น Apps Script ของ workshop; ผู้จัดต้องเปลี่ยน endpoint เป็น deployment ของตนก่อนใช้กับข้อมูลอื่น
Apps Script ตรวจ schema และเจ้าของชีท ไม่ได้ใช้ allowlist รายไฟล์: ใช้บัญชี workshop แยกจากข้อมูลธุรกิจ
ต้องเปิดหน้า Simulator และ Auto Sync เพื่อประมวลผลคิว; เปิดตัวประมวลผลเพียงหนึ่งหน้าต่อชีท
