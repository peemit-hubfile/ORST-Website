"""ขั้นที่ 0: รูปผู้บริหารและเครื่องหมายราชการ (เว็บเดิมฝังเป็น base64 ในหน้า)

ภาพผู้บริหารบนเว็บเดิมเป็นภาพรวม (รูป + ชื่อ + ตำแหน่ง พิมพ์ในภาพ) จึงตัดเฉพาะส่วนรูปถ่ายด้วยพิกัดคงที่
ถ้าเว็บเดิมเปลี่ยนภาพ ต้องตรวจพิกัด CROPS ใหม่ และแก้ชื่อ/ตำแหน่งใน step2_pages.py (หน้า executives) ด้วย
"""
import base64, io, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scrape import get, main_wrapper  # noqa
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")).replace("\\", "/")
OUT = ROOT + "/assets/images/orst/"


def images(p):
    w = main_wrapper(get("iwfm_list.asp?p=" + p))
    return [Image.open(io.BytesIO(base64.b64decode(b))) for b in re.findall(r'src="data:image/\w+;base64,([^"]+)"', w)]


def save(im, name, width=480):
    im = im.convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    os.makedirs(os.path.dirname(OUT + name), exist_ok=True)
    im.save(OUT + name, quality=85, optimize=True)
    print("  " + name, im.size)


exc = images("ABOUT-EXC")  # [เลขาธิการ, รองเลขาธิการ (ภาพรวม), ผู้อำนวยการ 4 คน (ภาพรวม)]
save(exc[0], "people/secretary-general.jpg")
save(exc[1].crop((205, 8, 440, 282)), "people/deputy-secretary-general.jpg")
CROPS = [(23, 574), (829, 1380), (1638, 2189), (2446, 2996)]  # แนวนอนของรูปถ่ายแต่ละคนในภาพกว้าง 3100px
for i, (x0, x1) in enumerate(CROPS):
    save(exc[2].crop((x0, 28, x1, 691)), f"people/director-{i + 1}.jpg")
emb = images("ABOUT-EMB")[0]
os.makedirs(OUT + "about", exist_ok=True)
emb.save(OUT + "about/emblem.png", optimize=True)
print("  about/emblem.png", emb.size)
