"""ขั้นที่ 3: อัปเดตหน้าหมวด (about / operations / news / services / dictionary) ให้ลิงก์ไปหน้าที่สร้างจากข้อมูลจริง"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scrape import CACHE, get, main_wrapper, text  # noqa
sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")).replace("\\", "/") + "/content/pages/"
HERE = os.path.dirname(os.path.abspath(__file__))
TODAY = "2026-11-13"
created = json.load(open(os.path.join(CACHE, "created.json"), encoding="utf-8"))
history = text(main_wrapper(get("iwfm_list.asp?p=ABOUT-HISTORY-ORS")))


def load(n):
    return json.load(open(ROOT + n + ".json", encoding="utf-8"))


def dump(n, p):
    with open(ROOT + n + ".json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(p, f, ensure_ascii=False, indent=2)
        f.write("\n")


def I(title, href=None, tag=None):
    it = {"title": title}
    if href:
        it["href"] = href
    if tag:
        it["tag"] = tag
    return it


# ---------- infographic: ชื่อที่หายไป 1 รายการ (ถอดจากภาพ) ----------
p = load("infographics")
for it in p["blocks"][1]["items"]:
    if not it["title"]:
        it["title"] = it["alt"] = "คำที่มักเขียนผิด ๑๒/๒๕๖๖ เปอร์เซ็นต์"
dump("infographics", p)

# ---------- about (หมวด 3) ----------
p = load("about")
hero = p["blocks"][0]
vision = load("vision-mission")["blocks"][1]["sections"][0]["paragraphs"][0]
p["_note"] = "หน้าหมวด 3 เกี่ยวกับสำนักงาน (แม่แบบ T3) ข้อความภาพรวมจาก orst.go.th — รายการที่ไม่มี href = รอเนื้อหาจาก ORST"
p["description"] = "ประวัติ วิสัยทัศน์ ผู้บริหาร โครงสร้าง กฎหมาย และข้อมูลการต่อต้านการทุจริตของสำนักงานราชบัณฑิตยสภา"
hero["lead"] = p["description"]
p["updatedAt"] = TODAY
p["blocks"] = [hero,
    {"type": "rich-text", "id": "overview", "heading": "ภาพรวมองค์กร",
     "paragraphs": [history[0], "วิสัยทัศน์ : " + vision]},
    {"type": "page-index", "id": "sections", "variant": "alt", "columns": 2, "groups": [
        # ลำดับตามผังเว็บไซต์ ORST: 3.1 ผู้บริหาร · 3.2 ศปท. · 3.3 ข้อมูลองค์กร · 3.4 บุคลากร
        {"heading": "ผู้บริหาร", "icon": "i-user", "items": [
            I("ผู้บริหารสำนักงานราชบัณฑิตยสภา", "executives.html"),
            I("ผู้บริหารเทคโนโลยีสารสนเทศระดับสูง (CIO)", "cio.html"),
            I("การบริหารงานด้านเทคโนโลยีสารสนเทศของ CIO", "cio-it-management.html")]},
        {"heading": "ศูนย์ปฏิบัติการต่อต้านการทุจริต (ศปท.)", "icon": "i-shield", "href": "anti-corruption-center.html", "items": [
            I("ข้อมูลของ ศปท.", "anti-corruption-center.html"),
            I("ช่องทางแจ้งเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ", "corruption-complaints.html"),
            I("แนวปฏิบัติการจัดการเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ", "complaint-guidelines.html"),
            I("ข้อมูลเชิงสถิติเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ", "complaint-statistics.html"),
            I("มาตรการป้องกันการรับสินบน (No Gift Policy)", "no-gift-policy.html"),
            I("การประเมินความเสี่ยงและแผนป้องกันการทุจริต", "anti-corruption-plan.html"),
            I("จริยธรรมและมาตรการส่งเสริมคุณธรรมและความโปร่งใส", "ethics.html")]},
        {"heading": "ข้อมูลองค์กร", "icon": "i-book", "items": [
            I("ประวัติความเป็นมา", "history.html"), I("วิสัยทัศน์ พันธกิจ", "vision-mission.html"),
            I("ค่านิยม", "core-values.html"), I("โครงสร้างหน่วยงานและการแบ่งส่วนราชการ", "organization-structure.html"),
            I("เครื่องหมายราชการ", "emblem.html"), I("กฎหมาย ระเบียบ และข้อบังคับที่เกี่ยวข้อง", "laws-regulations.html"),
            I("อำนาจหน้าที่และภารกิจ", "duties.html")]},
        {"heading": "บุคลากรและการบริหารทรัพยากรบุคคล", "icon": "i-people", "items": [
            I("คณะกรรมการวิชาการ และกรรมการอื่น", "committees.html"),
            I("นโยบายและแผนการบริหารทรัพยากรบุคคล", "hr-plan.html"), I("หลักเกณฑ์การบริหารและพัฒนาทรัพยากรบุคคล", "hr-criteria.html"),
            I("รายงานผลการบริหารและพัฒนาทรัพยากรบุคคลประจำปี", "hr-annual-report.html")]},
    ]},
    {"type": "cta-band", "heading": "การปฏิบัติราชการ", "body": "แผนปฏิบัติราชการ ผลการปฏิบัติราชการ และข้อมูลเปิดภาครัฐ",
     "actions": [{"label": "ดูการปฏิบัติราชการ", "href": "operations.html"}]}]
dump("about", p)

# ---------- operations (หมวด 4) ----------
p = load("operations")
links = {
    "กฎหมายที่เกี่ยวข้อง": "related-laws.html", "คู่มือหรือมาตรฐานการปฏิบัติงาน": "operation-manuals.html",
    "แผนยุทธศาสตร์และแผนปฏิบัติการราชการ ๕ ปี": "strategic-plans.html", "แผนบริหารความต่อเนื่อง": "continuity-plan.html",
    "แผนแม่บทเทคโนโลยีสารสนเทศ": "it-master-plan.html", "แผนบริหารความเสี่ยง": "risk-management-plan.html",
    "การลดใช้พลังงานของสำนักงานราชบัณฑิตยสภา": "energy-saving.html", "กฎบัตรการตรวจสอบภายใน": "internal-audit-charter.html",
    "คู่มือหรือมาตรฐานการให้บริการ": "service-manuals.html",
    "ผลการปฏิบัติราชการรายเดือน แยกตามผลผลิตและกิจกรรม": "monthly-performance.html",
    "สรุปผลการปฏิบัติราชการตามคำรับรองการปฏิบัติราชการ": "performance-agreement.html",
    "รายงานสรุปผลการวิเคราะห์ต้นทุนต่อหน่วยผลผลิต / งบทดลอง": "unit-cost.html",
}
for g in p["blocks"][1]["groups"]:
    for it in g["items"]:
        if it["title"] in links:
            it["href"] = links[it["title"]]
            it.pop("tag", None)
        if it["title"] == "มาตรฐานระยะเวลาการให้บริการ":  # เว็บเดิมไม่มีเอกสาร
            it.pop("href", None); it.pop("tag", None)
        if it["title"].startswith("แบบรับฟังความคิดเห็น"):
            it["href"] = "https://forms.gle/mc1qF9RCDQbvLnho6"
            it["tag"] = "Google Form"
        if it["title"] == "นโยบายและแผนด้านข้อมูล" and created.get("privacy"):
            it["href"] = created["privacy"]["href"]
            it["title"] = "นโยบายการคุ้มครองข้อมูลส่วนบุคคล"
            it["tag"] = "เว็บไซต์เดิม"
p["_note"] = "แม่แบบ T3 (หน้าหมวด) — เมนู 4 การปฏิบัติราชการ ลิงก์ไปหน้าที่สร้างจากข้อมูลจริงของ orst.go.th รายการที่ไม่มี href = รอเนื้อหาจาก ORST"
dump("operations", p)

# ---------- news (หมวด 5) ----------
p = load("news")
hero = p["blocks"][0]
latest = created["news"]["general-news"][:6]
p["_note"] = "หน้าหมวด 5 ข่าวสารและกิจกรรม (แม่แบบ T3) ข่าวล่าสุดจาก orst.go.th/iwfm_table.asp?a=34"
p["updatedAt"] = TODAY
p["blocks"] = [hero,
    {"type": "document-list", "id": "latest", "heading": "ข่าวประชาสัมพันธ์ล่าสุด", "layout": "compact",
     "action": {"label": "ดูข่าวทั้งหมด", "href": "general-news.html"}, "items": latest},
    {"type": "page-index", "id": "sections", "variant": "alt", "columns": 2, "groups": [
        {"heading": "ข่าวประชาสัมพันธ์", "icon": "i-megaphone", "items": [
            I("ข่าวประชาสัมพันธ์ทั่วไป", "general-news.html"), I("ข่าวกิจกรรม", "activity-news.html"),
            I("การบรรยายทางวิชาการ", "academic-lectures.html"), I("ปฏิทินกิจกรรม", "event-calendar.html"),
            I("คำถาม-คำตอบ (Q&A)", "qa.html"), I("คลังภาพและวิดีโอ", "media-gallery.html"), I("RSS ข่าวสาร", "rss.html")]},
        {"heading": "ประกาศ", "icon": "i-file", "items": [
            I("ประกาศการจัดซื้อจัดจ้าง", "procurement-notices.html"), I("ประกาศผลจัดซื้อจัดจ้าง", "procurement-results.html"),
            I("ประกาศราคากลาง", "reference-prices.html"), I("สรุปผลการจัดซื้อจัดจ้างรายเดือน (แบบ สขร.1)", "procurement-summary.html"),
            I("ประกาศผลการจัดซื้อจัดจ้าง (รายไตรมาส)", "procurement-quarterly.html"), I("ประกาศแผนจัดซื้อจัดจ้าง", "procurement-plans.html"),
            I("ประกาศขายทอดตลาด", "auctions.html"), I("ประกาศรับสมัครงานและประกาศด้านการบริหารงานบุคคล", "job-announcements.html"),
            I("ข่าวสารทางราชการ", "official-news.html"), I("ประกาศเผยแพร่สัญญา", "contracts.html")]}]}]
dump("news", p)

# ---------- services (หมวด 6) ----------
# โครงหน้า (hero รูป, การ์ดบริการ, ไทล์ระบบสืบค้น ฯลฯ) จัดด้วยมือแล้ว — ที่นี่อัปเดตเฉพาะข้อมูลจากเว็บเดิม:
# แบบฟอร์มดาวน์โหลด (จากหน้ากฎหมาย/ระเบียบ) และช่องทางร้องเรียน
p = load("services")
for b in p["blocks"]:
    if b.get("id") == "forms":
        laws = load("laws-regulations")["blocks"][1]["items"]
        b["items"] = [it for it in laws if it["title"].startswith("แบบ")]
    if b.get("id") == "channels":
        # ช่องทางร้องเรียน — เบอร์/อีเมล/Google Form จากเว็บเดิม (Google Form อยู่ในหน้าการปฏิบัติราชการ)
        b["items"] = [
            {"icon": "i-megaphone", "title": "ร้องเรียนการให้บริการ", "body": "แจ้งปัญหาหรือข้อขัดข้องในการรับบริการของสำนักงาน",
             "links": [{"label": "0 2141 1718", "href": "tel:021411718"},
                       {"label": "saraban@orst.go.th", "href": "mailto:saraban@orst.go.th"}]},
            {"icon": "i-shield", "title": "แจ้งเบาะแสการทุจริต", "body": "หรือใช้กล่องรับเรื่องร้องเรียนบริเวณชั้น 1 สำนักงานราชบัณฑิตยสภา",
             "links": [{"label": "anti.corruption@orst.go.th", "href": "mailto:anti.corruption@orst.go.th"},
                       {"label": "ช่องทางร้องเรียนการทุจริต", "href": "corruption-complaints.html"}]},
            {"icon": "i-pen", "title": "เสนอแนะต่อการดำเนินงาน", "body": "แบบรับฟังความคิดเห็น/ข้อเสนอแนะที่มีต่อการดำเนินงานของสำนักงาน",
             "links": [{"label": "แบบรับฟังความคิดเห็น (Google Form)", "href": "https://forms.gle/mc1qF9RCDQbvLnho6"}]}]
p["updatedAt"] = TODAY
dump("services", p)

# ---------- dictionary ----------
p = load("dictionary")
ext = {"พจนานุกรมออนไลน์": "https://dictionary.orst.go.th/", "ศัพท์บัญญัติ": "https://coined-word.orst.go.th/",
       "สารานุกรมและอนุกรมวิธาน": "https://lst.nectec.or.th/encyclopedia/"}
guides = {it["title"]: it for it in load("language-guidelines")["blocks"][1]["items"]}
for b in p["blocks"]:
    if b.get("id") == "services":
        for it in b["items"]:
            it["href"] = ext.get(it["title"], it.get("href"))
    if b.get("id") == "guidelines":
        b["items"] = [{"title": t, "href": guides[t]["href"], "icon": "i-file"} for t in
                      ["หลักเกณฑ์การทับศัพท์", "การถอดอักษรไทยเป็นอักษรโรมัน", "เครื่องหมายวรรคตอน",
                       "การเว้นวรรค", "การเขียนคำย่อ", "ราชาศัพท์"] if t in guides]
        b["action"] = {"label": "ดูหลักเกณฑ์ทั้งหมด", "href": "language-guidelines.html"}
p["_note"] = "ลิงก์ระบบและหลักเกณฑ์จาก orst.go.th — คำถามที่พบบ่อยด้านภาษายังเป็นตัวอย่างเดิม"
dump("dictionary", p)
print("ok")
