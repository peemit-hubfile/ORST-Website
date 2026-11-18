"""ขั้นที่ 10: หมวด 4 การปฏิบัติราชการ — เรียงตามผังเว็บไซต์ ORST และสร้างหน้าที่ยังขาด

  4.1 แผนปฏิบัติราชการ        4.1.1-4.1.10
  4.2 ผลการปฏิบัติราชการ      4.2.1-4.2.11
  4.3 ข้อมูลเปิดภาครัฐและการเปิดเผยข้อมูล 4.3.1-4.3.6

เอกสารคัดจากหน้าที่สร้างไว้แล้ว (ขั้นที่ 2) ตามชื่อเอกสาร:
  monthly-performance.json (iwfm_table.asp?a=19) -> แผนการดำเนินงาน / รอบ 6 เดือน / ประจำปี / ใช้จ่ายงบประมาณ / สถิติการให้บริการ
  performance-agreement.json (iwfm_table.asp?a=21) -> ผลสำรวจความพึงพอใจ
หน้าที่เว็บเดิมไม่มีเอกสาร = ข้อความ [รอข้อมูลจากสำนักงาน]
รันหลัง step2/step3 และก่อน step6 (แผนผังเว็บไซต์ + site-nav)
"""
# หมายเหตุ (17 พ.ย. 2569): หน้าหมวด operations ถูกเอาออกแล้ว — ส่วนที่อ่าน/เขียน operations.json ในไฟล์นี้ใช้ไม่ได้อีก
import json, os, re, sys
sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..")).replace("\\", "/")
PAGES = ROOT + "/content/pages/"
TPL = open(ROOT + "/_template.html", encoding="utf-8").read()
TODAY = "2026-11-17"
SIX = re.compile(r"รอบ\s*(6|๖)\s*เดือน")


def load(n):
    return json.load(open(PAGES + n + ".json", encoding="utf-8"))


def dump(n, p):
    with open(PAGES + n + ".json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(p, f, ensure_ascii=False, indent=2)
        f.write("\n")


def docs_of(n):
    return next(b for b in load(n)["blocks"] if b["type"] == "document-list")["items"]


A19, A21 = docs_of("monthly-performance"), docs_of("performance-agreement")
created = json.load(open(HERE + "/cache/created.json", encoding="utf-8"))
privacy = created.get("privacy")

PENDING = "[เอกสาร{} — รอข้อมูลจากสำนักงาน]"

# slug, ชื่อ (ตามผังเว็บไซต์), คำอธิบาย, เอกสาร
NEW = [
    ("annual-budget-plan", "แผนการดำเนินงานและงบประมาณรายจ่ายประจำปี",
     "แผนการดำเนินงานตามภารกิจ งบประมาณรายจ่าย และความก้าวหน้าในการดำเนินงานประจำปีของสำนักงานราชบัณฑิตยสภา",
     [d for d in A19 if d["title"].startswith("แผนการดำเนินงาน")]),
    ("service-time-standards", "มาตรฐานระยะเวลาการให้บริการ",
     "มาตรฐานระยะเวลาการให้บริการของสำนักงานราชบัณฑิตยสภา", []),
    ("six-month-report", "รายงานการกำกับติดตามการดำเนินงานและการใช้งบประมาณ รอบ ๖ เดือน",
     "รายงานการกำกับติดตามผลการดำเนินงานและการใช้จ่ายงบประมาณของสำนักงานราชบัณฑิตยสภา รอบ ๖ เดือน",
     [d for d in A19 if SIX.search(d["title"]) and not re.match(r"แผน|ข้อมูลสถิติ|จำนวน|ผลงานคณะกรรมการ", d["title"])]),
    ("annual-report", "รายงานผลการดำเนินงานประจำปี",
     "รายงานผลการดำเนินงานประจำปีงบประมาณของสำนักงานราชบัณฑิตยสภา",
     [d for d in A19 if re.search(r"^(รายงาน)?ผลการ(ดำเนินงาน|ปฏิบัติงาน|ปฏิบัติราชการ)|^สรุปผลการดำเนินงาน|^รายงานผลการดำเนินงาน", d["title"])
      and not SIX.search(d["title"])]),
    ("budget-spending-report", "รายงานผลการใช้จ่ายงบประมาณประจำปี",
     "รายงานผลการเบิกจ่ายและการใช้จ่ายงบประมาณประจำปีของสำนักงานราชบัณฑิตยสภา",
     [d for d in A19 if re.search(r"เบิกจ่าย|ใช้จ่ายงบประมาณ|งบการเงิน", d["title"]) and not SIX.search(d["title"])]),
    ("service-statistics", "ข้อมูลเชิงสถิติการให้บริการ",
     "ข้อมูลสถิติการให้บริการประชาชนของสำนักงานราชบัณฑิตยสภา",
     [d for d in A19 if re.search(r"สถิติการให้บริการ|จำนวน(การ)?ให้บริการ", d["title"])]
     + [d for d in A21 if "ผู้ใช้บริการ" in d["title"]]),
    ("satisfaction-survey", "รายงานผลการสำรวจความพึงพอใจการให้บริการ",
     "รายงานผลการสำรวจความพึงพอใจของผู้รับบริการและผู้มีส่วนได้ส่วนเสียของสำนักงานราชบัณฑิตยสภา",
     [d for d in A21 if re.search(r"ความพึงพอใจ|ความนิยม", d["title"])]),
    ("official-information", "ข้อมูลข่าวสารตามพระราชบัญญัติข้อมูลข่าวสารของราชการ พ.ศ. ๒๕๔๐",
     "ข้อมูลข่าวสารที่สำนักงานราชบัณฑิตยสภาเปิดเผยตามพระราชบัญญัติข้อมูลข่าวสารของราชการ พ.ศ. ๒๕๔๐", []),
    ("open-data", "ชุดข้อมูลเปิดภาครัฐ (Open Data)",
     "ชุดข้อมูลเปิดของสำนักงานราชบัณฑิตยสภาที่ประชาชนนำไปใช้ประโยชน์ได้", []),
    ("open-data-request", "แบบคำขอชุดข้อมูลเปิด",
     "แบบคำขอให้สำนักงานราชบัณฑิตยสภาเปิดเผยชุดข้อมูลเพิ่มเติม", []),
    ("data-policy", "นโยบายและแผนด้านข้อมูล (ธรรมาภิบาลข้อมูล การเปิดเผยข้อมูล และการคุ้มครองข้อมูลส่วนบุคคล)",
     "นโยบายและแผนด้านธรรมาภิบาลข้อมูล การเปิดเผยข้อมูล และการคุ้มครองข้อมูลส่วนบุคคลของสำนักงานราชบัณฑิตยสภา",
     [privacy] if privacy else []),
    ("public-disclosure", "การเปิดเผยข้อมูลสาธารณะ (ITA / OIT)",
     "การเปิดเผยข้อมูลสาธารณะตามการประเมินคุณธรรมและความโปร่งใสในการดำเนินงานของหน่วยงานภาครัฐ (ITA / OIT)", []),
    ("data-subject-request", "ช่องทางยื่นคำขอใช้สิทธิของเจ้าของข้อมูลส่วนบุคคล",
     "ช่องทางยื่นคำขอใช้สิทธิของเจ้าของข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. ๒๕๖๒", []),
]
SLUG = {t: s for s, t, _, _ in NEW}

for slug, title, lead, items in NEW:
    blocks = [{"type": "page-hero", "heading": title, "lead": lead,
               "breadcrumb": [{"label": "หน้าหลัก", "href": "index.html"}, {"label": "การปฏิบัติราชการ"}, {"label": title}]}]
    if items:
        blocks.append({"type": "document-list", "id": "documents", "items": items})
        note = "เอกสารคัดจากหน้าเว็บเดิม orst.go.th ตามชื่อเอกสาร — ลิงก์ยังชี้ไปเว็บไซต์เดิม รอย้ายไฟล์เข้า CMS"
    else:
        blocks.append({"type": "notice", "id": "pending", "tone": "info", "title": "อยู่ระหว่างรวบรวมข้อมูล",
                       "body": PENDING.format(title)})
        note = "เว็บไซต์เดิมยังไม่มีเอกสารหน้านี้ — รอข้อมูลจาก ORST แล้วเพิ่มเป็น document-list"
    page = {"$schema": "../blocks.schema.json", "_note": note, "title": title, "navKey": "about",
            "description": lead, "updatedAt": TODAY, "blocks": blocks}
    dump(slug, page)
    html = (TPL.replace("[แก้ไข] คำอธิบายหน้านี้ 1-2 ประโยค สำหรับ SEO", lead)
               .replace("[แก้ไข] ชื่อหน้า", title).replace("[แก้ไข-navKey]", "about").replace("[แก้ไข-slug]", slug))
    open(ROOT + "/" + slug + ".html", "w", encoding="utf-8", newline="\n").write(html)
    print(f"  {slug}.html  {len(items) if items else 'รอเอกสาร'}")

# ---------- หน้าหมวด operations: ลำดับและลิงก์ตามผังเว็บไซต์ ----------
def I(title, href=None, tag=None):
    it = {"title": title}
    if href: it["href"] = href
    if tag: it["tag"] = tag
    return it

S = lambda t: I(t, SLUG[t] + ".html")
p = load("operations")
idx = next(b for b in p["blocks"] if b["type"] == "page-index")
idx["groups"] = [
    {"heading": "แผนปฏิบัติราชการ", "icon": "i-journal", "items": [
        I("กฎหมายที่เกี่ยวข้อง", "related-laws.html"),
        I("คู่มือหรือมาตรฐานการปฏิบัติงาน", "operation-manuals.html"),
        I("แผนยุทธศาสตร์และแผนปฏิบัติการราชการ ๕ ปี", "strategic-plans.html"),
        I("แผนปฏิบัติราชการประจำปี", "annual-action-plan.html"),
        I("แผนบริหารความต่อเนื่อง", "continuity-plan.html"),
        I("แผนแม่บทเทคโนโลยีสารสนเทศ", "it-master-plan.html"),
        I("แผนบริหารความเสี่ยง", "risk-management-plan.html"),
        I("การลดใช้พลังงานของสำนักงานราชบัณฑิตยสภา", "energy-saving.html"),
        I("กฎบัตรการตรวจสอบภายใน", "internal-audit-charter.html"),
        S("แผนการดำเนินงานและงบประมาณรายจ่ายประจำปี")]},
    {"heading": "ผลการปฏิบัติราชการ", "icon": "i-file", "items": [
        I("คู่มือหรือมาตรฐานการให้บริการ", "service-manuals.html"),
        I("ผลการปฏิบัติราชการรายเดือน แยกตามผลผลิตและกิจกรรม", "monthly-performance.html"),
        S("มาตรฐานระยะเวลาการให้บริการ"),
        I("สรุปผลการปฏิบัติราชการตามคำรับรองการปฏิบัติราชการ", "performance-agreement.html"),
        I("รายงานสรุปผลการวิเคราะห์ต้นทุนต่อหน่วยผลผลิต / งบทดลอง", "unit-cost.html"),
        I("แบบรับฟังความคิดเห็น/ข้อเสนอแนะที่มีต่อการดำเนินงาน", "https://forms.gle/mc1qF9RCDQbvLnho6", "Google Form"),
        S("รายงานการกำกับติดตามการดำเนินงานและการใช้งบประมาณ รอบ ๖ เดือน"),
        S("รายงานผลการดำเนินงานประจำปี"),
        S("รายงานผลการใช้จ่ายงบประมาณประจำปี"),
        S("ข้อมูลเชิงสถิติการให้บริการ"),
        S("รายงานผลการสำรวจความพึงพอใจการให้บริการ")]},
    {"heading": "ข้อมูลเปิดภาครัฐและการเปิดเผยข้อมูล", "icon": "i-database", "items": [
        S("ข้อมูลข่าวสารตามพระราชบัญญัติข้อมูลข่าวสารของราชการ พ.ศ. ๒๕๔๐"),
        S("ชุดข้อมูลเปิดภาครัฐ (Open Data)"),
        S("แบบคำขอชุดข้อมูลเปิด"),
        S("นโยบายและแผนด้านข้อมูล (ธรรมาภิบาลข้อมูล การเปิดเผยข้อมูล และการคุ้มครองข้อมูลส่วนบุคคล)"),
        S("การเปิดเผยข้อมูลสาธารณะ (ITA / OIT)"),
        S("ช่องทางยื่นคำขอใช้สิทธิของเจ้าของข้อมูลส่วนบุคคล")]},
]
p["_note"] = "แม่แบบ T3 (หน้าหมวด) — เมนู 4 การปฏิบัติราชการ ลำดับตามผังเว็บไซต์ ORST (สร้างโดย step10_operations.py)"
dump("operations", p)
print(f"  operations.json  {sum(len(g['items']) for g in idx['groups'])} รายการใน 3 กลุ่ม")
