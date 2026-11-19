"""ขั้นที่ 12: หมวด 6 บริการวิชาการ — รายการ 6.1-6.20 ตามผังเว็บไซต์ ORST + หน้าที่ยังขาด

  6.14 งานบริการ (E-Service)                    -> e-services.html      (จาก orst.go.th/info.asp: 2 บริการ ระเบียบ/แบบฟอร์ม)
  6.15 คู่มือสำหรับประชาชน                        -> citizen-manual.html  (รอเอกสารจาก ORST)
  6.16 ดาวน์โหลดแบบฟอร์ม                          -> download-forms.html
  6.17 ประกาศช่องทางอิเล็กทรอนิกส์ในการติดต่อราชการ -> e-channels.html     (จาก orst.go.th/iwfm_list.asp?p=ABOUT-CONTACT)
  6.18 ข้อมูลการอนุญาตที่ดำเนินการแล้ว               -> permits-issued.html  (รอข้อมูลจาก ORST)
  6.19 ติดตามสถานะคำขอรับบริการ                    -> track-request.html   (ยังไม่มีระบบหลังบ้าน)
  6.20 คำแนะนำการใช้บริการออนไลน์                  -> e-service-guide.html

หน้า services.json: เพิ่ม page-index "บริการทั้งหมด" เรียง 6.1-6.20 (step6 ใช้ page-index นี้ทำแผนผังและเมนูย่อย)
รันหลัง step3 และก่อน step6
"""
import json, os, sys
sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..")).replace("\\", "/")
PAGES = ROOT + "/content/pages/"
TPL = open(ROOT + "/_template.html", encoding="utf-8").read()
TODAY = "2026-11-17"
OLD = "https://www.orst.go.th/"
PDF = OLD + "FILEROOM/CABROYINWEB/DRAWER001/GENERAL/DATA0000/{}.PDF"


def load(n):
    return json.load(open(PAGES + n + ".json", encoding="utf-8"))


def dump(n, p):
    with open(PAGES + n + ".json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(p, f, ensure_ascii=False, indent=2)
        f.write("\n")


def write_page(slug, title, lead, blocks, note):
    blocks = [{"type": "page-hero", "heading": title, "lead": lead,
               "breadcrumb": [{"label": "หน้าหลัก", "href": "index.html"}, {"label": "บริการวิชาการ", "href": "services.html"}, {"label": title}]}] + blocks
    dump(slug, {"$schema": "../blocks.schema.json", "_note": note, "title": title, "navKey": "services",
                "description": lead, "updatedAt": TODAY, "blocks": blocks})
    html = (TPL.replace("[แก้ไข] คำอธิบายหน้านี้ 1-2 ประโยค สำหรับ SEO", lead)
               .replace("[แก้ไข] ชื่อหน้า", title).replace("[แก้ไข-navKey]", "services").replace("[แก้ไข-slug]", slug))
    open(ROOT + "/" + slug + ".html", "w", encoding="utf-8", newline="\n").write(html)
    print(f"  {slug}.html")


def pending(title):
    return {"type": "notice", "id": "pending", "tone": "info", "title": "อยู่ระหว่างรวบรวมข้อมูล",
            "body": f"[{title} — รอข้อมูลจากสำนักงาน]"}


RELATED = {"type": "link-list", "id": "related", "variant": "alt", "heading": "บริการที่เกี่ยวข้อง", "items": [
    {"title": "งานบริการ (E-Service)", "href": "e-services.html", "icon": "i-form"},
    {"title": "ดาวน์โหลดแบบฟอร์ม", "href": "download-forms.html", "icon": "i-download"},
    {"title": "คำแนะนำการใช้บริการออนไลน์", "href": "e-service-guide.html", "icon": "i-file"},
    {"title": "ติดต่อสำนักงาน", "href": "contact.html", "icon": "i-phone-call"}]}


def related(exclude):
    return {**RELATED, "items": [it for it in RELATED["items"] if it["href"] != exclude]}


# บริการ e-Service จริงของเว็บเดิม (info.asp) — ระเบียบ/แบบฟอร์มเป็น PDF ส่งเอกสารทางอีเมล saraban@orst.go.th
SERVICES = [
    ("การขออนุญาตจัดพิมพ์และเผยแพร่สิ่งพิมพ์ สื่ออิเล็กทรอนิกส์ ข้อมูลอิเล็กทรอนิกส์ และสื่ออื่น ๆ ของสำนักงานราชบัณฑิตยสภา",
     "ตามระเบียบว่าด้วยการอนุญาตให้จัดพิมพ์และเผยแพร่สิ่งพิมพ์ สื่ออิเล็กทรอนิกส์ ข้อมูลทางอิเล็กทรอนิกส์ และสื่ออื่น ๆ ของสำนักงานราชบัณฑิตยสภา พ.ศ. 2561",
     "00000100", "00000237"),
    ("การขออนุญาตใช้สิทธิในการจัดพิมพ์และจำหน่ายหนังสือที่สำนักงานราชบัณฑิตยสภาผลิตขึ้นเพื่อเผยแพร่และจำหน่าย",
     "ตามระเบียบสำนักงานราชบัณฑิตยสภา ว่าด้วยการอนุญาตให้ใช้สิทธิการจัดพิมพ์และจำหน่ายหนังสือที่สำนักงานราชบัณฑิตยสภาผลิตขึ้นเพื่อเผยแพร่และจำหน่าย พ.ศ. 2561",
     "00000097", "00000238"),
]
SEND = "mailto:saraban@orst.go.th"

# ---------- 6.14 งานบริการ (E-Service) ----------
write_page("e-services", "งานบริการ (E-Service)",
           "บริการยื่นคำขออนุญาตออนไลน์ของสำนักงานราชบัณฑิตยสภา อ่านระเบียบ ดาวน์โหลดแบบฟอร์ม และส่งเอกสารทางอีเมล", [
    {"type": "feature-list", "id": "services", "layout": "cards", "heading": "บริการที่ยื่นคำขอได้", "items": [
        {"icon": "i-form", "title": t, "body": body, "links": [
            {"label": "ระเบียบ (PDF)", "href": PDF.format(rule)},
            {"label": "แบบฟอร์ม (PDF)", "href": PDF.format(form)},
            {"label": "ส่งเอกสาร saraban@orst.go.th", "href": SEND}]} for t, body, rule, form in SERVICES]},
    {"type": "notice", "id": "files", "tone": "info", "title": "การส่งเอกสาร",
     "body": "ส่งแบบฟอร์มที่กรอกแล้วพร้อมเอกสารประกอบทางอีเมล saraban@orst.go.th รองรับไฟล์ .pdf .doc .docx ขนาดไม่เกิน 10MB"},
    related("e-services.html")],
    "ข้อมูลจาก orst.go.th/info.asp (งานบริการ e-Services) — ไฟล์ระเบียบ/แบบฟอร์มยังชี้ไปเว็บไซต์เดิม เว็บเดิมส่งไฟล์อัปโหลดไปที่ saraban@orst.go.th")

# ---------- 6.15 คู่มือสำหรับประชาชน ----------
write_page("citizen-manual", "คู่มือสำหรับประชาชน",
           "คู่มือสำหรับประชาชนในการขอรับบริการจากสำนักงานราชบัณฑิตยสภา ตามพระราชบัญญัติการอำนวยความสะดวกในการพิจารณาอนุญาตของทางราชการ",
           [pending("คู่มือสำหรับประชาชน"), related("citizen-manual.html")],
           "เว็บไซต์เดิมยังไม่มีหน้านี้ — รอเอกสารจาก ORST แล้วเพิ่มเป็น document-list")

# ---------- 6.16 ดาวน์โหลดแบบฟอร์ม ----------
laws_forms = [it for it in next(b for b in load("laws-regulations")["blocks"] if b["type"] == "document-list")["items"]
              if it["title"].startswith("แบบ")]
forms = laws_forms + [{"title": f"แบบฟอร์ม{t}", "file": PDF.format(form)} for t, _, _, form in SERVICES]
seen, uniq = set(), []
for it in forms:
    key = it.get("file") or it.get("href")
    if key not in seen:
        seen.add(key); uniq.append(it)
write_page("download-forms", "ดาวน์โหลดแบบฟอร์ม",
           "แบบฟอร์มคำขอรับบริการของสำนักงานราชบัณฑิตยสภา ดาวน์โหลดไปกรอกแล้วส่งตามช่องทางที่กำหนด",
           [{"type": "document-list", "id": "forms", "items": uniq}, related("download-forms.html")],
           "แบบฟอร์มจากหน้ากฎหมาย ระเบียบ (laws-regulations.json) และงานบริการ e-Services ของเว็บเดิม — ไฟล์ยังชี้ไปเว็บไซต์เดิม")

# ---------- 6.17 ประกาศช่องทางอิเล็กทรอนิกส์ ----------
write_page("e-channels", "ประกาศช่องทางอิเล็กทรอนิกส์ในการติดต่อราชการ",
           "ช่องทางอิเล็กทรอนิกส์สำหรับการติดต่อสำนักงานราชบัณฑิตยสภา พ.ศ. 2568", [
    {"type": "table", "id": "channels", "heading": "ช่องทางอิเล็กทรอนิกส์สำหรับการติดต่อสำนักงานราชบัณฑิตยสภา พ.ศ. 2568",
     "columns": ["ช่องทาง", "ที่อยู่ / หมายเลข", "สำหรับติดต่อเรื่อง"],
     "rows": [
         ["อีเมล", "saraban@orst.go.th", "สอบถามข้อมูล ศัพท์ และติดต่อราชการทั่วไป"],
         ["อีเมล", "ribook@orst.go.th", "สอบถามและสั่งซื้อหนังสือ"],
         ["เว็บไซต์", "www.orst.go.th", "ข้อมูลข่าวสารและบริการของสำนักงาน"],
         ["โทรศัพท์", "02 141 1717", "สำนักงานเลขานุการกรม · สอบถามข้อมูล"],
         ["โทรศัพท์", "02 141 1718", "ห้องจำหน่ายหนังสือ"],
         ["โทรศัพท์", "02 141 1733", "กองศิลปกรรม"],
         ["โทรศัพท์", "02 141 1730", "กองวิทยาศาสตร์"],
         ["โทรศัพท์", "02 141 1732", "กองธรรมศาสตร์และการเมือง"]]},
    {"type": "rich-text", "id": "address", "heading": "ที่ทำการ",
     "paragraphs": ["สำนักงานราชบัณฑิตยสภา เลขที่ 120 หมู่ 3 ศูนย์ราชการเฉลิมพระเกียรติ 80 พรรษา 5 ธันวาคม 2550 (อาคารซี) กรุงเทพมหานคร 10210"]},
    related("e-channels.html")],
    "ข้อมูลจาก orst.go.th/iwfm_list.asp?p=ABOUT-CONTACT (ช่องทางอิเล็กทรอนิกส์สำหรับการติดต่อสำนักงานราชบัณฑิตยสภา พ.ศ. 2568) — ถ้ามีไฟล์ประกาศฉบับจริง ให้เพิ่มเป็น document-list")

# ---------- 6.18 ข้อมูลการอนุญาตที่ดำเนินการแล้ว ----------
write_page("permits-issued", "ข้อมูลการอนุญาตที่ดำเนินการแล้ว",
           "ข้อมูลการพิจารณาอนุญาตให้จัดพิมพ์ เผยแพร่ และใช้สิทธิในสิ่งพิมพ์ของสำนักงานราชบัณฑิตยสภาที่ดำเนินการแล้ว",
           [pending("ข้อมูลการอนุญาตที่ดำเนินการแล้ว"), related("permits-issued.html")],
           "เว็บไซต์เดิมยังไม่มีหน้านี้ — รอข้อมูลจาก ORST (เหมาะกับ table: เลขที่คำขอ เรื่อง วันที่อนุญาต)")

# ---------- 6.19 ติดตามสถานะคำขอรับบริการ ----------
write_page("track-request", "ติดตามสถานะคำขอรับบริการ",
           "ตรวจสอบความคืบหน้าของคำขอรับบริการที่ยื่นต่อสำนักงานราชบัณฑิตยสภา",
           [{"type": "notice", "id": "pending", "tone": "info", "title": "ระบบติดตามสถานะออนไลน์อยู่ระหว่างพัฒนา",
             "body": "ระหว่างนี้สอบถามความคืบหน้าของคำขอได้ทางอีเมล saraban@orst.go.th หรือโทรศัพท์ 02 141 1717 (สำนักงานเลขานุการกรม)"},
            related("track-request.html")],
           "ยังไม่มีระบบหลังบ้าน — เมื่อมี CMS/ระบบคำขอ ให้เปลี่ยนเป็นฟอร์มค้นหาด้วยเลขที่คำขอ")

# ---------- 6.20 คำแนะนำการใช้บริการออนไลน์ ----------
write_page("e-service-guide", "คำแนะนำการใช้บริการออนไลน์",
           "ขั้นตอนการยื่นคำขอรับบริการออนไลน์ของสำนักงานราชบัณฑิตยสภา", [
    {"type": "steps", "id": "steps", "layout": "timeline", "heading": "ขั้นตอนการยื่นคำขอ", "items": [
        {"title": "เลือกบริการ", "body": "เลือกบริการที่ต้องการในหน้างานบริการ (E-Service)"},
        {"title": "อ่านระเบียบ", "body": "อ่านระเบียบและเงื่อนไขของบริการนั้นให้ครบถ้วน"},
        {"title": "ดาวน์โหลดและกรอกแบบฟอร์ม", "body": "ดาวน์โหลดแบบฟอร์มคำขอ กรอกข้อมูล และเตรียมเอกสารประกอบ"},
        {"title": "ส่งเอกสาร", "body": "ส่งแบบฟอร์มและเอกสารประกอบทางอีเมล saraban@orst.go.th (ไฟล์ .pdf .doc .docx ขนาดไม่เกิน 10MB)"}]},
    related("e-service-guide.html")],
    "ขั้นตอนตามระบบงานบริการ e-Services ของเว็บเดิม (orst.go.th/info.asp)")

# ---------- services.json: รายการ 6.1-6.20 ----------
ITEMS = [
    ("พจนานุกรม", "dictionary.html"),
    ("ศัพท์บัญญัติ", "https://coined-word.orst.go.th/"),
    ("สารานุกรมและอนุกรมวิธาน", "https://lst.nectec.or.th/encyclopedia/"),
    ("คลังเอกสารเก่า", "https://da3.thaidlt.org/"),
    ("ระบบฐานข้อมูลคำทับศัพท์", "https://transliteration.orst.go.th/search"),
    ("อักขรานุกรมภูมิศาสตร์ไทย", "https://gazetteer.orst.go.th/"),
    ("คลังความรู้", "knowledge-base.html"),
    ("ขั้นตอนการสั่งซื้อหนังสือและวิธีการชำระเงิน", "book-ordering.html"),
    ("อินโฟกราฟิก", "infographics.html"),
    ("ระบบทดสอบความรู้ด้านภาษาไทย", "https://etest.orst.go.th/"),
    ("พจนานุกรมภาษามือไทย", "http://164.115.33.116/"),
    ("หลักเกณฑ์ต่าง ๆ", "language-guidelines.html"),
    ("ข้อมูลเสียง คู่มือระบบเขียนภาษาท้องถิ่นของกลุ่มชาติพันธุ์ด้วยอักษรไทย", "ethnic-language-audio.html"),
    ("งานบริการ (E-Service)", "e-services.html"),
    ("คู่มือสำหรับประชาชน", "citizen-manual.html"),
    ("ดาวน์โหลดแบบฟอร์ม", "download-forms.html"),
    ("ประกาศช่องทางอิเล็กทรอนิกส์ในการติดต่อราชการ", "e-channels.html"),
    ("ข้อมูลการอนุญาตที่ดำเนินการแล้ว", "permits-issued.html"),
    ("ติดตามสถานะคำขอรับบริการ", "track-request.html"),
    ("คำแนะนำการใช้บริการออนไลน์", "e-service-guide.html"),
]
p = load("services")
index = {"type": "page-index", "id": "all-services", "heading": "บริการวิชาการทั้งหมด", "columns": 2,
         "groups": [{"heading": "บริการวิชาการ", "icon": "i-service",
                     "items": [{"title": t, "href": h} for t, h in ITEMS]}]}
blocks = [b for b in p["blocks"] if b.get("id") != "all-services"]
cta = next((i for i, b in enumerate(blocks) if b["type"] == "cta-band"), len(blocks))
blocks.insert(cta, index)
for b in blocks:
    if b["type"] == "anchor-nav" and not any(it["href"] == "#all-services" for it in b["items"]):
        b["items"].append({"label": "บริการทั้งหมด", "href": "#all-services"})
    if b.get("id") == "academic-services":
        for it in b["items"]:
            if it["title"] == "คู่มือสำหรับประชาชน":
                it.pop("tag", None); it["href"] = "citizen-manual.html"
            if it["title"] == "ประกาศช่องทางอิเล็กทรอนิกส์ในการติดต่อราชการ":
                it.pop("tag", None); it["href"] = "e-channels.html"
p["blocks"] = blocks
dump("services", p)
print(f"  services.json  page-index {len(ITEMS)} รายการ")
