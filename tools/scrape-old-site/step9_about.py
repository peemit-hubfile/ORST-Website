"""ขั้นที่ 9: หมวด 3 เกี่ยวกับสำนักงาน — หน้าที่ยังขาดตามผังเว็บไซต์ (ORST Sitemap)

  3.1.4 การบริหารงานด้านเทคโนโลยีสารสนเทศของ CIO   -> cio-it-management.html (รอเอกสารจาก ORST)
  3.4.2 นโยบายและแผนการบริหารทรัพยากรบุคคล          -> hr-plan.html
  3.4.3 หลักเกณฑ์การบริหารและพัฒนาทรัพยากรบุคคล     -> hr-criteria.html
  3.4.4 รายงานผลการบริหารและพัฒนาทรัพยากรบุคคลประจำปี -> hr-annual-report.html

เอกสาร 3.4.x คัดจาก "ประกาศฝ่ายบริหารงานบุคคล" ของเว็บเดิม (job-announcements.json, ขั้นที่ 2) ตามชื่อเอกสาร
ลำดับกลุ่มในหน้า about.json กำหนดที่ step3_hubs.py (3.1 ผู้บริหาร · 3.2 ศปท. · 3.3 ข้อมูลองค์กร · 3.4 บุคลากร)
"""
import json, os, re, sys
sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")).replace("\\", "/")
PAGES = ROOT + "/content/pages/"
TPL = open(ROOT + "/_template.html", encoding="utf-8").read()
TODAY = "2026-11-17"


def load(n):
    return json.load(open(PAGES + n + ".json", encoding="utf-8"))


def write_page(slug, page):
    page = {"$schema": "../blocks.schema.json", **page}
    with open(PAGES + slug + ".json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(page, f, ensure_ascii=False, indent=2)
        f.write("\n")
    html = (TPL.replace("[แก้ไข] คำอธิบายหน้านี้ 1-2 ประโยค สำหรับ SEO", page["description"])
               .replace("[แก้ไข] ชื่อหน้า", page["title"]).replace("[แก้ไข-navKey]", "about").replace("[แก้ไข-slug]", slug))
    open(ROOT + "/" + slug + ".html", "w", encoding="utf-8", newline="\n").write(html)


def hero(title, lead):
    return {"type": "page-hero", "heading": title, "lead": lead,
            "breadcrumb": [{"label": "หน้าหลัก", "href": "index.html"}, {"label": "เกี่ยวกับเรา", "href": "about.html"}, {"label": title}]}


HR_SOURCE = next(b for b in load("job-announcements")["blocks"] if b["type"] == "document-list")["items"]
HR_PAGES = [
    ("hr-plan", "นโยบายและแผนการบริหารทรัพยากรบุคคล",
     "นโยบายการบริหารทรัพยากรบุคคล และแผนการบริหารและพัฒนาทรัพยากรบุคคลประจำปีของสำนักงานราชบัณฑิตยสภา",
     lambda t: re.search(r"แผน(การ)?บริหารและพัฒนาทรัพยากรบุคคล|นโยบายการบริหารทรัพยากรบุคคล", t)),
    ("hr-criteria", "หลักเกณฑ์การบริหารและพัฒนาทรัพยากรบุคคล",
     "ประกาศหลักเกณฑ์และวิธีการด้านการบริหารและพัฒนาบุคลากร เช่น การประเมินผลการปฏิบัติราชการ การคัดเลือก และการแต่งตั้ง",
     lambda t: "หลักเกณฑ์" in t and not re.search(r"จัดซื้อ|พัสดุ", t)),
    ("hr-annual-report", "รายงานผลการบริหารและพัฒนาทรัพยากรบุคคลประจำปี",
     "รายงานผลการบริหารและพัฒนาทรัพยากรบุคคลของสำนักงานราชบัณฑิตยสภาในแต่ละปีงบประมาณ",
     lambda t: "รายงานผลการบริหารและพัฒนาทรัพยากรบุคคล" in t),
]

for slug, title, lead, match in HR_PAGES:
    items = [it for it in HR_SOURCE if match(it["title"])]
    write_page(slug, {
        "_note": "เอกสารคัดจากประกาศฝ่ายบริหารงานบุคคล orst.go.th (iwfm_table.asp?a=7) — ลิงก์ยังชี้ไปเว็บไซต์เดิม รอย้ายไฟล์เข้า CMS",
        "title": title, "navKey": "about", "description": lead, "updatedAt": TODAY,
        "blocks": [hero(title, lead),
                   {"type": "document-list", "id": "documents", "items": items},
                   {"type": "link-list", "id": "related", "variant": "alt", "heading": "ข้อมูลที่เกี่ยวข้อง", "items": [
                       {"title": t, "href": h, "icon": "i-file"} for t, h in [
                           ("นโยบายและแผนการบริหารทรัพยากรบุคคล", "hr-plan.html"),
                           ("หลักเกณฑ์การบริหารและพัฒนาทรัพยากรบุคคล", "hr-criteria.html"),
                           ("รายงานผลการบริหารและพัฒนาทรัพยากรบุคคลประจำปี", "hr-annual-report.html"),
                           ("ประกาศรับสมัครงานและประกาศด้านการบริหารงานบุคคล", "job-announcements.html")] if h != slug + ".html"]}]})
    print(f"  {slug}.html  {len(items)} เอกสาร")

title = "การบริหารงานด้านเทคโนโลยีสารสนเทศของ CIO"
lead = "นโยบาย แนวทาง และผลการบริหารงานด้านเทคโนโลยีสารสนเทศของผู้บริหารเทคโนโลยีสารสนเทศระดับสูงสำนักงานราชบัณฑิตยสภา"
write_page("cio-it-management", {
    "_note": "เว็บไซต์เดิมยังไม่มีหน้านี้ — รอเอกสารจาก ORST แล้วเพิ่มเป็น document-list",
    "title": title, "navKey": "about", "description": lead, "updatedAt": TODAY,
    "blocks": [hero(title, lead),
               {"type": "notice", "id": "pending", "tone": "info", "title": "อยู่ระหว่างรวบรวมข้อมูล",
                "body": "[เอกสารการบริหารงานด้านเทคโนโลยีสารสนเทศของ CIO — รอข้อมูลจากสำนักงาน]"},
               {"type": "link-list", "id": "related", "variant": "alt", "heading": "ข้อมูลที่เกี่ยวข้อง", "items": [
                   {"title": "ผู้บริหารเทคโนโลยีสารสนเทศระดับสูง (CIO)", "href": "cio.html", "icon": "i-user"},
                   {"title": "แผนแม่บทเทคโนโลยีสารสนเทศ", "href": "it-master-plan.html", "icon": "i-file"},
                   {"title": "นโยบายการรักษาความมั่นคงปลอดภัยเว็บไซต์", "href": "security-policy.html", "icon": "i-shield"}]}]})
print("  cio-it-management.html  (รอเอกสาร)")
