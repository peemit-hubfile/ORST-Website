# คำสั่งสำหรับ AI ที่ทำงานในโปรเจกต์นี้

> ไฟล์นี้ถูกอ่านอัตโนมัติโดย Claude Code / AI agent อื่น ๆ
> อ่านให้จบก่อนแก้ไฟล์ใด ๆ — กฎในนี้สำคัญกว่าการเดาจากโค้ดที่เห็น

## โปรเจกต์นี้คืออะไร

เว็บไซต์สำนักงานราชบัณฑิตยสภา — **static site ล้วน ไม่มี build step บังคับ ไม่มี npm dependency**
เนื้อหาของหน้าทั่วไปเก็บเป็น **JSON** แล้ว render ด้วย block library

รันด้วย VS Code Live Server (พอร์ต 5501) — เปิดด้วย `file://` ไม่ทำงาน

---

## กฎเหล็ก 6 ข้อ ห้ามผิด

1. **ห้ามเพิ่ม dependency / framework / build tool** — ไม่มี `package.json` และจะไม่มี
   ทุกอย่างต้องรันได้ด้วยการเปิด Live Server เฉย ๆ
2. **ลำดับ CSS ห้ามสลับ** — `typography.css` → `base.css` → `blocks.css` → `pages/<หน้า>.css` → `components.css`
   `typography.css` (ฟอนต์ ขนาดตัวอักษร ระยะห่าง มุมโค้ง — ชุดเดียวกับเว็บไซต์ราชบัณฑิตยสภา) ต้องเป็นไฟล์แรก
   **ขนาดตัวอักษรใช้ `var(--text-xs|sm|base|md|lg|xl|2xl|3xl)` เท่านั้น ห้ามใส่ rem/px เอง** ระยะบรรทัดใช้ `var(--leading-tight|normal|reading)`
   มุมโค้งใช้ `var(--radius-sm|md|lg|xl|pill)` (สูงสุด 16px ยกเว้นวงกลม `50%` และ pill)
   **ความกว้างเนื้อหาใช้ `.container` จาก `typography.css` เท่านั้น** (สูงสุด 1680px ขอบ 16/24/32/48px ตามจอ) ห้ามตั้ง width/max-width ของ `.container` ซ้ำในไฟล์อื่น
   `components.css` ต้องเป็นไฟล์สุดท้ายเสมอ (เดิมมันถูก inject ผ่าน JS จึงชนะทุกไฟล์)
3. **ลำดับ JS ห้ามสลับ** — `components.js` (classic script) ต้องมาก่อน `page-runtime.js` (module)
4. **ห้ามเขียน `<header>` / `<footer>` ในไฟล์หน้า** — สร้างจาก `assets/js/components.js` ที่เดียว
   หน้ามีแค่ `<div id="app-header"></div>` และ `<div id="app-footer"></div>`
5. **ห้ามแก้ `index.html`, `knowledge.html`, `contact.html` แบบยกเครื่อง**
   3 หน้านี้เขียน HTML เองทั้งหมดและมี CSS เฉพาะหน้าหลายพันบรรทัด
   แก้ได้เฉพาะจุดที่ผู้ใช้สั่ง และต้องเทียบหน้าตาก่อน/หลังทุกครั้ง
6. **ห้ามใส่ข้อมูลจริงที่ไม่ได้รับมา** — ห้ามแต่งเบอร์โทร ที่อยู่ วันที่ ตัวเลขสถิติ ชื่อบุคคล
   ของหน่วยงานราชการขึ้นเอง ให้ใส่ placeholder รูปแบบ `[คำอธิบายสิ่งที่ต้องเติม]` แทน

---

## งานที่พบบ่อยที่สุด: สร้างหน้าใหม่

ทำ 4 ขั้นตอนนี้ให้ครบ **ห้ามข้าม**

### 1. สร้างไฟล์เนื้อหา `content/pages/<slug>.json`

```json
{
  "$schema": "../blocks.schema.json",
  "title": "ชื่อหน้า",
  "navKey": "about",
  "description": "คำอธิบายหน้า 1-2 ประโยค สำหรับ meta description",
  "blocks": [
    { "type": "page-hero", "heading": "...", "lead": "..." }
  ]
}
```

- `navKey` ต้องเป็นค่าใดค่าหนึ่งใน: `home` `dictionary` `knowledge` `publications`
  `news` `services` `about` `contact`
- block แรกควรเป็น `page-hero` เสมอ
- ชนิด block ทั้งหมดและฟิลด์ที่ใช้ได้ อยู่ใน [CONTENT-MODEL.md](CONTENT-MODEL.md)
  และดูตัวอย่างครบทุกชนิดได้ที่ `content/pages/_styleguide.json`

### 2. สร้างไฟล์ HTML คู่กัน

คัดลอก `_template.html` เป็น `<slug>.html` แล้วแก้ 4 จุด: `<title>`, `meta description`,
`data-page` (ต้องเท่ากับ `navKey`), `data-content` (ต้องชี้ไป `content/pages/<slug>.json`)

### 3. เพิ่มลิงก์ในเมนู (ถ้าเป็นหน้าหลักของหมวด)

แก้ `navItems` และ/หรือ `megaMenuData` ใน `assets/js/components.js`

### 4. ตรวจก่อนจบงาน — บังคับ

```bash
node tools/validate.mjs
```

ต้องขึ้น `ผ่านทั้งหมด ไม่พบข้อผิดพลาด` เท่านั้นจึงถือว่าเสร็จ
(คำเตือนเรื่อง placeholder `[...]` ไม่นับเป็น error)

---

## งานอื่น ๆ

### ข่าวสาร (เชื่อม CMS)

- เพิ่ม/แก้ข่าว = แก้ `content/news/index.json` (+ `content/news/<id>.json` ถ้ามีหน้ารายละเอียด) **ห้ามสร้าง news-*.html ใหม่**
  หน้ารายการข่าว หน้าแรก RSS อ่านจาก index ให้เอง · ฟิลด์ทั้งหมดอยู่ใน CMS-HANDOFF.md หัวข้อ 2.4.1

### สองภาษา (TH / EN)

- ไฟล์ภาษาอังกฤษสร้างอัตโนมัติ — **ห้ามแก้ `content/pages/en/*`, `content/en/*`, `content/i18n/en.json` ด้วยมือ**
  แก้คำแปลที่ `tools/i18n/memory.json` (หรือ `overrides.json` สำหรับคำ UI) แล้วรัน `python tools/i18n/i18n.py apply`
- แก้/เพิ่มเนื้อหาไทยใน JSON แล้ว ให้รัน `python tools/i18n/i18n.py extract` → แปลไฟล์ `tools/i18n/work/pack-*.json`
  ลง `work/out-*.json` (ตาม `tools/i18n/GLOSSARY.md`) → `apply`
- เพิ่มข้อความ UI ใหม่ในโค้ด/HTML: เปิดหน้าด้วย `?lang=en` แล้วรัน `orstI18n.missing()` ในคอนโซล
  เอาข้อความที่ได้ใส่ `tools/i18n/ui-strings.json` + คำแปล แล้ว `apply` · ข้อความมีตัวแปรใส่ที่ `tools/i18n/patterns.json`
- ส่วนที่ไม่ต้องการให้แปล ใส่ `data-i18n-skip`


### เพิ่ม block ชนิดใหม่

ทำครบ 5 อย่าง มิฉะนั้นระบบจะไม่สมบูรณ์

1. เขียนฟังก์ชัน render ใน `assets/js/blocks.js` — **ต้องเป็น pure function** คืน HTML string
   ห้ามแตะ `document` / `window` เพราะไฟล์นี้ต้องรันใน Node ได้ด้วย
2. ลงทะเบียนใน `BLOCKS` ท้ายไฟล์
3. เพิ่ม CSS ใน `assets/css/blocks.css` — **ใช้ตัวแปร `var(--...)` เท่านั้น ห้ามฮาร์ดโค้ดสี**
   (ไม่งั้นโหมด high-contrast / readable-mode จะพัง)
4. เพิ่ม schema ใน `content/blocks.schema.json` และเพิ่มชื่อฟิลด์บังคับใน `REQUIRED` ที่ `tools/validate.mjs`
5. เพิ่มตัวอย่างใน `content/pages/_styleguide.json`

### แก้ header / footer / เมนู

แก้ที่ `assets/js/components.js` ที่เดียว — มีผลทุกหน้าทันที

### escape ข้อความ

ทุกค่าที่มาจาก JSON **ต้องผ่าน `esc()`** ก่อนใส่ลง HTML string
ยกเว้นฟิลด์ `html` ของ block `rich-text` ซึ่งตั้งใจให้ใส่ HTML ดิบ

---

## คำสั่งที่ใช้ได้

```bash
node tools/validate.mjs
```

```bash
node tools/build.mjs
```

`validate` ตรวจไฟล์เนื้อหาทั้งหมด (โครงสร้าง, ไอคอนมีจริงไหม, รูปมีจริงไหม, ลิงก์เสียไหม)
`build` สร้าง HTML นิ่งลง `dist/` สำหรับขึ้น production (ใช้ตัว render ตัวเดียวกับเบราว์เซอร์)
พร้อมคัดลอก `robots.txt` / `_headers` และสร้าง `sitemap.xml` ให้ด้วย

ตอนขึ้นจริงต้องบอกโดเมนให้ build ด้วย ไม่งั้นจะข้าม `sitemap.xml` และตัดบรรทัด `Sitemap:` ทิ้ง

```bash
$env:SITE_URL = "https://ชื่อเว็บ.netlify.app"; node tools/build.mjs
```

**อัพขึ้น Netlify เฉพาะโฟลเดอร์ `dist/`** ไม่ต้องอัพ `tools/` `_archive/` `*.md` `_template*.html`

---

## แผนผังไฟล์

```
index.html knowledge.html contact.html   เขียน HTML เอง — อย่ายกเครื่อง
about.html dictionary.html news.html
publications.html services.html          shell บาง ๆ ดึงเนื้อหาจาก JSON
styleguide.html                          คลังบล็อก ดูตัวอย่างทุก block
_template.html                           แม่แบบหน้าใหม่ (JSON-driven)
_template-static.html                    แม่แบบหน้าที่เขียน HTML เอง
404.html                                 หน้าที่ขึ้นเมื่อเปิด URL ที่ไม่มีจริง (มี <base href="/">)

netlify.toml  robots.txt  _headers       ไฟล์สำหรับ deploy ขึ้น Netlify

content/
  blocks.schema.json                     JSON Schema ของไฟล์เนื้อหา
  pages/<slug>.json                      เนื้อหา 1 หน้า = 1 ไฟล์
  news/index.json                        รายการข่าวทั้งหมด (แหล่งเดียว — หน้ารายการข่าว หน้าแรก RSS)
  news/<id>.json                         เนื้อหาข่าว 1 เรื่อง แสดงที่ news-detail.html?id=<id>

assets/
  css/base.css                           ตัวแปรสี + reset + คลาสพื้นฐาน
  css/blocks.css                          สไตล์ของ block ทุกตัว
  css/components.css                      header/footer (โหลดท้ายสุด)
  css/pages/<หน้า>.css                     เฉพาะ 3 หน้าที่เขียน HTML เอง
  js/components.js                        header/footer/เมนู/ไอคอน sprite
  js/blocks.js                            block renderer (pure, รันใน Node ได้)
  js/page-runtime.js                      ตัวโหลด JSON -> render (ES module)
  js/content-sources.js                   เติมรายการจากแหล่งกลาง (document-list ที่มี source) — pure ใช้ทั้งเบราว์เซอร์และ build
  js/pages/<หน้า>.js                       เฉพาะ 3 หน้าที่เขียน HTML เอง

tools/validate.mjs  tools/build.mjs
_archive/                                โค้ดเก่า ไม่ถูกโหลด อย่านำกลับมาใช้
```

---

## สิ่งที่ควรรู้ก่อนแก้ของเดิม

- ระบบค้นหาบน `index.html` มี **3 ชั้นทับกัน** เขียนผลลง `#search-results` ชุดเดียวกัน
  ถ้าจะแก้ ต้องอ่าน `assets/js/pages/home.js` ให้ครบก่อน
- `assets/css/pages/*.css` ยังมี CSS ของ header/footer ซ้ำกับ `components.css` อยู่
  (คงไว้เพื่อไม่ให้หน้าตาเปลี่ยน) — **แก้ header/footer ที่ `components.css` เท่านั้น**
- ทั้งเว็บยังไม่มี backend ข้อมูลทุกอย่างเป็น mock
- รายละเอียดหนี้ทางเทคนิคทั้งหมดอยู่ใน [HANDOFF.md](HANDOFF.md) หัวข้อ 6

## วิธีตรวจว่าไม่ทำหน้าเดิมพัง

ถ้าแก้อะไรที่กระทบหน้าเดิม ให้เทียบ computed style ก่อน/หลัง อย่าเชื่อสายตาอย่างเดียว
วิธีที่ใช้จริงในโปรเจกต์นี้: เสิร์ฟเวอร์ชันก่อนแก้กับหลังแก้จาก origin เดียวกัน
เก็บ `getComputedStyle` ของทุก element ทั้งสองฝั่ง แล้ว diff ทีละ element
