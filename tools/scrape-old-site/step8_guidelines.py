"""ขั้นที่ 8: หลักเกณฑ์ภาษาไทย — ย้ายเนื้อหาจากเว็บเดิมมาแสดงในเว็บใหม่ (ไม่ส่งผู้ใช้ออกไปเว็บเดิมแล้ว)

เว็บเดิม: iwfm_table.asp?a=36  -> แต่ละหัวข้อเป็น
  - ตารางหัวข้อย่อย (iwfm_table.asp?a=36&i=...) แต่ละแถวเปิด iwfm_modal.asp?i=... ในป๊อปอัป
  - หรือหน้า iwfm_modal.asp?i=... หน้าเดียว
หน้า modal มีเนื้อหาได้ 3 แบบ
  1. HTML ในกล่อง .modal-pro-content
  2. ไฟล์ .HTM ที่ถูกอ้างเป็น <img src="...HTM"> (ตัด HTML ข้างในมาใช้)
  3. สคริปต์ส่งต่อไป PDF (self.location.href = '/pdfjs/web/viewer.html?file=...PDF')

ผลลัพธ์
  content/pages/guideline-<slug>.json + guideline-<slug>.html   หน้าละหัวข้อ (block article มีสารบัญ)
  content/pages/language-guidelines.json                        หน้ารวม (การ์ดหัวข้อ ลิงก์ภายใน)
  assets/images/orst/guidelines/                                 รูปในเนื้อหา (รวมรูป base64 ที่ฝังในเว็บเดิม)
ไฟล์ PDF ยังอยู่บนเว็บเดิม (เปิดดูในป๊อปอัปของเว็บใหม่) — รอย้ายไฟล์เข้า CMS
"""
import base64
import hashlib
import html as H
import json
import os
import re
import sys
import urllib.request
from html.parser import HTMLParser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scrape import get, absu  # noqa

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")).replace("\\", "/")
TPL = open(f"{ROOT}/_template.html", encoding="utf-8").read()
IMG_DIR = f"{ROOT}/assets/images/orst/guidelines"
IMG_URL = "assets/images/orst/guidelines"
HUB = "language-guidelines"
HUB_TITLE = "หลักเกณฑ์ภาษาไทย"
NOTE = "เนื้อหาจาก orst.go.th/iwfm_table.asp?a=36 (ดึงเมื่อ 16 พ.ย. 2569) ไฟล์ PDF ยังชี้ไปเว็บไซต์เดิม รอย้ายไฟล์เข้า CMS"
TH_DIGITS = str.maketrans("0123456789", "๐๑๒๓๔๕๖๗๘๙")

# ชื่อหัวข้อ -> (slug, ไอคอน, หน้าบนเว็บเดิม) เรียงตามเว็บเดิม
TOPICS = {
    "ชุดแบบอักษรหรือฟอนต์อักษรโบราณ ๖ ชุด": ("ancient-fonts", "i-book", "iwfm_table.asp?a=36&i=0040002104011001%2F65CRO0017088"),
    "หลักเกณฑ์การทับศัพท์": ("transcription", "i-dictionary", "iwfm_modal.asp?i=8728397LTG5813223326234222622"),
    "การถอดอักษรไทยเป็นอักษรโรมัน": ("romanization", "i-pen", "iwfm_table.asp?a=36&i=0040002104011001%2F63ERJ5814038"),
    "การอ่านตัวเลขต่างๆ": ("reading-numbers", "i-list", "iwfm_table.asp?a=36&i=0040002104011001%2F63ERK0020019"),
    "การอ่านวิสามานยนาม": ("reading-proper-nouns", "i-megaphone", "iwfm_table.asp?a=36&i=0040002104011001%2F63ERK0129056"),
    "การอ่านเครื่องหมาย": ("reading-symbols", "i-megaphone", "iwfm_table.asp?a=36&i=0040002104011001%2F63ERK0201056"),
    "เครื่องหมายวรรคตอน": ("punctuation", "i-pen", "iwfm_table.asp?a=36&i=0040002104011001%2F63ERK0249069"),
    "การเว้นวรรค": ("spacing", "i-file", "iwfm_modal.asp?i=3529352MTG5813223326234222622"),
    "การเขียนคำย่อ": ("abbreviations", "i-file", "iwfm_modal.asp?i=6622562MTG5813223326234222622"),
    "ชื่อจังหวัด อำเภอ ตำบล เขต และแขวง": ("place-names", "i-map", "iwfm_table.asp?a=36&i=0040002104011001%2F63ERK0503006"),
    "ชื่อทะเล": ("sea-names", "i-map", "iwfm_table.asp?a=36&i=0040002104011001%2F63ERK0548006"),
    "ชื่อธาตุ": ("element-names", "i-puzzle", "iwfm_modal.asp?i=6529482MTG5813223326234222622"),
    "ชื่อประเทศ/เมืองหลวง": ("country-names", "i-pin", "iwfm_table.asp?a=36&i=0040002104011001%2F63ERK0700072"),
    "ลักษณนาม": ("classifiers", "i-list", "iwfm_table.asp?a=36&i=0040002104011001%2F63ERK0729009"),
    "ราชาศัพท์": ("royal-vocabulary", "i-shield", "iwfm_modal.asp?i=65233%3A2MTG5813223326234222622"),
}


def clean_title(t):
    t = re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", "", t))).strip()
    t = re.sub(r"\s*\(คลิกรายละเอียดเพิ่มเติม\)\s*", "", t)
    t = re.sub(r"^[๐-๙0-9]+\.\s*", "", t)          # ลำดับข้อ "๑. " — สารบัญมีลำดับให้แล้ว
    t = re.sub(r"\s*ที่นี่$", "", t)                 # "...แขวง ที่นี่" (ข้อความลิงก์ของเว็บเดิม)
    return t


def pdf_url(u):
    """ลิงก์ตัวแสดง PDF ของเว็บเดิม -> ลิงก์ไฟล์ PDF ตรง"""
    m = re.search(r"viewer\.html\?file=([^&#\"' ]+\.pdf)", u, re.I)
    return absu(m.group(1)) if m else (absu(u) if re.search(r"\.pdf($|[?#])", u, re.I) else None)


def save_image(src):
    """รูปในเนื้อหา -> ไฟล์ในโปรเจกต์ (รองรับ data:base64 และไฟล์บนเว็บเดิม)"""
    os.makedirs(IMG_DIR, exist_ok=True)
    if src.startswith("data:image/"):
        m = re.match(r"data:image/(\w+);base64,(.*)", src, re.S)
        if not m:
            return None
        raw = base64.b64decode(m.group(2))
        ext = {"jpeg": "jpg"}.get(m.group(1), m.group(1))
    else:
        url = absu(src)
        try:
            raw = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=90).read()
        except Exception as e:  # รูปเสียบนเว็บเดิม — ข้ามไป
            print("    ! รูปโหลดไม่ได้", url, e)
            return None
        ext = os.path.splitext(url.split("?")[0])[1].lstrip(".").lower() or "png"
    name = hashlib.md5(raw).hexdigest()[:12] + "." + ext
    path = f"{IMG_DIR}/{name}"
    if not os.path.exists(path):
        open(path, "wb").write(raw)
    return f"{IMG_URL}/{name}"


class Clean(HTMLParser):
    """ตัด HTML จากเว็บเดิม (Word/Summernote) ให้เหลือแท็กพื้นฐาน ไม่มี style/class — หน้าตามาจาก CSS ของเว็บใหม่"""
    KEEP = {"p", "br", "strong", "em", "u", "sup", "sub", "ul", "ol", "li", "table", "thead", "tbody",
            "tr", "td", "th", "a", "img", "blockquote", "h4", "h5"}
    MAP = {"b": "strong", "i": "em", "h1": "h4", "h2": "h4", "h3": "h4", "h4": "h4", "h5": "h5", "h6": "h5"}   # หัวข้อในเนื้อหาอยู่ใต้ h3 ของ article
    VOID = {"br", "img"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.stack, self.skip = [], [], 0
        self.pdfs = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "button", "input"):
            self.skip += 1
            return
        tag = self.MAP.get(tag, tag)
        if tag not in self.KEEP:
            return
        a = dict(attrs)
        attr = ""
        if tag == "a":
            href = (a.get("href") or "").strip()
            pdf = pdf_url(href) if href else None
            if pdf:
                self.pdfs.append(pdf)
                href = pdf
            if not href or href.startswith(("#", "javascript")):
                self.stack.append(None)
                return
            href = absu(href) if not href.startswith(("http", "mailto:", "tel:")) else href
            attr = f' href="{H.escape(href)}"' + (' target="_blank" rel="noopener noreferrer"' if href.startswith("http") else "")
        elif tag == "img":
            src = save_image((a.get("src") or "").strip()) if a.get("src") and not a["src"].upper().endswith(".HTM") else None
            if not src:
                return
            attr = f' src="{src}" alt="{H.escape(a.get("alt") or "")}" loading="lazy"'
        elif tag in ("td", "th"):
            for k in ("colspan", "rowspan"):
                if a.get(k, "").isdigit() and a[k] != "1":
                    attr += f' {k}="{a[k]}"'
        if tag == "table":
            self.out.append('<div class="table-scroll">')
        self.out.append(f"<{tag}{attr}>")
        if tag not in self.VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in ("script", "style", "button", "input"):
            self.skip = max(0, self.skip - 1)
            return
        tag = self.MAP.get(tag, tag)
        if tag not in self.KEEP or tag in self.VOID:
            return
        if tag in self.stack:
            while self.stack:
                t = self.stack.pop()
                if t:
                    self.out.append(f"</{t}>")
                    if t == "table":
                        self.out.append("</div>")
                if t == tag:
                    break

    def handle_data(self, data):
        if not self.skip:
            self.out.append(H.escape(data, quote=False))

    def result(self):
        while self.stack:
            t = self.stack.pop()
            if t:
                self.out.append(f"</{t}>")
        s = "".join(self.out).replace("\xa0", " ")
        s = re.sub(r"[ \t\r\n]+", " ", s)
        s = re.sub(r"<(p|li|td|th|h4|h5)> +", r"<\1>", s)        # ย่อหน้าเว็บเดิมใช้ &nbsp; หลายตัวแทนการเยื้อง
        s = re.sub(r" +</(p|li|td|th|h4|h5)>", r"</\1>", s)
        for _ in range(3):                                          # แท็กว่าง (เกิดจากการตัด span/style)
            s = re.sub(r"<(strong|em|u|p|h4|h5|sup|sub)>\s*(<br>\s*)*</\1>", "", s)
        s = re.sub(r"(<br>\s*){2,}", "<br>", s)
        s = re.sub(r"(<blockquote>)+", "<blockquote>", s)          # เว็บเดิมซ้อน blockquote หลายชั้นเพื่อเยื้อง
        s = re.sub(r"(</blockquote>)+", "</blockquote>", s)
        s = re.sub(r"<p>\s*<br>\s*</p>", "", s)
        return s.strip()


def clean(fragment):
    c = Clean()
    c.feed(fragment)
    return c.result(), c.pdfs


def pdf_card(url, title):
    """การ์ด PDF ในเนื้อหา — ปุ่ม "ดูเอกสาร" เปิดป๊อปอัปของเว็บใหม่ (initDocPreview ใน components.js)"""
    t = H.escape(title)
    u = H.escape(url)
    return (f'<div class="doc-inline"><span class="doc-inline-badge" aria-hidden="true">PDF</span>'
            f'<span class="doc-inline-title">{t}</span>'
            f'<span class="doc-inline-actions">'
            f'<button type="button" class="doc-btn is-primary" data-doc-preview="{u}" data-doc-title="{t}" hidden>ดูเอกสาร<span class="sr-only"> {t}</span></button>'
            f'<a class="doc-btn" href="{u}" target="_blank" rel="noopener noreferrer">เปิดไฟล์<span class="sr-only"> {t} (เปิดในแท็บใหม่)</span></a>'
            f'</span></div>')


def modal_content(url, title):
    """เนื้อหาของหน้า modal 1 หน้า -> HTML ที่สะอาดแล้ว"""
    h = get(url)
    body = h[h.find("<body"):h.find("<!-- all js")] if "<!-- all js" in h else h
    parts = []
    # แบบ 3: ส่งต่อไป PDF
    m = re.search(r"self\.location\.href\s*=\s*'([^']+)'", body)
    if m and pdf_url(m.group(1)):
        return pdf_card(pdf_url(m.group(1)), title), 1
    # แบบ 2: ไฟล์ .HTM ที่อ้างเป็นรูป
    for src in re.findall(r'<img[^>]+src="([^"]+\.HTM)"', body, re.I):
        frag = get(absu(src).replace("https://www.orst.go.th/", ""))
        parts.append(clean(frag.lstrip("﻿"))[0])
    # แบบ 1: HTML ในกล่องเนื้อหา (ตัดชื่อเรื่องซ้ำ <h5>..</h5><hr> และปุ่ม "ลิงก์" ออก)
    m = re.search(r'<div class="modal-pro-content">(.*)', body, re.S)
    pdfs = []
    if m:
        frag = re.sub(r'<p class="pull-right">.*?</p>', "", m.group(1), flags=re.S)
        frag = re.sub(r"^\s*<p>\s*<h5>.*?</h5>\s*<hr>", "", frag, flags=re.S)
        html, pdfs = clean(frag)
        parts.append(html)
    html = "".join(p for p in parts if p)
    # หัวเรื่องซ้ำกับชื่อหัวข้อ (เว็บเดิมใส่ชื่อซ้ำไว้บรรทัดแรก)
    plain = re.sub(r"\s+", "", title)
    html = re.sub(r"^<(h4|h5|p)>(?:<strong>)?([^<]{1,120})(?:</strong>)?</\1>",
                  lambda mm: "" if re.sub(r"\s+", "", mm.group(2)) == plain else mm.group(0), html)
    # ลิงก์ PDF ในเนื้อหา -> การ์ด PDF ต่อท้าย (ลิงก์ข้อความเดิมยังอยู่ แต่ชี้ไฟล์ตรง)
    if pdfs:
        html += "".join(pdf_card(u, f"{title} ({i + 1})" if len(pdfs) > 1 else title) for i, u in enumerate(dict.fromkeys(pdfs)))
    # ขนาดเนื้อหา: ข้อความ + รูป (หัวข้อที่มีแต่รูป เช่น "วงเล็บปีกกา" ไม่นับว่าว่าง)
    return html, len(re.sub(r"<[^>]+>", "", html).strip()) + 100 * html.count("<img")


def write_page(slug, title, description, blocks):
    page = {"$schema": "../blocks.schema.json", "_note": NOTE, "title": title, "navKey": "knowledge",
            "description": description, "sideNav": False, "blocks": blocks}
    with open(f"{ROOT}/content/pages/{slug}.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(page, f, ensure_ascii=False, indent=2)
        f.write("\n")
    html = (TPL.replace("[แก้ไข] คำอธิบายหน้านี้ 1-2 ประโยค สำหรับ SEO", H.escape(description))
               .replace("[แก้ไข] ชื่อหน้า", H.escape(title))
               .replace("[แก้ไข-navKey]", "knowledge")
               .replace("[แก้ไข-slug]", slug))
    with open(f"{ROOT}/{slug}.html", "w", encoding="utf-8", newline="\n") as f:
        f.write(html)


hub_path = f"{ROOT}/content/pages/{HUB}.json"
hub = json.load(open(hub_path, encoding="utf-8"))
hero = hub["blocks"][0]
cards = []

for title, (key, ic, href) in TOPICS.items():
    if "iwfm_table" in href:
        rows = re.findall(r"src=(iwfm_modal\.asp\?i=[^ ]+?)\s*></iframe>'\)\"[^>]*>\s*(.*?)\s*</a>", get(href), re.S)
        subs = [(H.unescape(u), clean_title(t)) for u, t in rows]
    else:
        subs = [(href, title)]
    sections, empty = [], 0
    for u, t in subs:
        html, size = modal_content(u, t)
        if not size:
            empty += 1
            html = '<p class="article-pending">[รอเนื้อหาจากสำนักงาน — หัวข้อนี้ในเว็บไซต์เดิมยังไม่มีรายละเอียด]</p>'
        sections.append({"heading": t, "html": html} if len(subs) > 1 else {"html": html})
    slug = f"guideline-{key}"
    n = len(subs)
    desc = (f"{title} — {' · '.join(s for _, s in subs[:3])}{' และอื่น ๆ' if n > 3 else ''}" if n > 1
            else f"{title} ตามหลักเกณฑ์ที่สำนักงานราชบัณฑิตยสภากำหนด")
    blocks = [
        {"type": "page-hero", "heading": title, "image": hero.get("image"),
         "lead": f"หลักเกณฑ์ที่สำนักงานราชบัณฑิตยสภากำหนด{' — ' + str(n).translate(TH_DIGITS) + ' หัวข้อ' if n > 1 else ''}",
         "breadcrumb": [{"label": "หน้าหลัก", "href": "index.html"}, {"label": "คลังองค์ความรู้", "href": "knowledge.html"},
                        {"label": HUB_TITLE, "href": f"{HUB}.html"}, {"label": title}]},
        {"type": "article", "id": "content", "toc": n >= 3, "sections": sections},
        {"type": "cta-band", "heading": "ดูหลักเกณฑ์เรื่องอื่น", "body": "หลักเกณฑ์การใช้ภาษาไทยทั้งหมดของสำนักงานราชบัณฑิตยสภา",
         "actions": [{"label": "หลักเกณฑ์ภาษาไทยทั้งหมด", "href": f"{HUB}.html"}]},
    ]
    write_page(slug, title, desc, blocks)
    cards.append({"icon": ic, "title": title, "href": f"{slug}.html",
                  "body": " · ".join(s for _, s in subs[:3]) + (" …" if n > 3 else "") if n > 1 else "",
                  "meta": f"{str(n).translate(TH_DIGITS)} หัวข้อ" if n > 1 else "อ่านเนื้อหา"})
    print(f"  {slug}.html  {title}  ({n} หัวข้อ{', ว่าง ' + str(empty) if empty else ''})")

# หน้ารวม: การ์ดหัวข้อ (ลิงก์ภายใน)
hub["_note"] = NOTE
hub["sideNav"] = False
hub["blocks"] = [hero, {"type": "card-grid", "id": "topics", "layout": "tiles", "columns": 3, "items": cards}]
with open(hub_path, "w", encoding="utf-8", newline="\n") as f:
    json.dump(hub, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(f"\n{HUB}.html  {len(cards)} หัวข้อ")
