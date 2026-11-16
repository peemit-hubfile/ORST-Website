"""ขั้นที่ 2: สร้างหน้าเนื้อหาตาม sitemap จากข้อมูลจริงของเว็บเดิม (หมวด 3-6)"""
import concurrent.futures as cf
import io
import json
import os
import re
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scrape import CACHE, BASE, get, table, list_docs, expand_page, main_wrapper, text, one_line, absu, file_size  # noqa

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")).replace("\\", "/")
TODAY = "2026-11-13"
TPL = open(f"{ROOT}/_template.html", encoding="utf-8").read()
SRC_NOTE = "ข้อมูลจาก {} (ดึงเมื่อ 13 พ.ย. 2569) ลิงก์เอกสารยังชี้ไปเว็บไซต์เดิม รอย้ายไฟล์เข้า CMS"
HOME = ("หน้าหลัก", "index.html")
P = {  # หน้าแม่ของแต่ละหมวด (ใช้ทำ breadcrumb)
    "about": ("เกี่ยวกับเรา", "about.html"),
    "ops": ("การปฏิบัติราชการ", "operations.html"),
    "news": ("ข่าวสารและกิจกรรม", "news.html"),
    "services": ("บริการวิชาการ", "services.html"),
}
NAV = {"about": "about", "ops": "about", "news": "news", "services": "services"}
CREATED = []


def crumbs(parent, title, mid=None):
    c = [HOME, P[parent]] + ([mid] if mid else []) + [(title, None)]
    return [{"label": l, **({"href": h} if h else {})} for l, h in c]


def save(slug, title, parent, description, blocks, source, mid=None, lead=None):
    page = {
        "$schema": "../blocks.schema.json",
        "_note": SRC_NOTE.format(source),
        "title": title,
        "navKey": NAV[parent],
        "description": description,
        "updatedAt": TODAY,
        "blocks": [{"type": "page-hero", "heading": title, "lead": lead or description,
                    "breadcrumb": crumbs(parent, title, mid)}] + blocks,
    }
    with open(f"{ROOT}/content/pages/{slug}.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(page, f, ensure_ascii=False, indent=2)
        f.write("\n")
    html = (TPL.replace("[แก้ไข] คำอธิบายหน้านี้ 1-2 ประโยค สำหรับ SEO", description)
               .replace("[แก้ไข] ชื่อหน้า", title)
               .replace("[แก้ไข-navKey]", page["navKey"])
               .replace("[แก้ไข-slug]", slug))
    with open(f"{ROOT}/{slug}.html", "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    CREATED.append(slug)
    n = sum(len(b.get("items", [])) for b in blocks if b["type"] == "document-list")
    print(f"  {slug}.html  {title}  ({n} รายการ)" if n else f"  {slug}.html  {title}")


def clean(items):
    """ตัดฟิลด์ภายใน (_xxx) และ category ที่ซ้ำกับชื่อเอกสารทุกรายการ"""
    out = []
    cats = {it.get("category") for it in items}
    for it in items:
        it = {k: v for k, v in it.items() if not k.startswith("_") and v not in (None, "")}
        if len(cats) <= 1:
            it.pop("category", None)
        out.append(it)
    return out


def sizes(items):
    files = [it["file"] for it in items if it.get("file")]
    with cf.ThreadPoolExecutor(8) as ex:
        res = dict(zip(files, ex.map(file_size, files)))
    for it in items:
        if it.get("file") and res.get(it["file"]):
            it["fileSize"] = res[it["file"]]
    return items


def docs(items, **kw):
    return {"type": "document-list", "id": kw.pop("id", "documents"), "items": clean(sizes(items)), **kw}


def doc_page(slug, title, parent, description, items, source, **kw):
    save(slug, title, parent, description, [docs(items, **kw)], source)


# ============================================================================
# หมวด 3 เกี่ยวกับสำนักงาน
# ============================================================================
print("หมวด 3")

def person(name, position, image, phone=None, email=None):
    p = {"name": name, "position": position, "image": f"assets/images/orst/people/{image}.jpg", "alt": name}
    if phone: p["phone"] = phone
    if email: p["email"] = email
    return p


save("executives", "ผู้บริหารสำนักงานราชบัณฑิตยสภา", "about",
     "รายชื่อผู้บริหารสำนักงานราชบัณฑิตยสภาและหมายเลขโทรศัพท์ติดต่อ",
     [{"type": "person-grid", "id": "executives", "columns": 4, "items": [
         person("นายศุภฤกษ์ ภู่พงศ์ศักดิ์", "เลขาธิการราชบัณฑิตยสภา", "secretary-general", "02-141-1725"),
         person("นายศานติ ภักดีคำ", "รองเลขาธิการราชบัณฑิตยสภา", "deputy-secretary-general", "02-141-1718", "Santi.p@orst.go.th")]},
      {"type": "person-grid", "id": "directors", "columns": 4, "heading": "ผู้อำนวยการหน่วยงานภายใน", "variant": "alt", "items": [
          person("นางสาวอารี พลดี", "เลขานุการกรม", "director-1", "02-141-1723"),
          person("นางกนกวรรณ ทองตะโก", "ผู้อำนวยการกองธรรมศาสตร์และการเมือง", "director-2", "02-141-1732"),
          person("นางสาวกุลศิรินทร์ นาคไพจิตร", "ผู้อำนวยการกองวิทยาศาสตร์", "director-3", "02-141-1730"),
          person("นางสาวปิยรัตน์ อินทร์อ่อน", "ผู้อำนวยการกองศิลปกรรม", "director-4", "02-141-1733")]}],
     "orst.go.th/iwfm_list.asp?p=ABOUT-EXC (ชื่อ ตำแหน่ง เบอร์โทร ถอดจากภาพบนเว็บเดิม)")

save("cio", "ผู้บริหารเทคโนโลยีสารสนเทศระดับสูง (CIO)", "about",
     "ข้อมูลผู้บริหารเทคโนโลยีสารสนเทศระดับสูงของสำนักงานราชบัณฑิตยสภา",
     [{"type": "person-grid", "id": "cio", "columns": 4, "items": [
         person("นายศานติ ภักดีคำ", "รองเลขาธิการราชบัณฑิตยสภา ผู้บริหารเทคโนโลยีสารสนเทศระดับสูง (CIO)",
                "deputy-secretary-general", "02-141-1718", "Santi.p@orst.go.th")]},
      {"type": "link-list", "id": "related", "variant": "alt", "heading": "ข้อมูลที่เกี่ยวข้อง",
       "items": [{"title": "แผนแม่บทเทคโนโลยีสารสนเทศ", "href": "it-master-plan.html", "icon": "i-file"}]}],
     "orst.go.th/iwfm_list.asp?p=ABOUT-CIO (ถอดข้อความจากภาพ) — ข้อ 4.3 ยังขาดที่อยู่ และโทรสาร")

# --- ศปท. ---
a11 = table(11)
nogift_re = re.compile(r"No Gift|ของขวัญ|รับสินบน|ของกำนัล|ประโยชน์อื่นใด", re.I)
mid_acc = ("ศูนย์ปฏิบัติการต่อต้านการทุจริต", "anti-corruption-center.html")


def acc_page(slug, title, description, items, source):
    save(slug, title, "about", description, [docs(items)], source, mid=None if slug == "anti-corruption-center" else mid_acc)


acc_page("anti-corruption-center", "ศูนย์ปฏิบัติการต่อต้านการทุจริต (ศปท.)",
         "ข้อมูลของศูนย์ปฏิบัติการต่อต้านการทุจริต สำนักงานราชบัณฑิตยสภา", table(9), "orst.go.th/iwfm_table.asp?a=9")

save("corruption-complaints", "ช่องทางแจ้งเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ", "about",
     "ช่องทางแจ้งเรื่องร้องเรียนการทุจริตและประพฤติมิชอบของเจ้าหน้าที่สำนักงานราชบัณฑิตยสภา",
     [{"type": "article", "id": "channels", "toc": False,
       "intro": ["หากท่านพบเห็นเจ้าหน้าที่ของสำนักงานราชบัณฑิตยสภา เข้าข่ายกระทำการทุจริตและประพฤติมิชอบ สามารถแจ้งเรื่องร้องเรียนดังกล่าว ตามช่องทาง ดังนี้"],
       "sections": [
           {"heading": "กล่องรับเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ", "paragraphs": ["บริเวณชั้น 1 สำนักงานราชบัณฑิตยสภา"]},
           {"heading": "ทางจดหมาย", "paragraphs": ["ศูนย์ปฏิบัติการต่อต้านการทุจริต (ศปท.) สำนักงานราชบัณฑิตยสภา ศูนย์ราชการเฉลิมพระเกียรติ ๘๐ พรรษา ๕ ธันวาคม ๒๕๕๐ (อาคารซี) ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร ๑๐๒๑๐"]},
           {"heading": "ทางอีเมล", "html": "<p><a href=\"mailto:anti.corruption@orst.go.th\">anti.corruption@orst.go.th</a></p>"},
           {"heading": "ทางโทรศัพท์", "paragraphs": ["0 2356 0466-70 ต่อ 2021"]}]},
      docs(table(13), id="guidelines", heading="แนวทางการดำเนินการต่อเรื่องร้องเรียน", variant="alt", layout="compact")],
     "orst.go.th/iwfm_mb.asp — เบอร์โทร 0 2356 xxxx เป็นเลขหมายเดิมสมัยสนามเสือป่า ให้ ORST ยืนยัน",
     mid=mid_acc)

acc_page("complaint-guidelines", "แนวปฏิบัติการจัดการเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ",
         "คู่มือและแนวทางการดำเนินการต่อเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ", table(13), "orst.go.th/iwfm_table.asp?a=13")
acc_page("complaint-statistics", "ข้อมูลเชิงสถิติเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ",
         "ข้อมูลสถิติเรื่องร้องเรียนการทุจริตและประพฤติมิชอบของเจ้าหน้าที่สำนักงานราชบัณฑิตยสภา", table(14), "orst.go.th/iwfm_table.asp?a=14")
acc_page("no-gift-policy", "มาตรการป้องกันการรับสินบน (No Gift Policy)",
         "ประกาศเจตนารมณ์และผลการดำเนินการตามนโยบายไม่รับของขวัญและของกำนัล (No Gift Policy)",
         [it for it in a11 if nogift_re.search(it["title"])], "orst.go.th/iwfm_table.asp?a=11 (เฉพาะรายการที่เกี่ยวกับ No Gift)")
plan_items = [dict(it, category="แผนและรายงานการป้องกันการทุจริต") for it in a11 if not nogift_re.search(it["title"])]
plan_items += [dict(it, category="คู่มือการป้องกันผลประโยชน์ทับซ้อน") for it in table(12)]
plan_items += [dict(it, category="แผนปฏิบัติการป้องกันและปราบปรามการทุจริต") for it in list_docs("ATP-ACCP", 1)]
acc_page("anti-corruption-plan", "การประเมินความเสี่ยงและแผนป้องกันการทุจริต",
         "ผลการประเมินความเสี่ยง แผนปฏิบัติการ และรายงานผลการป้องกันและปราบปรามการทุจริต", plan_items,
         "orst.go.th/iwfm_table.asp?a=11, a=12 และ iwfm_list.asp?p=ATP-ACCP")
eth = [dict(it, category="เจตจำนงการบริหารงานด้วยความซื่อสัตย์สุจริต") for it in table(10)]
for p, name in [("ABOUT-ETHICS", "ประมวลจริยธรรม"), ("ABOUT-MORALITY", "จรรยาข้าราชการพลเรือน"),
                ("ABOUT-BOARD-ETHICS", "คณะกรรมการจริยธรรม"), ("ABOUT-PROJECT-ETHICS", "โครงการ/กิจกรรมที่เกี่ยวข้อง"),
                ("ABOUT-LAPES-ETHICS", "การป้องกันการล่วงละเมิดหรือคุกคามทางเพศ"),
                ("ABOUT-DRIVE-ETHICS", "องค์กรคุณธรรมต้นแบบ"), ("ABOUT-RULE-ETHICS", "ข้อกำหนดจริยธรรม"),
                ("ABOUT-GUIDE-ETHICS", "แนวทางการปฏิบัติตนตามประมวลจริยธรรม"),
                ("ABOUT-FROMHR-ETHICS", "แบบฟอร์มรายงานผลการนำการประเมินจริยธรรมไปใช้"),
                ("ABOUT-FROMCHANCE-ETHICS", "แบบฟอร์มรายงานผลการเปิดโอกาสให้มีส่วนร่วม")]:
    for it in expand_page(f"iwfm_list.asp?p={p}&s=1", name, name):
        it["category"] = name
        eth.append(it)
acc_page("ethics", "จริยธรรมและมาตรการส่งเสริมคุณธรรมและความโปร่งใส",
         "ประมวลจริยธรรม ข้อกำหนดจริยธรรม และมาตรการส่งเสริมคุณธรรมและความโปร่งใสของสำนักงานราชบัณฑิตยสภา",
         eth, "orst.go.th/iwfm_table.asp?a=10 และหน้า ABOUT-*-ETHICS")

# --- ข้อมูลองค์กร ---
vis = main_wrapper(get("iwfm_list.asp?p=ABOUT-VISION"))
vlines = text(vis)
duties = [l for l in vlines if re.match(r"\([๐-๙]+\)", l)]
vision_text = vlines[vlines.index("วิสัยทัศน์") + 1]
save("vision-mission", "วิสัยทัศน์ พันธกิจ", "about",
     "วิสัยทัศน์และพันธกิจของสำนักงานราชบัณฑิตยสภา",
     [{"type": "article", "id": "vision", "toc": False, "sections": [
         {"heading": "วิสัยทัศน์", "paragraphs": [vision_text]},
         {"heading": "พันธกิจ", "paragraphs": ["สำนักงานราชบัณฑิตยสภามีอำนาจหน้าที่ดังต่อไปนี้"], "list": duties}]}],
     "orst.go.th/iwfm_list.asp?p=ABOUT-VISION")

save("core-values", "ค่านิยม", "about", "ค่านิยมของราชบัณฑิตยสภา",
     [{"type": "article", "id": "values", "toc": False, "sections": [
         {"heading": "ค่านิยมราชบัณฑิตยสภา", "paragraphs": ["ปฏิบัติงานโดยยึดหลัก"],
          "list": ["ความถูกต้อง", "เป็นมาตรฐาน", "และมีจิตบริการ"]}]}],
     "orst.go.th/iwfm_list.asp?p=ABOUT-VALUE")

org = text(main_wrapper(get("iwfm_list.asp?p=ABOUT-ORGCHART&s=1")))
org_docs = list_docs("ABOUT-ORGCHART", 0)
save("organization-structure", "โครงสร้างหน่วยงานและการแบ่งส่วนราชการ", "about",
     "แผนภูมิและการแบ่งส่วนราชการของสำนักงานราชบัณฑิตยสภา",
     [{"type": "article", "id": "divisions", "toc": False,
       "sections": [{"heading": org[0] if org else "การแบ่งส่วนราชการ",
                     "list": [l for l in org[1:] if l.startswith("(")] or None,
                     "paragraphs": [l for l in org[1:] if not l.startswith("(")]}]},
      docs([it for it in org_docs if it.get("file")], id="chart", heading="แผนภูมิการแบ่งส่วนราชการ", variant="alt", layout="compact")],
     "orst.go.th/iwfm_list.asp?p=ABOUT-ORGCHART")

emb = text(main_wrapper(get("iwfm_list.asp?p=ABOUT-EMB")))
th_desc = next(l for l in emb if l.startswith("เครื่องหมายเป็นรูป"))
en_desc = next(l for l in emb if l.startswith("The emblem"))
save("emblem", "เครื่องหมายราชการ", "about", "ความหมายของเครื่องหมายราชการของสำนักงานราชบัณฑิตยสภา",
     [{"type": "two-column", "id": "emblem", "image": "assets/images/orst/about/emblem.png",
       "imageAlt": "เครื่องหมายราชการของสำนักงานราชบัณฑิตยสภา", "imageSide": "left",
       "subheading": "เครื่องหมายราชการของสำนักงานราชบัณฑิตยสภา", "paragraphs": [th_desc]},
      {"type": "rich-text", "id": "emblem-en", "variant": "alt", "heading": "Official Emblem of the Office of the Royal Society",
       "html": f"<p lang=\"en\">{en_desc}</p>"},
      docs([{"title": "ประกาศสำนักนายกรัฐมนตรี เรื่อง กำหนดภาพเครื่องหมายราชการ ตามพระราชบัญญัติเครื่องหมายราชการ พุทธศักราช ๒๔๘๒ (ฉบับที่ ๒๙๕)",
             "file": "http://www.ratchakitcha.soc.go.th/DATA/PDF/2561/E/100/1.PDF", "note": "ราชกิจจานุเบกษา"}],
           id="reference", heading="เอกสารอ้างอิง", layout="compact")],
     "orst.go.th/iwfm_list.asp?p=ABOUT-EMB")

doc_page("laws-regulations", "กฎหมาย ระเบียบ และข้อบังคับที่เกี่ยวข้อง", "about",
         "พระราชบัญญัติ ข้อบังคับ ระเบียบ และประกาศที่เกี่ยวข้องกับราชบัณฑิตยสภาและสำนักงานราชบัณฑิตยสภา",
         list_docs("ABOUT-RUL-0", 1), "orst.go.th/iwfm_list.asp?p=ABOUT-RUL-0", sort="none")

save("duties", "อำนาจหน้าที่และภารกิจ", "about",
     "อำนาจหน้าที่ของสำนักงานราชบัณฑิตยสภาตามพระราชบัญญัติราชบัณฑิตยสภา พ.ศ. ๒๕๕๘ และการแบ่งส่วนราชการ",
     [{"type": "article", "id": "duties", "toc": False, "sections": [
         {"heading": "อำนาจหน้าที่ของสำนักงานราชบัณฑิตยสภา", "paragraphs": ["สำนักงานราชบัณฑิตยสภามีอำนาจหน้าที่ดังต่อไปนี้"], "list": duties},
         {"heading": "หน่วยงานภายใน", "list": [l for l in org[1:] if l.startswith("(")]}]},
      {"type": "notice", "tone": "info", "body": "ภารกิจและหน้าที่ความรับผิดชอบของแต่ละหน่วยงานภายใน อยู่ระหว่างรอข้อมูลจากสำนักงานราชบัณฑิตยสภา"}],
     "orst.go.th/iwfm_list.asp?p=ABOUT-VISION (อำนาจหน้าที่) และ ABOUT-ORGCHART (หน่วยงานภายใน)")

doc_page("committees", "คณะกรรมการวิชาการ และกรรมการอื่น", "about",
         "รายชื่อคณะกรรมการวิชาการและคณะกรรมการอื่นของสำนักงานราชบัณฑิตยสภา",
         list_docs("BOARD-LIST", 1), "orst.go.th/iwfm_list.asp?p=BOARD-LIST", sort="none")

# ============================================================================
# หมวด 4 การปฏิบัติราชการ
# ============================================================================
print("หมวด 4")
for slug, title, desc, src, kind, kw in [
    ("related-laws", "กฎหมายที่เกี่ยวข้อง", "กฎหมายที่เกี่ยวข้องกับการปฏิบัติราชการของสำนักงานราชบัณฑิตยสภา", ("ATP-RDL", 2), "list", {}),
    ("operation-manuals", "คู่มือหรือมาตรฐานการปฏิบัติงาน", "คู่มือการปฏิบัติงานและมาตรฐานการปฏิบัติงานของสำนักงานราชบัณฑิตยสภา", ("ATP-PAP", 0), "list", {}),
    ("strategic-plans", "แผนยุทธศาสตร์และแผนปฏิบัติราชการ ๕ ปี", "แผนยุทธศาสตร์และแผนปฏิบัติราชการระยะ ๕ ปีของสำนักงานราชบัณฑิตยสภา", ("ATP-SGP", 4), "list", {}),
    ("continuity-plan", "แผนบริหารความต่อเนื่อง", "แผนบริหารความต่อเนื่องของสำนักงานราชบัณฑิตยสภา", ("CTMP-63", 0), "list", {}),
    ("it-master-plan", "แผนแม่บทเทคโนโลยีสารสนเทศ", "แผนแม่บทเทคโนโลยีสารสนเทศและแผนปฏิบัติการดิจิทัลของสำนักงานราชบัณฑิตยสภา", ("ATP-ITMS", 1), "list", {}),
    ("risk-management-plan", "แผนบริหารความเสี่ยง", "แผนบริหารความเสี่ยงของสำนักงานราชบัณฑิตยสภา", ("ATP-RMP", 1), "list", {}),
    ("energy-saving", "การลดใช้พลังงานของสำนักงานราชบัณฑิตยสภา", "มาตรการและผลการลดใช้พลังงานของสำนักงานราชบัณฑิตยสภา", 15, "table", {}),
    ("internal-audit-charter", "กฎบัตรการตรวจสอบภายใน", "กฎบัตรการตรวจสอบภายในของสำนักงานราชบัณฑิตยสภา", 16, "table", {}),
    ("service-manuals", "คู่มือหรือมาตรฐานการให้บริการ", "คู่มือและมาตรฐานการให้บริการของสำนักงานราชบัณฑิตยสภา", 18, "table", {}),
    ("monthly-performance", "ผลการปฏิบัติราชการรายเดือน แยกตามผลผลิตและกิจกรรม", "รายงานผลการปฏิบัติราชการรายเดือน แยกตามผลผลิตและกิจกรรม", 19, "table", {}),
    ("performance-agreement", "สรุปผลการปฏิบัติราชการตามคำรับรองการปฏิบัติราชการ", "สรุปผลการปฏิบัติราชการตามคำรับรองการปฏิบัติราชการของสำนักงานราชบัณฑิตยสภา", 21, "table", {}),
    ("unit-cost", "รายงานสรุปผลการวิเคราะห์ต้นทุนต่อหน่วยผลผลิต / งบทดลอง", "รายงานผลการวิเคราะห์ต้นทุนต่อหน่วยผลผลิตและงบทดลอง", 22, "table", {}),
]:
    if kind == "list":
        items, source = list_docs(*src), f"orst.go.th/iwfm_list.asp?p={src[0]}"
    else:
        items, source = table(src), f"orst.go.th/iwfm_table.asp?a={src}"
    doc_page(slug, title, "ops", desc, items, source, **kw)

# ============================================================================
# หมวด 5 ข่าวสารและกิจกรรม
# ============================================================================
print("หมวด 5")
news_pages = [
    ("general-news", "ข่าวประชาสัมพันธ์ทั่วไป", "ข่าวประชาสัมพันธ์ของสำนักงานราชบัณฑิตยสภา", 34),
    ("activity-news", "ข่าวกิจกรรม", "ข่าวกิจกรรมของสำนักงานราชบัณฑิตยสภา", 35),
    ("academic-lectures", "การบรรยายทางวิชาการ", "การบรรยายทางวิชาการของราชบัณฑิตและผู้ทรงคุณวุฒิ", 23),
    ("procurement-results", "ประกาศผลจัดซื้อจัดจ้าง", "ประกาศผลการจัดซื้อจัดจ้างของสำนักงานราชบัณฑิตยสภา", 3),
    ("reference-prices", "ประกาศราคากลาง", "ประกาศราคากลางการจัดซื้อจัดจ้างของสำนักงานราชบัณฑิตยสภา", 4),
    ("procurement-summary", "สรุปผลการจัดซื้อจัดจ้างรายเดือน (แบบ สขร.1)", "สรุปผลการดำเนินการจัดซื้อจัดจ้างรายเดือนของสำนักงานราชบัณฑิตยสภา", 5),
    ("procurement-quarterly", "ประกาศผลการจัดซื้อจัดจ้าง (รายไตรมาส)", "ประกาศผลการจัดซื้อจัดจ้างรายไตรมาสของสำนักงานราชบัณฑิตยสภา", 6),
    ("procurement-plans", "ประกาศแผนจัดซื้อจัดจ้าง", "ประกาศแผนการจัดซื้อจัดจ้างประจำปีของสำนักงานราชบัณฑิตยสภา", 39),
    ("auctions", "ประกาศขายทอดตลาด", "ประกาศขายทอดตลาดของสำนักงานราชบัณฑิตยสภา", 40),
    ("job-announcements", "ประกาศรับสมัครงานและประกาศด้านการบริหารงานบุคคล", "ประกาศรับสมัครงานและประกาศด้านการบริหารงานบุคคลของสำนักงานราชบัณฑิตยสภา", 7),
    ("official-news", "ข่าวสารทางราชการ", "ข่าวสารทางราชการที่สำนักงานราชบัณฑิตยสภาเผยแพร่", 8),
    ("contracts", "ประกาศเผยแพร่สัญญา", "การเผยแพร่สัญญาจัดซื้อจัดจ้างของสำนักงานราชบัณฑิตยสภา", 41),
]
NEWS_DATA = {}
for slug, title, desc, a in news_pages:
    items = table(a)
    NEWS_DATA[slug] = items
    doc_page(slug, title, "news", desc, items, f"orst.go.th/iwfm_table.asp?a={a}")

# ปฏิทินกิจกรรม — ฝัง Google Calendar ตัวเดียวกับเว็บเดิม
cal = re.search(r'<iframe[^>]+src="(https://calendar\.google\.com/[^"]+)"', get("iwfm_calendar.asp")).group(1).replace("&amp;", "&")
save("event-calendar", "ปฏิทินกิจกรรม", "news", "ปฏิทินกิจกรรมของสำนักงานราชบัณฑิตยสภา",
     [{"type": "rich-text", "id": "calendar", "width": "full",
       "html": f'<iframe src="{cal}" title="ปฏิทินกิจกรรมสำนักงานราชบัณฑิตยสภา (Google Calendar)" style="width:100%;height:640px;border:0" loading="lazy"></iframe>'}],
     "orst.go.th/iwfm_calendar.asp (Google Calendar)")

# คำถาม-คำตอบ
qa_html = get("iwfm_qa.asp")
qa = []
for row in re.findall(r"<tr>(.*?)</tr>", qa_html[qa_html.find("<tbody"):qa_html.find("</tbody>")], re.S):
    q = re.search(r'class="text-primary"><b>(.*?)</b>', row, re.S)
    if not q:
        continue
    a_part = row[q.end():]
    qa.append({"q": re.sub(r"^คำถาม\s*:\s*", "", one_line(q.group(1))),
               "a": re.sub(r"^คำตอบ\s*:\s*", "", " ".join(text(a_part)))})
save("qa", "คำถาม-คำตอบ (Q&A)", "news", "คำถามและคำตอบเกี่ยวกับการใช้ภาษาไทยที่ประชาชนสอบถามมายังสำนักงานราชบัณฑิตยสภา",
     [{"type": "faq", "id": "qa", "items": qa}], "orst.go.th/iwfm_qa.asp")

# ============================================================================
# หมวด 6 บริการวิชาการ
# ============================================================================
print("หมวด 6")
doc_page("knowledge-base", "คลังความรู้", "services", "เอกสารความรู้เผยแพร่ของสำนักงานราชบัณฑิตยสภา",
         table(28), "orst.go.th/iwfm_table.asp?a=28", sort="none")
doc_page("language-guidelines", "หลักเกณฑ์ต่าง ๆ", "services",
         "หลักเกณฑ์การใช้ภาษาไทย การทับศัพท์ การถอดอักษร การอ่าน และการเขียนชื่อต่าง ๆ ที่สำนักงานราชบัณฑิตยสภากำหนด",
         table(36), "orst.go.th/iwfm_table.asp?a=36", sort="none")
doc_page("ethnic-language-audio", "ข้อมูลเสียง คู่มือระบบเขียนภาษาท้องถิ่นของกลุ่มชาติพันธุ์ด้วยอักษรไทย", "services",
         "ข้อมูลเสียงประกอบคู่มือระบบเขียนภาษาท้องถิ่นของกลุ่มชาติพันธุ์ด้วยอักษรไทย", table(42), "orst.go.th/iwfm_table.asp?a=42")

bb = text(main_wrapper(get("iwfm_list.asp?p=ABOUT-BUY-BOOK")))
save("book-ordering", "ขั้นตอนการสั่งซื้อหนังสือและวิธีการชำระเงิน", "services",
     "ขั้นตอนการสั่งซื้อหนังสือของสำนักงานราชบัณฑิตยสภาและวิธีการชำระเงิน",
     [{"type": "article", "id": "order", "toc": False,
       "intro": [bb[1]],
       "sections": [{"heading": "วิธีการชำระเงิน", "list": [re.sub(r"^[๑๒]\.", "", l).strip() for l in bb[2:4]]},
                    {"heading": "สอบถามข้อมูลเพิ่มเติม",
                     "html": "<p>" + bb[4].replace("ribook@orst.go.th", "") + '<a href="mailto:ribook@orst.go.th">ribook@orst.go.th</a></p>'}]},
      {"type": "notice", "tone": "warn", "title": "ข้อมูลจากเว็บไซต์เดิม",
       "body": "ที่อยู่สำหรับสั่งจ่ายธนาณัติ หมายเลขโทรสาร และหมายเลขโทรศัพท์ในหน้านี้เป็นข้อมูลชุดเดิม (ก่อนย้ายมาศูนย์ราชการฯ แจ้งวัฒนะ) อยู่ระหว่างรอสำนักงานยืนยัน"}],
     "orst.go.th/iwfm_list.asp?p=ABOUT-BUY-BOOK — ที่อยู่ ธนาณัติ/แฟกซ์/โทร เป็นของเดิมสมัยสนามเสือป่า ให้ ORST ยืนยัน")

# อินโฟกราฟิก — ย่อรูปเก็บในโปรเจกต์ ลิงก์ไปภาพเต็มบนเว็บเดิม
ib = get("iwfm_book.asp?p=INFO-%,Infographic")
infos = []
for td in re.findall(r"<td>(.*?)</td>", ib, re.S):
    m = re.search(r"<a href=(/FILEROOM/[^ >]+)[^>]*><img[^>]*>.*?<br>(.*?)</a>", td, re.S)
    if m:
        infos.append({"src": absu(m.group(1)), "title": one_line(m.group(2))})
IMG_DIR = f"{ROOT}/assets/images/orst/infographic"
os.makedirs(IMG_DIR, exist_ok=True)


def thumb(it):
    name = os.path.splitext(os.path.basename(it["src"]))[0].lower() + ".jpg"
    path = f"{IMG_DIR}/{name}"
    if not os.path.exists(path):
        from PIL import Image
        raw = urllib.request.urlopen(urllib.request.Request(it["src"], headers={"User-Agent": "Mozilla/5.0"}), timeout=90).read()
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        im.thumbnail((600, 1200))
        im.save(path, quality=82, optimize=True)
    return f"assets/images/orst/infographic/{name}"


with cf.ThreadPoolExecutor(8) as ex:
    paths = list(ex.map(thumb, infos))
save("infographics", "อินโฟกราฟิก", "services", "อินโฟกราฟิกความรู้ด้านภาษาไทยและศาสตร์ต่าง ๆ จากสำนักงานราชบัณฑิตยสภา",
     [{"type": "media-grid", "id": "infographics", "columns": 4, "ratio": "1:1", "fit": "contain",
       "items": [{"image": p, "alt": it["title"], "title": it["title"], "href": it["src"]} for p, it in zip(paths, infos)]}],
     "orst.go.th/iwfm_book.asp?p=INFO-% (รูปย่อเก็บใน assets/images/orst/infographic ลิงก์ไปภาพเต็มบนเว็บเดิม)")

json.dump({"created": CREATED, "news": {k: v[:8] for k, v in NEWS_DATA.items()}, "privacy": next(
    (it for it in NEWS_DATA["official-news"] if "คุ้มครองข้อมูลส่วนบุคคล" in it["title"]), None)},
    open(os.path.join(CACHE, "created.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"\nสร้าง {len(CREATED)} หน้า")
