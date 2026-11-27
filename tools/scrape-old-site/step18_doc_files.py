"""ขั้นที่ 18: รายการเอกสาร (document-list) ที่ลิงก์ไปหน้าเอกสารเว็บเดิม (iwfm_view.asp) -> หาไฟล์ PDF จริง

ใช้วิธีเดียวกับขั้นที่ 16 (ข่าว): iwfm_view.asp ส่งต่อ (302) ไป /pdfjs/web/viewer.html?file=/FILEROOM/.../xxxx.PDF
เมื่อรู้ไฟล์จริง รายการจะแสดงแบบเดียวกับเอกสาร PDF อื่น (ป้าย PDF + ปุ่ม "เปิดเอกสาร" / "ดาวน์โหลด")
หาไม่เจอ = คงลิงก์เดิมไว้ (href) · ผลเก็บใน cache/doc-files.json (รันซ้ำไม่ต้องถามเว็บเดิมใหม่)
"""
import concurrent.futures as cf
import glob, json, os, re, sys, urllib.error, urllib.parse, urllib.request
sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..")).replace("\\", "/")
CACHE = HERE + "/cache/doc-files.json"
OLD = "https://www.orst.go.th"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


opener = urllib.request.build_opener(NoRedirect)


def resolve(url):
    """iwfm_view.asp -> URL ไฟล์ PDF (หรือ None) — เหมือน step16_news_files.py"""
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
        try:
            opener.open(req, timeout=20)
            return None
        except urllib.error.HTTPError as e:
            loc = e.headers.get("Location", "")
        m = re.search(r"[?&]file=([^&]+)", loc)
        path = urllib.parse.unquote(m.group(1)) if m else (loc if "/FILEROOM/" in loc else "")
        return (OLD + path) if path.startswith("/") else (path or None)
    except Exception:
        return None


cache = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
pages = {}
for p in sorted(glob.glob(ROOT + "/content/pages/*.json")):
    if p.endswith("_styleguide.json"):
        continue
    d = json.load(open(p, encoding="utf-8"))
    hit = [it for b in d["blocks"] if b["type"] == "document-list" and not b.get("source")
           for it in b.get("items", []) if not it.get("file") and "iwfm_view.asp" in it.get("href", "")]
    if hit:
        pages[p] = (d, hit)

todo = sorted({it["href"] for _, hit in pages.values() for it in hit} - set(cache))
print(f"ต้องถามเว็บเดิม {len(todo)} ลิงก์ (มีในแคช {len(cache)})")
with cf.ThreadPoolExecutor(12) as ex:
    for i, (url, pdf) in enumerate(zip(todo, ex.map(resolve, todo)), 1):
        cache[url] = pdf
        if i % 200 == 0:
            print(f"  {i}/{len(todo)}")
            json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
os.makedirs(os.path.dirname(CACHE), exist_ok=True)
json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

total = found = 0
for p, (d, hit) in pages.items():
    for it in hit:
        total += 1
        pdf = cache.get(it["href"])
        if pdf:
            found += 1
            it["file"] = pdf
            del it["href"]
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")
print(f"พบไฟล์ PDF {found}/{total} รายการ ใน {len(pages)} หน้า")
