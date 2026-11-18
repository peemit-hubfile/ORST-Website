"""ขั้นที่ 11: หมวด 5 ข่าวสารและกิจกรรม — หน้าที่ยังขาดตามผังเว็บไซต์ ORST

  5.1.6 คลังภาพ          -> media-gallery.html  (อัลบั้มจากหน้าข่าว content/news/<id>.json → ลิงก์ album.html?id=<id>)
  5.1.7 คลังวิดีโอ        -> videos.html         (แก้รายการวิดีโอที่ content/pages/videos.json โดยตรง)
  5.1.8 RSS ข่าวสาร      -> rss.html            (ไฟล์ rss.xml สร้างโดย tools/build.mjs ตอนตั้ง SITE_URL)

ลำดับกลุ่มในหน้า news.json กำหนดที่ step3_hubs.py (5.1 ข่าวประชาสัมพันธ์ · 5.2 ประกาศ)
รันหลัง step5 (หน้าข่าว) และก่อน step6 (แผนผังเว็บไซต์ + site-nav)
"""
import glob, json, os, re, sys
sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..")).replace("\\", "/")
PAGES = ROOT + "/content/pages/"
TPL = open(ROOT + "/_template.html", encoding="utf-8").read()
TODAY = "2026-11-17"
TH_MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]


def load(n):
    return json.load(open(PAGES + n + ".json", encoding="utf-8"))


def dump(n, p):
    with open(PAGES + n + ".json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(p, f, ensure_ascii=False, indent=2)
        f.write("\n")


def write_page(slug, title, lead, blocks, note, image=None, **extra):
    hero = {"type": "page-hero", "heading": title, "lead": lead,
            "breadcrumb": [{"label": "หน้าหลัก", "href": "index.html"}, {"label": "ข่าวสารและกิจกรรม", "href": "news.html"}, {"label": title}]}
    if image:
        hero.update({"image": image, "imageAlt": ""})
    dump(slug, {"$schema": "../blocks.schema.json", "_note": note, "title": title, "navKey": "news",
                "description": lead, "updatedAt": TODAY, **extra, "blocks": [hero] + blocks})
    html = (TPL.replace("[แก้ไข] คำอธิบายหน้านี้ 1-2 ประโยค สำหรับ SEO", lead)
               .replace("[แก้ไข] ชื่อหน้า", title).replace("[แก้ไข-navKey]", "news").replace("[แก้ไข-slug]", slug))
    open(ROOT + "/" + slug + ".html", "w", encoding="utf-8", newline="\n").write(html)


def th_date(iso):
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{d} {TH_MONTH[m - 1]} {y + 543}"


# ---------- 5.1.6 คลังภาพ (อัลบั้ม = ข่าวที่มีภาพกิจกรรม) ----------
albums = []
for f in glob.glob(ROOT + "/content/news/*.json"):
    if f.endswith("index.json"):
        continue
    nid = os.path.basename(f)[:-5]
    p = json.load(open(f, encoding="utf-8"))
    hero = p["blocks"][0]
    media = next((b for b in p["blocks"] if b["type"] == "news-media"), {})
    images = media.get("images") or []
    # เฉพาะข่าวที่มีภาพกิจกรรม — ข้ามประกาศ/หนังสือเชิญ (ภาพเป็นสแกนเอกสาร ไม่ใช่ภาพกิจกรรม)
    if not images or hero.get("tag") == "ประกาศ" or re.match(r"(ประกาศ|ขอเชิญ)", hero["heading"]):
        continue
    albums.append({"date": hero.get("date", ""), "n": len(images), "item": {
        "image": images[0]["image"], "alt": hero["heading"], "tag": f"{len(images)} ภาพ",
        "title": hero["heading"], "desc": th_date(hero["date"]) if hero.get("date") else "",
        "href": f"album.html?id={nid}"}})
albums.sort(key=lambda a: a["date"], reverse=True)

title = "คลังภาพ"
lead = "ภาพกิจกรรมของสำนักงานราชบัณฑิตยสภา จัดเป็นอัลบั้มตามข่าว เลือกอัลบั้มเพื่อดูภาพทั้งหมด"
write_page("media-gallery", title, lead, [
    {"type": "media-grid", "id": "photos", "heading": "อัลบั้มภาพกิจกรรม",
     "columns": 3, "ratio": "4:3", "pageSize": 12, "unit": "อัลบั้ม", "items": [a["item"] for a in albums]},
], "อัลบั้มจากหน้าข่าว (content/news/<id>.json) แต่ละอัลบั้มเปิดที่ album.html?id=<id> — สร้างโดย step11_news.py รันใหม่หลังเพิ่มข่าว",
   image="assets/images/orst/news/data0005-00005374-960.jpg", sideNav=False)
print(f"  media-gallery.html  {len(albums)} อัลบั้ม")

# ---------- 5.1.7 RSS ข่าวสาร ----------
title = "RSS ข่าวสาร"
lead = "ติดตามข่าวประชาสัมพันธ์และข่าวกิจกรรมล่าสุดของสำนักงานราชบัณฑิตยสภาผ่านโปรแกรมอ่าน RSS"
write_page("rss", title, lead, [
    {"type": "rich-text", "id": "about-rss", "heading": "RSS คืออะไร",
     "paragraphs": ["RSS (Really Simple Syndication) คือรูปแบบไฟล์สำหรับเผยแพร่ข่าวที่อัปเดตอยู่เสมอ "
                    "เมื่อนำลิงก์ RSS ไปใส่ในโปรแกรมอ่าน RSS หรือแอปพลิเคชันอ่านข่าว จะได้รับข่าวใหม่ของสำนักงานโดยไม่ต้องเข้าเว็บไซต์"]},
    {"type": "link-list", "id": "feeds", "variant": "alt", "heading": "ช่อง RSS ของสำนักงาน", "items": [
        {"title": "ข่าวสารและกิจกรรม (ข่าวประชาสัมพันธ์ทั่วไป และข่าวกิจกรรม)", "href": "rss.xml", "icon": "i-megaphone",
         "desc": "คัดลอกลิงก์นี้ไปใส่ในโปรแกรมอ่าน RSS"}]},
    {"type": "steps", "id": "how", "heading": "วิธีติดตามข่าวผ่าน RSS", "items": [
        {"title": "คัดลอกลิงก์ RSS", "body": "คลิกขวาที่ลิงก์ช่อง RSS ด้านบน แล้วเลือกคัดลอกที่อยู่ลิงก์"},
        {"title": "เปิดโปรแกรมอ่าน RSS", "body": "เปิดโปรแกรมหรือแอปพลิเคชันอ่าน RSS ที่ใช้อยู่ แล้วเลือกเพิ่มแหล่งข่าวใหม่"},
        {"title": "วางลิงก์และบันทึก", "body": "วางลิงก์ที่คัดลอกไว้ แล้วบันทึก ข่าวใหม่ของสำนักงานจะแสดงในโปรแกรมโดยอัตโนมัติ"}]},
], "rss.xml สร้างโดย tools/build.mjs จาก general-news.json + activity-news.json (ต้องตั้ง SITE_URL ตอน build)")
print("  rss.html")

# ---------- หน้าหมวด news: ลิงก์ 5.1.6 / 5.1.7 ----------
p = load("news")
for g in next(b for b in p["blocks"] if b["type"] == "page-index")["groups"]:
    for it in g["items"]:
        if it["title"] == "คลังภาพ":
            it["href"] = "media-gallery.html"
        if it["title"] == "RSS ข่าวสาร":
            it["href"] = "rss.html"
dump("news", p)
