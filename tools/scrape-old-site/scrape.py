"""ตัวช่วยดึงข้อมูลจากเว็บไซต์เดิม www.orst.go.th — ใช้โดย migrate.py

หน้าเว็บที่โหลดแล้วเก็บไว้ใน cache/ (ไม่อยู่ใน git) — ลบโฟลเดอร์นี้ถ้าต้องการข้อมูลล่าสุดจากเว็บเดิม

รูปแบบหน้าของเว็บเดิมที่รองรับ
  iwfm_table.asp?a=N        ตาราง วันที่ + เรื่อง                       -> table(N)
  iwfm_list.asp?p=X&s=N     เมนูด้านข้าง + หน้าย่อยที่ฝัง PDF/ลิงก์ไฟล์   -> list_docs(X, s)
  iwfm_list.asp?p=X         หน้าข้อความ                                -> text(main_wrapper(get(...)))
"""
import hashlib, html as H, os, re, sys, urllib.request, urllib.parse

sys.stdout.reconfigure(encoding="utf-8")
BASE = "https://www.orst.go.th/"
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "cache")
TH = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")


def key(u):
    """ชื่อไฟล์ cache ของ URL — URL ที่มีอักษรไทยต่อท้ายด้วย hash กันชื่อซ้ำ"""
    tail = u.split("orst.go.th/")[1]
    name = re.sub(r"[^A-Za-z0-9=_-]+", "_", tail)
    if not tail.isascii():
        name += "-" + hashlib.md5(tail.encode("utf-8")).hexdigest()[:8]
    return name


def get(u):
    if not u.startswith("http"):
        u = BASE + u.lstrip("/")
    p = os.path.join(CACHE, key(u) + ".html")
    if not os.path.exists(p):
        os.makedirs(CACHE, exist_ok=True)
        # เข้ารหัสเฉพาะอักษรไทย — เว็บเดิมใช้ % ตัวเดียวเป็น wildcard (เช่น p=INFO-%,Infographic) ห้ามแปลงเป็น %25
        u = urllib.parse.quote(u, safe=":/?&=%,;+#@!$'()*[]~-._")
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
        b = urllib.request.urlopen(req, timeout=90).read()
        open(p, "wb").write(b)
    return open(p, encoding="utf-8", errors="replace").read()


def absu(u):
    u = H.unescape(u.strip())
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("http"):
        return u
    return BASE + u.lstrip("/")


def text(fragment):
    # การขึ้นบรรทัดใน source HTML ไม่ใช่การขึ้นบรรทัดจริง — ยุบเป็นช่องว่างก่อน แล้วค่อยแยกบรรทัดตาม <br> / </p>
    fragment = re.sub(r"[ \t]*\r?\n[ \t]*", " ", fragment)
    t = re.sub(r"<br\s*/?>", "\n", fragment, flags=re.I)
    t = re.sub(r"</(p|div|h\d|li|tr)>", "\n", t, flags=re.I)
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", t, flags=re.S | re.I)
    t = H.unescape(re.sub(r"<[^>]+>", "", t)).replace("\xa0", " ")
    lines = [re.sub(r"[ \t\r]+", " ", x).strip() for x in t.split("\n")]
    return [x for x in lines if x]


def one_line(fragment):
    return " ".join(text(fragment))


def iso(d):
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", d.translate(TH).strip())
    if not m:
        return None
    y = int(m.group(3))
    y = y - 543 if y > 2400 else y
    return f"{y:04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"


def main_wrapper(h):
    s = h.find('blog-main-wrapper">')
    e = h.find("<!-- blog-main-area-end")
    return h[s + len('blog-main-wrapper">'):e] if s > 0 else ""


def side_menu(h):
    s = h.find("blog-side-menu")
    e = h.find("blog-main-wrapper")
    if s < 0:
        return []
    out = []
    for m in re.finditer(r"<li>(.*?)</li>", h[s:e], re.S):
        li = m.group(1)
        a = re.search(r'<a href="([^"]+)"[^>]*>(.*?)</a>', li, re.S)
        if a:
            out.append({"href": H.unescape(a.group(1)), "title": one_line(a.group(2))})
        else:
            out.append({"group": one_line(li)})
    return out


def table(a):
    """iwfm_table.asp?a=N -> [{title, publishedAt?, href?}]"""
    h = get(f"iwfm_table.asp?a={a}")
    s, e = h.find("<tbody"), h.find("</tbody>")
    out = []
    for r in re.findall(r"<tr>(.*?)</tr>", h[s:e], re.S):
        tds = re.findall(r"<td[^>]*>(.*?)</td>", r, re.S)
        if not tds:
            continue
        date = iso(one_line(tds[0])) if len(tds) > 1 else None
        cell = tds[-1]
        if "ไม่พบข้อมูล" in cell:
            continue
        href = None
        m = re.search(r"""href=['"]([^'"]+)['"]""", cell)
        if m and m.group(1) != "#":
            href = absu(m.group(1))
        mm = re.search(r"src=(iwfm_modal\.asp\?[^ '\"&]+)", cell)
        if not href and mm:
            href = absu(mm.group(1))
        lines = text(re.sub(r"""onclick=(["']).*?\1""", "", cell, flags=re.S))
        title = lines[0] if lines else ""
        it = {"title": title}
        if date:
            it["publishedAt"] = date
        if href:
            it["href"] = href
        out.append(it)
    return out


def doc_from_page(h):
    """เนื้อหาหลักของหน้าย่อย iwfm_list: คืน (file_url | None, links[], text_lines[])"""
    w = main_wrapper(h)
    f = re.search(r"viewer\.html\?file=([^\"'&]+)", w)
    links = [(absu(u), one_line(t)) for u, t in re.findall(r"""<a[^>]+href=['"]([^'"]+)['"][^>]*>(.*?)</a>""", w, re.S)
             if not u.startswith("#") and "javascript" not in u]
    return (absu(f.group(1)) if f else None), links, text(w)


def viewer_file(u):
    m = re.search(r"viewer\.html\?file=([^\"'&]+)", u)
    if m:
        return absu(m.group(1))
    if "/FILEROOM/" in u:
        return absu(u)
    return None


def expand_page(url, title, category, depth=0):
    """หน้าย่อยหนึ่งหน้า -> รายการเอกสาร
       - มีลิงก์ไฟล์หลายไฟล์ในเนื้อหา  -> หลายรายการ (หมวด = ชื่อหน้าย่อย)
       - มีแค่ iframe PDF             -> 1 รายการ
       - มีลิงก์ไปโฟลเดอร์ iwfm_list อื่น -> ไล่ต่อ (หมวด = ชื่อโฟลเดอร์)
       - ไม่มีอะไรเลย                 -> 1 รายการไม่มีไฟล์ (หมายเหตุว่าเว็บเดิมไม่มีไฟล์)"""
    w = main_wrapper(get(url))
    anchors = [(H.unescape(u), one_line(t)) for u, t in
               re.findall(r"""<a[^>]+href=['"]([^'"]+)['"][^>]*>(.*?)</a>""", w, re.S)]
    files = [(viewer_file(u), t) for u, t in anchors if viewer_file(u)]
    folders = [(u, t) for u, t in anchors if "iwfm_list.asp" in u and not viewer_file(u)]
    others = [(absu(u), t) for u, t in anchors if not viewer_file(u) and "iwfm_list.asp" not in u
              and not u.startswith("#") and "javascript" not in u]
    if files:
        cat = category or title
        return [{"title": t or title, "file": f, "category": cat} for f, t in files] + \
               [{"title": t, "href": u, "category": cat} for u, t in others if t]
    if folders and depth < 2:
        out = []
        for u, t in folders:
            out += expand_page(u, t, t, depth + 1)
        return out
    f = re.search(r"<iframe[^>]+src=\"[^\"]*viewer\.html\?file=([^\"'&]+)", w)
    it = {"title": title}
    if category:
        it["category"] = category
    if f:
        it["file"] = absu(f.group(1))
    elif others:
        it["href"] = others[0][0]
    else:
        it["note"] = "เว็บไซต์เดิมไม่มีไฟล์แนบ"
        it["_text"] = text(w)
    return [it]


def list_docs(p, first_s=1):
    """iwfm_list.asp?p=X  -> เอกสารทุกหน้าย่อยจากเมนูด้านข้าง"""
    h = get(f"iwfm_list.asp?p={p}&s={first_s}")
    out = []
    group = None
    for m in side_menu(h):
        if "group" in m:
            group = m["group"]
            continue
        items = expand_page(m["href"], m["title"], None)
        for it in items:
            if group and "category" not in it:
                it["category"] = group
        out += items
    return out


def file_size(url):
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
        r = urllib.request.urlopen(req, timeout=30)
        return int(r.headers.get("Content-Length") or 0) or None
    except Exception:
        return None


def year_from_title(title):
    """"... พ.ศ. ๒๕๖๙ ..." -> 2569 (ปีแรกที่เจอในชื่อ) ใช้เป็นปีงบประมาณเมื่อเอกสารไม่มีวันที่"""
    m = re.search(r"(25[0-9]{2})", title.translate(TH))
    return int(m.group(1)) if m else None
