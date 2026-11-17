# Content Model — โครงสร้างเนื้อหาและคลังบล็อก

เอกสารอ้างอิงสำหรับคนเขียนเนื้อหาและ AI ที่สร้างหน้าใหม่
ดูของจริงที่ **[styleguide.html](styleguide.html)** (เปิดผ่าน Live Server) ซึ่งแสดง block ทุกชนิด

---

## 1. หลักการ

หน้าเว็บ 1 หน้า = ไฟล์ JSON 1 ไฟล์ + ไฟล์ HTML บาง ๆ 1 ไฟล์

```
content/pages/about.json   ← เนื้อหาทั้งหมดอยู่ที่นี่ (คนทำเนื้อหา / CMS แก้ไฟล์นี้)
about.html                 ← โครงเปล่า 30 บรรทัด ไม่ต้องแตะอีก
```

JSON ประกอบด้วย **ลำดับของ block** เรียงจากบนลงล่าง แต่ละ block คือหนึ่ง section บนหน้าเว็บ
`assets/js/blocks.js` แปลง block เป็น HTML — ตัวเดียวกันนี้ใช้ทั้งตอน render ในเบราว์เซอร์
และตอนสร้าง HTML นิ่งด้วย `node tools/build.mjs` ผลลัพธ์จึงตรงกันเป๊ะ

---

## 2. โครงไฟล์เนื้อหา

```json
{
  "$schema": "../blocks.schema.json",
  "title": "เกี่ยวกับเรา",
  "navKey": "about",
  "description": "ประวัติ ภารกิจ และโครงสร้างองค์กร",
  "blocks": [ ... ]
}
```

| ฟิลด์ | บังคับ | ใช้ทำอะไร |
|---|:--:|---|
| `$schema` | | ทำให้ VS Code เติมคำและตรวจ error ให้อัตโนมัติ — ควรใส่ทุกไฟล์ |
| `title` | ✓ | ใช้ทำ `<title>` โดยต่อท้ายด้วย ` \| สำนักงานราชบัณฑิตยสภา` |
| `seoTitle` | | ถ้าต้องการกำหนด `<title>` เองทั้งหมด |
| `navKey` | ✓ | ต้องตรงกับ `data-page` ในไฟล์ HTML เพื่อให้เมนูไฮไลต์ถูกหน้า |
| `description` | | meta description |
| `blocks` | ✓ | ลำดับ block บนหน้า |
| `_note` | | บันทึกภายในทีม ไม่ถูกแสดงผล |
| `updatedAt` | | วันที่ปรับปรุงล่าสุด `YYYY-MM-DD` (ค.ศ.) แสดงท้ายหน้าเป็น "ปรับปรุงข้อมูลล่าสุด ๑๓ พฤศจิกายน ๒๕๖๙" — CMS ควรเขียนให้อัตโนมัติ |

**ค่าที่ `navKey` รับได้:** `home` `dictionary` `knowledge` `publications` `news` `services` `about` `contact`

---

## 3. ฟิลด์ที่ block ทุกตัวใช้ได้

| ฟิลด์ | ค่า | ผล |
|---|---|---|
| `id` | string | ใส่เป็น `id` ของ `<section>` ใช้ทำ anchor link เช่น `about.html#mission` |
| `variant` | `default` \| `alt` | `alt` = พื้นหลังสีขาว, `default` = พื้นสีกระดาษ **สลับไปมาเพื่อให้แต่ละ section แยกกันชัด** |
| `heading` | string | หัวข้อของ section |
| `lead` | string | คำโปรยใต้หัวข้อ |
| `eyebrow` | string | ข้อความตัวเล็กสีทองเหนือหัวข้อ |
| `action` | `{label, href}` | ปุ่มมุมขวาบนของ section เช่น "ดูทั้งหมด" |

---

## 4. คลังบล็อก 21 ชนิด

### `page-hero` — หัวหน้าเพจ
ใช้หน้าละ 1 อัน และควรเป็น block แรกเสมอ

```json
{
  "type": "page-hero",
  "eyebrow": "About Us",
  "heading": "เกี่ยวกับเรา",
  "lead": "ประวัติ ภารกิจ และโครงสร้างองค์กร",
  "breadcrumb": [
    { "label": "หน้าหลัก", "href": "index.html" },
    { "label": "เกี่ยวกับเรา" }
  ],
  "actions": [{ "label": "ดาวน์โหลดเอกสาร", "href": "#" }]
}
```
`breadcrumb` รายการสุดท้ายไม่ต้องใส่ `href` (คือหน้าปัจจุบัน)

---

### `rich-text` — ข้อความยาว

```json
{ "type": "rich-text", "heading": "ภาพรวม",
  "paragraphs": ["ย่อหน้าที่หนึ่ง", "ย่อหน้าที่สอง"] }
```
| ฟิลด์ | ใช้ทำอะไร |
|---|---|
| `paragraphs` | array ของย่อหน้า — **ใช้ตัวนี้เป็นค่าเริ่มต้น ปลอดภัย escape ให้อัตโนมัติ** |
| `html` | HTML ดิบ ใช้เมื่อต้องการลิสต์/ตัวหนา/ลิงก์ — ใช้เฉพาะเนื้อหาที่เชื่อถือได้ |
| `width` | `narrow` (ค่าเริ่มต้น จำกัด 78 ตัวอักษร อ่านง่าย) หรือ `full` |

---

### `card-grid` — การ์ดเรียงตาราง *(ใช้บ่อยที่สุด)*

```json
{ "type": "card-grid", "heading": "บริการออนไลน์", "columns": 3,
  "items": [
    { "icon": "i-form", "title": "สอบถามข้อมูล", "body": "คำอธิบาย",
      "href": "#", "tag": "ใหม่", "meta": "ตอบใน 3 วัน" }
  ]}
```
`columns`: 2, 3 หรือ 4 (จอเล็กยุบเป็น 1 คอลัมน์อัตโนมัติ) · ใส่ `href` แล้วการ์ดทั้งใบคลิกได้

---

### `feature-list` — ไอคอน + หัวข้อ + คำอธิบาย

```json
{ "type": "feature-list", "columns": 2,
  "items": [{ "icon": "i-shield", "title": "หัวข้อ", "body": "คำอธิบาย" }] }
```

---

### `stat-row` — ตัวเลขสถิติ

```json
{ "type": "stat-row",
  "items": [{ "value": "1,240", "label": "คำศัพท์", "note": "อัปเดต ม.ค. 2569" }] }
```

---

### `link-list` — รายการเอกสาร/ดาวน์โหลด

```json
{ "type": "link-list", "heading": "แบบฟอร์ม",
  "items": [{ "title": "ชื่อเอกสาร", "desc": "คำอธิบาย",
              "tag": "PDF", "meta": "1 ม.ค. 2569", "href": "#", "icon": "i-file" }] }
```

---

### `media-grid` — การ์ดที่มีรูป

```json
{ "type": "media-grid", "columns": 4,
  "items": [{ "image": "assets/images/e-Book01.png", "alt": "ปกหนังสือ",
              "title": "ชื่อเรื่อง", "desc": "คำอธิบาย", "tag": "e-Book", "href": "#" }] }
```
รูปถูกครอบเป็นอัตราส่วน 4:3 · **ต้องใส่ `alt` เสมอ** (validate จะเตือนถ้าไม่ใส่)

---

### `table` — ตารางข้อมูล

```json
{ "type": "table", "caption": "คำอธิบายตาราง",
  "columns": ["กิจกรรม", "วันที่", "สถานที่"],
  "rows": [["ชื่อกิจกรรม", "1 ม.ค.", "ห้องประชุม"]] }
```
คอลัมน์แรกถูกทำเป็น row header อัตโนมัติ · จำนวนช่องในแต่ละ `rows` ต้องเท่ากับจำนวน `columns`

---

### `faq` — คำถามที่พบบ่อย

```json
{ "type": "faq", "id": "faq",
  "items": [{ "q": "คำถาม", "a": "คำตอบ" }] }
```
กดเปิด/ปิดได้ — `components.js` ผูก event ให้อัตโนมัติ · **ควรใส่ `id`** เพราะใช้สร้าง id ของคำตอบ

---

### `steps` — ขั้นตอนการทำงาน

```json
{ "type": "steps",
  "items": [{ "title": "ขั้นตอนแรก", "body": "คำอธิบาย" }] }
```
เลขลำดับถูกใส่ให้อัตโนมัติ

---

### `two-column` — ข้อความคู่กับรูป

```json
{ "type": "two-column", "subheading": "หัวข้อย่อย",
  "paragraphs": ["ข้อความ"],
  "image": "assets/images/hero01.png", "imageAlt": "คำอธิบายรูป",
  "imageSide": "right",
  "actions": [{ "label": "อ่านต่อ", "href": "#" }] }
```

---

### `cta-band` — แถบเรียกให้ทำอะไรบางอย่าง

```json
{ "type": "cta-band", "heading": "ต้องการข้อมูลเพิ่มเติม", "body": "คำอธิบาย",
  "actions": [{ "label": "ติดต่อเรา", "href": "contact.html" },
              { "label": "รอง", "href": "#", "variant": "ghost" }] }
```
พื้นเขียวเข้ม เต็มความกว้าง มักวางเป็น block สุดท้ายของหน้า

---

### `notice` — กล่องแจ้งเตือน

```json
{ "type": "notice", "tone": "warn", "title": "ข้อควรทราบ", "body": "ข้อความ" }
```
`tone`: `info` (ค่าเริ่มต้น) · `warn` (เหลือง) · `success` (เขียว)

---

### `contact-info` — ข้อมูลติดต่อ

```json
{ "type": "contact-info", "address": "...", "phone": "...",
  "email": "...", "hours": "...", "mapEmbed": "https://..." }
```
เบอร์โทรและอีเมลกลายเป็นลิงก์ `tel:` / `mailto:` อัตโนมัติ

### `document-list` — รายการเอกสาร/ประกาศ *(แม่แบบ T1)*

```json
{ "type": "document-list", "pageSize": 20, "yearBy": "fiscal",
  "items": [
    { "title": "ชื่อเอกสาร", "file": "https://.../a.pdf", "fileSize": 1839934, "fiscalYear": 2569 },
    { "title": "ชื่อประกาศ", "href": "https://...", "publishedAt": "2026-11-05", "refNo": "12/2569", "category": "ประกวดราคา" }
  ] }
```
- `publishedAt` เป็น **ค.ศ.** เสมอ แสดงผลเป็น พ.ศ. ให้เอง (validate จับถ้าใส่ พ.ศ. มา) — ไม่มีวันที่ใส่ `fiscalYear` (พ.ศ.) แทน
- เรียงใหม่ไปเก่าอัตโนมัติ (`"sort": "none"` = ตามลำดับในไฟล์), ชนิดไฟล์เดาจากนามสกุล, `fileSize` ใส่เป็นไบต์
- มีช่องค้นหา (รองรับเลขไทย/อารบิก) + ตัวกรองปี + ตัวกรองหมวด (ขึ้นเมื่อมี `category` มากกว่า 1 ค่า) + ปุ่มแสดงเพิ่ม
- `"layout": "compact"` = ไม่มีแถบค้นหา ใช้เป็นเอกสารแนบท้ายหน้าเนื้อหา, `items: []` = แสดง `emptyText`
- ตัวอย่างจริง: `annual-action-plan.json`, `procurement-notices.json`

### `article` — เนื้อหายาวแบ่งหัวข้อ *(แม่แบบ T2)*

```json
{ "type": "article", "intro": ["ย่อหน้านำ"],
  "sections": [ { "heading": "หัวข้อ", "paragraphs": ["..."], "list": ["..."], "html": "<p>...</p>" } ] }
```
มีสารบัญ "หัวข้อในหน้านี้" อัตโนมัติเมื่อมีหัวข้อ >= 3 (บังคับด้วย `"toc": true/false`) — ตัวอย่างจริง: `history.json`

### `page-index` — สารบัญหน้าลูกของหมวด *(แม่แบบ T3)*

```json
{ "type": "page-index", "columns": 3,
  "groups": [ { "heading": "แผนปฏิบัติราชการ", "icon": "i-journal",
    "items": [ { "title": "หน้าในเว็บ", "href": "annual-action-plan.html" },
               { "title": "หน้าในเว็บเดิม", "href": "https://www.orst.go.th/...", "tag": "เว็บไซต์เดิม" },
               { "title": "ยังไม่มีหน้า" } ] } ] }
```
ลิงก์ `http(s)` เปิดแท็บใหม่, รายการที่ไม่มี `href` แสดง "รอเนื้อหา" — ตัวอย่างจริง: `operations.json`

### `person-grid` — บุคคล/ผู้บริหาร *(แม่แบบ T5)*

```json
{ "type": "person-grid", "columns": 4,
  "items": [ { "name": "ชื่อ-นามสกุล", "position": "ตำแหน่ง", "image": "assets/images/...jpg",
               "phone": "02-141-1725", "email": "a@orst.go.th" } ] }
```
รูปแนวตั้ง 3:4 ครอปจากด้านล่าง (ศีรษะไม่ขาด) — ไม่มีรูปแสดงไอคอนแทน — ตัวอย่างจริง: `executives.json`

### `figure` — ภาพเด่น *(หน้าข่าว)*

```json
{ "type": "figure", "image": "รูปย่อ 960px", "alt": "...", "href": "ภาพเต็ม", "caption": "..." }
```
เห็นทั้งภาพ (ไม่ครอป) กดแล้วเปิดภาพเต็มใน lightbox

### `share` — ปุ่มแชร์ *(หน้าข่าว)*

```json
{ "type": "share" }
```
Facebook / LINE / X / คัดลอกลิงก์ — ใส่ลิงก์ของหน้าให้อัตโนมัติ (มาตรฐานข้อ 7.2 (5))

### ตัวเลือกเพิ่มของ block เดิม

- `page-hero` `"variant": "article"` = หัวหน้าเพจรายละเอียดข่าว แบ่งสองฝั่ง: `tag` (ประเภท) · `date` (YYYY-MM-DD) · หัวข้อ · `lead` (ไม่บังคับ) · ปุ่ม แชร์/คัดลอกลิงก์/พิมพ์ (`"share": false` = ซ่อน)
  ด้านขวาเป็นภาพเด่น `image` + `imageAlt` + `imageHref` (ภาพเต็ม เปิด lightbox) + `caption` — ไม่มีภาพ = ข้อความเต็มความกว้าง
- `news-media` (ท้ายหน้าข่าว): `attachments: [{ title, file, fileType?, fileSize? }]` | `images: [{ image, href?, alt? }]` — สองคอลัมน์ ภาพแบบโมเสก เกิน 5 ภาพแสดง "+N"
- `news-related` (ข่าวอื่น ๆ): `heading?`, `href` (ดูทั้งหมด), `items: [{ title, href, image?, category?, publishedAt? }]` สูงสุด 4 ข่าว — การ์ดเหมือนหน้ารวมข่าว
- `media-grid`: `"ratio": "4:3" | "3:4" | "1:1" | "16:9"` และ `"fit": "cover" | "contain"` (contain = เห็นทั้งภาพ ใช้กับปกหนังสือ ภาพสแกน อินโฟกราฟิก)
  ลิงก์ที่ชี้ไปไฟล์รูปเปิดใน lightbox (เลื่อนดูภาพในกลุ่มเดียวกันได้)
  วิดีโอ: ใส่ `"youtube": "<รหัสวิดีโอ>"` แทน `href` — การ์ดมีปุ่มเล่น กดแล้วเล่นในป๊อปอัปของเว็บ (`tag` แสดงเป็นป้ายประเภทเหนือชื่อ) ดูตัวอย่าง `videos.json`
- `document-list`: `"layout": "news"` = รายการข่าว แต่ละรายการเพิ่ม `image` (รูปปก) และ `excerpt` (คำโปรย)
- `document-list`: `"source": { "type": "news", "channel": "general" | "activity" | "lecture", "limit": 6 }` = ไม่ใส่ `items` เอง
  ดึงรายการข่าวจาก `content/news/index.json` (ใหม่สุดก่อน) — ใช้กับหน้ารายการข่าวทุกหน้า ดู CMS-HANDOFF.md หัวข้อ 2.4.1
  รายการข่าวมีปุ่มสลับมุมมอง **ตาราง** (การ์ดภาพ — ค่าเริ่มต้น) / **รายการ** (แถว) เบราว์เซอร์จำค่าที่เลือกไว้ หน้าละ 12 ข่าว (ตั้งเองด้วย `pageSize`)
  แถบเครื่องมือข่าว: ชิปประเภท (จาก `category` ของแต่ละรายการ — ทั้งหมด/ข่าว/ประกาศ) · ค้นหา · ปี · สลับมุมมอง
  การ์ด/แถวข่าวแสดง ประเภท · ชื่อ · คำโปรย · วันที่ + ปุ่ม "อ่านต่อ"
- ระดับหน้า: `"sideNav": false` = ไม่แสดงแถบเมนูย่อยของหมวด หน้าเต็มความกว้าง (ใช้กับหน้ารวมข่าว)
- `document-list` (แบบเต็ม ไม่ใช่ compact): แบ่งหน้าแบบตัวเลข "แสดง 1–20 จาก N รายการ · หน้าแรก ก่อนหน้า 1 2 … ถัดไป สุดท้าย · แสดงต่อหน้า" แทนปุ่ม "แสดงเพิ่ม" (ค่าเริ่มต้นหน้าละ 20 รายการ / ข่าว 12 ตั้งด้วย `pageSize` ผู้ใช้เลือก ×2 ×4 ได้)
- `page-hero`: `"image"` = รูปพื้นหลังเต็มความกว้าง (แนวนอน ≥ 1600px) มีเงาไล่สีเขียวด้านซ้าย ตัวอักษรเป็นสีขาว
  + `"imageAlt"` (เว้นว่างถ้าเป็นภาพประกอบ) + `"highlights": [{ "icon", "label" }]` จุดเด่นสั้น ๆ ใต้ปุ่ม (สูงสุด 4) — ตัวอย่าง `services.json`
- `card-grid`: `"layout": "service"` = การ์ดบริการขนาดใหญ่ ไอคอนในกรอบเขียว ป้าย `tags: [..]` ปุ่ม `action` ชิดล่าง
  / `"layout": "tiles"` = การ์ดลิงก์แนวตั้ง (ไอคอน + ลูกศร | ชื่อ | คำอธิบาย | โดเมนของลิงก์ภายนอก) เหมาะกับรายการระบบ 4-12 รายการ
  / `"layout": "list"` = รายการแถวในกรอบเดียว (`columns: 2`) รายการที่ไม่มี `href` แสดงจางพร้อมป้าย `tag` เช่น "อยู่ระหว่างจัดทำ"
  ลิงก์ภายนอก (`http...`) เปิดแท็บใหม่ให้อัตโนมัติ · หน้าหมวดที่ใช้ `tiles`/`list` ถูกนับเป็นกลุ่มในแผนผังเว็บไซต์ด้วย
- `document-list`: รายการที่ไฟล์เป็น PDF (`file` ลงท้าย `.pdf`) ได้ป้าย PDF + บรรทัดชนิด/ขนาด/โดเมน และปุ่ม **ดูตัวอย่าง** (เปิด PDF ในหน้าต่างซ้อน)
  กับ **เปิดเอกสาร** (แท็บใหม่) ให้อัตโนมัติ ไม่ต้องเพิ่มฟิลด์ — เบราว์เซอร์ที่แสดง PDF ในหน้าไม่ได้ (เช่น Chrome บน Android) จะเห็นเฉพาะ "เปิดเอกสาร"
  ไฟล์ต้องอยู่บนเซิร์ฟเวอร์ที่ไม่ห้ามฝัง (ไม่มี `X-Frame-Options: DENY`) — ไฟล์บน www.orst.go.th ฝังได้
- `steps`: `"layout": "timeline"` = เรียงแนวนอนต่อกันด้วยเส้นประ (จอเล็กกลับเป็นแนวตั้ง) เหมาะกับ 3-5 ขั้น
- `feature-list`: `"layout": "cards"` = แต่ละรายการเป็นการ์ดมีกรอบ ไอคอนในวงกลม
  แต่ละรายการใส่ `links: [{ "label", "href" }]` = ปุ่มติดต่อท้ายการ์ด (`tel:` โทร, `mailto:` อีเมล, `https:` เปิดแท็บใหม่ — ไอคอนเลือกให้อัตโนมัติ)
  และ block ใส่ `footnote: { "title", "body" }` = แถบหมายเหตุใต้การ์ด (ใช้แทน block `notice` แยกเมื่อข้อความเกี่ยวกับรายการนั้นโดยตรง) — ตัวอย่าง `services.json` #channels

### `anchor-nav` — เมนูลัดไปหัวข้อในหน้า

```json
{ "type": "anchor-nav",
  "items": [{ "label": "บริการออนไลน์", "href": "#online-services" }, { "label": "ขั้นตอน", "href": "#how-to" }] }
```
วางต่อจาก `page-hero` ในหน้าที่ยาวหลายส่วน — ติดใต้ header ขณะเลื่อน ไฮไลต์หัวข้อที่กำลังอ่าน จอเล็กเลื่อนแนวนอนได้
`href` ต้องชี้ `id` ของ block ในหน้าเดียวกัน (ใส่ `"id"` ให้ block ปลายทาง) — ตัวอย่าง `services.json`

### `variant: "dark"` (ทุก block ที่เป็น section)
แถบสีเขียวเข้ม ตัวอักษรขาว — ใช้คั่นจังหวะหน้ายาว 1-2 ส่วนต่อหน้า (ตอนนี้ปรับสีให้ `steps` แล้ว block อื่นยังไม่ได้ตรวจบนพื้นเข้ม)

### แถบเมนูย่อยของหมวด (ไม่ใช่ block)

ถ้าหน้าอยู่ในหมวดใน `content/site-nav.json` หน้าย่อยจะเป็นสองคอลัมน์ (เมนูย่อย + เนื้อหา) อัตโนมัติ
ดูรายละเอียดใน [CMS-HANDOFF.md](CMS-HANDOFF.md)

---

## 5. ปุ่ม (actions)

block ที่รับ `actions` ได้: `page-hero`, `two-column`, `cta-band`

```json
"actions": [
  { "label": "ปุ่มหลัก", "href": "#" },
  { "label": "ปุ่มรอง", "href": "#", "variant": "ghost" }
]
```

---

## 6. ไอคอนที่ใช้ได้

ทั้งหมดมาจาก sprite ใน `assets/js/components.js` — ใส่ชื่ออื่นที่ไม่มีในรายการ `validate` จะฟ้อง

```
i-search  i-book      i-eye        i-menu    i-x        i-user     i-access
i-shield  i-people    i-file       i-video   i-form     i-dictionary
i-database i-journal  i-ebook      i-megaphone i-service
i-chevron i-arrow     i-plus       i-map     i-phone    i-pen      i-puzzle
```

---

## 7. ข้อควรระวังเรื่องเนื้อหา

- **ห้ามแต่งข้อมูลจริงของหน่วยงาน** — เบอร์โทร ที่อยู่ วันที่ ตัวเลขสถิติ ชื่อบุคคล
  ให้ใส่ `[คำอธิบายสิ่งที่ต้องเติม]` แล้วให้ผู้รับผิดชอบเนื้อหาเติมทีหลัง
  `node tools/validate.mjs` จะรายงานจำนวน placeholder ที่ยังค้างอยู่ให้
- ข้อความทุกตัวถูก escape อัตโนมัติ จึงใส่ `<` `>` `&` ได้ตามปกติ
  ยกเว้นฟิลด์ `html` ของ `rich-text` ที่ตั้งใจให้ใส่ HTML ดิบ

---

## 8. เส้นทางต่อ CMS

โครงสร้างนี้ออกแบบให้ย้ายไป CMS ได้โดยไม่ต้องรื้อ

| CMS | แมปยังไง |
|---|---|
| **Headless** (Strapi / Directus / Sanity) | 1 หน้า = 1 entry · `blocks` = dynamic zone / portable text · block 1 ชนิด = 1 component · ให้ API คืน JSON หน้าตาเดียวกับ `content/pages/*.json` แล้วเปลี่ยน `data-content` เป็น URL ของ API |
| **WordPress** | block 1 ชนิด = 1 Gutenberg block หรือ ACF flexible-content layout · เขียน template part ตามฟังก์ชันใน `assets/js/blocks.js` |
| **Git-based** (Decap / Tina) | ชี้ CMS มาที่โฟลเดอร์ `content/pages/` ได้เลย ใช้ `content/blocks.schema.json` เป็นตัวกำหนดฟอร์ม |

ทุกทางเลือกใช้ `content/blocks.schema.json` เป็นสัญญากลางได้ทันที

**สิ่งที่ยังต้องทำเพิ่มเมื่อขึ้น CMS จริง**

1. header/footer/เมนู ยังเป็นข้อมูลใน `assets/js/components.js` (ตัวแปร `navItems`, `megaMenuData`)
   ถ้าต้องการให้ CMS จัดการเมนูด้วย ให้ย้ายออกเป็น `content/site.json` แล้วโหลดก่อน render header
2. `index.html`, `knowledge.html`, `contact.html` ยังเป็น HTML ที่เขียนเอง
   ถ้าต้องการให้ CMS จัดการด้วย ต้องแตกเป็น block ก่อน (งานใหญ่ ควรทำหลังเนื้อหาหน้าอื่นนิ่งแล้ว)
3. ฟอร์มติดต่อยังไม่ส่งข้อมูลไปที่ไหน ต้องต่อ endpoint จริง
