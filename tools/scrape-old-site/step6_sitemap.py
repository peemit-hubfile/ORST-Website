"""ขั้นที่ 6: หน้าแผนผังเว็บไซต์ (sitemap.html) — รวมรายการจากหน้าหมวดทุกหมวด (page-index ใน JSON)

รันซ้ำหลังเพิ่ม/แก้หน้าหมวด เพื่อให้แผนผังตรงกับเมนูจริง (มาตรฐานเว็บไซต์ภาครัฐ ข้อ 4.7)
"""
import json, os, sys
sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")).replace("\\", "/")
PAGES = ROOT + "/content/pages/"
TPL = open(ROOT + "/_template.html", encoding="utf-8").read()


def load(n):
    return json.load(open(PAGES + n + ".json", encoding="utf-8"))


def groups_of(name):
    """กลุ่มลิงก์ของหน้าหมวด: page-index (ทุกกลุ่ม) + card-grid แบบ tiles (1 block = 1 กลุ่ม ชื่อกลุ่มจาก eyebrow/heading)"""
    out = []
    blocks = load(name)["blocks"]
    # หน้าหมวดที่มี page-index ใช้ page-index อย่างเดียว (เรียงตามผังเว็บไซต์ ORST) — การ์ดอื่นในหน้าเป็นส่วนประกอบหน้าตา
    if any(b["type"] == "page-index" for b in blocks):
        blocks = [b for b in blocks if b["type"] == "page-index"]
    for b in blocks:
        if b["type"] == "page-index":
            out += b["groups"]
        elif b["type"] == "card-grid" and b.get("layout") in ("tiles", "list"):
            out.append({"heading": b.get("eyebrow") or b.get("heading", ""), "icon": (b["items"][0].get("icon") if b["items"] else None) or "i-file",
                        "items": [{k: v for k, v in it.items() if k in ("title", "href")} for it in b["items"]]})
    return out


def index_groups(name, href, title):
    """page-index ของหน้าหมวด -> กลุ่มในแผนผัง (ชื่อกลุ่มนำหน้าด้วยชื่อหมวด)"""
    out = []
    for g in groups_of(name):
        out.append({"heading": f"{title} · {g['heading']}", "href": href, "icon": g.get("icon", "i-file"),
                    "items": [{k: v for k, v in it.items() if k in ("title", "href")} for it in g["items"]]})
    return out


groups = [{"heading": "หน้าหลักของเว็บไซต์", "icon": "i-home", "items": [
    {"title": "หน้าหลัก", "href": "index.html"}, {"title": "พจนานุกรมและคำศัพท์", "href": "dictionary.html"},
    {"title": "องค์ความรู้", "href": "knowledge.html"}, {"title": "หนังสือและสิ่งพิมพ์", "href": "publications.html"},
    {"title": "ข่าวสารและกิจกรรม", "href": "news.html"}, {"title": "บริการวิชาการ", "href": "services.html"},
    {"title": "เกี่ยวกับเรา", "href": "about.html"}, {"title": "การปฏิบัติราชการ"},
    {"title": "ติดต่อเรา", "href": "contact.html"}]}]
groups += index_groups("about", "about.html", "เกี่ยวกับเรา")
groups += index_groups("operations", "operations.html", "การปฏิบัติราชการ")
groups += index_groups("news", "news.html", "ข่าวสาร")
groups += index_groups("services", "services.html", "บริการวิชาการ")
# หมวด 7 ติดต่อเรา — contact.html เขียน HTML เอง (ไม่มี page-index) ลำดับตามผังเว็บไซต์ ORST
CONTACT_ITEMS = [
    {"title": "รับเรื่องร้องเรียน ร้องทุกข์ และติดตามสถานะ", "href": "complaints.html"},
    {"title": "แบบฟอร์มติดต่อสอบถามและข้อเสนอแนะ (e-Form)", "href": "contact.html#message-form"},
    {"title": "แบบสำรวจความพึงพอใจการใช้งานเว็บไซต์", "href": "website-survey.html"},
    {"title": "เครือข่ายสังคมออนไลน์ (Social Media)", "href": "social-media.html"},
]
groups.append({"heading": "ติดต่อเรา", "href": "contact.html", "icon": "i-phone-call", "items": CONTACT_ITEMS})
# FOOTER ตามผังเว็บไซต์ ORST (ลิงก์เดียวกับคอลัมน์ "ข้อมูลเว็บไซต์และนโยบาย" ใน renderFooter ของ components.js)
groups.append({"heading": "ข้อมูลเว็บไซต์และนโยบาย", "icon": "i-shield", "items": [
    {"title": "คำถามที่พบบ่อย (FAQ)", "href": "qa.html"},
    {"title": "เว็บลิงก์หน่วยงานที่เกี่ยวข้อง", "href": "related-links.html"},
    {"title": "การปฏิเสธความรับผิด (Disclaimer)", "href": "disclaimer.html"},
    {"title": "นโยบายเว็บไซต์ (Website Policy)", "href": "website-policy.html"},
    {"title": "นโยบายการคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy)", "href": "privacy-policy.html"},
    {"title": "นโยบายคุกกี้ (Cookies Policy)", "href": "cookie-policy.html"},
    {"title": "นโยบายการรักษาความมั่นคงปลอดภัยเว็บไซต์ (Website Security Policy)", "href": "security-policy.html"},
    {"title": "การเข้าถึงเว็บไซต์ (Web Accessibility)", "href": "accessibility.html"}]})

page = {"$schema": "../blocks.schema.json",
        "_note": "สร้างอัตโนมัติจาก tools/scrape-old-site/step6_sitemap.py — อย่าแก้ด้วยมือ ให้แก้หน้าหมวดแล้วรันใหม่",
        "title": "แผนผังเว็บไซต์", "navKey": "home",
        "description": "แผนผังเว็บไซต์สำนักงานราชบัณฑิตยสภา รวมลิงก์ไปทุกหมวดและทุกหน้า",
        "blocks": [{"type": "page-hero", "heading": "แผนผังเว็บไซต์",
                    "lead": "รวมลิงก์ไปทุกหมวดและทุกหน้าของเว็บไซต์สำนักงานราชบัณฑิตยสภา",
                    "breadcrumb": [{"label": "หน้าหลัก", "href": "index.html"}, {"label": "แผนผังเว็บไซต์"}]},
                   {"type": "page-index", "id": "sitemap", "columns": 3, "groups": groups}]}
with open(PAGES + "sitemap.json", "w", encoding="utf-8", newline="\n") as f:
    json.dump(page, f, ensure_ascii=False, indent=2)
    f.write("\n")
html = (TPL.replace("[แก้ไข] คำอธิบายหน้านี้ 1-2 ประโยค สำหรับ SEO", page["description"])
           .replace("[แก้ไข] ชื่อหน้า", page["title"]).replace("[แก้ไข-navKey]", "home").replace("[แก้ไข-slug]", "sitemap"))
open(ROOT + "/sitemap.html", "w", encoding="utf-8", newline="\n").write(html)
print(f"  sitemap.html  {len(groups)} กลุ่ม {sum(len(g['items']) for g in groups)} ลิงก์")

# ---------------------------------------------------------------------------
# content/site-nav.json — โครงเมนูของแต่ละหมวด ใช้ทำแถบเมนูย่อยข้างเนื้อหาในหน้าย่อย
# (page-runtime.js และ tools/build.mjs อ่านไฟล์นี้ — ตอนต่อ CMS ให้ CMS สร้างไฟล์/endpoint รูปแบบเดียวกัน)
# ---------------------------------------------------------------------------
SECTIONS = [("about", "เกี่ยวกับเรา", "about.html"), ("operations", "การปฏิบัติราชการ", "operations.html"),
            ("news", "ข่าวสารและกิจกรรม", "news.html"), ("services", "บริการวิชาการ", "services.html"),
            ("contact", "ติดต่อเรา", "contact.html")]
nav = {"_note": "สร้างอัตโนมัติจาก tools/scrape-old-site/step6_sitemap.py (อ่านจาก page-index ของหน้าหมวด) — อย่าแก้ด้วยมือ",
       "sections": []}
for key, title, href in SECTIONS:
    sec = {"key": key, "title": title, "href": href, "groups": []}
    for g in ([{"heading": "ติดต่อเรา", "items": CONTACT_ITEMS}] if key == "contact" else groups_of(key)):
        items = [{"title": it["title"], "href": it["href"]} for it in g["items"]
                 if it.get("href", "").split("#")[0].endswith(".html") and not it["href"].startswith("http")]
        if items:
            sec["groups"].append({"heading": g["heading"], "items": items})
    nav["sections"].append(sec)
with open(ROOT + "/content/site-nav.json", "w", encoding="utf-8", newline="\n") as f:
    json.dump(nav, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(f"  content/site-nav.json  {sum(len(g['items']) for s in nav['sections'] for g in s['groups'])} ลิงก์ใน {len(nav['sections'])} หมวด")
