"""ขั้นที่ 13: หมวด 7 ติดต่อเรา — หน้าที่ยังขาดตามผังเว็บไซต์ ORST

  7.1 รับเรื่องร้องเรียน ร้องทุกข์ และติดตามสถานะ   -> complaints.html     (ช่องทางจริงจากเว็บเดิม — เหมือนหน้าบริการวิชาการ)
  7.2 แบบฟอร์มติดต่อสอบถามและข้อเสนอแนะ (e-Form)   -> contact.html#message-form (ฟอร์มเดิมในหน้าติดต่อเรา)
  7.3 แบบสำรวจความพึงพอใจการใช้งานเว็บไซต์          -> website-survey.html (รอลิงก์แบบสำรวจจาก ORST)
  7.4 เครือข่ายสังคมออนไลน์ (Social Media)           -> social-media.html   (Facebook / Messenger / YouTube ที่เว็บเดิมใช้)

contact.html เป็นหน้าเขียน HTML เอง จึงไม่มี page-index — ลำดับหมวด 7 กำหนดที่ CONTACT_ITEMS ใน step6_sitemap.py
รันก่อน step6
"""
import json, os, sys
sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..")).replace("\\", "/")
PAGES = ROOT + "/content/pages/"
TPL = open(ROOT + "/_template.html", encoding="utf-8").read()
TODAY = "2026-11-17"
FB_PAGE = "206167399441363"   # เพจ Facebook "ราชบัณฑิตยสภา" จากกล่อง Facebook บนเว็บเดิม (ตัวเดียวกับ MESSENGER_URL ใน components.js)
YOUTUBE = "https://www.youtube.com/channel/UCFGKmCXh_pWaawbilPgZ69g"   # ช่อง YouTube เดียวกับคลังองค์ความรู้


def load(n):
    return json.load(open(PAGES + n + ".json", encoding="utf-8"))


def write_page(slug, title, lead, blocks, note):
    blocks = [{"type": "page-hero", "heading": title, "lead": lead,
               "breadcrumb": [{"label": "หน้าหลัก", "href": "index.html"}, {"label": "ติดต่อเรา", "href": "contact.html"}, {"label": title}]}] + blocks
    page = {"$schema": "../blocks.schema.json", "_note": note, "title": title, "navKey": "contact",
            "description": lead, "updatedAt": TODAY, "blocks": blocks}
    with open(PAGES + slug + ".json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(page, f, ensure_ascii=False, indent=2)
        f.write("\n")
    html = (TPL.replace("[แก้ไข] คำอธิบายหน้านี้ 1-2 ประโยค สำหรับ SEO", lead)
               .replace("[แก้ไข] ชื่อหน้า", title).replace("[แก้ไข-navKey]", "contact").replace("[แก้ไข-slug]", slug))
    open(ROOT + "/" + slug + ".html", "w", encoding="utf-8", newline="\n").write(html)
    print(f"  {slug}.html")


RELATED = [
    {"title": "รับเรื่องร้องเรียน ร้องทุกข์ และติดตามสถานะ", "href": "complaints.html", "icon": "i-megaphone"},
    {"title": "แบบฟอร์มติดต่อสอบถามและข้อเสนอแนะ (e-Form)", "href": "contact.html#message-form", "icon": "i-form"},
    {"title": "แบบสำรวจความพึงพอใจการใช้งานเว็บไซต์", "href": "website-survey.html", "icon": "i-check"},
    {"title": "เครือข่ายสังคมออนไลน์ (Social Media)", "href": "social-media.html", "icon": "i-share"},
]


def related(self_href):
    return {"type": "link-list", "id": "related", "variant": "alt", "heading": "ช่องทางติดต่ออื่น",
            "items": [it for it in RELATED if it["href"] != self_href]}


# ---------- 7.1 รับเรื่องร้องเรียน ร้องทุกข์ และติดตามสถานะ ----------
channels = next(b for b in load("services")["blocks"] if b.get("id") == "channels")["items"]
write_page("complaints", "รับเรื่องร้องเรียน ร้องทุกข์ และติดตามสถานะ",
           "ช่องทางร้องเรียน ร้องทุกข์ แจ้งเบาะแสการทุจริต และเสนอแนะต่อการดำเนินงานของสำนักงานราชบัณฑิตยสภา พร้อมการติดตามสถานะเรื่อง", [
    {"type": "feature-list", "id": "channels", "layout": "cards", "heading": "ช่องทางรับเรื่อง", "items": channels},
    {"type": "feature-list", "id": "follow", "layout": "cards", "variant": "alt", "heading": "ติดตามสถานะและข้อมูลที่เกี่ยวข้อง", "items": [
        {"icon": "i-search", "title": "ติดตามสถานะเรื่อง", "body": "สอบถามความคืบหน้าของเรื่องที่ยื่นไว้",
         "links": [{"label": "ติดตามสถานะคำขอรับบริการ", "href": "track-request.html"}]},
        {"icon": "i-file", "title": "แนวปฏิบัติการจัดการเรื่องร้องเรียน", "body": "ขั้นตอนการรับและจัดการเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ",
         "links": [{"label": "อ่านแนวปฏิบัติ", "href": "complaint-guidelines.html"}]},
        {"icon": "i-journal", "title": "สถิติเรื่องร้องเรียน", "body": "ข้อมูลเชิงสถิติเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ",
         "links": [{"label": "ดูสถิติ", "href": "complaint-statistics.html"}]}]},
    related("complaints.html")],
    "ช่องทางรับเรื่องเดียวกับหน้าบริการวิชาการ (services.json id=channels ข้อมูลจาก orst.go.th) — แก้ที่ step3_hubs.py")

# ---------- 7.3 แบบสำรวจความพึงพอใจการใช้งานเว็บไซต์ ----------
write_page("website-survey", "แบบสำรวจความพึงพอใจการใช้งานเว็บไซต์",
           "ร่วมประเมินความพึงพอใจการใช้งานเว็บไซต์สำนักงานราชบัณฑิตยสภา เพื่อนำไปปรับปรุงการให้บริการ", [
    {"type": "notice", "id": "pending", "tone": "info", "title": "อยู่ระหว่างจัดทำแบบสำรวจ",
     "body": "[ลิงก์แบบสำรวจความพึงพอใจการใช้งานเว็บไซต์ — รอข้อมูลจากสำนักงาน]"},
    {"type": "link-list", "id": "feedback", "heading": "แสดงความคิดเห็นได้ทางช่องทางนี้", "items": [
        {"title": "แบบรับฟังความคิดเห็น/ข้อเสนอแนะที่มีต่อการดำเนินงาน", "href": "https://forms.gle/mc1qF9RCDQbvLnho6", "icon": "i-form", "tag": "Google Form"}]},
    related("website-survey.html")],
    "เว็บไซต์เดิมไม่มีแบบสำรวจความพึงพอใจเว็บไซต์ — รอลิงก์ (เช่น Google Form) จาก ORST")

# ---------- 7.4 เครือข่ายสังคมออนไลน์ ----------
write_page("social-media", "เครือข่ายสังคมออนไลน์ (Social Media)",
           "ติดตามข่าวสาร กิจกรรม และสาระความรู้ของสำนักงานราชบัณฑิตยสภาผ่านเครือข่ายสังคมออนไลน์", [
    {"type": "feature-list", "id": "accounts", "layout": "cards", "heading": "บัญชีทางการของสำนักงาน", "items": [
        {"icon": "i-people", "title": "Facebook", "body": "เพจราชบัณฑิตยสภา ข่าวสารและกิจกรรมของสำนักงาน",
         "links": [{"label": "เปิดเพจ Facebook", "href": f"https://www.facebook.com/{FB_PAGE}"}]},
        {"icon": "i-mail", "title": "Messenger", "body": "ส่งข้อความสอบถามผ่าน Facebook Messenger ของเพจราชบัณฑิตยสภา",
         "links": [{"label": "เริ่มแชทใน Messenger", "href": f"https://m.me/{FB_PAGE}"}]},
        {"icon": "i-video", "title": "YouTube", "body": "วิดีโอการบรรยาย การเสวนาวิชาการ และสาระความรู้",
         "links": [{"label": "เปิดช่อง YouTube", "href": YOUTUBE}]}]},
    related("social-media.html")],
    "บัญชีที่เว็บเดิม/เว็บนี้ใช้อยู่: เพจ Facebook id 206167399441363 และช่อง YouTube ของคลังองค์ความรู้ — ถ้ามีบัญชีอื่น (LINE, X, TikTok) ให้เพิ่มใน accounts")
