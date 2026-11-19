"""ขั้นที่ 15: ข่าวสารพร้อมเชื่อม CMS — ข้อมูลข่าวอยู่ที่เดียว แม่แบบหน้าข่าวหน้าเดียว

ก่อน: ข่าวแต่ละเรื่อง = news-<id>.html + content/pages/news-<id>.json · รายการข่าวฝังซ้ำใน general-news / activity-news / news
หลัง:
  content/news/index.json      รายการข่าวทั้งหมด (ชื่อ วันที่ ช่อง รูปปก คำโปรย) — แหล่งเดียวของรายการข่าวทุกที่
  content/news/<id>.json       เนื้อหาข่าว 1 เรื่อง (โครงหน้าแบบเดิม: page-hero article + news-media + rich-text + news-related)
  news-detail.html?id=<id>     แม่แบบหน้ารายละเอียดข่าวหน้าเดียว
  news-<id>.html               ไฟล์ส่งต่อไป news-detail.html?id=<id> (ลิงก์เดิมยังใช้ได้)
  general-news / activity-news / academic-lectures / news  → document-list ใช้ "source" ดึงจาก index.json

รันซ้ำได้ (ข้ามส่วนที่ย้ายแล้ว) — รันหลัง step5 (ซึ่งยังสร้างหน้าแบบเดิม) และก่อน step11 (คลังภาพ) / step6
"""
import glob, json, os, re, sys
sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..")).replace("\\", "/")
PAGES = ROOT + "/content/pages/"
NEWS = ROOT + "/content/news/"
TPL = open(ROOT + "/_template.html", encoding="utf-8").read()
NEWS_LINK = re.compile(r"news-([a-z0-9]{12})\.html")
LISTS = {"general-news": "general", "activity-news": "activity", "academic-lectures": "lecture"}
os.makedirs(NEWS, exist_ok=True)


def load(p):
    return json.load(open(p, encoding="utf-8"))


def dump(p, d):
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


def relink(v):
    """news-<id>.html -> news-detail.html?id=<id> ทุกที่ในค่า JSON"""
    if isinstance(v, dict):
        return {k: relink(x) for k, x in v.items()}
    if isinstance(v, list):
        return [relink(x) for x in v]
    if isinstance(v, str):
        return NEWS_LINK.sub(lambda m: f"news-detail.html?id={m.group(1)}", v)
    return v


# ---------- 1) ย้ายหน้าข่าวไป content/news/<id>.json ----------
moved = 0
for f in sorted(glob.glob(PAGES + "news-*.json")):
    nid = os.path.basename(f)[5:-5]
    if not re.fullmatch(r"[a-z0-9]{12}", nid):
        continue
    page = relink(load(f))
    page["_note"] = (page.get("_note", "") + " · ย้ายจาก content/pages/ (ขั้นที่ 15) — แสดงที่ news-detail.html?id=" + nid).strip(" ·")
    dump(NEWS + nid + ".json", page)
    os.remove(f)
    en = PAGES + "en/" + os.path.basename(f)
    if os.path.exists(en):
        os.remove(en)
    moved += 1
print(f"  ย้ายหน้าข่าว {moved} เรื่อง -> content/news/")
details = {os.path.basename(f)[:-5]: load(f) for f in glob.glob(NEWS + "*.json") if not f.endswith("index.json")}

# ---------- 2) รายการข่าวกลาง content/news/index.json ----------
index = {}
order = []
for name, channel in LISTS.items():
    page = load(PAGES + name + ".json")
    for b in page["blocks"]:
        if b.get("type") != "document-list" or b.get("source"):
            continue
        for doc in b.get("items", []):
            if not doc.get("title"):   # รายการว่างในเว็บเดิม (มีแต่วันที่) — ข้าม
                continue
            href = relink(doc.get("href", ""))
            m = re.match(r"news-detail\.html\?id=([a-z0-9]{12})$", href)
            key = m.group(1) if m else href or doc["title"]
            it = index.get(key)
            if not it:
                it = {"id": m.group(1)} if m else {}
                it.update({"title": doc["title"], "publishedAt": doc.get("publishedAt", ""), "channels": []})
                if not m and href:
                    it["href"] = href
                for k in ("category", "image", "excerpt"):
                    if doc.get(k):
                        it[k] = doc[k]
                index[key] = it
                order.append(key)
            if channel not in it["channels"]:
                it["channels"].append(channel)
# ภาพใหญ่ (หัวข่าวบนหน้าแรก) จากหน้ารายละเอียด
for key, it in index.items():
    d = details.get(it.get("id", ""))
    if d:
        hero = d["blocks"][0]
        if hero.get("image"):
            it["imageLarge"] = hero["image"]
        if not it.get("publishedAt") and hero.get("date"):
            it["publishedAt"] = hero["date"]
items = sorted((index[k] for k in order), key=lambda x: x.get("publishedAt", ""), reverse=True)
if items or not os.path.exists(NEWS + "index.json"):
    dump(NEWS + "index.json", {
        "_note": "รายการข่าวทั้งหมด — แหล่งเดียวของหน้ารายการข่าว ข่าวล่าสุด หน้าแรก RSS (CMS เขียนไฟล์นี้) ดู CMS-HANDOFF.md หัวข้อข่าวสาร",
        "items": items})
    print(f"  content/news/index.json  {len(items)} ข่าว ({sum(1 for i in items if i.get('id'))} มีหน้ารายละเอียด)")

# ---------- 2b) ประเภทข่าว (type) — ค่าคงที่ภาษาอังกฤษ ใช้จัดแท็บหน้าแรก (ไม่ถูกแปล) ----------
#   training = อบรม/เสวนา/บรรยาย · activity = ข่าวกิจกรรม · announcement = ประกาศ · news = ข่าวประชาสัมพันธ์
TRAINING = re.compile(r"อบรม|เสวนา|บรรยาย|ค่าย|สัมมนา|ประชุมวิชาการ")
idx = load(NEWS + "index.json")
for it in idx["items"]:
    if not it.get("type"):
        it["type"] = ("training" if TRAINING.search(it["title"]) else
                      "activity" if "activity" in it.get("channels", []) else
                      "announcement" if it["title"].startswith("ประกาศ") else "news")
dump(NEWS + "index.json", idx)

# ---------- 3) หน้ารายการ: ใช้ source แทนรายการฝัง ----------
SOURCES = {"general-news": {"type": "news", "channel": "general"},
           "activity-news": {"type": "news", "channel": "activity"},
           "academic-lectures": {"type": "news", "channel": "lecture"},
           "news": {"type": "news", "channel": "general", "limit": 6}}
for name, src in SOURCES.items():
    page = load(PAGES + name + ".json")
    for b in page["blocks"]:
        if b.get("type") == "document-list":
            b.pop("items", None)
            b["source"] = src
            break
    dump(PAGES + name + ".json", page)
print("  หน้ารายการข่าว 4 หน้าใช้ source: news")

# ---------- 4) ลิงก์ news-<id>.html ที่อื่นในเนื้อหา + หน้าแรก ----------
for f in glob.glob(PAGES + "*.json"):
    d = load(f)
    r = relink(d)
    if r != d:
        dump(f, r)
for f in [ROOT + "/index.html"]:
    s = open(f, encoding="utf-8").read()
    s2 = NEWS_LINK.sub(lambda m: f"news-detail.html?id={m.group(1)}", s)
    if s2 != s:
        open(f, "w", encoding="utf-8", newline="").write(s2)

# ---------- 5) แม่แบบหน้าข่าว + ไฟล์ส่งต่อจากลิงก์เดิม ----------
detail = (TPL.replace("[แก้ไข] คำอธิบายหน้านี้ 1-2 ประโยค สำหรับ SEO", "ข่าวสารและกิจกรรมของสำนักงานราชบัณฑิตยสภา")
             .replace("[แก้ไข] ชื่อหน้า", "ข่าวสารและกิจกรรม").replace("[แก้ไข-navKey]", "news")
             .replace("content/pages/[แก้ไข-slug].json", "content/news/{id}.json"))
detail = detail.replace("<!-- เนื้อหาทั้งหมดของหน้านี้อยู่ในไฟล์ JSON ด้านล่าง — แก้เนื้อหาที่ไฟล์นั้นไฟล์เดียว -->",
                        "<!-- แม่แบบหน้ารายละเอียดข่าว: news-detail.html?id=<id> โหลด content/news/<id>.json (id = ตัวอักษร/ตัวเลข) -->")
open(ROOT + "/news-detail.html", "w", encoding="utf-8", newline="\n").write(detail)
STUB = """<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="robots" content="noindex">
  <title>ข่าวสารและกิจกรรม | สำนักงานราชบัณฑิตยสภา</title>
  <link rel="canonical" href="news-detail.html?id={id}">
  <meta http-equiv="refresh" content="0; url=news-detail.html?id={id}">
  <!-- ลิงก์เดิมของข่าว — ส่งต่อไปแม่แบบหน้าข่าว (คงพารามิเตอร์ lang และ #anchor) -->
  <script>location.replace('news-detail.html?id={id}' + location.search.replace(/^\\?/, '&') + location.hash);</script>
</head>
<body>
  <p><a href="news-detail.html?id={id}">ไปที่ข่าว</a></p>
</body>
</html>
"""
for nid in details:
    open(f"{ROOT}/news-{nid}.html", "w", encoding="utf-8", newline="\n").write(STUB.replace("{id}", nid))
print(f"  news-detail.html + ไฟล์ส่งต่อ {len(details)} ไฟล์")
