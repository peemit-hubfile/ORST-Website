"""ขั้นที่ 16: ข่าวที่ลิงก์ไปหน้าเอกสารเว็บเดิม (iwfm_view.asp) -> หาไฟล์ PDF จริง ใส่ในฟิลด์ "file" ของ content/news/index.json

หน้า iwfm_view.asp ของเว็บเดิมส่งต่อ (302) ไปตัวแสดง PDF: /pdfjs/web/viewer.html?file=/FILEROOM/.../xxxx.PDF
เมื่อรู้ไฟล์จริง การ์ดข่าวจะมีปุ่ม "ดูตัวอย่าง" (หน้าต่างซ้อนในเว็บ) และ "เปิดเอกสาร" แทนการพาออกไปเว็บเดิม
ผลเก็บใน cache/news-files.json (รันซ้ำไม่ต้องถามเว็บเดิมใหม่)
"""
import concurrent.futures as cf
import json, os, re, sys, urllib.parse, urllib.request
sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..")).replace("\\", "/")
INDEX = ROOT + "/content/news/index.json"
CACHE = HERE + "/cache/news-files.json"
OLD = "https://www.orst.go.th"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


opener = urllib.request.build_opener(NoRedirect)


def resolve(url):
    """iwfm_view.asp -> URL ไฟล์ PDF (หรือ None)"""
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
idx = json.load(open(INDEX, encoding="utf-8"))
todo = [it["href"] for it in idx["items"]
        if not it.get("id") and not it.get("file") and "iwfm_view.asp" in it.get("href", "") and it["href"] not in cache]
with cf.ThreadPoolExecutor(6) as ex:
    for href, f in zip(todo, ex.map(resolve, todo)):
        cache[href] = f
json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

n = 0
for it in idx["items"]:
    f = cache.get(it.get("href", ""))
    if f and not it.get("file"):
        it["file"] = f
        n += 1
with open(INDEX, "w", encoding="utf-8", newline="\n") as fh:
    json.dump(idx, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
print(f"  ถามเว็บเดิม {len(todo)} ลิงก์ · ใส่ไฟล์ PDF ให้ {n} ข่าว · cache {sum(1 for v in cache.values() if v)} ไฟล์")
