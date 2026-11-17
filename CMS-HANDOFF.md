# ส่งมอบหน้าย่อย (Inner pages) ให้ทีมพัฒนา CMS

เอกสารนี้อธิบายว่าหน้าย่อยทุกหน้าสร้างจากอะไร CMS ต้องส่งข้อมูลรูปแบบไหน และต้องต่อจุดไหนบ้าง
อ่านคู่กับ [TEMPLATES.md](TEMPLATES.md) (แม่แบบแต่ละหน้าใน sitemap) และ [CONTENT-MODEL.md](CONTENT-MODEL.md) (ฟิลด์ของ block ทุกชนิด)

ดูของจริงได้ที่ `styleguide.html` (block ทุกชนิด) และหน้าตัวอย่างในตารางข้อ 3

---

## 1. หน้าย่อย 1 หน้าประกอบด้วยอะไร

```
<slug>.html                     โครง HTML บาง ๆ (คัดลอกจาก _template.html) — ไม่มีเนื้อหา
content/pages/<slug>.json       เนื้อหาของหน้า = ลำดับ block           <- CMS สร้าง/แก้ส่วนนี้
content/site-nav.json           โครงเมนูของแต่ละหมวด (แถบเมนูย่อยข้างเนื้อหา) <- CMS สร้างส่วนนี้
assets/js/blocks.js             ตัวแปลง JSON -> HTML (pure function รันได้ทั้งเบราว์เซอร์และ Node)
```

หน้าตาที่ได้ (สร้างโดย `renderPage(page, nav, slug)` ใน `blocks.js`):

```
[header / เมนู — components.js]
[page-hero: breadcrumb + ชื่อหน้า + คำโปรย]            block แรกของทุกหน้า
┌─────────────────┬────────────────────────────────┐
│ แถบเมนูย่อย      │ block ที่เหลือตามลำดับใน JSON      │   แสดงเมื่อหน้าอยู่ในหมวดใน site-nav.json
│ ของหมวด         │                                │   (หน้าหมวดเอง และหน้าที่ไม่อยู่ในหมวด = เต็มความกว้าง)
└─────────────────┴────────────────────────────────┘
[footer — components.js]
```

จอเล็กกว่า 1024px แถบเมนูย่อยย้ายขึ้นไปอยู่เหนือเนื้อหาและพับไว้

## 2. สัญญาข้อมูล (data contract)

### 2.1 หน้า — `content/pages/<slug>.json`

| ฟิลด์ | บังคับ | ความหมาย |
|---|:--:|---|
| `title` | ✓ | ชื่อหน้า → `<title>` |
| `navKey` | ✓ | เมนูหลักที่ไฮไลต์: `home` `dictionary` `knowledge` `publications` `news` `services` `about` `contact` |
| `description` | | meta description |
| `updatedAt` | | วันที่แก้ไขล่าสุด `YYYY-MM-DD` (ค.ศ.) — **CMS ควรเขียนให้อัตโนมัติเมื่อบันทึก** (มาตรฐานข้อ 7.1) — ตอนนี้ไม่แสดงบนหน้า (ผู้ใช้ให้เอาแถบท้ายหน้าออก) |
| `blocks` | ✓ | ลำดับ block — block แรกควรเป็น `page-hero` ที่มี `breadcrumb` |
| `_note` | | บันทึกภายใน (ที่มาของข้อมูล) ไม่แสดงผล |

Schema เต็มอยู่ที่ `content/blocks.schema.json` (JSON Schema draft-07) — ใช้สร้างฟอร์มใน CMS ได้ทันที
ตรวจไฟล์ทั้งหมดด้วย `node tools/validate.mjs`

### 2.2 โครงเมนูของหมวด — `content/site-nav.json`

```json
{ "sections": [
  { "key": "about", "title": "เกี่ยวกับเรา", "href": "about.html",
    "groups": [ { "heading": "ข้อมูลองค์กร",
                  "items": [ { "title": "ประวัติความเป็นมา", "href": "history.html" } ] } ] } ] }
```

- หน้าไหนอยู่ในกลุ่มไหน หาจาก `href` ของหน้าเอง ถ้าไม่เจอ (เช่น หน้าข่าว) หาจากลิงก์ใน breadcrumb ย้อนขึ้นไป
- ตอนนี้ไฟล์นี้สร้างอัตโนมัติจาก `page-index` ของหน้าหมวด (`tools/scrape-old-site/step6_sitemap.py`)
  เมื่อมี CMS ให้ CMS สร้างจากโครงเมนูที่ผู้ดูแลจัดลำดับเอง

### 2.3 กิจกรรมในปฏิทินหน้าแรก — `content/events.json`

```json
{ "events": [
  { "id": "ev-20250717-29", "start": "2025-07-17", "end": "2025-07-18",
    "title": "โครงการเสวนาเชิงวิชาการ สำนักวิทยาศาสตร์", "location": "สำนักงานราชบัณฑิตยสภา", "unit": "สำนักวิทยาศาสตร์" } ] }
```

- `id` `start` `title` บังคับ, `end` ใส่เมื่อจัดหลายวัน (วันสุดท้าย ค.ศ.), `location` `unit` ไม่บังคับ
- ปฏิทินบนหน้าแรก (`initEventCalendar` ใน `assets/js/pages/home.js`) อ่านไฟล์นี้ มีปุ่มเปลี่ยนเดือน
  เปิดหน้าที่เดือนปัจจุบันถ้ามีกิจกรรม ไม่งั้นเดือนล่าสุดที่มีกิจกรรม
- ตอนนี้ข้อมูลมาจาก Google Calendar สาธารณะของหน่วยงานที่เว็บเดิมฝังไว้ (`tools/scrape-old-site/step7_calendar.py`)
  กิจกรรมล่าสุดในปฏิทินเหล่านั้นคือ ส.ค. 2568 — **CMS ต้องเป็นที่ลงกิจกรรมใหม่** แล้วเขียนไฟล์/endpoint รูปแบบเดียวกัน

### 2.4 หน้าคลังองค์ความรู้ของชาติ — `content/knowledge-hub.json`

ตั้งค่าหน้า `knowledge.html` (อ่านโดย `assets/js/pages/knowledge.js`) — **รายการในแต่ละประเภทไม่ได้อยู่ในไฟล์นี้**
แต่ดึงจาก `content/pages/<page>.json` ของประเภทนั้น (block แรกที่มี `items`: media-grid / document-list / card-grid)
จำนวนรายการบนหน้านับจากข้อมูลจริงอัตโนมัติ CMS แค่เพิ่ม/ลบรายการในหน้าของประเภทนั้น

```json
{
  "popular": ["ราชาศัพท์", "ทับศัพท์"],
  "categories": [
    { "cat": "infographic", "label": "อินโฟกราฟิก", "icon": "i-eye", "page": "infographics",
      "kind": "cards", "unit": "ภาพ", "action": "ดูภาพ" },
    { "cat": "video", "label": "วิดีโอความรู้", "icon": "i-video", "page": "videos", "kind": "video", "unit": "คลิป" }
  ],
  "systems": [ { "title": "ศัพท์บัญญัติ", "desc": "…", "href": "https://coined-word.orst.go.th/", "icon": "i-form" } ]
}
```

- `categories` = ส่วนบนหน้า เรียงตามลำดับในอาร์เรย์ — `cat` (ไม่ซ้ำ ใช้เป็น id `#kb-<cat>`), `label`, `icon` (ไอคอนใน sprite),
  `page` (slug ของหน้ารวมประเภทนั้น), `kind` = `cards` (ภาพ) / `covers` (ปกหนังสือ) / `topics` (การ์ดหัวข้อ) / `list` (รายการ) / `video`,
  `unit` (หน่วยนับ เช่น ภาพ เล่ม เรื่อง), `action` (ข้อความปุ่ม), `description` / `href` (ไม่บังคับ — แทนค่าจากหน้าของประเภท)
- วิดีโออยู่ในหน้ารวม `content/pages/videos.json` (block media-grid) — แต่ละรายการใส่ `youtube` (รหัสวิดีโอ) + `image` + `title` + `tag`
  การ์ดมีปุ่มเล่น กดแล้วเล่นในป๊อปอัปของเว็บ (`initVideoPlayer` ใน components.js, youtube-nocookie) ทั้งหน้าคลังและหน้า videos.html
- `systems` = แถบ "ระบบสืบค้นออนไลน์" ท้ายหน้า, `popular` = ชิปคำค้นยอดนิยมใน hero
- ถ้าโหลดไฟล์นี้ไม่ได้ หน้ายังใช้ค่าเริ่มต้นใน `knowledge.js` (5 ประเภทเดิม ไม่มีวิดีโอ/ระบบสืบค้น)

### 2.5 ไฟล์และรูป

| ชนิด | ตอนนี้อยู่ที่ | ต้องทำตอนต่อ CMS |
|---|---|---|
| PDF / เอกสารแนบ | ลิงก์ไปเว็บเดิม `www.orst.go.th/FILEROOM/...` | ย้ายเข้า media library ของ CMS แล้วแทน URL ใน `file` |
| รูปข่าว ผู้บริหาร ปกหนังสือ อินโฟกราฟิก | รูปย่อใน `assets/images/orst/` ภาพเต็มยังลิงก์เว็บเดิม | CMS สร้างรูปย่อเอง (ขนาดแนะนำในข้อ 3) |
| หน้ารายละเอียดข่าวเก่า | ข่าว 28 เรื่องล่าสุดมีหน้าใหม่ ที่เหลือลิงก์เว็บเดิม | นำเข้าข่าวทั้งหมดเป็น entry ชนิดข่าว |

สคริปต์ที่ดึงข้อมูลจากเว็บเดิมทั้งหมดอยู่ที่ `tools/scrape-old-site/` — ใช้เป็นต้นแบบตอนเขียนตัวนำเข้า (import) เข้า CMS ได้

### 2.6 ภาษาอังกฤษ (สองภาษา TH / EN)

ผู้ใช้สลับภาษาที่ปุ่ม **TH | EN** (topbar และเมนูมือถือ) หรือเปิดด้วย `?lang=en` — เว็บจำภาษาที่เลือกไว้ (localStorage `orst-lang`)

| เนื้อหา | ไฟล์ภาษาไทย | ไฟล์ภาษาอังกฤษ |
|---|---|---|
| หน้า JSON | `content/pages/<slug>.json` | `content/pages/en/<slug>.json` — โครงเดียวกัน แปลเฉพาะข้อความ (URL รูป ไฟล์ วันที่ ISO คงเดิม) |
| ข้อมูลประกอบ | `content/site-nav.json` `content/knowledge-hub.json` `content/events.json` | `content/en/<ไฟล์เดียวกัน>` |
| ข้อความส่วนกลาง (header footer เมนู ปุ่ม หน้า index/knowledge/contact ข้อความที่สคริปต์สร้าง) | ในโค้ด/HTML | `content/i18n/en.json` → `strings` (ไทย→อังกฤษ) + `patterns` (ข้อความมีตัวแปร เช่น "พบ 12 ข่าว") |

- **CMS:** เมื่อบันทึกเนื้อหาภาษาอังกฤษ ให้เขียนไฟล์/endpoint `en` โครงเดียวกับภาษาไทย — หน้าไหนยังไม่มีไฟล์ `en` เว็บจะแสดงภาษาไทยพร้อมแถบแจ้ง "available in Thai only"
- วันที่ไทยในข้อความ (เช่น "2 พ.ย. 2569", "ปีงบประมาณ 2569") แปลงเป็นวันที่สากลอัตโนมัติ · ภาษาอังกฤษไม่แปลงเลขไทย
- **เครื่องมือแปล** `tools/i18n/i18n.py`: `extract` ดึงข้อความไทยที่ยังไม่มีคำแปล → `apply` สร้างไฟล์ `en` ทั้งหมดจากหน่วยความจำคำแปล `tools/i18n/memory.json`
  แก้คำแปลที่ `memory.json` แล้วรัน `python tools/i18n/i18n.py apply` · กฎและชื่อหน่วยงานทางการอยู่ที่ `tools/i18n/GLOSSARY.md`
- ข้อความส่วนกลางที่ยังไม่มีคำแปล: เปิดหน้าด้วย `?lang=en` แล้วพิมพ์ `orstI18n.missing()` ในคอนโซล
- **คำแปลชุดแรกทำด้วยเครื่อง (AI) — ต้องให้สำนักงานตรวจทานก่อนเผยแพร่จริง** โดยเฉพาะชื่อเฉพาะ ชื่อบุคคล ชื่อกฎหมาย และเอกสารราชการ

## 3. แม่แบบหน้าย่อย → block → ฟิลด์ที่ CMS ต้องมี

| แม่แบบ | ประกอบด้วย block | หน้าตัวอย่าง | ฟิลด์ต่อรายการ |
|---|---|---|---|
| **T1 รายการเอกสาร** | `page-hero` + `document-list` | `annual-action-plan.html`, `laws-regulations.html` (มีหมวด), `procurement-results.html` (911 รายการ) | `title` `file`/`href` `publishedAt` `fiscalYear` `category` `refNo` `fileSize` `note` |
| **T2 หน้าเนื้อหา** | `page-hero` + `article` (+ `document-list` layout `compact` เป็นเอกสารแนบ) | `history.html`, `vision-mission.html`, `corruption-complaints.html` | `sections[]` = `heading` `paragraphs[]` `list[]` `html` |
| **T3 หน้าหมวด** | `page-hero` + `page-index` | `about.html`, `operations.html`, `news.html` | `groups[]` = `heading` `icon` `items[]` (`title` `href` `tag`) — รายการไม่มี `href` = "รอเนื้อหา" |
| **T4 รายการข่าว** | `page-hero` + `document-list` layout `news` | `general-news.html`, `activity-news.html` | + `image` (รูปปก 640px) `excerpt` — ไม่มีรูปจะแสดงป้ายวันที่ |
| **T4 รายละเอียดข่าว** | `page-hero` + `share` + `figure` + `rich-text` + `media-grid` (gallery) + `document-list` (เอกสารแนบ) + `cta-band` | `news-69gxi2522022.html` | ภาพเด่น 960px + ภาพเต็ม, แกลเลอรี 640px + ภาพเต็ม (เปิด lightbox), เอกสารแนบ |
| **T5 บุคคล** | `page-hero` + `person-grid` | `executives.html`, `cio.html` | `name` `position` `image` (แนวตั้ง ≥ 480px) `phone` `fax` `email` |
| **T6 คำถาม-คำตอบ** | `page-hero` + `faq` | `qa.html` | `q` `a` |
| **T7 คลังสื่อ** | `page-hero` + `media-grid` (`ratio` / `fit`) | `infographics.html` (1:1 contain), `publications.html` (3:4 contain) | `image` `title` `alt` `href` (ลิงก์ไปไฟล์รูป = เปิด lightbox) |
| **T8 ปฏิทิน** | `page-hero` + `rich-text` (ฝัง Google Calendar) | `event-calendar.html` | — (ใช้ Google Calendar เดิมของหน่วยงาน) |
| **T11 แผนผังเว็บไซต์** | `page-hero` + `page-index` | `sitemap.html` | สร้างอัตโนมัติจากหน้าหมวด |

แม่แบบที่ยังไม่ได้ทำ (ต้องมี backend/CMS ก่อน): **T9 แบบฟอร์มออนไลน์** (ร้องเรียน สำรวจ คำขอ PDPA),
**T10 Open Data**, **T12 ผลการค้นหาขั้นสูง**, RSS, ตัวนับผู้เข้าชม — ดูรายละเอียดใน TEMPLATES.md

### ข้อกำหนดที่ block จัดการให้แล้ว (CMS ไม่ต้องทำซ้ำ)

- วันที่: ส่งเป็น ค.ศ. `YYYY-MM-DD` → แสดงเป็น พ.ศ. ภาษาไทย และเลขไทยอัตโนมัติ
- รายการเอกสาร/ข่าว: ค้นหา (รองรับเลขไทย/อารบิก) กรองปีงบประมาณ กรองหมวด และ "แสดงเพิ่ม" ทีละ 20 ทำงานฝั่งเบราว์เซอร์
  — รายการเกิน ~1,000 ควรเปลี่ยนเป็นแบ่งหน้าฝั่ง server (ใช้ query `?page=` `?year=` `?q=`)
- ลิงก์ภายนอก/ไฟล์: เปิดแท็บใหม่ พร้อมข้อความสำหรับ screen reader ชนิดไฟล์และขนาดไฟล์คำนวณจาก URL/`fileSize`
- ปุ่มแชร์: ใส่ลิงก์ของหน้าให้เองตอนเปิดหน้า
- ข้อความทุกช่องถูก escape ยกเว้น `html` ของ `rich-text` / `article` (CMS ต้อง sanitize เอง)

## 4. ทางเลือกการต่อ CMS

| แบบ | ทำอย่างไร |
|---|---|
| **Headless + static build** (แนะนำ) | CMS เขียน `content/pages/*.json` + `content/site-nav.json` (ผ่าน API หรือ git) แล้วรัน `node tools/build.mjs` ได้ HTML นิ่งใน `dist/` (SEO ดี ใช้ตัว render เดียวกับเบราว์เซอร์) |
| **Headless + render ฝั่งเบราว์เซอร์** | เปลี่ยน `data-content` ในไฟล์ HTML ให้ชี้ API ที่คืน JSON รูปแบบเดียวกัน (`page-runtime.js` โหลดและ render ให้) |
| **CMS render ฝั่ง server** (WordPress / Node) | เรียก `renderPage(page, nav, slug)` จาก `assets/js/blocks.js` ใน Node หรือแปลงฟังก์ชัน block เป็น template ของ CMS ทีละตัว (ฟังก์ชันละ 20–60 บรรทัด) |

## 5. สิ่งที่ห้ามเปลี่ยนเมื่อต่อ CMS

- ลำดับ CSS: `typography.css` → `base.css` → `blocks.css` → `pages/*.css` → `components.css`
- header / footer / เมนูหลัก สร้างจาก `assets/js/components.js` ที่เดียว — ไฟล์ HTML มีแค่ `<div id="app-header">` / `<div id="app-footer">`
- ขนาดตัวอักษร มุมโค้ง ระยะห่าง ใช้ token จาก `typography.css` (`--text-*` `--radius-*` `--space-*`) — ห้ามใส่ px เอง
- ความกว้างเนื้อหาใช้ `.container` จาก `typography.css` กรอบเดียว (สูงสุด 1680px) — แถบพื้นหลังเต็มจอได้ แต่เนื้อหาต้องอยู่ใน `.container`
- สีใช้ตัวแปรจาก `base.css` เท่านั้น — ไม่งั้นโหมดสีตัดกันสูง/โหมดอ่านง่ายจะพัง
- `index.html` `knowledge.html` `contact.html` เขียน HTML เอง (ไม่ใช่ block) — ถ้าจะให้ CMS จัดการต้องแตกเป็น block ก่อน
