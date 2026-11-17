"""ขั้นที่ 7: ปฏิทินกิจกรรม (หน้าแรก) — ดึงกิจกรรมจริงจาก Google Calendar สาธารณะที่เว็บเดิมฝังไว้

เว็บเดิม www.orst.go.th/iwfm_calendar.asp ฝัง Google Calendar ของหน่วยงานย่อย 5 ปฏิทิน
ทุกปฏิทินเปิดสาธารณะ จึงอ่านไฟล์ .ics ได้โดยตรง แล้วเขียนเป็น content/events.json
(หน้าแรกอ่านไฟล์นี้ผ่าน initEventCalendar() ใน assets/js/pages/home.js)

ข้ามปฏิทิน zoomorst@gmail.com (ตารางนัดภายใน เช่น Morning Catch Up / Lunch ไม่ใช่กิจกรรมสาธารณะ)
ไม่เก็บ DESCRIPTION (อาจมีลิงก์ประชุม/รหัสผ่าน) — เก็บเฉพาะ ชื่อ วันที่ สถานที่ หน่วยงาน
ข้ามกิจกรรมที่เกิดซ้ำ (RRULE) เช่น "ประชุมกิจการสภา" — เป็นการประชุมภายใน

ตอนต่อ CMS: ให้ CMS เขียน content/events.json รูปแบบเดียวกัน (หรือ endpoint ที่คืน JSON เดียวกัน)
"""
import json, os, re, sys, urllib.parse, urllib.request

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")

CALENDARS = {
    "1efbbac617d74c3b66319daa75ac730d96b8ebc31397bcd2a96a54b1d78737f9@group.calendar.google.com": "สำนักธรรมศาสตร์และการเมือง",
    "8a0fc4e6ca07fb0da9cc923368f563d231de361869e1a91c843d9f524d8a7760@group.calendar.google.com": "สำนักวิทยาศาสตร์",
    "5580c6b8835d63300fba9fc3b1d4142a25d59f4e103092e5a6b84db7344271a0@group.calendar.google.com": "สำนักศิลปกรรม",
    "a642c8e23c1120ed19e2ec2ee602d29eb65bb51642bbc0e06d28ce964ca62b43@group.calendar.google.com": "กิจการสภา",
    "120eebd8cc70d210618849a13b01a7ba227fde286055c790352038f341c6a60d@group.calendar.google.com": "คณะกรรมการวิชาการกลาง",
}


def ics(cal_id):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, "gcal_" + cal_id[:12] + ".ics")
    if not os.path.exists(path):
        url = f"https://calendar.google.com/calendar/ical/{urllib.parse.quote(cal_id)}/public/basic.ics"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        open(path, "wb").write(urllib.request.urlopen(req, timeout=60).read())
    # unfold บรรทัดที่ถูกตัด (RFC 5545) แล้วถอด escape
    return open(path, encoding="utf-8").read().replace("\r\n ", "").replace("\r\n", "\n")


def unescape(v):
    return v.replace("\\,", ",").replace("\\;", ";").replace("\\n", " ").replace("\\N", " ").strip()


def clean_title(t, unit):
    t = re.sub(r"^\s*กอง[^_]*_", "", t)            # "กองธรรมศาสตร์_โครงการ..." -> "โครงการ..."
    t = re.sub(r"^ครงการ", "โครงการ", t.strip())    # พิมพ์ตก
    return re.sub(r"\s+", " ", t).strip()


def iso(d):
    return f"{d[:4]}-{d[4:6]}-{d[6:8]}"


def minus_one_day(d):
    from datetime import date, timedelta
    x = date(int(d[:4]), int(d[4:6]), int(d[6:8])) - timedelta(days=1)
    return x.isoformat()


events, seen = [], set()
for cal_id, unit in CALENDARS.items():
    for block in re.findall(r"BEGIN:VEVENT(.*?)END:VEVENT", ics(cal_id), re.S):
        g = lambda k: (re.search(rf"^{k}([^:\n]*):(.*)$", block, re.M) or [None, "", ""])
        if g("RRULE")[0]:
            continue
        s, e = g("DTSTART"), g("DTEND")
        start = s[2][:8]
        if not re.fullmatch(r"\d{8}", start):
            continue
        # กิจกรรมทั้งวัน: DTEND เป็นวันถัดจากวันสุดท้าย -> ลบ 1 วัน
        end = minus_one_day(e[2][:8]) if "VALUE=DATE" in (e[1] or "") and e[2] else iso(start)
        title = clean_title(unescape(g("SUMMARY")[2]), unit)
        loc = unescape(g("LOCATION")[2])
        loc = re.sub(r"[,\s]*(ประเทศไทย|Thailand)\s*$", "", loc)
        k = (start, title)
        if not title or k in seen:
            continue
        seen.add(k)
        ev = {"start": iso(start), "title": title, "unit": unit}
        if end != iso(start):
            ev["end"] = end
        if loc:
            ev["location"] = loc
        events.append(ev)

events.sort(key=lambda x: (x["start"], x["title"]))
for i, ev in enumerate(events, 1):
    ev["id"] = f"ev-{ev['start'].replace('-', '')}-{i}"
out = {
    "_note": "สร้างอัตโนมัติจาก tools/scrape-old-site/step7_calendar.py (Google Calendar สาธารณะของหน่วยงานที่เว็บเดิมฝังไว้) "
             "— วันที่เป็น ค.ศ. YYYY-MM-DD, end = วันสุดท้ายของกิจกรรม (ถ้าจัดหลายวัน)",
    "source": "https://www.orst.go.th/iwfm_calendar.asp",
    "events": [{k: ev[k] for k in ("id", "start", "end", "title", "location", "unit") if k in ev} for ev in events],
}
with open(os.path.join(ROOT, "content", "events.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write("\n")
months = sorted({e["start"][:7] for e in events})
print(f"  content/events.json  {len(events)} กิจกรรม  {months[0]} ถึง {months[-1]}")
