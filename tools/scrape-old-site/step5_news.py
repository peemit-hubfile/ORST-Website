"""ขั้นที่ 5: ข่าวล่าสุดพร้อมรูปและรายละเอียด -> หน้ารายละเอียดข่าว + การ์ดข่าวบนหน้าแรก

- ดึงรายการข่าวจาก "ข่าวประชาสัมพันธ์ทั่วไป" (iwfm_table.asp?a=34) และ "ข่าวกิจกรรม" (a=35)
- แต่ละข่าวดึงหน้ารายละเอียดเว็บเดิม: รูปทั้งหมด เนื้อหา และเอกสารที่เกี่ยวข้อง
- สร้างหน้า news-<รหัสข่าว>.html + content/pages/news-<รหัสข่าว>.json (แม่แบบหน้าข่าว)
- แทนเฉพาะการ์ดข่าวใน 4 แท็บของ index.html (ส่วน "ข่าวสารและกิจกรรม") — ส่วนอื่นของหน้าแรกไม่แตะ

แบ่งแท็บ (แท็บละ PER_TAB เรื่อง ใหม่สุดก่อน ไม่ซ้ำกันข้ามแท็บ)
  อบรม     ชื่อมีคำ อบรม/เสวนา/บรรยาย/ค่าย/สัมมนา/ประชุมวิชาการ (จากทั้งสองรายการ)
  กิจกรรม  ข่าวกิจกรรม (a=35)
  ประกาศ   ข่าวประชาสัมพันธ์ที่ชื่อขึ้นต้นด้วย "ประกาศ"
  ข่าว     ข่าวประชาสัมพันธ์ที่เหลือ
"""
import concurrent.futures as cf
import html as H
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scrape import get, table, main_wrapper, text, absu, viewer_file  # noqa
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")).replace("\\", "/")
TODAY = "2026-11-13"
PER_TAB = 7
IMG_DIR = ROOT + "/assets/images/orst/news"
TPL = open(ROOT + "/_template.html", encoding="utf-8").read()
MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
          "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
TRAINING = re.compile(r"อบรม|เสวนา|บรรยาย|ค่าย|สัมมนา|ประชุมวิชาการ")


SHORT_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]


def thai_date(iso):
    y, m, d = map(int, iso.split("-"))
    return f"{d} {MONTHS[m - 1]} {y + 543}"


def news_id(href):
    """รหัสข่าวเว็บเดิม (ส่วนหลัง / ของพารามิเตอร์ i) -> ชื่อไฟล์ที่ใช้ได้ เช่น 69J$H5647044 -> 69jsh5647044"""
    raw = urllib.parse.unquote(re.search(r"i=([^&]+)", href).group(1)).split("/")[-1]
    return re.sub(r"[^a-z0-9]", "", raw.lower().replace("$", "s").replace("@", "a").replace("-", "d"))


def detail(item):
    """หน้ารายละเอียดข่าวบนเว็บเดิม -> รูป เนื้อหา เอกสารแนบ"""
    w = main_wrapper(get(item["href"]))
    slider = w[w.find("blog-img"):w.find("single-blog-content")]
    images = []
    for src in re.findall(r'<img src="([^"]+)"', slider) + re.findall(r'<img src="([^"]+)" style="width:120px"', w):
        u = absu(src)
        if u not in images:
            images.append(u)
    body_html = w[w.find("blog-single-content"):]
    cut = body_html.find("เอกสารที่เกี่ยวข้อง")
    attach_html = body_html[cut:] if cut > 0 else ""
    body_html = body_html[:cut] if cut > 0 else body_html
    body_html = body_html[body_html.find(">") + 1:]            # ข้ามแท็กเปิด <div class="blog-single-content">
    body_html = re.sub(r"<button.*?</button>", "", body_html, flags=re.S)
    paras = [p for p in text(body_html) if p not in ("ดูข่าวทั้งหมด",) and not p.startswith('">')]
    attachments = []
    for u, t in re.findall(r'<a href="([^"]+)"[^>]*>(.*?)</a>', attach_html, re.S):
        f = viewer_file(u.replace("\\", "/"))
        title = re.sub(r"\.(PDF|pdf|DOCX?|docx?|XLSX?)$", "", " ".join(text(t)))
        if f or u.startswith("http"):
            attachments.append({"title": title, "file": f or absu(u)})
    return {**item, "images": images, "paras": paras, "attachments": attachments}


def save_image(url, width):
    name = re.sub(r"[^a-z0-9]+", "-", url.split("/GENERAL/")[-1].lower()).strip("-")
    name = re.sub(r"-(jpe?g|png)$", "", name) + f"-{width}.jpg"
    path = f"{IMG_DIR}/{name}"
    if not os.path.exists(path):
        raw = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=90).read()
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        im.thumbnail((width, width * 2))
        im.save(path, quality=82, optimize=True)
    return f"assets/images/orst/news/{name}"


# ---------------------------------------------------------------------------
# 1) เลือกข่าวเข้าแท็บ
# ---------------------------------------------------------------------------
general = [dict(it, source="general") for it in table(34) if it.get("href") and it.get("publishedAt")]
activity = [dict(it, source="activity") for it in table(35) if it.get("href") and it.get("publishedAt")]
newest = lambda items: sorted(items, key=lambda x: x["publishedAt"], reverse=True)

used = set()


def take(items, n=PER_TAB):
    out = []
    for it in newest(items):
        if it["href"] in used:
            continue
        used.add(it["href"])
        out.append(it)
        if len(out) == n:
            break
    return out


tabs = {}
tabs["training"] = take([it for it in general + activity if TRAINING.search(it["title"])])
tabs["event"] = take(activity)
tabs["announcement"] = take([it for it in general if it["title"].startswith("ประกาศ")])
tabs["news"] = take([it for it in general if not it["title"].startswith("ประกาศ")])
TAB_LABEL = {"news": "ข่าวประชาสัมพันธ์", "training": "อบรมและเสวนา", "event": "ข่าวกิจกรรม", "announcement": "ประกาศ"}
LIST_PAGE = {"general": ("ข่าวประชาสัมพันธ์ทั่วไป", "general-news.html"), "activity": ("ข่าวกิจกรรม", "activity-news.html")}

all_items = [dict(it, tab=t) for t, items in tabs.items() for it in items]
with cf.ThreadPoolExecutor(6) as ex:
    all_items = list(ex.map(detail, all_items))

# ---------------------------------------------------------------------------
# 2) รูป — ปกการ์ด (960px) + แกลเลอรีในหน้าข่าว (640px)  ภาพเต็มยังอยู่บนเว็บเดิม
# ---------------------------------------------------------------------------
os.makedirs(IMG_DIR, exist_ok=True)
jobs = [(u, 960) for it in all_items for u in it["images"][:1]] + [(u, 640) for it in all_items for u in it["images"]]
with cf.ThreadPoolExecutor(8) as ex:
    saved = dict(zip(jobs, ex.map(lambda j: save_image(*j), jobs)))

# ---------------------------------------------------------------------------
# 3) หน้ารายละเอียดข่าว
# ---------------------------------------------------------------------------
for it in all_items:
    slug = "news-" + news_id(it["href"])
    it["slug"] = slug
    it["cover"] = saved.get((it["images"][0], 960)) if it["images"] else None
    body = [p for p in it["paras"] if p != it["title"] and not re.match(r"^วัน.+ที่ \d+ .+ พ\.ศ\. \d{4}$", p)]
    # ข่าวบนเว็บเดิมส่วนใหญ่ไม่มีเนื้อหาเป็นข้อความ (เนื้อหาอยู่ในภาพ/ไฟล์แนบ) — ใช้สรุปสิ่งที่มีในข่าวเป็นคำโปรยแทน
    summary = " · ".join(x for x in [f"ภาพประกอบ {len(it['images'])} ภาพ" if it["images"] else "",
                                     f"เอกสารแนบ {len(it['attachments'])} ไฟล์" if it["attachments"] else ""] if x)
    it["excerpt"] = body[0] if body else summary
    list_label, list_href = LIST_PAGE[it["source"]]
    # หัวหน้าเพจแบบข่าว (variant article) แบ่งสองฝั่ง: ประเภท · วันที่ / หัวข้อ / ปุ่มแชร์-คัดลอก-พิมพ์ | ภาพเด่น (กดดูภาพเต็ม)
    hero = {"type": "page-hero", "variant": "article", "tag": TAB_LABEL[it["tab"]], "date": it["publishedAt"], "heading": it["title"]}
    if it["images"]:
        hero.update({"image": saved[(it["images"][0], 960)], "imageAlt": f"ภาพประกอบข่าว {it['title'][:80]}", "imageHref": it["images"][0]})
    hero["breadcrumb"] = [{"label": "หน้าหลัก", "href": "index.html"}, {"label": "ข่าวสารและกิจกรรม", "href": "news.html"},
                          {"label": list_label, "href": list_href}, {"label": it["title"]}]
    blocks = [hero]
    if body:
        blocks.append({"type": "rich-text", "id": "content", "paragraphs": body})
    # ท้ายหน้า: เอกสารแนบ | ภาพประกอบข่าว (โมเสก) — ภาพเดียวอยู่ใน hero แล้ว ไม่ต้องแสดงซ้ำ
    media = {"type": "news-media", "id": "news-media"}
    if it["attachments"]:
        media["attachments"] = it["attachments"]
    if len(it["images"]) > 1:
        media["images"] = [{"image": saved[(u, 640)], "href": u, "alt": f"ภาพประกอบข่าว ภาพที่ {i + 1}"} for i, u in enumerate(it["images"])]
    if len(media) > 2:
        blocks.append(media)
    # ข่าวอื่น ๆ: ข่าวล่าสุด 4 ข่าวจากหน้ารวมเดียวกัน (ไม่รวมข่าวนี้)
    others = sorted((o for o in all_items if o["source"] == it["source"] and o is not it),
                    key=lambda o: o["publishedAt"], reverse=True)[:4]
    if others:
        blocks.append({"type": "news-related", "id": "related", "heading": "ข่าวอื่น ๆ", "href": list_href,
                       "items": [{"title": o["title"], "href": f"news-{news_id(o['href'])}.html",
                                  **({"image": saved[(o["images"][0], 640)]} if o["images"] else {}),
                                  "category": TAB_LABEL[o["tab"]], "publishedAt": o["publishedAt"]} for o in others]})
    else:
        blocks.append({"type": "cta-band", "heading": list_label, "body": "อ่านข่าวอื่นของสำนักงานราชบัณฑิตยสภา",
                       "actions": [{"label": "ดูข่าวทั้งหมด", "href": list_href}]})
    desc = (it["excerpt"] or it["title"])[:150]
    page = {"$schema": "../blocks.schema.json",
            "_note": f"หน้าข่าว — ข้อมูลจาก {it['href']} (ดึงเมื่อ 13 พ.ย. 2569) รูปย่อเก็บใน assets/images/orst/news ภาพเต็มและไฟล์แนบยังอยู่บนเว็บไซต์เดิม",
            "title": it["title"][:120], "navKey": "news", "description": desc,
            "sideNav": False,   # หน้าข่าวเต็มความกว้าง ไม่มีแถบเมนูย่อย
            "updatedAt": it["publishedAt"], "blocks": blocks}
    with open(f"{ROOT}/content/pages/{slug}.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(page, f, ensure_ascii=False, indent=2)
        f.write("\n")
    html = (TPL.replace("[แก้ไข] คำอธิบายหน้านี้ 1-2 ประโยค สำหรับ SEO", H.escape(desc))
               .replace("[แก้ไข] ชื่อหน้า", H.escape(it["title"][:120]))
               .replace("[แก้ไข-navKey]", "news").replace("[แก้ไข-slug]", slug))
    with open(f"{ROOT}/{slug}.html", "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    print(f"  {it['tab']:12} {slug}.html  {it['publishedAt']}  รูป {len(it['images'])}  แนบ {len(it['attachments'])}  {it['title'][:50]}")

# ---------------------------------------------------------------------------
# 4) การ์ดข่าวบนหน้าแรก — แทนเฉพาะ <div class="news-mosaic-layout"> ของแต่ละแท็บ (คลาสเดิมทั้งหมด)
# ---------------------------------------------------------------------------
e = H.escape
FALLBACK_IMG = "assets/images/New-01.png"   # ข่าวที่เว็บเดิมไม่มีรูป


def short(s, n):
    return s if len(s) <= n else s[:n].rsplit(" ", 1)[0] + "…"


def feature(it):
    img = it["cover"] or FALLBACK_IMG
    label = TAB_LABEL[it["tab"]]
    return f"""
                <article class="news-mosaic-feature">
                  <a href="{it['slug']}.html" class="news-mosaic-feature-img" aria-label="อ่านข่าว{e(short(it['title'], 80))}">
                    <img src="{img}" alt="{e(short(it['title'], 120))}" loading="lazy">
                    <span class="news-type-badge">ข่าวเด่น</span>
                  </a>

                  <div class="news-mosaic-feature-body">
                    <div class="news-meta">
                      <span>{thai_date(it['publishedAt'])}</span>
                      <span>{label}</span>
                    </div>
                    <h3>{e(it['title'])}</h3>
                    <p>
                      {e(short(it['excerpt'], 220))}
                    </p>
                    <a class="news-primary-action" href="{it['slug']}.html">อ่านต่อ <span class="read-ic" aria-hidden="true"><svg class="icon"><use href="#i-arrow"></use></svg></span></a>
                  </div>
                </article>
"""


def date_badge(iso):
    """ป้ายวันที่บนภาพ: วันตัวใหญ่ + เดือนย่อ ปีย่อ (เช่น 20 / ก.ค. 69)"""
    y, m, d = map(int, iso.split("-"))
    return (f'<time class="news-date-badge" datetime="{iso}" aria-label="{thai_date(iso)}">'
            f'<b>{d}</b><span>{SHORT_MONTHS[m - 1]} {str(y + 543)[-2:]}</span></time>')


def card(it):
    img = it["cover"] or FALLBACK_IMG
    return f"""                  <article class="news-mosaic-card">
                    <a href="{it['slug']}.html" class="news-mosaic-thumb">
                      <img src="{img}" alt="{e(short(it['title'], 120))}" loading="lazy">
                    </a>
                    {date_badge(it['publishedAt'])}
                    <div class="news-mosaic-card-body">
                      <h4>{e(it['title'])}</h4>
                      <p>{e(short(it['excerpt'], 120))}</p>
                      <div class="news-mini-foot"><span class="news-mini-type">{TAB_LABEL[it['tab']]}</span><a href="{it['slug']}.html">อ่านต่อ <span class="read-ic" aria-hidden="true"><svg class="icon"><use href="#i-arrow"></use></svg></span></a></div>
                    </div>
                  </article>
"""


def layout(items):
    return ('<div class="news-mosaic-layout">' + feature(items[0]) +
            '\n                <div class="news-mosaic-side">\n' + "".join(card(it) for it in items[1:]) +
            "                </div>\n              </div>")


def replace_layout(html, panel_id, new):
    start = html.index(f'id="{panel_id}"')
    s = html.index('<div class="news-mosaic-layout">', start)
    depth, i = 0, s
    for m in re.finditer(r"<div\b|</div>", html[s:]):
        depth += 1 if m.group(0) == "<div" else -1
        if depth == 0:
            i = s + m.end()
            break
    return html[:s] + new + html[i:]


idx_path = ROOT + "/index.html"
idx = open(idx_path, encoding="utf-8").read()
by_tab = {}
for it in all_items:
    by_tab.setdefault(it["tab"], []).append(it)
for tab, items in by_tab.items():
    idx = replace_layout(idx, f"news-panel-{tab}", layout(items))
open(idx_path, "w", encoding="utf-8", newline="").write(idx)
print(f"\nหน้าแรก: แทนการ์ดข่าว {len(all_items)} เรื่องใน {len(by_tab)} แท็บ")

# ---------------------------------------------------------------------------
# 5) หน้ารายการข่าว (general-news / activity-news / news) — ข่าวที่มีหน้ารายละเอียดแล้ว ลิงก์มาที่หน้าใหม่แทนเว็บเดิม
# ---------------------------------------------------------------------------
local = {it["href"]: f"{it['slug']}.html" for it in all_items}
by_href = {it["href"]: it for it in all_items}
by_href.update({f"{it['slug']}.html": it for it in all_items})   # รันซ้ำ: รายการที่เคยเปลี่ยนเป็นลิงก์หน้าใหม่แล้ว
local.update({f"{it['slug']}.html": f"{it['slug']}.html" for it in all_items})
for name in ["general-news", "activity-news", "news"]:
    path = f"{ROOT}/content/pages/{name}.json"
    page = json.load(open(path, encoding="utf-8"))
    n = 0
    for b in page["blocks"]:
        for doc in b.get("items", []) if b.get("type") == "document-list" else []:
            if doc.get("href") in local:
                it = by_href[doc["href"]]
                doc["href"] = local[doc["href"]]
                if it["images"]:
                    doc["image"] = saved[(it["images"][0], 640)]
                if it["excerpt"]:
                    doc["excerpt"] = it["excerpt"]
                n += 1
        if b.get("type") == "document-list":
            b["layout"] = "news"   # แม่แบบ T4 รายการข่าว: แถวมีรูปปก / ป้ายวันที่
            # ประเภทข่าวสำหรับชิปกรอง (ทั้งหมด / ข่าว / ประกาศ / กิจกรรม) — แยกจากคำขึ้นต้นชื่อเรื่อง
            for doc in b.get("items", []):
                doc["category"] = "ประกาศ" if doc["title"].strip().startswith("ประกาศ") else (
                    "กิจกรรม" if name == "activity-news" else "ข่าว")
    page["sideNav"] = False   # หน้ารวมข่าวเต็มความกว้าง (การ์ดหลายคอลัมน์) ไม่มีแถบเมนูย่อย
    # hero แบบมีรูป: ใช้ภาพข่าวล่าสุดที่มีภาพขนาด 960px (ถ้ายังไม่ได้ตั้งรูปไว้)
    hero = page["blocks"][0] if page["blocks"] and page["blocks"][0].get("type") == "page-hero" else None
    if hero is not None and not hero.get("image"):
        for b in page["blocks"]:
            for doc in b.get("items", []) if b.get("type") == "document-list" else []:
                big = (doc.get("image") or "").replace("-640.jpg", "-960.jpg")
                if big and os.path.exists(f"{ROOT}/{big}"):
                    hero["image"], hero["imageAlt"] = big, ""
                    break
            if hero.get("image"):
                break
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(page, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"  {name}.json: ลิงก์ไปหน้าข่าวใหม่ {n} รายการ")

# 6) "ข่าวที่เกี่ยวข้อง" ท้ายหน้ารายละเอียดข่าว — เลือกจากชื่อข่าวที่คล้ายกัน (related.py) หลังเขียนหน้ารวมข่าวแล้ว
#    ไม่มีข่าวเรื่องเดียวกัน = แสดง "ข่าวอื่น ๆ" (ข่าวล่าสุดของหมวด) · ไม่แสดงประกาศชื่อซ้ำ
import related  # noqa: E402
print("\nข่าวที่เกี่ยวข้อง")
related.apply(ROOT)
