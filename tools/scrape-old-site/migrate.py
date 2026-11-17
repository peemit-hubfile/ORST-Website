"""ย้ายข้อมูลจากเว็บไซต์เดิม www.orst.go.th มาเป็นไฟล์เนื้อหาของเว็บใหม่

รัน:   python tools/scrape-old-site/migrate.py
ต้องมี Python 3.10+ และ Pillow (pip install pillow) — ไม่เกี่ยวกับการรันหรือ build เว็บ

ขั้นตอน
  step0_images.py         รูปผู้บริหาร + เครื่องหมายราชการ -> assets/images/orst/
  step1_examples.py       หน้าตัวอย่างแม่แบบ T1-T3
  step2_pages.py          หน้าเนื้อหาหมวด 3-6 ทั้งหมด + รูปย่ออินโฟกราฟิก
  step3_hubs.py           หน้าหมวด about / operations / news / services / dictionary
  step4_publications.py   รายการสิ่งพิมพ์ + รูปปก
  step5_news.py           ข่าวล่าสุดพร้อมรูป -> หน้า news-*.html + การ์ดข่าวบนหน้าแรก (แก้เฉพาะส่วนการ์ดใน index.html)
  step6_sitemap.py        หน้าแผนผังเว็บไซต์ จากหน้าหมวดทั้งหมด
  step7_calendar.py       กิจกรรมจริงจาก Google Calendar ของหน่วยงาน -> content/events.json (ปฏิทินหน้าแรก)
  step8_guidelines.py     หลักเกณฑ์ภาษาไทย ๑๕ หัวข้อ -> หน้า guideline-*.html (ย้ายเนื้อหามาแสดงในเว็บใหม่) + หน้ารวม

หน้าที่โหลดแล้วเก็บใน cache/ — ลบ cache/ ถ้าต้องการข้อมูลล่าสุด
**ไฟล์ JSON ที่สร้างจะถูกเขียนทับทั้งไฟล์** ถ้าแก้เนื้อหาในหน้าเหล่านี้ด้วยมือแล้ว อย่ารันซ้ำโดยไม่ตรวจ diff
หลังรันเสร็จ: node tools/validate.mjs
"""
import os, runpy, sys

HERE = os.path.dirname(os.path.abspath(__file__))
for step in ["step0_images", "step1_examples", "step2_pages", "step3_hubs", "step4_publications", "step5_news", "step6_sitemap", "step7_calendar", "step8_guidelines"]:
    print(f"== {step}")
    runpy.run_path(os.path.join(HERE, step + ".py"), run_name="__main__")
print("\nเสร็จ — รัน node tools/validate.mjs เพื่อตรวจ")
