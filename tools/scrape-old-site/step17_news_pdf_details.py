"""ขั้นที่ 17: รายละเอียดจากไฟล์ PDF ของข่าว/การบรรยาย (ฟิลด์ file ใน content/news/index.json)

ดาวน์โหลด PDF (เก็บใน cache/pdf/) แล้วอ่านด้วย PyMuPDF (pip install pymupdf):
  pages     จำนวนหน้า
  fileSize  ขนาดไฟล์ (ไบต์)
  byline    ผู้บรรยาย/ผู้เขียน — บรรทัดแรกของย่อหน้าที่ 2 (ถ้าดูเป็นชื่อบุคคล: มีคำนำหน้า/ตำแหน่ง)
  excerpt   ย่อหน้าเนื้อหาแรก ไม่เกิน ~220 ตัวอักษร (ใส่เฉพาะข่าวที่ยังไม่มี excerpt)
ข้อมูลทั้งหมดมาจากเอกสารต้นฉบับของสำนักงาน (ไม่แต่งเพิ่ม) — รันซ้ำได้ ไม่ดาวน์โหลดซ้ำ
"""
import concurrent.futures as cf
import hashlib, json, os, re, sys, urllib.request
sys.stdout.reconfigure(encoding="utf-8")
import fitz  # PyMuPDF

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..")).replace("\\", "/")
INDEX = ROOT + "/content/news/index.json"
PDF_DIR = HERE + "/cache/pdf"
os.makedirs(PDF_DIR, exist_ok=True)
TH = re.compile("[฀-๿]")
PERSON = re.compile(r"^(ศาสตราจารย์|รองศาสตราจารย์|ผู้ช่วยศาสตราจารย์|ศ\.|รศ\.|ผศ\.|ดร\.|นาย|นาง|นางสาว|พล|พระ|ราชบัณฑิต|ภาคีสมาชิก|ศาสตราจารย์เกียรติคุณ)")


def fetch(url):
    path = f"{PDF_DIR}/{hashlib.md5(url.encode()).hexdigest()}.pdf"
    if not os.path.exists(path):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            data = urllib.request.urlopen(req, timeout=60).read()
            if data[:4] != b"%PDF":
                return None
            open(path, "wb").write(data)
        except Exception:
            return None
    return path


def join_lines(lines):
    """ต่อบรรทัดที่ตัดกลางประโยค: ไทยต่อไทยไม่เว้นวรรค นอกนั้นเว้น 1 ช่อง"""
    out = ""
    for ln in (l.strip() for l in lines):
        if not ln:
            continue
        if out and not (TH.match(ln[0]) and TH.match(out[-1])):
            out += " "
        out += ln
    return re.sub(r"\s+", " ", out).strip()


def blocks_of(text):
    """แบ่งข้อความเป็นย่อหน้าตามบรรทัดว่าง"""
    blocks, cur = [], []
    for ln in text.splitlines():
        if ln.strip():
            cur.append(ln)
        elif cur:
            blocks.append(cur)
            cur = []
    if cur:
        blocks.append(cur)
    return blocks


# ฟอนต์บางไฟล์แยก "ำ" เป็น " า" (เช่น "ค าส าคัญ") — คืนเป็นสระอำ
FIX_AM = re.compile(r"([ก-ฮ่-๋]) า")
FIX_AM2 = re.compile(r"([ก-ฮ]) ([่-๋])า")   # "ล ้า" -> "ล้ำ"
SKIP_PARA = re.compile(r"^([๐-๙0-9]|\*|โดย|เสนอต|รศ\.|ศ\.|ผศ\.|คำสำคัญ|Keywords?\b|บทคัดย่อ\s*$|Abstract\s*$)", re.I)
AFFIL = re.compile(r"(ภาคีสมาชิก|ราชบัณฑิต|ศาสตราจารย์เกียรติคุณ\s|ผู้เชี่ยวชาญ|สำนัก|คณะ|ภาควิชา|มหาวิทยาลัย)")


def details(path, title):
    doc = fitz.open(path)
    info = {"pages": doc.page_count, "fileSize": os.path.getsize(path)}
    raw = "\n".join(doc[i].get_text() for i in range(min(2, doc.page_count)))
    text = FIX_AM.sub(r"\1ำ", FIX_AM2.sub(r"\1\2ำ", raw))
    bl = blocks_of(text)
    if len(bl) < 2:
        return info
    first = re.sub(r"\s+", " ", bl[1][0]).strip()
    if PERSON.match(first) and len(first) <= 90:
        info["byline"] = first
        body = bl[2:]
    else:
        body = bl[1:]
    norm = lambda x: re.sub(r"[\s\W_]+", "", x)
    para = ""
    for blk in body:
        seg = join_lines(blk)
        # "โดย <ชื่อ> <สังกัด> ..." = ผู้บรรยาย ไม่ใช่เนื้อหา
        #   รวมถึง "เสนอโดย…", "โดยศาสตราจารย์…" (ไม่เว้นวรรค) และชื่อเรื่องตามด้วย "โดย…" ในย่อหน้าเดียวกัน
        m = re.search(r"(?:^|\s)(?:เสนอ)?โดย\s*((?:ศาสตราจารย์|รองศาสตราจารย์?|ผู้ช่วยศาสตราจารย์|ศ\.|รศ\.|ผศ\.|ดร\.|นาย|นาง|พล).+)$", seg)
        if m and len(seg) - len(m.group(0)) < len(title) + 20:
            name = AFFIL.split(m.group(1), 1)[0].strip()
            if "byline" not in info and len(name) <= 90:
                info["byline"] = re.sub(r"\s+", " ", name)
            continue
        seg = re.sub(r"^บทคัดย่?อ\s*", "", seg)
        if SKIP_PARA.match(seg) or re.match(r"^กล่?าวเปิ?ด", seg):
            continue
        # ฟอนต์บางไฟล์ทำวรรณยุกต์/สระหาย (เช่น "ความไมสอดคลอง") — ข้อความแบบนี้อ่านไม่รู้เรื่อง ไม่ใช้
        thai = len(TH.findall(seg))
        if thai > 60 and len(re.findall("[่-๋]", seg)) / thai < 0.02:
            continue
        if norm(seg).startswith(norm(title)[:30]) and len(seg) > len(title) + 40:
            seg = seg[len(title):].strip()   # ชื่อเรื่องติดหัวย่อหน้า — ตัดออกแล้วใช้ส่วนที่เหลือ
        if norm(seg).startswith(norm(title)[:30]) or "*" in seg[:40]:
            continue   # ซ้ำชื่อเรื่อง / มีเครื่องหมายเชิงอรรถ (หัวเอกสาร ไม่ใช่เนื้อหา)
        para = (para + " " + seg).strip()
        if len(para) >= 80:
            break
    para = re.sub(r"\s*[๐-๙0-9]+\s*$", "", para)
    if info.get("byline") and re.sub(r"\s+", "", info["byline"]) == re.sub(r"\s+", "", title):
        info.pop("byline")   # เอกสารที่ชื่อเรื่องเป็นชื่อบุคคล (เช่น ประวัติราชบัณฑิต) ไม่ใช่ผู้บรรยาย
    para = re.sub(r"^\W*บทคัด\S*\s*", "", para)
    thai = len(TH.findall(para))
    degraded = thai > 60 and len(re.findall("[่-๋]", para)) / thai < 0.03
    if re.match("[ัิ-ฺ็-๎]", para) or degraded:
        para = ""   # เริ่มกลางคำ หรือฟอนต์ทำวรรณยุกต์หาย — ไม่ใช้เป็นคำโปรย
    if len(para) >= 40:
        info["excerpt"] = para if len(para) <= 220 else para[:220].rsplit(" ", 1)[0] + "…"
    return info


idx = json.load(open(INDEX, encoding="utf-8"))
items = [it for it in idx["items"] if str(it.get("file", "")).lower().endswith(".pdf")]
with cf.ThreadPoolExecutor(6) as ex:
    paths = list(ex.map(lambda it: fetch(it["file"]), items))
n = 0
for it, path in zip(items, paths):
    if not path:
        continue
    try:
        info = details(path, it["title"])
    except Exception as e:
        print("  ! อ่านไม่ได้", it["file"], e)
        continue
    it["pages"], it["fileSize"] = info["pages"], info["fileSize"]
    if info.get("byline"):
        it["byline"] = info["byline"]
    if info.get("excerpt") and (not it.get("excerpt") or it.get("_auto_excerpt")):
        it["excerpt"] = info["excerpt"]
    n += 1
with open(INDEX, "w", encoding="utf-8", newline="\n") as fh:
    json.dump(idx, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
print(f"  อ่าน PDF {n}/{len(items)} ไฟล์ · ผู้บรรยาย {sum(1 for i in items if i.get('byline'))} · คำโปรย {sum(1 for i in items if i.get('excerpt'))}")
