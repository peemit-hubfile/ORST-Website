"""ขั้นที่ 14: FOOTER — หน้าที่ยังขาดตามผังเว็บไซต์ ORST

  เว็บลิงก์หน่วยงานที่เกี่ยวข้อง                    -> related-links.html
  นโยบายการคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy)  -> privacy-policy.html  (เอกสารนโยบายจริงจากเว็บเดิม)
  นโยบายคุกกี้ (Cookies Policy)                    -> cookie-policy.html   (อธิบายสิ่งที่เว็บนี้จัดเก็บจริง + แถบขอความยินยอม)
  การเข้าถึงเว็บไซต์ (Web Accessibility)            -> accessibility.html   (เครื่องมือช่วยการเข้าถึงที่มีจริงบนเว็บ)

ตัวบทนโยบายฉบับทางการยังต้องให้ ORST พิจารณาอนุมัติ (เหมือน website-policy / security-policy / disclaimer) — ใส่ [placeholder] ไว้
footer สร้างใน assets/js/components.js (renderFooter)
"""
import json, os, sys
sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..")).replace("\\", "/")
PAGES = ROOT + "/content/pages/"
TPL = open(ROOT + "/_template.html", encoding="utf-8").read()
TODAY = "2026-11-17"
created = json.load(open(HERE + "/cache/created.json", encoding="utf-8"))


def write_page(slug, title, lead, blocks, note):
    blocks = [{"type": "page-hero", "heading": title, "lead": lead,
               "breadcrumb": [{"label": "หน้าหลัก", "href": "index.html"}, {"label": title}]}] + blocks
    page = {"$schema": "../blocks.schema.json", "_note": note, "title": title, "navKey": "home",
            "description": lead, "updatedAt": TODAY, "blocks": blocks}
    with open(PAGES + slug + ".json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(page, f, ensure_ascii=False, indent=2)
        f.write("\n")
    html = (TPL.replace("[แก้ไข] คำอธิบายหน้านี้ 1-2 ประโยค สำหรับ SEO", lead)
               .replace("[แก้ไข] ชื่อหน้า", title).replace("[แก้ไข-navKey]", "home").replace("[แก้ไข-slug]", slug))
    open(ROOT + "/" + slug + ".html", "w", encoding="utf-8", newline="\n").write(html)
    print(f"  {slug}.html")


POLICIES = {"type": "link-list", "id": "policies", "variant": "alt", "heading": "นโยบายอื่นของเว็บไซต์", "items": [
    {"title": "นโยบายเว็บไซต์ (Website Policy)", "href": "website-policy.html", "icon": "i-file"},
    {"title": "นโยบายการคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy)", "href": "privacy-policy.html", "icon": "i-shield"},
    {"title": "นโยบายคุกกี้ (Cookies Policy)", "href": "cookie-policy.html", "icon": "i-file"},
    {"title": "นโยบายการรักษาความมั่นคงปลอดภัยเว็บไซต์ (Website Security Policy)", "href": "security-policy.html", "icon": "i-shield"},
    {"title": "การปฏิเสธความรับผิด (Disclaimer)", "href": "disclaimer.html", "icon": "i-file"}]}


def policies(self_href):
    return {**POLICIES, "items": [it for it in POLICIES["items"] if it["href"] != self_href]}


# ---------- เว็บลิงก์หน่วยงานที่เกี่ยวข้อง (เฉพาะลิงก์ที่เว็บนี้/เว็บเดิมใช้อยู่จริง) ----------
write_page("related-links", "เว็บลิงก์หน่วยงานที่เกี่ยวข้อง",
           "ลิงก์ไปยังเว็บไซต์ของหน่วยงานและระบบที่เกี่ยวข้องกับสำนักงานราชบัณฑิตยสภา", [
    {"type": "link-list", "id": "agencies", "heading": "หน่วยงานที่เกี่ยวข้อง", "items": [
        {"title": "ราชบัณฑิตยสภา", "href": "https://royalsociety.go.th/", "icon": "i-external"},
        {"title": "เว็บไซต์เดิมของสำนักงานราชบัณฑิตยสภา", "href": "https://www.orst.go.th/", "icon": "i-external"}]},
    {"type": "link-list", "id": "systems", "variant": "alt", "heading": "ระบบฐานข้อมูลและบริการออนไลน์", "items": [
        {"title": "พจนานุกรม", "href": "https://dictionary.orst.go.th/", "icon": "i-dictionary"},
        {"title": "ศัพท์บัญญัติ สำนักงานราชบัณฑิตยสภา ออนไลน์", "href": "https://coined-word.orst.go.th/", "icon": "i-journal"},
        {"title": "ระบบฐานข้อมูลคำทับศัพท์สำนักงานราชบัณฑิตยสภา", "href": "https://transliteration.orst.go.th/", "icon": "i-pen"},
        {"title": "อักขรานุกรมภูมิศาสตร์ไทย", "href": "https://gazetteer.orst.go.th/", "icon": "i-map"},
        {"title": "สารานุกรมและอนุกรมวิธาน", "href": "https://lst.nectec.or.th/encyclopedia/", "icon": "i-book"},
        {"title": "คลังเอกสารเก่า", "href": "https://da3.thaidlt.org/", "icon": "i-database"},
        {"title": "ระบบทดสอบความรู้ด้านภาษาไทย", "href": "https://etest.orst.go.th/", "icon": "i-puzzle"},
        {"title": "พจนานุกรมภาษามือไทย ฉบับราชบัณฑิตยสภา", "href": "http://164.115.33.116/", "icon": "i-people"}]},
    {"type": "notice", "id": "more", "tone": "info", "body": "[เว็บลิงก์หน่วยงานภาครัฐอื่นที่สำนักงานต้องการแสดง — รอข้อมูลจากสำนักงาน]"}],
    "ลิงก์ที่เว็บนี้และเว็บเดิมใช้อยู่จริง — หน่วยงานอื่นรอรายชื่อจาก ORST")

# ---------- นโยบายการคุ้มครองข้อมูลส่วนบุคคล ----------
privacy = created.get("privacy")
write_page("privacy-policy", "นโยบายการคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy)",
           "นโยบายการคุ้มครองข้อมูลส่วนบุคคลของสำนักงานราชบัณฑิตยสภา ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562", [
    *([{"type": "document-list", "id": "documents", "heading": "เอกสารนโยบาย", "items": [privacy]}] if privacy else []),
    {"type": "link-list", "id": "rights", "heading": "สิทธิของเจ้าของข้อมูลส่วนบุคคล", "items": [
        {"title": "ช่องทางยื่นคำขอใช้สิทธิของเจ้าของข้อมูลส่วนบุคคล", "href": "data-subject-request.html", "icon": "i-form"},
        {"title": "นโยบายและแผนด้านข้อมูล", "href": "data-policy.html", "icon": "i-file"}]},
    policies("privacy-policy.html")],
    "เอกสารนโยบายจากเว็บเดิม (orst.go.th) — ไฟล์ยังชี้ไปเว็บไซต์เดิม รอย้ายเข้า CMS")

# ---------- นโยบายคุกกี้ ----------
write_page("cookie-policy", "นโยบายคุกกี้ (Cookies Policy)",
           "ข้อมูลการใช้คุกกี้และพื้นที่จัดเก็บข้อมูลในเบราว์เซอร์ของเว็บไซต์สำนักงานราชบัณฑิตยสภา", [
    {"type": "rich-text", "id": "about", "heading": "คุกกี้คืออะไร",
     "paragraphs": ["คุกกี้และพื้นที่จัดเก็บข้อมูลในเบราว์เซอร์ (Local Storage) คือข้อมูลขนาดเล็กที่เว็บไซต์บันทึกไว้ในอุปกรณ์ของผู้ใช้ เพื่อจดจำการตั้งค่าและช่วยให้ใช้งานเว็บไซต์ได้สะดวก",
                    "เว็บไซต์นี้ไม่ใช้คุกกี้เพื่อติดตามพฤติกรรมหรือโฆษณา"]},
    {"type": "table", "id": "storage", "heading": "ข้อมูลที่เว็บไซต์จัดเก็บในเบราว์เซอร์",
     "columns": ["ชื่อ", "ประเภท", "วัตถุประสงค์"],
     "rows": [["orst-lang", "จำเป็น", "จดจำภาษาที่เลือก (ไทย / อังกฤษ)"],
              ["orst-cookie-consent", "จำเป็น", "จดจำการตอบแถบขอความยินยอมคุกกี้"],
              ["มุมมองรายการ (เช่น kb-view)", "จำเป็น", "จดจำรูปแบบการแสดงผลแบบตารางหรือรายการ"]]},
    {"type": "rich-text", "id": "third-party", "heading": "เนื้อหาจากผู้ให้บริการภายนอก",
     "paragraphs": ["บางหน้ามีวิดีโอจาก YouTube ปฏิทินจาก Google Calendar และลิงก์ไปยัง Facebook ผู้ให้บริการเหล่านี้อาจบันทึกคุกกี้ของตนเองเมื่อผู้ใช้กดเล่นหรือเปิดเนื้อหา ซึ่งเป็นไปตามนโยบายของผู้ให้บริการนั้น",
                    "วิดีโอบนเว็บไซต์นี้เล่นผ่าน youtube-nocookie.com ซึ่งจะไม่บันทึกคุกกี้จนกว่าผู้ใช้จะกดเล่น"]},
    {"type": "rich-text", "id": "manage", "heading": "การจัดการคุกกี้",
     "paragraphs": ["ผู้ใช้เลือก “ยอมรับทั้งหมด” หรือ “เฉพาะที่จำเป็น” ได้ที่แถบขอความยินยอมเมื่อเข้าเว็บไซต์ครั้งแรก และลบข้อมูลที่จัดเก็บได้ทุกเมื่อจากการตั้งค่าของเบราว์เซอร์"]},
    {"type": "notice", "id": "official", "tone": "info", "body": "[ตัวบทนโยบายคุกกี้ฉบับทางการ — รอสำนักงานพิจารณาอนุมัติ]"},
    policies("cookie-policy.html")],
    "อธิบายตามสิ่งที่โค้ดเว็บนี้จัดเก็บจริง (localStorage ใน components.js / knowledge.js) — ตัวบททางการรอ ORST อนุมัติ")

# ---------- การเข้าถึงเว็บไซต์ ----------
write_page("accessibility", "การเข้าถึงเว็บไซต์ (Web Accessibility)",
           "เครื่องมือและแนวทางที่ช่วยให้ทุกคนเข้าถึงเนื้อหาบนเว็บไซต์สำนักงานราชบัณฑิตยสภาได้", [
    {"type": "feature-list", "id": "tools", "layout": "cards", "heading": "เครื่องมือช่วยการเข้าถึง",
     "intro": "กดปุ่ม “ช่วยการเข้าถึง” มุมขวาล่างของทุกหน้าเพื่อใช้เครื่องมือเหล่านี้", "items": [
        {"icon": "i-access", "title": "ปรับขนาดตัวอักษร", "body": "เพิ่ม ลด หรือคืนค่าขนาดตัวอักษรทั้งหน้า"},
        {"icon": "i-eye", "title": "สีตัดกันสูง", "body": "เปลี่ยนสีพื้นและตัวอักษรให้ตัดกันชัดเจน"},
        {"icon": "i-book", "title": "โหมดอ่านง่าย", "body": "เพิ่มระยะบรรทัดและระยะห่างให้อ่านสบายตา"},
        {"icon": "i-check", "title": "หยุดการเคลื่อนไหว", "body": "ปิดภาพเคลื่อนไหวและการเลื่อนอัตโนมัติ"}]},
    {"type": "rich-text", "id": "keyboard", "heading": "การใช้งานด้วยแป้นพิมพ์และโปรแกรมอ่านหน้าจอ",
     "paragraphs": ["กดปุ่ม Tab ที่ต้นหน้าเพื่อใช้ลิงก์ “ข้ามไปยังเนื้อหาหลัก” ทุกเมนูและปุ่มใช้งานได้ด้วยแป้นพิมพ์",
                    "รูปภาพมีข้อความอธิบาย และลิงก์ที่เปิดในแท็บใหม่มีข้อความแจ้งสำหรับโปรแกรมอ่านหน้าจอ"]},
    {"type": "notice", "id": "standard", "tone": "info", "body": "[ระดับมาตรฐานการเข้าถึงที่เว็บไซต์ผ่านการรับรอง (เช่น WCAG 2.1 / มาตรฐานเว็บไซต์ภาครัฐ) — รอผลการตรวจสอบ]"},
    {"type": "link-list", "id": "contact", "variant": "alt", "heading": "พบปัญหาในการเข้าถึง", "items": [
        {"title": "แจ้งปัญหาผ่านแบบฟอร์มติดต่อ", "href": "contact.html#message-form", "icon": "i-form"}]}],
    "อธิบายเครื่องมือที่มีจริงในเว็บ (โมดัลช่วยการเข้าถึงใน components.js) — ระดับมาตรฐานรอผลตรวจ")
