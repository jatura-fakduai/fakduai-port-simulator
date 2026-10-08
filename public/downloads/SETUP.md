# ตั้งค่า Port Workshop (LINE)

## ผู้จัดเตรียมก่อนเรียน

- Google Sheet แยกกลุ่มละ 1 ไฟล์: อัปโหลด docs/Google-Sheet-Template.xlsx แล้วแปลงเป็น Google Sheets (File → Save as Google Sheets) จากนั้น Make a copy แยกกลุ่ม คง Shipments, Documents, Events และคอลัมน์ทั้งหมด
- ติดตั้ง google-apps-script/Code.gs ในชีทกลางของบัญชี workshop; authorize และ deploy Web App ตามระบบเดิม
- ชีทกลุ่มต้องเป็นของบัญชีที่ Deploy หรืออีเมลใน `CONFIG.ALLOWED_OWNER_EMAILS` (โค้ดเพิ่ม `louiszzico@gmail.com` แล้ว); เจ้าของที่เพิ่มต้องแชร์แต่ละไฟล์ให้บัญชีที่ Deploy เป็น **Editor** ด้วย
- เปลี่ยน SHEET_API_URL ใน public/app.js หากสร้าง deployment ใหม่
- แต่ละกลุ่มเตรียม LINE OA + Messaging API ไว้ก่อนวันเรียน ในห้องรีแคป ไม่สมัครใหม่
- n8n มี HTTPS URL, Google Sheets credential และ OpenAI credential พร้อมใช้งาน

## Import workflow

1. Import n8n/Fakduai-Freight-Full-Release.json
2. Workshop Settings: ใส่ sheetId ที่เดียว (ส่วนระหว่าง /d/ และ /edit ใน URL)
3. เลือก Google Sheets credentials ให้ครบทั้ง 5 tools และเลือก OpenAI credential
4. LINE Webhook: เปลี่ยน path ให้ไม่ซ้ำกับกลุ่มอื่น เช่น port-line-webhook-G01 (ต่อท้ายด้วยเลขกลุ่ม)
5. Reply to LINE: สร้าง Header Auth ชื่อ header Authorization ค่า Bearer ตามด้วย Channel Access Token
6. Publish/Activate workflow แล้วคัดลอก Production URL จาก LINE Webhook
7. LINE Developers: ใส่ Webhook URL, Verify และเปิด Use webhook; ปิดข้อความตอบกลับอัตโนมัติที่ซ้ำซ้อน
8. เพิ่มเพื่อน OA แล้วส่งข้อความทดสอบ ตรวจ Executions ใน n8n

Template ไม่ตรวจ signature: mock workshop เท่านั้น ห้ามใช้เป็นระบบงานจริง

## เชื่อม Simulator

เปิด Settings บนเว็บ ใส่ URL ของชีทกลุ่มเดียวกับ Workshop Settings → Connect → Refresh → Start Auto Sync
ลองอ่าน IMP-003 ใน LINE เทียบกับเว็บและชีท
เมื่อแก้ Apps Script ต้องสร้าง deployment version ใหม่ด้วย ไม่ใช่บันทึกอย่างเดียว

## เมื่อคิวไม่เดิน

เปิดเว็บ/Auto Sync, ตรวจ Sheet ID ตรงกัน, เอกสารครบ, Event Type/Animation ถูกต้อง
WAITING_DOCUMENT บางขั้นตอนจะกลับมาทำงานเมื่อเว็บ sync พบเอกสารครบ
PROCESSING ไม่ได้แปลว่าจบ ห้ามเปลี่ยนเป็น COMPLETED เองหรือสั่งซ้ำเพื่อแก้อาการ
เมื่อ Reconnecting ให้รอ retry; Check Sheet ให้ตรวจสิทธิ์/deployment แล้ว Refresh
