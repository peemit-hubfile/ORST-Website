"""เครื่องมือแปลเว็บเป็นภาษาอังกฤษ (ไม่มี dependency นอก Python มาตรฐาน)

    python tools/i18n/i18n.py extract [จำนวนชุด]   ดึงข้อความไทยที่ต้องแปลทั้งหมด -> tools/i18n/work/pack-XX.json
    python tools/i18n/i18n.py apply                รวมคำแปล (tools/i18n/work/out-*.json + tools/i18n/memory.json)
                                                   แล้วสร้างไฟล์ภาษาอังกฤษ:
                                                     content/pages/en/<slug>.json   (โครงเดียวกับไฟล์ไทย แปลเฉพาะข้อความ)
                                                     content/en/<ไฟล์>.json          (site-nav, knowledge-hub, events)
                                                     content/i18n/en.json            (ข้อความส่วนกลาง/หน้า HTML ที่เขียนเอง)
    python tools/i18n/i18n.py status               รายงานข้อความที่ยังไม่มีคำแปล

แหล่งข้อความ
  - ทุกค่า string ที่มีอักษรไทยใน content/pages/*.json และ content/{site-nav,knowledge-hub,events}.json
    (ฟิลด์ html แยกแปลทีละช่วงข้อความระหว่างแท็ก — แท็กและลิงก์คงเดิม)
  - ข้อความส่วนกลาง/หน้า HTML ที่เขียนเอง: tools/i18n/ui-strings.json (เก็บจากหน้าเว็บในโหมด ?lang=en ด้วย orstI18n.missing())
หน่วยความจำคำแปล tools/i18n/memory.json = { "ข้อความไทย": "English" } — แก้คำแปลได้ที่นี่แล้วรัน apply ใหม่
ข้อความที่ไม่มีคำแปล = คงภาษาไทยไว้ (หน้าเว็บยังใช้ได้)
"""
import glob
import html as H
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "work")
MEMORY = os.path.join(HERE, "memory.json")
UI = os.path.join(HERE, "ui-strings.json")
THAI = re.compile("[฀-๿]")
SKIP_KEYS = {"_note", "$schema"}
DATA_FILES = ["site-nav.json", "knowledge-hub.json", "events.json", "news/index.json", "people/index.json"]


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


def page_files():
    return sorted(glob.glob(os.path.join(ROOT, "content", "pages", "*.json")))


def news_files():
    """หน้ารายละเอียดข่าว content/news/<id>.json (ไม่รวม index.json ซึ่งเป็นข้อมูลประกอบ)"""
    return sorted(f for f in glob.glob(os.path.join(ROOT, "content", "news", "*.json")) if not f.endswith("index.json"))


def data_files():
    return [os.path.join(ROOT, "content", f) for f in DATA_FILES if os.path.exists(os.path.join(ROOT, "content", f))]


def html_segments(s):
    return [norm(H.unescape(x)) for x in re.split(r"<[^>]+>", s) if THAI.search(x)]


def collect(v, out, key=None):
    if isinstance(v, dict):
        for k, x in v.items():
            if k not in SKIP_KEYS:
                collect(x, out, k)
    elif isinstance(v, list):
        for x in v:
            collect(x, out, key)
    elif isinstance(v, str) and THAI.search(v):
        for s in (html_segments(v) if "<" in v and ">" in v else [norm(v)]):
            if s:
                out.append(s)


def load_memory():
    mem = {}
    if os.path.exists(MEMORY):
        mem.update(json.load(open(MEMORY, encoding="utf-8")))
    for f in sorted(glob.glob(os.path.join(WORK, "out-*.json"))):
        try:
            mem.update({norm(k): v for k, v in json.load(open(f, encoding="utf-8")).items() if isinstance(v, str) and v.strip()})
        except Exception as e:  # ไฟล์ผลแปลเสีย — ข้ามไฟล์นั้น
            print("  ! อ่านไม่ได้", f, e)
    return mem


def extract(n_packs=10):
    os.makedirs(WORK, exist_ok=True)
    mem = load_memory()
    groups = []   # [(ชื่อแหล่ง, [ข้อความ])] เรียงตามไฟล์ — ให้ผู้แปลเห็นบริบทเดียวกัน
    seen = set(mem)
    for f in page_files() + news_files() + data_files():
        out = []
        collect(json.load(open(f, encoding="utf-8")), out)
        uniq = [s for s in dict.fromkeys(out) if s not in seen]
        seen.update(uniq)
        if uniq:
            groups.append((os.path.relpath(f, ROOT).replace("\\", "/"), uniq))
    if os.path.exists(UI):
        ui = [norm(s) for s in json.load(open(UI, encoding="utf-8"))]
        uniq = [s for s in dict.fromkeys(ui) if s not in seen and THAI.search(s)]
        seen.update(uniq)
        # ข้อความส่วนกลางแยกเป็นชุดละ ~400 รายการ
        for i in range(0, len(uniq), 400):
            groups.append((f"ui (header/footer/เมนู/ปุ่ม/หน้า index-knowledge-contact) #{i // 400 + 1}", uniq[i:i + 400]))
    total = sum(len(s) for _, g in groups for s in g)
    target = total / max(1, n_packs)
    packs, cur, size = [], [], 0
    for name, g in groups:
        # ไฟล์ใหญ่แตกเป็นหลายชิ้น
        for i in range(0, len(g), 600):
            part = g[i:i + 600]
            cur.append({"source": name, "strings": part})
            size += sum(len(s) for s in part)
            if size >= target:
                packs.append(cur)
                cur, size = [], 0
    if cur:
        packs.append(cur)
    for old in glob.glob(os.path.join(WORK, "pack-*.json")):
        os.remove(old)
    for i, p in enumerate(packs, 1):
        json.dump(p, open(os.path.join(WORK, f"pack-{i:02d}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"  pack-{i:02d}.json  {sum(len(g['strings']) for g in p)} ข้อความ  {sum(len(s) for g in p for s in g['strings'])} ตัวอักษร")
    print(f"รวม {sum(len(g) for _, g in groups)} ข้อความที่ยังไม่มีคำแปล")


def translate_value(v, mem, miss):
    if isinstance(v, dict):
        return {k: (x if k in SKIP_KEYS else translate_value(x, mem, miss)) for k, x in v.items()}
    if isinstance(v, list):
        return [translate_value(x, mem, miss) for x in v]
    if isinstance(v, str) and THAI.search(v):
        if "<" in v and ">" in v:
            def seg(m):
                text = m.group(0)
                if not THAI.search(text):
                    return text
                key = norm(H.unescape(text))
                if key in mem:
                    lead = text[: len(text) - len(text.lstrip())]
                    tail = text[len(text.rstrip()):]
                    return lead + H.escape(mem[key], quote=False) + tail
                miss.add(key)
                return text
            return re.sub(r"[^<>]+(?=<|$)", seg, v)
        key = norm(v)
        if key in mem:
            return mem[key]
        miss.add(key)
    return v


# หน้าที่สอนภาษาไทย: คำแปลคงคำไทยตัวอย่างไว้ (memory) · หน้าอื่น/UI/ข้อมูลประกอบ: ใช้คำแปลทั่วไปใน overrides.json ก่อน
TEACHING = re.compile(r"^(guideline-|qa\.json$|_styleguide\.json$)")


def load_overrides():
    p = os.path.join(HERE, "overrides.json")
    if not os.path.exists(p):
        return {}
    return {k: v for k, v in json.load(open(p, encoding="utf-8")).items() if not k.startswith("_")}


def apply():
    mem = load_memory()
    json.dump(dict(sorted(mem.items())), open(MEMORY, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    plain = {**mem, **load_overrides()}
    miss = set()
    en_pages = os.path.join(ROOT, "content", "pages", "en")
    os.makedirs(en_pages, exist_ok=True)
    for f in page_files():
        d = json.load(open(f, encoding="utf-8"))
        out = translate_value(d, mem if TEACHING.match(os.path.basename(f)) else plain, miss)
        out["lang"] = "en"
        with open(os.path.join(en_pages, os.path.basename(f)), "w", encoding="utf-8", newline="\n") as fh:
            json.dump(out, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
    en_data = os.path.join(ROOT, "content", "en")
    os.makedirs(os.path.join(en_data, "news"), exist_ok=True)
    for f in news_files():
        out = translate_value(json.load(open(f, encoding="utf-8")), plain, miss)
        out["lang"] = "en"
        with open(os.path.join(en_data, "news", os.path.basename(f)), "w", encoding="utf-8", newline="\n") as fh:
            json.dump(out, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
    for f in data_files():
        out = translate_value(json.load(open(f, encoding="utf-8")), plain, miss)
        rel = os.path.relpath(f, os.path.join(ROOT, "content"))
        os.makedirs(os.path.dirname(os.path.join(en_data, rel)), exist_ok=True)
        with open(os.path.join(en_data, rel), "w", encoding="utf-8", newline="\n") as fh:
            json.dump(out, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
    # พจนานุกรมส่วนกลาง: ข้อความ UI ทั้งหมด + ข้อความเนื้อหา (สำรอง — ใช้แปลข้อความที่สคริปต์สร้างจากข้อมูล)
    ui = [norm(s) for s in json.load(open(UI, encoding="utf-8"))] if os.path.exists(UI) else []
    strings = {k: plain[k] for k in ui if k in plain}
    patterns = json.load(open(os.path.join(HERE, "patterns.json"), encoding="utf-8")) if os.path.exists(os.path.join(HERE, "patterns.json")) else []
    os.makedirs(os.path.join(ROOT, "content", "i18n"), exist_ok=True)
    with open(os.path.join(ROOT, "content", "i18n", "en.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump({"_note": "คำแปลข้อความส่วนกลาง (header/footer/เมนู/ปุ่ม/หน้า index-knowledge-contact) — สร้างโดย tools/i18n/i18n.py apply แก้คำแปลที่ tools/i18n/memory.json",
                   "strings": dict(sorted(strings.items())), "patterns": patterns}, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    ui_miss = [s for s in ui if s not in plain]
    print(f"หน้า JSON: {len(page_files())} ไฟล์ · ข้อมูล: {len(data_files())} ไฟล์ · พจนานุกรมส่วนกลาง {len(strings)} ข้อความ")
    print(f"ยังไม่มีคำแปล: เนื้อหา {len(miss)} ข้อความ · ส่วนกลาง {len(ui_miss)} ข้อความ")
    json.dump(sorted(miss | set(ui_miss)), open(os.path.join(WORK, "missing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "extract":
        extract(int(sys.argv[2]) if len(sys.argv) > 2 else 10)
    elif cmd == "apply":
        apply()
    else:
        mem = load_memory()
        print(f"คำแปลที่มี {len(mem)} ข้อความ")
