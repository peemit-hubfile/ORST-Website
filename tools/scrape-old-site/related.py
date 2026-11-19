"""เลือก "ข่าวที่เกี่ยวข้อง" ให้หน้ารายละเอียดข่าว — ใช้โดย step5_news.py

ภาษาไทยไม่เว้นวรรคระหว่างคำ จึงเทียบชื่อข่าวด้วยกลุ่มตัวอักษรต่อเนื่อง 3 ตัว (character trigram)
หลังตัดคำที่มีในเกือบทุกข่าว (ชื่อหน่วยงาน "ประกาศ" "เรื่อง" ปี พ.ศ. ตัวเลข)
คะแนน = จำนวน trigram ที่ซ้ำกัน / จำนวน trigram ของชื่อที่สั้นกว่า (0–1)

ผลลัพธ์: ข่าวที่คะแนนถึงเกณฑ์ เรียงคะแนนมาก → น้อย แล้วเติมด้วยข่าวล่าสุดของหมวดเดียวกันให้ครบ
ไม่ซ้ำ: ข่าวนี้เอง / ลิงก์ซ้ำ / ชื่อซ้ำ (ประกาศชื่อเดียวกันที่ลงหลายครั้ง แสดงครั้งเดียว)
"""
import re

STOP = sorted([
    "ประกาศสำนักงานราชบัณฑิตยสภา", "สำนักงานราชบัณฑิตยสภา", "ราชบัณฑิตยสภา", "ราชบัณฑิตยสถาน",
    "ประกาศ", "เรื่อง", "ประจำปี", "ประจำพุทธศักราช", "พุทธศักราช", "พ.ศ.", "ครั้งที่", "หัวข้อ",
    "จัดพิธี", "จัดกิจกรรม", "จัด", "เนื่องในโอกาส", "และ", "ของ", "เพื่อ", "ใน", "การ", "ที่",
], key=len, reverse=True)
THRESHOLD = 0.45   # ต่ำกว่านี้มักเกี่ยวกันแค่คำทั่วไป เช่น "เชิงปฏิบัติการ"


def norm(title):
    t = re.sub(r"[\s\"“”‘’'()\[\]:;,.\-–—/!?]+", "", title or "")
    for w in STOP:
        t = t.replace(w, "")
    return re.sub(r"[0-9๐-๙]+", "", t)


def grams(title, n=3):
    t = norm(title)
    return {t[i:i + n] for i in range(len(t) - n + 1)}


def score(a, b):
    ga, gb = grams(a), grams(b)
    if not ga or not gb:
        return 0.0
    return len(ga & gb) / min(len(ga), len(gb))


def pick(current, pool, n=4):
    """current/pool: dict ที่มี title, href, publishedAt (+ category ฯลฯ) — คืน (รายการ, มีข่าวที่เกี่ยวข้องจริงไหม)"""
    seen_href = {current.get("href")}
    seen_title = {norm(current.get("title"))}
    scored = sorted(((score(current["title"], it["title"]), it) for it in pool),
                    key=lambda x: (x[0], x[1].get("publishedAt", "")), reverse=True)
    out, related = [], 0
    def add(it):
        key = norm(it.get("title"))
        if it.get("href") in seen_href or key in seen_title:
            return False
        seen_href.add(it.get("href"))
        seen_title.add(key)
        out.append(it)
        return True
    for s, it in scored:
        if len(out) >= n or s < THRESHOLD:
            break
        if add(it):
            related += 1
    # เติมด้วยข่าวล่าสุดของหมวดเดียวกัน
    same = sorted((it for it in pool if it.get("category") == current.get("category")),
                  key=lambda it: it.get("publishedAt", ""), reverse=True)
    for it in same + sorted(pool, key=lambda it: it.get("publishedAt", ""), reverse=True):
        if len(out) >= n:
            break
        add(it)
    return out, related > 0


def apply(root):
    """เขียนส่วน "ข่าวที่เกี่ยวข้อง" ของทุกหน้าข่าว content/news/<id>.json ใหม่ จากรายการข่าวกลาง content/news/index.json
    (เรียกท้าย step5_news.py หลังเขียนหน้ารวมแล้ว — หรือรันไฟล์นี้ตรง ๆ: python related.py)"""
    import glob
    import json
    import os
    news = os.path.join(root, "content", "news")
    index = json.load(open(os.path.join(news, "index.json"), encoding="utf-8"))["items"]
    pool = [dict(it, href=f"news-detail.html?id={it['id']}" if it.get("id") else it.get("href", ""))
            for it in index if set(it.get("channels", [])) & {"general", "activity"}]
    keep = ("title", "href", "image", "category", "publishedAt")
    for p in sorted(glob.glob(os.path.join(news, "*.json"))):
        if p.endswith("index.json"):
            continue
        raw = open(p, encoding="utf-8", newline="").read()
        d = json.loads(raw)
        hero = d["blocks"][0]
        slug = os.path.basename(p)[:-5]
        crumbs = hero.get("breadcrumb", [])
        list_href = crumbs[2]["href"] if len(crumbs) > 3 else "news.html"
        cur = {"title": hero.get("heading", d.get("title", "")), "href": f"news-detail.html?id={slug}",
               "publishedAt": hero.get("date") or d.get("updatedAt", ""), "category": hero.get("tag")}
        items, related = pick(cur, pool)
        block = {"type": "news-related", "id": "related", "heading": "ข่าวที่เกี่ยวข้อง" if related else "ข่าวอื่น ๆ",
                 "href": list_href, "items": [{k: it[k] for k in keep if it.get(k)} for it in items]}
        d["blocks"] = [b for b in d["blocks"] if b["type"] not in ("news-related", "cta-band")] + [block]
        nl = chr(10)
        crlf = chr(13) + nl in raw
        out = json.dumps(d, ensure_ascii=False, indent=2) + nl
        open(p, "w", encoding="utf-8", newline="").write(out.replace(nl, chr(13) + nl) if crlf else out)
        print(f"  {slug}  {block['heading']}  ({len(items)})")


if __name__ == "__main__":
    import os
    apply(os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")))
