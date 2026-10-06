# โครงสร้างข้อมูล

ใช้ชื่อ tab และ header ภาษาอังกฤษตาม template เดิม ไม่แปลชื่อคอลัมน์ตามภาษา UI

| Tab | หน้าที่ | คอลัมน์สำคัญ |
| --- | --- | --- |
| Shipments | สถานะและตำแหน่งล่าสุด | Shipment ID, Direction, Status, Current Location, Current Step, Updated At, Sync Version |
| Documents | เอกสารจำลอง | Document ID, Shipment ID, Document Type, Status |
| Events | คิวคำสั่งและผลจำลอง | Event ID, Shipment ID, Event Type, Event Status, Animation, Timestamp, Processed At |

นี่คือรายการคอลัมน์สำคัญ ไม่ใช่ schema สำหรับสร้างชีทจากศูนย์: คงคอลัมน์อื่นทั้งหมดใน template โดยเฉพาะ Animation และข้อมูลเส้นทาง

AI อ่าน Shipments/Documents/Events, อัปเดต Documents และเพิ่ม Events ผ่าน Google Sheets tools
Simulator ประมวลผล animation แล้ว Apps Script ยืนยัน Event และสถานะ Shipment

| ฝั่ง | ลำดับ |
| --- | --- |
| Import | CUSTOMS_HOLD → CUSTOMS_RELEASE → DELIVERED (ออก Terminal) |
| Export | YARD_RECEIVED → READY_TO_LOAD → LOADED → IN_TRANSIT → ARRIVED |

Export Events: EXPORT_YARD_TRANSFER → EXPORT_LOAD → EXPORT_DEPARTURE → EXPORT_ARRIVAL
PENDING = รอทำ, WAITING_DOCUMENT = รอเอกสาร, PROCESSING = กำลังทำ, COMPLETED = ยืนยันจบ
Import ใหม่จบใน CUSTOMS_RELEASE; GATE_OUT รองรับข้อมูล legacy ไม่ต้องเพิ่มซ้ำหลัง DELIVERED
Export Departure ไม่ใช่ถึงปลายทาง ต้องมี EXPORT_ARRIVAL เพื่อจบ ARRIVED
