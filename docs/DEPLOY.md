# Cloudflare Pages

GitHub Actions ทดสอบ + build ก่อน deploy public/ ไปโปรเจกต์ fakduai-port-simulator
อ้างอิง: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/

## ตั้งค่าครั้งเดียว

1. สร้าง Cloudflare Pages แบบ Direct Upload ชื่อ fakduai-port-simulator (ถ้ามีแล้วไม่ต้องสร้างซ้ำ)
2. GitHub Settings → Secrets and variables → Actions เพิ่ม:
   - CLOUDFLARE_ACCOUNT_ID
   - CLOUDFLARE_API_TOKEN (Account / Cloudflare Pages / Edit)
3. Actions → Deploy Pages → Run workflow หรือ push main

เมื่อไม่มี secrets workflow จะทดสอบ/build แต่ข้าม deploy พร้อม notice ไม่ได้หมายความว่าเว็บขึ้นแล้ว
ไม่มีขั้นตอน list/create project อัตโนมัติ เพื่อไม่ชนชื่อโปรเจกต์ที่มีอยู่
อย่าใส่ token ในไฟล์ repository
