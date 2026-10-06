# Cloudflare Pages

GitHub Actions ทดสอบ + build ก่อน deploy public/ ไปโปรเจกต์ fakduai-port-simulator
อ้างอิง: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/

## ตั้งค่าครั้งเดียว

1. GitHub Settings → Secrets and variables → Actions เพิ่ม:
   - CLOUDFLARE_ACCOUNT_ID
   - CLOUDFLARE_API_TOKEN (Account / Cloudflare Pages / Edit)
2. Actions → Deploy Pages → Run workflow เลือก branch main
3. ถ้ายังไม่มี Pages project ให้ติ๊ก Create Pages project first แล้ว Run workflow: Action จะสร้าง fakduai-port-simulator และ deploy ต่อในรอบเดียว
4. เมื่อมี project แล้ว ไม่ต้องติ๊กตัวเลือกนี้อีก; push main จะ deploy ตามปกติ

เมื่อไม่มี secrets workflow จะทดสอบ/build แต่ข้าม deploy พร้อม notice ไม่ได้หมายความว่าเว็บขึ้นแล้ว
การสร้าง project ทำเฉพาะ manual run ที่ติ๊ก create_project เท่านั้น ไม่สร้างซ้ำบน push
ถ้าติ๊กทั้งที่ project มีอยู่แล้ว ขั้นตอนสร้างจะ fail; ให้ Run workflow ใหม่โดยไม่ติ๊ก (อย่า Re-run รอบที่ใช้ตัวเลือกเดิม)
อย่าใส่ token ในไฟล์ repository
