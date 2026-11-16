"""ขั้นที่ 4: รายการสิ่งพิมพ์ + รูปปก -> publications.json"""
import re, sys, os, io, json, urllib.request, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scrape import *  # noqa
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")).replace("\\", "/")
from PIL import Image
h = get('iwfm_book.asp?p=PUB-%,สื่อสิ่งพิมพ์')
D = ROOT + '/assets/images/orst/publications'; os.makedirs(D, exist_ok=True)
items = []
for td in re.findall(r'<td>(.*?)</td>', h, re.S):
    img = re.search(r'<img src="([^"]+)"', td); modal = re.search(r'src=(iwfm_modal\.asp\?[^ &>]+)', td)
    t = text(re.sub(r'onclick="[^"]*"', '', td))
    if img and t:
        items.append({'src': absu(img.group(1)), 'title': t[0], 'href': absu(modal.group(1)) if modal else None})
def thumb(it):
    name = os.path.splitext(os.path.basename(it['src']))[0].lower() + '.jpg'; path = f'{D}/{name}'
    if not os.path.exists(path):
        raw = urllib.request.urlopen(urllib.request.Request(it['src'], headers={'User-Agent': 'Mozilla/5.0'}), timeout=90).read()
        im = Image.open(io.BytesIO(raw)).convert('RGB'); im.thumbnail((320, 480)); im.save(path, quality=82, optimize=True)
    return 'assets/images/orst/publications/' + name
with cf.ThreadPoolExecutor(8) as ex: paths = list(ex.map(thumb, items))
P = ROOT + '/content/pages/publications.json'
p = json.load(open(P, encoding='utf-8'))
bb = text(main_wrapper(get('iwfm_list.asp?p=ABOUT-BUY-BOOK')))
for i, b in enumerate(p['blocks']):
    if b.get('id') in ('journals', 'catalog'):
        p['blocks'][i] = {'type': 'media-grid', 'id': 'catalog', 'heading': 'สิ่งพิมพ์ของสำนักงานราชบัณฑิตยสภา',
            'lead': f'หนังสือ พจนานุกรม และสารานุกรมที่สำนักงานจัดพิมพ์ ทั้งหมด {len(items)} รายการ', 'columns': 4, 'ratio': '3:4', 'fit': 'contain',
            'items': [dict({'image': pth, 'alt': 'ปกหนังสือ ' + it['title'], 'title': it['title']}, **({'href': it['href']} if it['href'] else {}))
                      for pth, it in zip(paths, items)]}
    if b.get('id') == 'media':
        for it in b['items']:
            if it['title'] == 'อินโฟกราฟิก': it['href'] = 'infographics.html'
    if b.get('id') == 'how-to-order':
        b['action'] = {'label': 'รายละเอียดการสั่งซื้อ', 'href': 'book-ordering.html'}
        for it in b['items']:
            if it['title'] == 'ชำระเงิน': it['body'] = 'ชำระทางธนาณัติ หรือโอนเงินเข้าบัญชีธนาคารไทยพาณิชย์ ชื่อบัญชี สำนักงานราชบัณฑิตยสภา (ห้องจำหน่ายหนังสือ)'
            if it['title'] == 'รับหนังสือ': it['body'] = 'เจ้าหน้าที่จัดส่งหนังสือหลังได้รับชำระค่าหนังสือพร้อมค่าจัดส่งแล้ว'
p['_note'] = 'รายการสิ่งพิมพ์จาก orst.go.th/iwfm_book.asp?p=PUB-% (ดึงเมื่อ 13 พ.ย. 2569) รูปปกย่อเก็บใน assets/images/orst/publications ลิงก์รายละเอียดยังชี้ไปเว็บไซต์เดิม'
p['updatedAt'] = '2026-11-13'
with open(P, 'w', encoding='utf-8', newline='\n') as f: json.dump(p, f, ensure_ascii=False, indent=2); f.write('\n')
print(len(items))
