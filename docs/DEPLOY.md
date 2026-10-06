# Cloudflare Pages

GitHub Actions ทดสอบ + build ก่อน deploy public/ ไปโปรเจกต์ fakduai-port-simulator
อ้างอิง: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/

## ตั้งค่าครั้งเดียว

1. GitHub Settings → Secrets and variables → Actions เพิ่ม:
   - CLOUDFLARE_ACCOUNT_ID
   - CLOUDFLARE_API_TOKEN (Account / Cloudflare Pages / Edit)
2. Actions → Deploy Pages → Run workflow เลือก branch main
3. Action ตรวจโปรเจกต์ผ่าน Cloudflare API ถ้าไม่มีจะสร้าง fakduai-port-simulator แล้ว deploy ต่อในรอบเดียว ไม่ต้องติ๊กตัวเลือก
4. เมื่อมี project แล้ว ขั้นสร้างจะถูกข้าม; push main จะตรวจและ deploy ตามปกติ

เมื่อไม่มี secrets workflow จะทดสอบ/build แต่ข้าม deploy พร้อม notice ไม่ได้หมายความว่าเว็บขึ้นแล้ว
การสร้างทำเฉพาะเมื่อ API ยืนยัน Project Not Found (8000007) ไม่ถือ token/permission/network errors ว่าโปรเจกต์ไม่มี
หลังอัปเดต Action ให้ใช้รอบ push ล่าสุดหรือ Run workflow ใหม่ ไม่ Re-run รอบเก่าที่ใช้โค้ดเดิม
อย่าใส่ token ในไฟล์ repository
