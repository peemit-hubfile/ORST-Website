/* =============================================================================
   blocks.js — ตัวสร้าง HTML จากข้อมูล JSON (Block renderer)
   -----------------------------------------------------------------------------
   ไฟล์นี้เป็น "ฟังก์ชันบริสุทธิ์" ล้วน ๆ  รับ object เข้า -> คืน HTML string ออก
   ไม่แตะ DOM ไม่แตะ window  จึงรันได้ทั้งในเบราว์เซอร์และใน Node.js
   (ใช้ซ้ำได้ทั้งตอน render สด และตอน build เป็นไฟล์ HTML นิ่ง)

   วิธีใช้
     import { renderBlocks } from './blocks.js';
     const html = renderBlocks(page.blocks);

   เพิ่ม block ใหม่ยังไง
     1. เขียนฟังก์ชัน render ใหม่ในไฟล์นี้
     2. ลงทะเบียนใน BLOCKS ท้ายไฟล์
     3. เพิ่ม schema ใน content/blocks.schema.json
     4. เพิ่มตัวอย่างใน content/pages/_styleguide.json
     5. เพิ่ม CSS (ถ้าต้องการ) ใน assets/css/blocks.css

   *** ทุก block รับ prop ร่วมเหล่านี้ได้ ***
     id       string   ใส่เป็น id ของ <section> เพื่อทำ anchor link
     variant  string   "default" (พื้นสีกระดาษ) | "alt" (พื้นขาว)
     heading  string   หัวข้อของ section
     lead     string   คำโปรยใต้หัวข้อ
     action   object   ปุ่มมุมขวาบนของ section { label, href }
   ============================================================================= */

/* ---------- ตัวช่วยพื้นฐาน ---------- */

/** แปลงอักขระพิเศษเป็น entity — ใช้กับ "ทุก" ค่าที่มาจากข้อมูล */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** ใส่ attribute เฉพาะเมื่อมีค่า */
function attr(name, value) {
  return value ? ` ${name}="${esc(value)}"` : '';
}

/** ไอคอนจาก sprite ที่ components.js ใส่ไว้ให้ (เช่น 'i-book') */
export function icon(id, className = 'icon') {
  if (!id) return '';
  return `<svg class="${esc(className)}" aria-hidden="true"><use href="#${esc(id)}"></use></svg>`;
}

/** ใส่ lang="en" ให้ข้อความที่เป็นภาษาอังกฤษล้วน (ไม่มีอักษรไทย) — ใช้ฟอนต์อังกฤษ และโปรแกรมอ่านหน้าจอออกเสียงถูก */
function langAttr(text) {
  return text && !/[฀-๿]/.test(text) ? ' lang="en"' : '';
}

/** หัว section มาตรฐาน: หัวข้อ + คำโปรย + ปุ่มมุมขวา */
function sectionHead(block) {
  if (!block.heading && !block.lead) return '';
  const action = block.action?.href
    ? `<a class="view-all" href="${esc(block.action.href)}">${esc(block.action.label || 'ดูทั้งหมด')}</a>`
    : '';
  return `
      <div class="section-head">
        <div>
          ${block.eyebrow ? `<span class="block-eyebrow"${langAttr(block.eyebrow)}>${esc(block.eyebrow)}</span>` : ''}
          ${block.heading ? `<h2>${esc(block.heading)}</h2>` : ''}
          ${block.lead ? `<p>${esc(block.lead)}</p>` : ''}
        </div>
        ${action}
      </div>`;
}

/** ห่อเนื้อหาด้วย <section class="section"> + .container ให้เป็นมาตรฐานเดียวกัน */
function section(block, inner, extraClass = '') {
  const variant = block.variant === 'alt' ? ' alt' : '';
  const cls = `section${variant}${extraClass ? ' ' + extraClass : ''}`;
  return `
    <section class="${cls}"${attr('id', block.id)}>
      <div class="container">${sectionHead(block)}
        ${inner}
      </div>
    </section>`;
}

/** ปุ่ม/ลิงก์ชุดหนึ่ง */
function actions(list = []) {
  if (!list.length) return '';
  return `<div class="block-actions">${list.map(a => {
    const cls = a.variant === 'ghost' ? 'block-btn is-ghost' : 'block-btn';
    return `<a class="${cls}" href="${esc(a.href || '#')}">${esc(a.label || '')}</a>`;
  }).join('')}</div>`;
}

/** คลาสจำนวนคอลัมน์ */
function colsClass(n) {
  const c = Number(n) || 3;
  return `block-grid block-grid-${Math.min(Math.max(c, 1), 4)}`;
}

/* ---------- Block: page-hero ---------- */
/* หัวหน้าเพจ ใช้ได้หน้าละ 1 อันและควรอยู่บนสุด
   { type, heading, lead, eyebrow?, breadcrumb?: [{label, href}], actions?: [] } */
function pageHero(b) {
  const crumbs = (b.breadcrumb || []).length
    ? `<nav class="block-breadcrumb" aria-label="เส้นทางหน้า">${b.breadcrumb.map((c, i, arr) =>
        i === arr.length - 1
          ? `<span aria-current="page">${esc(c.label)}</span>`
          : `<a href="${esc(c.href || '#')}">${esc(c.label)}</a>`
      ).join('<span aria-hidden="true">/</span>')}</nav>`
    : '';
  return `
    <section class="page-hero"${attr('id', b.id)}>
      <div class="container">
        ${crumbs}
        ${b.eyebrow ? `<span class="block-eyebrow"${langAttr(b.eyebrow)}>${esc(b.eyebrow)}</span>` : ''}
        <h1>${esc(b.heading)}</h1>
        ${b.lead ? `<p>${esc(b.lead)}</p>` : ''}
        ${actions(b.actions)}
      </div>
    </section>`;
}

/* ---------- Block: rich-text ---------- */
/* ข้อความยาว  ใช้ paragraphs (ปลอดภัย) หรือ html (ต้องเชื่อถือแหล่งที่มา)
   { type, heading?, lead?, paragraphs?: [string], html?: string, width?: "narrow"|"full" } */
function richText(b) {
  const body = b.html
    ? b.html
    : (b.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join('\n        ');
  const width = b.width === 'full' ? '' : ' block-prose-narrow';
  return section(b, `<div class="block-prose${width}">
          ${body}
        </div>`);
}

/* ---------- Block: card-grid ---------- */
/* การ์ดเนื้อหาเรียงเป็นตาราง — block ที่ใช้บ่อยที่สุด
   { type, heading?, lead?, columns?: 2|3|4,
     items: [{ title, body?, href?, icon?, tag?, meta?, action? }] }
   action = ข้อความปุ่มท้ายการ์ด (เช่น "ยื่นคำขอ") แสดงเมื่อการ์ดมี href */
function cardGrid(b) {
  const cards = (b.items || []).map(it => {
    const inner = `
            ${it.icon ? `<span class="block-card-icon">${icon(it.icon, 'icon-lg')}</span>` : ''}
            ${it.tag ? `<span class="block-tag">${esc(it.tag)}</span>` : ''}
            <h3>${esc(it.title)}</h3>
            ${it.body ? `<p>${esc(it.body)}</p>` : ''}
            ${it.meta ? `<small class="block-meta">${esc(it.meta)}</small>` : ''}
            ${it.action ? `<span class="block-card-action">${esc(it.action)} <span aria-hidden="true">→</span></span>` : ''}`;
    return it.href
      ? `<a class="content-card block-card is-link" href="${esc(it.href)}">${inner}
          </a>`
      : `<article class="content-card block-card">${inner}
          </article>`;
  }).join('\n          ');
  return section(b, `<div class="${colsClass(b.columns)}">
          ${cards}
        </div>`);
}

/* ---------- Block: feature-list ---------- */
/* รายการไอคอน + หัวข้อ + คำอธิบาย เรียงเป็นแถว
   { type, heading?, lead?, columns?, items: [{ icon, title, body? }] } */
function featureList(b) {
  const items = (b.items || []).map(it => `
            <li class="block-feature">
              <span class="block-feature-icon">${icon(it.icon || 'i-shield', 'icon-lg')}</span>
              <div>
                <strong>${esc(it.title)}</strong>
                ${it.body ? `<p>${esc(it.body)}</p>` : ''}
              </div>
            </li>`).join('');
  return section(b, `<ul class="${colsClass(b.columns)} block-feature-list">${items}
        </ul>`);
}

/* ---------- Block: stat-row ---------- */
/* ตัวเลขสถิติ  { type, heading?, items: [{ value, label, note? }] } */
function statRow(b) {
  const items = (b.items || []).map(it => `
            <div class="block-stat">
              <strong>${esc(it.value)}</strong>
              <span>${esc(it.label)}</span>
              ${it.note ? `<small>${esc(it.note)}</small>` : ''}
            </div>`).join('');
  return section(b, `<div class="block-stat-row">${items}
        </div>`);
}

/* ---------- Block: link-list ---------- */
/* รายการเอกสาร/ลิงก์ พร้อมชนิดไฟล์และวันที่
   { type, heading?, lead?, items: [{ title, desc?, meta?, href, tag?, icon? }] } */
function linkList(b) {
  const items = (b.items || []).map(it => `
            <li>
              <a class="block-link-row" href="${esc(it.href || '#')}">
                <span class="block-link-icon">${icon(it.icon || 'i-file')}</span>
                <span class="block-link-text">
                  <strong>${esc(it.title)}</strong>
                  ${it.desc ? `<span>${esc(it.desc)}</span>` : ''}
                </span>
                ${it.tag ? `<span class="block-tag">${esc(it.tag)}</span>` : ''}
                ${it.meta ? `<span class="block-meta">${esc(it.meta)}</span>` : ''}
              </a>
            </li>`).join('');
  return section(b, `<ul class="block-link-list">${items}
        </ul>`);
}

/* ---------- Block: media-grid ---------- */
/* การ์ดที่มีรูปภาพ
   { type, heading?, columns?, ratio?, fit?, items: [{ image, alt, title, desc?, href?, tag? }] }
   ratio = สัดส่วนกรอบรูป "4:3" (ค่าเริ่มต้น) | "3:4" (ปกหนังสือ/รูปแนวตั้ง) | "1:1" | "16:9"
   fit   = "cover" (เต็มกรอบ อาจถูกครอป — ค่าเริ่มต้น) | "contain" (เห็นทั้งภาพ เช่น ภาพสแกนเอกสาร อินโฟกราฟิก)
   ลิงก์ที่ชี้ไปไฟล์รูป (.jpg .png ...) เปิดดูภาพเต็มในหน้าเดิม (lightbox ใน components.js) */
const MEDIA_RATIOS = { '4:3': '4-3', '3:4': '3-4', '1:1': '1-1', '16:9': '16-9' };
const isImageUrl = href => /\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(String(href || ''));

function mediaGrid(b) {
  const ratio = MEDIA_RATIOS[b.ratio] || '4-3';
  const fit = b.fit === 'contain' ? ' media-fit-contain' : '';
  const items = (b.items || []).map(it => {
    const inner = `
            <span class="block-media-thumb">
              <img src="${esc(it.image)}" alt="${esc(it.alt || it.title || '')}" loading="lazy">
              ${it.tag ? `<span class="block-tag">${esc(it.tag)}</span>` : ''}
            </span>
            <span class="block-media-body">
              <strong>${esc(it.title)}</strong>
              ${it.desc ? `<span>${esc(it.desc)}</span>` : ''}
            </span>`;
    if (!it.href) return `<div class="block-media-card">${inner}
          </div>`;
    const lightbox = isImageUrl(it.href) ? ` data-lightbox="${esc(b.id || 'gallery')}"` : '';
    const ext = !lightbox && isExternal(it.href) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a class="block-media-card is-link" href="${esc(it.href)}"${lightbox}${ext}>${inner}
          </a>`;
  }).join('\n          ');
  return section(b, `<div class="${colsClass(b.columns)} block-media-grid media-ratio-${ratio}${fit}">
          ${items}
        </div>`);
}

/* ---------- Block: person-grid  (แม่แบบ T5 บุคคล / ผู้บริหาร) ---------- */
/* รูปแนวตั้ง 3:4 ไม่ครอปศีรษะ + ชื่อ ตำแหน่ง และช่องทางติดต่อ (ลิงก์โทร/อีเมลได้)
   { type, heading?, lead?, columns?: 1-4 (ค่าเริ่มต้น 4),
     items: [{ name, position, image?, alt?, phone?, fax?, email?, note? }] }                  */
function personGrid(b) {
  const telHref = v => `tel:${String(v).replace(/[^0-9+]/g, '')}`;
  const items = (b.items || []).map(it => {
    const contacts = [
      it.phone ? `<li><span>โทรศัพท์</span> <a href="${esc(telHref(it.phone))}">${esc(it.phone)}</a></li>` : '',
      it.fax ? `<li><span>โทรสาร</span> ${esc(it.fax)}</li>` : '',
      it.email ? `<li><span>อีเมล</span> <a href="mailto:${esc(it.email)}" lang="en">${esc(it.email)}</a></li>` : '',
    ].join('');
    return `
          <article class="person-card">
            <div class="person-photo">${it.image
              ? `<img src="${esc(it.image)}" alt="${esc(it.alt || it.name)}" loading="lazy">`
              : `<span class="person-photo-empty" aria-hidden="true">${icon('i-user', 'icon-lg')}</span>`}</div>
            <div class="person-body">
              <h3>${esc(it.name)}</h3>
              ${it.position ? `<p class="person-position">${esc(it.position)}</p>` : ''}
              ${contacts ? `<ul class="person-contact">${contacts}</ul>` : ''}
              ${it.note ? `<p class="person-note">${esc(it.note)}</p>` : ''}
            </div>
          </article>`;
  }).join('');
  return section(b, `<div class="${colsClass(b.columns || 4)} person-grid">${items}
        </div>`);
}

/* ---------- Block: table ---------- */
/* ตารางข้อมูล  { type, heading?, caption?, columns: [string], rows: [[string]] } */
function table(b) {
  const head = (b.columns || []).map(c => `<th scope="col">${esc(c)}</th>`).join('');
  const body = (b.rows || []).map(row =>
    `<tr>${row.map((cell, i) =>
      i === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`
    ).join('')}</tr>`).join('\n              ');
  return section(b, `<div class="block-table-wrap">
          <table class="block-table">
            ${b.caption ? `<caption>${esc(b.caption)}</caption>` : ''}
            <thead><tr>${head}</tr></thead>
            <tbody>
              ${body}
            </tbody>
          </table>
        </div>`);
}

/* ---------- Block: faq ---------- */
/* คำถามที่พบบ่อย — ใช้คลาส .faq-compact-list ที่ components.js ผูก event ให้อยู่แล้ว
   { type, heading?, lead?, items: [{ q, a }] } */
function faq(b) {
  const items = (b.items || []).map((it, i) => `
            <div class="faq-item">
              <button class="faq-q" type="button" aria-expanded="false" aria-controls="faq-a-${esc(b.id || 'x')}-${i}">
                <span>${esc(it.q)}</span>
                ${icon('i-chevron')}
              </button>
              <div class="faq-a" id="faq-a-${esc(b.id || 'x')}-${i}" hidden>
                <p>${esc(it.a)}</p>
              </div>
            </div>`).join('');
  return section(b, `<div class="faq-compact-list">${items}
        </div>`);
}

/* ---------- Block: steps ---------- */
/* ขั้นตอนการทำงาน มีเลขลำดับให้อัตโนมัติ
   { type, heading?, lead?, items: [{ title, body? }] } */
function steps(b) {
  const items = (b.items || []).map((it, i) => `
            <li class="block-step">
              <span class="block-step-no" aria-hidden="true">${i + 1}</span>
              <div>
                <strong>${esc(it.title)}</strong>
                ${it.body ? `<p>${esc(it.body)}</p>` : ''}
              </div>
            </li>`).join('');
  return section(b, `<ol class="block-steps">${items}
        </ol>`);
}

/* ---------- Block: two-column ---------- */
/* ข้อความ + รูป วางคู่กัน
   { type, heading?, paragraphs?: [], image, imageAlt?, imageSide?: "left"|"right", actions?: [] } */
function twoColumn(b) {
  const side = b.imageSide === 'left' ? ' is-image-left' : '';
  const body = (b.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join('\n            ');
  return section(b, `<div class="block-two-col${side}">
          <div class="block-two-col-text">
            ${b.subheading ? `<h3>${esc(b.subheading)}</h3>` : ''}
            ${body}
            ${actions(b.actions)}
          </div>
          <div class="block-two-col-media">
            <img src="${esc(b.image)}" alt="${esc(b.imageAlt || '')}" loading="lazy">
          </div>
        </div>`);
}

/* ---------- Block: cta-band ---------- */
/* แถบเรียกให้ทำอะไรบางอย่าง  { type, heading, body?, actions: [{label, href, variant?}] } */
function ctaBand(b) {
  return `
    <section class="block-cta"${attr('id', b.id)}>
      <div class="container block-cta-inner">
        <div>
          <h2>${esc(b.heading)}</h2>
          ${b.body ? `<p>${esc(b.body)}</p>` : ''}
        </div>
        ${actions(b.actions)}
      </div>
    </section>`;
}

/* ---------- Block: notice ---------- */
/* กล่องแจ้งเตือน  { type, tone?: "info"|"warn"|"success", title?, body } */
function notice(b) {
  const tone = ['info', 'warn', 'success'].includes(b.tone) ? b.tone : 'info';
  const icons = { info: 'i-file', warn: 'i-shield', success: 'i-shield' };
  return section(b, `<div class="block-notice is-${tone}" role="note">
          <span class="block-notice-icon">${icon(icons[tone], 'icon-lg')}</span>
          <div>
            ${b.title ? `<strong>${esc(b.title)}</strong>` : ''}
            <p>${esc(b.body)}</p>
          </div>
        </div>`);
}

/* ---------- Block: contact-info ---------- */
/* ข้อมูลติดต่อ  { type, heading?, address?, phone?, email?, hours?, mapEmbed? } */
function contactInfo(b) {
  const row = (iconId, label, value, href) => value ? `
            <li class="block-contact-row">
              <span class="block-contact-icon">${icon(iconId)}</span>
              <div>
                <small>${esc(label)}</small>
                ${href ? `<a href="${esc(href)}">${esc(value)}</a>` : `<span>${esc(value)}</span>`}
              </div>
            </li>` : '';
  const map = b.mapEmbed
    ? `<div class="block-contact-map"><iframe src="${esc(b.mapEmbed)}" title="แผนที่" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`
    : '';
  return section(b, `<div class="block-contact${map ? ' has-map' : ''}">
          <ul class="block-contact-list">
            ${row('i-map', 'ที่อยู่', b.address)}
            ${row('i-phone', 'โทรศัพท์', b.phone, b.phone ? `tel:${String(b.phone).replace(/[^0-9+]/g, '')}` : '')}
            ${row('i-file', 'อีเมล', b.email, b.email ? `mailto:${b.email}` : '')}
            ${row('i-eye', 'เวลาทำการ', b.hours)}
          </ul>
          ${map}
        </div>`);
}

/* ---------- ตัวช่วยวันที่ / ไฟล์ (ใช้กับ document-list และ updatedAt) ---------- */

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

/** "2026-11-05" -> { y: 2026, m: 11, d: 5 }  (ไม่ใช้ Date เพื่อไม่ให้ timezone เลื่อนวัน) */
function parseIsoDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

/** วันที่แบบไทย พ.ศ.  short: "5 พ.ย. 2569"  long: "5 พฤศจิกายน 2569" (เลขไทยแปลงให้โดย components.js) */
export function formatThaiDate(value, long = false) {
  const p = parseIsoDate(value);
  if (!p) return '';
  return `${p.d} ${(long ? TH_MONTHS_FULL : TH_MONTHS)[p.m - 1]} ${p.y + 543}`;
}

/** ปีงบประมาณ (พ.ศ.) — เริ่ม 1 ตุลาคม  เช่น 2026-11-05 -> 2570 */
function fiscalYearOf(value) {
  const p = parseIsoDate(value);
  if (!p) return null;
  return (p.m >= 10 ? p.y + 1 : p.y) + 543;
}

/** ชนิดไฟล์จากนามสกุล: ".../a.PDF" -> "PDF" */
function fileTypeOf(url) {
  const m = /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(String(url || ''));
  if (!m) return '';
  const ext = m[1].toUpperCase();
  return ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'CSV', 'PPT', 'PPTX', 'ZIP', 'JPG', 'PNG', 'MP3', 'MP4', 'JSON'].includes(ext) ? ext : '';
}

/** ขนาดไฟล์: 1839934 -> "1.8 MB"  (ถ้าส่งเป็นข้อความมาแล้วใช้ตามนั้น) */
function formatFileSize(value) {
  if (typeof value === 'string') return value;
  const n = Number(value);
  if (!n) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** เลขอารบิก -> เลขไทย  ใช้กับข้อความใน <option> ซึ่งตัวแปลงเลขไทยของ components.js ข้ามไป */
const thaiNum = v => String(v).replace(/[0-9]/g, d => '๐๑๒๓๔๕๖๗๘๙'[d]);

const isExternal = href => /^https?:\/\//i.test(String(href || ''));

/* ---------- Block: document-list  (แม่แบบ T1 รายการเอกสาร) ---------- */
/* รายการเอกสาร/ประกาศ พร้อมค้นหา กรองปี กรองหมวด และแสดงทีละหน้า
   ทุกรายการอยู่ใน HTML ตั้งแต่แรก (อ่านได้แม้ไม่มี JS) — components.js ผูกตัวกรองให้ภายหลัง
   { type, heading?, lead?,
     layout?: "full" | "compact"   compact = ไม่มีแถบค้นหา ใช้เป็น "เอกสารแนบ" ท้ายหน้าเนื้อหา
     yearBy?: "fiscal" | "calendar" (ค่าเริ่มต้น fiscal = ปีงบประมาณ)
     sort?: "newest" | "none"       (ค่าเริ่มต้น newest ถ้ามีวันที่/ปี)
     pageSize?: number              (ค่าเริ่มต้น 20)
     emptyText?: string,
     items: [{ title, file?, href?, publishedAt?, fiscalYear?, category?, refNo?,
               fileType?, fileSize?, note? }] }                                   */
function documentList(b) {
  const compact = b.layout === 'compact';
  const news = b.layout === 'news';   // แม่แบบ T4 รายการข่าว: แถวมีรูปปก
  const yearBy = b.yearBy === 'calendar' ? 'calendar' : 'fiscal';
  const yearOf = it => {
    if (yearBy === 'fiscal') return it.fiscalYear || fiscalYearOf(it.publishedAt);
    const p = parseIsoDate(it.publishedAt);
    return p ? p.y + 543 : it.fiscalYear || null;
  };

  let items = (b.items || []).map((it, index) => ({ ...it, _year: yearOf(it), _index: index }));
  if (b.sort !== 'none') {
    items.sort((a, z) =>
      String(z.publishedAt || '').localeCompare(String(a.publishedAt || '')) ||
      (z._year || 0) - (a._year || 0) ||
      a._index - z._index);
  }

  if (!items.length) {
    return section(b, `<div class="block-notice is-info" role="note">
          <span class="block-notice-icon">${icon('i-file', 'icon-lg')}</span>
          <div><p>${esc(b.emptyText || 'ยังไม่มีเอกสารในหมวดนี้')}</p></div>
        </div>`);
  }

  const years = [...new Set(items.map(it => it._year).filter(Boolean))].sort((a, z) => z - a);
  const cats = [...new Set(items.map(it => it.category).filter(Boolean))];
  const yearLabel = yearBy === 'fiscal' ? 'ปีงบประมาณ' : 'ปี พ.ศ.';
  const uid = esc(b.id || 'docs');

  const rows = items.map(it => {
    const url = it.file || it.href || '';
    const type = it.fileType || fileTypeOf(url);
    const size = formatFileSize(it.fileSize);
    const newTab = Boolean(it.file) || isExternal(url);
    const srNote = [type, size, newTab ? 'เปิดในแท็บใหม่' : ''].filter(Boolean).join(' ');
    const meta = [
      it.publishedAt ? `<time datetime="${esc(it.publishedAt)}">${esc(formatThaiDate(it.publishedAt))}</time>` : '',
      !it.publishedAt && it._year ? `${yearLabel} ${esc(it._year)}` : '',
      it.refNo ? `เลขที่ ${esc(it.refNo)}` : '',
      it.category && cats.length > 1 ? esc(it.category) : '',
    ].filter(Boolean).join('<span aria-hidden="true"> · </span>');
    const title = url
      ? `<a class="doc-title" href="${esc(url)}"${newTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(it.title)}${srNote ? `<span class="sr-only"> (${esc(srNote)})</span>` : ''}</a>`
      : `<span class="doc-title">${esc(it.title)}</span>`;
    if (news) {
      // แถวข่าว: รูปปก (หรือป้ายวันที่ถ้าไม่มีรูป) + ชื่อข่าว + วันที่ + คำโปรย
      const d = parseIsoDate(it.publishedAt);
      const thumb = it.image
        ? `<img src="${esc(it.image)}" alt="" loading="lazy">`
        : d ? `<span class="news-date-tile"><strong>${d.d}</strong><span>${TH_MONTHS[d.m - 1]}</span><span>${d.y + 543}</span></span>`
          : `<span class="news-date-tile">${icon('i-megaphone', 'icon-lg')}</span>`;
      return `
            <li class="doc-item news-row${it.image ? ' has-image' : ''}"${attr('data-year', it._year)}${attr('data-cat', it.category)}>
              ${url ? `<a class="news-row-thumb" href="${esc(url)}" tabindex="-1" aria-hidden="true"${newTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>${thumb}</a>`
                    : `<span class="news-row-thumb" aria-hidden="true">${thumb}</span>`}
              <div class="doc-body">
                ${title}
                ${meta ? `<div class="doc-meta">${meta}</div>` : ''}
                ${it.excerpt ? `<p class="news-row-excerpt">${esc(it.excerpt)}</p>` : ''}
              </div>
            </li>`;
    }
    return `
            <li class="doc-item"${attr('data-year', it._year)}${attr('data-cat', it.category)}>
              <span class="doc-icon" aria-hidden="true">${icon('i-file')}</span>
              <div class="doc-body">
                ${title}
                ${meta ? `<div class="doc-meta">${meta}</div>` : ''}
                ${it.note ? `<p class="doc-note">${esc(it.note)}</p>` : ''}
              </div>
              ${type || size ? `<span class="doc-file" aria-hidden="true">${[type, size].filter(Boolean).map(esc).join(' · ')}</span>` : ''}
            </li>`;
  }).join('');

  const toolbar = compact ? '' : `
          <form class="doc-toolbar" data-doc-toolbar hidden role="search" aria-label="${news ? 'ค้นหาข่าว' : 'ค้นหาเอกสาร'}">
            <label class="doc-field doc-field-search">
              <span>${news ? 'ค้นหาข่าว' : 'ค้นหาชื่อเอกสาร'}</span>
              <input type="search" data-doc-search placeholder="พิมพ์คำค้น" autocomplete="off">
            </label>
            ${years.length > 1 ? `<label class="doc-field">
              <span>${yearLabel}</span>
              <select data-doc-year>
                <option value="">ทุกปี</option>
                ${years.map(y => `<option value="${esc(y)}">${esc(thaiNum(y))}</option>`).join('')}
              </select>
            </label>` : ''}
            ${cats.length > 1 ? `<label class="doc-field">
              <span>หมวด</span>
              <select data-doc-cat>
                <option value="">ทุกหมวด</option>
                ${cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
              </select>
            </label>` : ''}
          </form>`;

  return section(b, `<div class="doc-list${compact ? ' is-compact' : ''}${news ? ' is-news' : ''}" data-doc-list data-page-size="${Number(b.pageSize) || 20}">${toolbar}
          ${compact ? '' : `<p class="doc-count" data-doc-count aria-live="polite">ทั้งหมด ${items.length} รายการ</p>`}
          <ul class="doc-items" id="${uid}-items">${rows}
          </ul>
          <p class="doc-empty" data-doc-empty hidden>ไม่พบเอกสารที่ตรงกับเงื่อนไข</p>
          ${compact ? '' : `<div class="doc-more"><button class="block-btn is-ghost" type="button" data-doc-more aria-controls="${uid}-items" hidden>แสดงเพิ่ม</button></div>`}
        </div>`, 'doc-section');
}

/* ---------- Block: article  (แม่แบบ T2 หน้าเนื้อหา) ---------- */
/* บทความยาวแบ่งเป็นหัวข้อ พร้อมสารบัญ "หัวข้อในหน้านี้" (ติดด้านข้างบนจอใหญ่)
   { type, heading?, lead?, toc?: boolean (ค่าเริ่มต้น: แสดงเมื่อมี >= 3 หัวข้อ),
     intro?: [string],
     sections: [{ heading?, id?, paragraphs?: [string], list?: [string], html?: string }] }
   html = HTML ดิบ (ต้องเชื่อถือแหล่งที่มา เหมือน rich-text)                                  */
function article(b) {
  const base = esc(b.id || 'article');
  const secs = (b.sections || []).map((s, i) => ({ ...s, _id: s.id || `${base}-${i + 1}` }));
  const titled = secs.filter(s => s.heading);
  const showToc = b.toc ?? titled.length >= 3;

  const toc = showToc && titled.length ? `
          <nav class="article-toc" aria-label="หัวข้อในหน้านี้">
            <strong>หัวข้อในหน้านี้</strong>
            <ol>${titled.map(s => `<li><a href="#${esc(s._id)}">${esc(s.heading)}</a></li>`).join('')}</ol>
          </nav>` : '';

  const body = secs.map(s => `
            <section class="article-section"${s.heading ? ` id="${esc(s._id)}" aria-labelledby="${esc(s._id)}-h"` : ''}>
              ${s.heading ? `<h3 id="${esc(s._id)}-h">${esc(s.heading)}</h3>` : ''}
              ${(s.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join('\n              ')}
              ${s.list?.length ? `<ul>${s.list.map(li => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}
              ${s.html || ''}
            </section>`).join('');

  return section(b, `<div class="article${toc ? ' has-toc' : ''}">${toc}
          <div class="article-body block-prose">
            ${(b.intro || []).map(p => `<p class="article-intro">${esc(p)}</p>`).join('')}${body}
          </div>
        </div>`);
}

/* ---------- Block: page-index  (แม่แบบ T3 หน้าหมวด) ---------- */
/* สารบัญหน้าลูกของหมวด แบ่งเป็นกลุ่ม — ใช้กับหน้าเมนูระดับ 1-2 เช่น "การปฏิบัติราชการ"
   { type, heading?, lead?, columns?: 1|2|3,
     groups: [{ heading, href?, desc?, icon?,
                items: [{ title, href?, desc?, tag? }] }] }
   รายการที่ไม่มี href แสดงเป็น "รอเนื้อหา" (ยังไม่มีหน้า) — ลิงก์ http(s) เปิดแท็บใหม่             */
function pageIndex(b) {
  const groups = (b.groups || []).map(g => {
    const items = (g.items || []).map(it => {
      const ext = isExternal(it.href);
      // ป้ายแบบข้อความสีจาง ไม่ใช้แคปซูล — รายการยาว ๆ มีแคปซูลซ้ำกันหลายอันจะรกตา
      const tag = it.tag ? `<span class="index-tag">${esc(it.tag)}</span>` : '';
      if (!it.href) {
        return `
                <li class="index-item is-pending">
                  <span class="index-link"><span class="index-text"><strong>${esc(it.title)}</strong>${it.desc ? `<span>${esc(it.desc)}</span>` : ''}</span>
                  <span class="index-pending">รอเนื้อหา</span></span>
                </li>`;
      }
      return `
                <li class="index-item">
                  <a class="index-link" href="${esc(it.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>
                    <span class="index-text"><strong>${esc(it.title)}</strong>${it.desc ? `<span>${esc(it.desc)}</span>` : ''}</span>
                    ${tag}
                    ${icon(ext ? 'i-external' : 'i-chevron')}${ext ? '<span class="sr-only">(เปิดในแท็บใหม่)</span>' : ''}
                  </a>
                </li>`;
    }).join('');
    const title = g.href ? `<a href="${esc(g.href)}">${esc(g.heading)}</a>` : esc(g.heading);
    return `
            <section class="index-group">
              <header class="index-group-head">
                ${g.icon ? `<span class="index-group-icon">${icon(g.icon, 'icon-lg')}</span>` : ''}
                <div>
                  <h3>${title}</h3>
                  ${g.desc ? `<p>${esc(g.desc)}</p>` : ''}
                </div>
              </header>
              <ul class="index-list">${items}
              </ul>
            </section>`;
  }).join('');
  const cols = Math.min(Math.max(Number(b.columns) || 2, 1), 3);
  return section(b, `<div class="page-index index-cols-${cols}">${groups}
        </div>`);
}

/* ---------- Block: figure  (ภาพเด่น เช่น ภาพปกข่าว) ---------- */
/* { type, image, alt, caption?, href? }  href = ภาพเต็ม (เปิดใน lightbox) */
function figure(b) {
  const img = `<img src="${esc(b.image)}" alt="${esc(b.alt || '')}" loading="lazy">`;
  const inner = b.href ? `<a href="${esc(b.href)}" data-lightbox="${esc(b.id || 'figure')}">${img}<span class="sr-only">ดูภาพขนาดเต็ม</span></a>` : img;
  return section(b, `<figure class="block-figure">${inner}
          ${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}
        </figure>`, 'figure-section');
}

/* ---------- Block: share  (ปุ่มแชร์ — มาตรฐานเว็บไซต์ภาครัฐ ข้อ 7.2 (5)) ---------- */
/* { type, label? }  ลิงก์ของหน้าใส่ให้ตอนเปิดหน้า (components.js) เพราะตอน build ยังไม่รู้โดเมนจริง */
function share(b) {
  const btn = (kind, label) => `<a class="share-btn is-${kind}" href="#" data-share="${kind}" target="_blank" rel="noopener noreferrer"><span>${label}</span><span class="sr-only"> (เปิดในแท็บใหม่)</span></a>`;
  return `
    <div class="block-share"${attr('id', b.id)}>
      <div class="container">
        <span class="share-label">${esc(b.label || 'แชร์ข่าวนี้')}</span>
        ${btn('facebook', 'Facebook')}
        ${btn('line', 'LINE')}
        ${btn('x', 'X')}
        <button class="share-btn is-copy" type="button" data-share="copy">คัดลอกลิงก์</button>
        <span class="share-status" data-share-status aria-live="polite"></span>
      </div>
    </div>`;
}

/* ---------- ทะเบียน block ทั้งหมด ---------- */

export const BLOCKS = {
  'page-hero': pageHero,
  'rich-text': richText,
  'card-grid': cardGrid,
  'feature-list': featureList,
  'stat-row': statRow,
  'link-list': linkList,
  'media-grid': mediaGrid,
  'table': table,
  'faq': faq,
  'steps': steps,
  'two-column': twoColumn,
  'cta-band': ctaBand,
  'notice': notice,
  'contact-info': contactInfo,
  'document-list': documentList,
  'article': article,
  'page-index': pageIndex,
  'person-grid': personGrid,
  'figure': figure,
  'share': share,
};

export const BLOCK_TYPES = Object.keys(BLOCKS);

/**
 * แปลง array ของ block เป็น HTML string
 * block ที่ไม่รู้จักจะไม่ทำให้ทั้งหน้าพัง แต่จะแสดงกล่องเตือนแทน
 */
export function renderBlocks(blocks = []) {
  return blocks.map((block, index) => {
    const fn = BLOCKS[block?.type];
    if (!fn) {
      return `
    <section class="section">
      <div class="container">
        <div class="block-notice is-warn" role="note">
          <div><strong>ไม่รู้จัก block ชนิด "${esc(block?.type)}" (ลำดับที่ ${index + 1})</strong>
          <p>ชนิดที่ใช้ได้: ${BLOCK_TYPES.join(', ')}</p></div>
        </div>
      </div>
    </section>`;
    }
    try {
      return fn(block);
    } catch (error) {
      return `
    <section class="section">
      <div class="container">
        <div class="block-notice is-warn" role="note">
          <div><strong>สร้าง block "${esc(block.type)}" (ลำดับที่ ${index + 1}) ไม่สำเร็จ</strong>
          <p>${esc(error.message)}</p></div>
        </div>
      </div>
    </section>`;
    }
  }).join('\n');
}

/**
 * แถบเมนูย่อยของหมวด (ข้างเนื้อหาในหน้าย่อย) — ข้อมูลจาก content/site-nav.json
 * หาหมวดของหน้าจาก slug ก่อน ถ้าไม่เจอ (เช่น หน้ารายละเอียดข่าว) ไล่หาจากลิงก์ใน breadcrumb ย้อนขึ้นไป
 * หน้าหมวดเอง (href ตรงกับ section.href) ไม่แสดงแถบนี้
 */
function sectionNav(page, nav, slug) {
  if (!nav?.sections || !slug) return '';
  const self = `${slug}.html`;
  const crumbs = ((page.blocks || [])[0]?.breadcrumb || []).map(c => c.href).filter(Boolean).reverse();
  let found = null;
  for (const target of [self, ...crumbs]) {
    for (const sec of nav.sections) {
      if (sec.href === self) return '';
      const group = sec.groups.find(g => g.items.some(it => it.href === target));
      if (group) { found = { sec, group, target }; break; }
    }
    if (found) break;
  }
  if (!found) return '';
  const { sec, group, target } = found;
  const links = group.items.map(it => {
    const current = it.href === self ? ' aria-current="page"' : it.href === target ? ' aria-current="true"' : '';
    return `<li><a href="${esc(it.href)}"${current}>${esc(it.title)}</a></li>`;
  }).join('');
  return `
      <aside class="section-nav" aria-label="เมนูในหมวด${esc(sec.title)}">
        <details class="section-nav-box" data-section-nav>
          <summary>${esc(group.heading)}</summary>
          <nav>
            <ul>${links}</ul>
            <a class="section-nav-up" href="${esc(sec.href)}">${icon('i-arrow')} ทั้งหมดในหมวด${esc(sec.title)}</a>
          </nav>
        </details>
      </aside>`;
}

/**
 * แปลงทั้งหน้า = block ทั้งหมด + แถบ "ปรับปรุงข้อมูลล่าสุด" ท้ายหน้า (ถ้า JSON มี updatedAt)
 * มาตรฐานเว็บไซต์ภาครัฐ ข้อ 7.1 / 7 Pillars P4.6 ข้อ 10 — CMS ควรเขียน updatedAt ให้อัตโนมัติเมื่อบันทึก
 * nav + slug (ไม่บังคับ) = แสดงแถบเมนูย่อยของหมวดข้างเนื้อหา (หน้าย่อย layout แบบสองคอลัมน์)
 */
export function renderPage(page, nav = null, slug = '') {
  const updated = page?.updatedAt && parseIsoDate(page.updatedAt)
    ? `
    <div class="page-updated">
      <div class="container">ปรับปรุงข้อมูลล่าสุด <time datetime="${esc(page.updatedAt)}">${esc(formatThaiDate(page.updatedAt, true))}</time></div>
    </div>`
    : '';
  const blocks = page?.blocks || [];
  const aside = sectionNav(page, nav, slug);
  if (!aside) return renderBlocks(blocks) + updated;
  const hasHero = blocks[0]?.type === 'page-hero';
  return renderBlocks(hasHero ? blocks.slice(0, 1) : []) + `
    <div class="container page-layout">${aside}
      <div class="page-main">${renderBlocks(hasHero ? blocks.slice(1) : blocks)}
      </div>
    </div>` + updated;
}

/** ตรวจข้อมูลหน้าอย่างง่าย คืน array ของข้อความปัญหา (ว่าง = ผ่าน) */
export function validatePage(page) {
  const problems = [];
  if (!page || typeof page !== 'object') return ['ไฟล์ JSON ไม่ใช่ object'];
  if (!page.title) problems.push('ขาด "title"');
  if (!page.navKey) problems.push('ขาด "navKey" (ต้องตรงกับ key ในเมนู เช่น about, news)');
  if (!Array.isArray(page.blocks)) return [...problems, 'ขาด "blocks" หรือไม่ใช่ array'];
  page.blocks.forEach((b, i) => {
    if (!b || !b.type) problems.push(`blocks[${i}] ขาด "type"`);
    else if (!BLOCKS[b.type]) problems.push(`blocks[${i}] ชนิด "${b.type}" ไม่มีอยู่จริง`);
  });
  return problems;
}
