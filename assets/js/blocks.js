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
     headingStyle "quote"  หัวข้อเป็นกล่องคำคม (เส้นทองซ้าย พื้นไล่สี) — ใช้กับวิสัยทัศน์/ข้อความสำคัญ 1 ประโยค
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

/** ปุ่ม "ดูทั้งหมด" มุมขวาของ section — ป้ายที่ขึ้นต้นด้วย "ดู" แสดงสั้นเป็น "ดูทั้งหมด" (ชื่อเต็มอยู่ใน aria-label) */
function viewAll(action) {
  const label = action.label || 'ดูทั้งหมด';
  const short = label.startsWith('ดู') ? 'ดูทั้งหมด' : label;
  const aria = short !== label ? ` aria-label="${esc(label)}"` : '';
  return `<a class="view-all" href="${esc(action.href)}"${aria}>${esc(short)} ${icon('i-arrow', 'icon view-all-ic')}</a>`;
}

/** หัว section มาตรฐาน: หัวข้อ + คำโปรย + ปุ่มมุมขวา */
function sectionHead(block) {
  if (!block.heading && !block.lead) return '';
  const action = block.action?.href
    ? viewAll(block.action)
    : '';
  return `
      <div class="section-head">
        <div>
          ${block.eyebrow ? `<span class="block-eyebrow"${langAttr(block.eyebrow)}>${esc(block.eyebrow)}</span>` : ''}
          ${block.heading ? `<h2${block.headingStyle === 'quote' ? ' class="is-quote"' : ''}>${esc(block.heading)}</h2>` : ''}
          ${block.lead ? `<p>${esc(block.lead)}</p>` : ''}
        </div>
        ${action}
      </div>`;
}

/** ห่อเนื้อหาด้วย <section class="section"> + .container ให้เป็นมาตรฐานเดียวกัน */
function section(block, inner, extraClass = '') {
  // variant: alt = พื้นขาว (สลับกับพื้นหน้า), dark = แถบสีเขียวเข้ม ตัวอักษรขาว (ใช้คั่นจังหวะหน้า 1-2 ส่วนต่อหน้า)
  const variant = block.variant === 'alt' ? ' alt' : block.variant === 'dark' ? ' is-dark' : '';
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

/** แถบเส้นทางหน้า (breadcrumb) — รายการสุดท้ายคือหน้าปัจจุบัน · home = ไอคอนบ้านหน้ารายการแรก */
function breadcrumbNav(list = [], { home = false } = {}) {
  return (list || []).length
    ? `<nav class="block-breadcrumb" aria-label="เส้นทางหน้า">${list.map((c, i, arr) => {
        const label = `${home && i === 0 ? icon('i-home', 'icon crumb-home') : ''}${esc(c.label)}`;
        return i === arr.length - 1
          ? `<span aria-current="page" title="${esc(c.label)}">${label}</span>`
          : c.href ? `<a href="${esc(c.href)}">${label}</a>` : `<span>${label}</span>`;
      }).join(`<span class="crumb-sep" aria-hidden="true">${icon('i-chevron')}</span>`)}</nav>`
    : '';
}

/* ---------- Block: page-hero ---------- */
/* หัวหน้าเพจ ใช้ได้หน้าละ 1 อันและควรอยู่บนสุด
   { type, heading, lead, eyebrow?, breadcrumb?: [{label, href}], actions?: [],
     image?, imageAlt?, highlights?: [{ icon, label }] }
   image = รูปพื้นหลังเต็มความกว้าง (แนวนอน ≥ 1600px) — มีเงาไล่สีเขียวเข้มด้านซ้ายให้อ่านตัวอักษรได้
           ไม่ใส่ = หัวหน้าเพจแบบเรียบ (พื้นสีอ่อน) เหมือนเดิม
   highlights = จุดเด่นสั้น ๆ ใต้ปุ่ม (ไอคอน + ข้อความ 2-4 คำ) แสดงเฉพาะแบบมีรูป */
function pageHero(b) {
  const crumbs = breadcrumbNav(b.breadcrumb);
  const media = b.image
    ? `<img class="page-hero-bg" src="${esc(b.image)}" alt="${esc(b.imageAlt || '')}" fetchpriority="high">`
    : '';
  const highlights = b.image && (b.highlights || []).length
    ? `<ul class="page-hero-highlights">${b.highlights.map(h =>
        `<li>${icon(h.icon || 'i-shield')}<span>${esc(h.label)}</span></li>`).join('')}</ul>`
    : '';
  // variant article = หัวหน้าเพจรายละเอียดข่าว แบ่งสองฝั่ง:
  //   ซ้าย: ประเภท · วันที่ → หัวข้อ → คำโปรย (ถ้ามี) → ปุ่ม แชร์ / คัดลอกลิงก์ / พิมพ์
  //   ขวา: ภาพเด่นของข่าว (กดดูภาพเต็ม) + คำบรรยายภาพ (ถ้ามี) — ไม่มีภาพ = ข้อความเต็มความกว้าง + ตราสัญลักษณ์จาง ๆ
  if (b.variant === 'article') {
    const date = b.date ? `<time datetime="${esc(b.date)}">${esc(formatThaiDate(b.date, true))}</time>` : '';
    const kicker = b.tag || date
      ? `<p class="article-kicker">${b.tag ? `<span class="article-kicker-tag">${esc(b.tag)}</span>` : ''}${date ? `<span class="article-kicker-date">${icon('i-calendar')}${date}</span>` : ''}</p>`
      : '';
    const meta = (b.meta || []).length
      ? `<ul class="page-hero-meta">${b.meta.map(m =>
          `<li>${icon(m.icon || 'i-file')}<span>${esc(m.label)}</span></li>`).join('')}</ul>`
      : '';
    const shareLink = (kind, label) => `<a href="#" data-share="${kind}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only"> (เปิดในแท็บใหม่)</span></a>`;
    const tools = b.share === false ? '' : `
          <div class="article-tools">
            <details class="article-share">
              <summary class="article-tool">${icon('i-share')}<span>แชร์</span></summary>
              <div class="article-share-menu">${shareLink('facebook', 'Facebook')}${shareLink('line', 'LINE')}${shareLink('x', 'X')}</div>
            </details>
            <button type="button" class="article-tool" data-share="copy">${icon('i-copy')}<span>คัดลอกลิงก์</span></button>
            <button type="button" class="article-tool" data-share="print">${icon('i-print')}<span>พิมพ์</span></button>
            <span class="share-status" data-share-status aria-live="polite"></span>
          </div>`;
    const img = b.image ? `<img src="${esc(b.image)}" alt="${esc(b.imageAlt || '')}" fetchpriority="high">` : '';
    const media = b.image ? `
        <figure class="article-hero-media">
          ${b.imageHref ? `<a href="${esc(b.imageHref)}" data-lightbox="cover">${img}<span class="sr-only">ดูภาพขนาดเต็ม</span></a>` : img}
          ${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}
        </figure>` : '';
    return `
    <section class="page-hero is-article${b.image ? ' has-media' : ' no-photo'}"${attr('id', b.id)}>
      ${b.image ? `<img class="article-hero-glow" src="${esc(b.image)}" alt="" aria-hidden="true">` : '<span class="page-hero-mark" aria-hidden="true"></span>'}
      <div class="container">
        ${crumbs}
        <div class="article-hero-grid">
          <div class="article-hero-text">
            ${kicker}
            <h1>${esc(b.heading)}</h1>
            ${b.lead ? `<p class="article-lead">${esc(b.lead)}</p>` : ''}
            ${meta}
            ${tools}
          </div>${media}
        </div>
      </div>
    </section>`;
  }
  return `
    <section class="page-hero${b.image ? ' has-image' : ' is-plain'}"${attr('id', b.id)}>
      ${media || '<span class="page-hero-mark" aria-hidden="true"></span>'}
      <div class="container">
        ${crumbs}
        ${b.eyebrow ? `<span class="block-eyebrow"${langAttr(b.eyebrow)}>${esc(b.eyebrow)}</span>` : ''}
        <h1>${esc(b.heading)}</h1>
        ${b.lead ? `<p>${esc(b.lead)}</p>` : ''}
        ${actions(b.actions)}
        ${highlights}
      </div>
      ${b.image && b.imageCredit?.text ? `<small class="page-hero-credit">ภาพ: ${b.imageCredit.href ? `<a href="${esc(b.imageCredit.href)}" target="_blank" rel="noopener noreferrer">${esc(b.imageCredit.text)}</a>` : esc(b.imageCredit.text)}</small>` : ''}
    </section>`;
}

/* ---------- Block: anchor-nav ---------- */
/* เมนูลัดไปหัวข้อในหน้า — ติดใต้ header ขณะเลื่อน (sticky) และไฮไลต์หัวข้อที่กำลังอ่าน (initAnchorNav ใน components.js)
   วางต่อจาก page-hero ในหน้าที่ยาวหลายส่วน  { type, label?, items: [{ label, href: "#id-ของ-block" }] } */
function anchorNav(b) {
  const items = (b.items || []).map(it =>
    `<li><a href="${esc(it.href)}">${esc(it.label)}</a></li>`).join('');
  return `
    <nav class="anchor-nav"${attr('id', b.id)} aria-label="${esc(b.label || 'ไปยังหัวข้อในหน้านี้')}" data-anchor-nav>
      <div class="container"><ul>${items}</ul></div>
    </nav>`;
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
     layout?: "default"|"service"|"tiles"|"list",
     items: [{ title, body?, href?, icon?, tag?, tags?: [string], meta?, action? }] }
   action = ข้อความปุ่มท้ายการ์ด (เช่น "ยื่นคำขอ") แสดงเมื่อการ์ดมี href
   layout "service" = การ์ดบริการขนาดใหญ่: ไอคอนในกรอบสี + ป้าย tags + ปุ่มชิดล่าง (เหมาะกับ 2-3 รายการ)
   layout "tiles"   = การ์ดแนวตั้ง: ไอคอน + ลูกศร | ชื่อ | คำอธิบาย | โดเมน (ลิงก์ภายนอก) — เหมาะกับรายการระบบ 4-12 รายการ
   layout "list"    = รายการแถวในกรอบเดียว (2 คอลัมน์บนจอกว้าง): ไอคอน | ชื่อ + คำอธิบาย | ลูกศร
                      รายการที่ไม่มี href แสดงจาง พร้อมป้าย tag (เช่น "อยู่ระหว่างจัดทำ") — เหมาะกับคู่มือ/ลิงก์เอกสาร
   ลิงก์ภายนอก (http...) เปิดแท็บใหม่ พร้อมข้อความสำหรับ screen reader */
const CARD_LAYOUTS = { service: ' block-cards-service', tiles: ' block-cards-tiles', list: ' block-cards-list' };

/* card-grid layout "guide" — สารบัญหลักเกณฑ์: การ์ดเลขลำดับทอง + ชื่อ + สรุป 2 บรรทัด + จำนวนหัวข้อ
   สลับมุมมอง ตาราง/รายการ ได้ (components.js initGuideViews จำค่าที่เลือกในเบราว์เซอร์) */
function guideGrid(b) {
  const items = (b.items || []).filter(it => it && it.title);
  const cards = items.map((it, i) => {
    const ext = isExternal(it.href);
    const tag = it.href ? 'a' : 'div';
    const href = it.href ? ` href="${esc(it.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}` : '';
    return `
            <li style="--i:${i}"><${tag} class="guide-card"${href}>
              <span class="guide-no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
              <span class="guide-text">
                <strong>${esc(it.title)}</strong>
                ${it.body ? `<span>${esc(it.body)}</span>` : ''}
              </span>
              ${it.meta ? `<small class="guide-meta">${esc(it.meta)}</small>` : ''}
              ${it.href ? `<span class="guide-go" aria-hidden="true">${icon(ext ? 'i-external' : 'i-arrow')}</span>` : ''}
              ${ext ? '<span class="sr-only"> (เปิดในแท็บใหม่)</span>' : ''}
            </${tag}></li>`;
  }).join('');
  // แบ่งหน้าด้วยตัวจัดการเดียวกับ document-list (components.js initDocLists) — pageSize ค่าเริ่มต้น 8
  const pageSize = Number(b.pageSize) || 8;
  return section(b, `<div class="guide" data-guide data-view="grid" data-doc-list data-doc-item=".guide-list > li" data-page-size="${pageSize}" data-unit="หัวข้อ">
          <div class="guide-bar">
            <p class="guide-count">${items.length} หัวข้อ</p>
            <div class="doc-view" role="group" aria-label="มุมมองการแสดงผล">
              <button type="button" data-guide-view="grid" aria-pressed="true">${icon('i-grid')}<span>ตาราง</span></button>
              <button type="button" data-guide-view="list" aria-pressed="false">${icon('i-list')}<span>รายการ</span></button>
            </div>
          </div>
          <ol class="guide-list" data-reveal>${cards}
          </ol>
          <nav class="doc-pager" data-doc-pager aria-label="การแบ่งหน้า" hidden></nav>
        </div>`);
}

function cardGrid(b) {
  if (b.layout === 'guide') return guideGrid(b);
  const layout = CARD_LAYOUTS[b.layout] || '';
  const cards = (b.items || []).map(it => {
    const ext = isExternal(it.href);
    const tags = [it.tag, ...(it.tags || [])].filter(Boolean);
    const arrow = icon(ext ? 'i-external' : 'i-arrow', 'icon block-card-arrow');
    const host = ext ? String(it.href).replace(/^https?:\/\//i, '').split(/[/?#]/)[0].replace(/^www\./, '') : '';
    const listRow = `
            <span class="block-card-icon">${icon(it.icon || 'i-file', 'icon-lg')}</span>
            <span class="block-card-text">
              <strong>${esc(it.title)}</strong>
              ${it.body ? `<span>${esc(it.body)}</span>` : ''}
            </span>
            ${it.href ? arrow : tags.length ? `<span class="block-tag">${esc(tags[0])}</span>` : ''}`;
    const inner = layout === ' block-cards-list' ? listRow : layout === ' block-cards-tiles' ? `
            <span class="block-tile-top">
              <span class="block-card-icon">${icon(it.icon || 'i-file', 'icon-lg')}</span>
              ${it.href ? arrow : ''}
            </span>
            <span class="block-card-text">
              <strong>${esc(it.title)}</strong>
              ${it.body ? `<span>${esc(it.body)}</span>` : ''}
            </span>
            ${host ? `<small class="block-tile-host" lang="en">${esc(host)}</small>` : it.meta ? `<small class="block-tile-host">${esc(it.meta)}</small>` : ''}` : `
            ${it.icon ? `<span class="block-card-icon">${icon(it.icon, 'icon-lg')}</span>` : ''}
            ${tags.length ? `<span class="block-card-tags">${tags.map(t => `<span class="block-tag">${esc(t)}</span>`).join('')}</span>` : ''}
            <h3>${esc(it.title)}</h3>
            ${it.body ? `<p>${esc(it.body)}</p>` : ''}
            ${it.meta ? `<small class="block-meta">${esc(it.meta)}</small>` : ''}
            ${it.action ? `<span class="block-card-action">${esc(it.action)} ${layout ? arrow : '<span aria-hidden="true">→</span>'}</span>` : ''}`;
    const sr = ext ? '<span class="sr-only"> (เปิดในแท็บใหม่)</span>' : '';
    return it.href
      ? `<a class="content-card block-card is-link" href="${esc(it.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${inner}${sr}
          </a>`
      : `<article class="content-card block-card${layout === ' block-cards-list' ? ' is-pending' : ''}">${inner}
          </article>`;
  }).join('\n          ');
  // numbered = เลขลำดับ 01 02 03 ตัวใหญ่มุมการ์ด + เส้นทองด้านบน (ใช้กับยุทธศาสตร์/ประเด็นที่เรียงลำดับ)
  return section(b, `<div class="${colsClass(b.columns)}${layout}${b.numbered ? ' block-cards-numbered' : ''}">
          ${cards}
        </div>`);
}

/* ---------- Block: feature-list ---------- */
/* รายการไอคอน + หัวข้อ + คำอธิบาย เรียงเป็นแถว
   { type, heading?, lead?, columns?, layout?: "list"|"cards", footnote?: { title?, body },
     items: [{ icon, title, body?, links?: [{ label, href, icon? }] }] }
   layout "cards" = แต่ละรายการเป็นการ์ดมีกรอบ ไอคอนในวงกลมสี
   links    = ปุ่มติดต่อท้ายรายการ: tel: (โทร) mailto: (อีเมล) http (เปิดแท็บใหม่) — ไอคอนเลือกให้ตามชนิดลิงก์
   footnote = แถบหมายเหตุใต้รายการ (ไอคอนโล่) ใช้แทน block notice แยก เมื่อข้อความเกี่ยวกับรายการนี้โดยตรง */
function linkIcon(href) {
  if (/^tel:/i.test(href)) return 'i-phone-call';
  if (/^mailto:/i.test(href)) return 'i-mail';
  return isExternal(href) ? 'i-external' : 'i-arrow';
}

/* รายละเอียดแบบ ป้าย : ค่า ในรายการ feature-list (เช่น ธนาคาร / เลขที่บัญชี) — copy: true = ปุ่มคัดลอกค่า (components.js initCopy) */
function featureDetails(list = []) {
  if (!list.length) return '';
  return `<dl class="feature-details">${list.filter(d => d && d.label).map(d => {
    const isEn = /^[0-9A-Za-z@._+()\s-]+$/.test(d.value || '');
    return `<div class="feature-detail${d.copy ? ' has-copy' : ''}${d.wide ? ' is-wide' : ''}"><dt>${esc(d.label)}</dt><dd><span${isEn ? ' lang="en" data-keep-digits' : ''}>${esc(d.value || '')}</span>${d.copy ? `<button type="button" class="feature-copy" data-copy="${esc(d.value || '')}">${icon('i-copy')}<span data-copy-label>คัดลอก</span></button>` : ''}</dd></div>`;
  }).join('')}</dl>`;
}

/* feature-list layout "directory" — สมุดรายชื่อแบบเรียบ ไม่มีการ์ด: แต่ละรายการเป็นแถวคั่นเส้นบาง
   ซ้าย = ลำดับ + ชื่อ · ขวา = คำอธิบาย + ค่าที่กดได้ตัวใหญ่ (ป้ายชนิดตัวเล็กใต้ค่า) */
function featureDirectory(b) {
  const rows = (b.items || []).map((it, i) => {
    const links = (it.links || []).filter(l => l && l.href).map(l => {
      const ext = isExternal(l.href);
      const isEn = /^(tel|mailto):/i.test(l.href) || /^[A-Za-z0-9@._+()\s-]+$/.test(l.label || '');
      return `<li><a class="dir-link" href="${esc(l.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}><span class="dir-value"${isEn ? ' lang="en" data-keep-digits' : ''}>${esc(l.label || l.href)}</span>${l.kind ? `<small>${esc(l.kind)}</small>` : ''}${icon(ext ? 'i-external' : 'i-arrow', 'icon dir-go')}${ext ? '<span class="sr-only"> (เปิดในแท็บใหม่)</span>' : ''}</a></li>`;
    }).join('');
    return `
            <li class="dir-row" style="--i:${i}">
              <div class="dir-head"><span class="dir-no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(it.title)}</h3>${it.body && it.details?.length ? `<p class="dir-note">${esc(it.body)}</p>` : ''}</div></div>
              <div class="dir-body">
                ${it.body && !it.details?.length ? `<p>${esc(it.body)}</p>` : ''}
                ${featureDetails(it.details)}
                ${links ? `<ul class="dir-links">${links}</ul>` : ''}
              </div>
            </li>`;
  }).join('');
  const foot = b.footnote?.body ? `
        <div class="block-footnote" role="note">
          ${icon('i-shield')}
          <p>${b.footnote.title ? `<strong>${esc(b.footnote.title)}</strong> ` : ''}${esc(b.footnote.body)}</p>
        </div>` : '';
  return section(b, `<ol class="feature-dir" data-reveal>${rows}
        </ol>${foot}`);
}

function featureList(b) {
  if (b.layout === 'directory') return featureDirectory(b);
  const rowsLayout = b.layout === 'rows';
  const asRows = rowsLayout || !!b.image || b.linkStyle === 'rows';   // ลิงก์แสดงเป็นแถวรายการ (ป้ายชนิด + ค่า + ลูกศร) แทนปุ่มแคปซูล
  const items = (b.items || []).map((it, i) => {
    const links = (it.links || []).filter(l => l && l.href).map(l => {
      const ext = isExternal(l.href);
      const isEn = /^(tel|mailto):/i.test(l.href) || /^[A-Za-z0-9@._+()\s-]+$/.test(l.label || '');
      if (asRows) {
        const kind = l.kind || (/^tel:/i.test(l.href) ? 'โทรศัพท์' : /^mailto:/i.test(l.href) ? 'อีเมล' : ext ? 'ออนไลน์' : 'ข้อมูลเพิ่มเติม');
        return `<a class="feature-row" href="${esc(l.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${icon(l.icon || (/^(tel|mailto):/i.test(l.href) ? linkIcon(l.href) : ext ? 'i-form' : 'i-file'), 'icon feature-row-ic')}<span class="feature-row-body"><small>${esc(kind)}</small><span${isEn ? ' lang="en" data-keep-digits' : ''}>${esc(l.label || l.href)}</span></span>${icon(ext ? 'i-external' : 'i-arrow', 'icon feature-row-go')}${ext ? '<span class="sr-only"> (เปิดในแท็บใหม่)</span>' : ''}</a>`;
      }
      return `<a class="block-feature-link" href="${esc(l.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${icon(l.icon || linkIcon(l.href))}<span${isEn ? ' lang="en"' : ''}>${esc(l.label || l.href)}</span>${ext ? '<span class="sr-only"> (เปิดในแท็บใหม่)</span>' : ''}</a>`;
    }).join('');
    if (rowsLayout) {
      // layout "rows": การ์ดกว้างเต็มแถว — ซ้าย: ลำดับ + ชื่อ + คำอธิบาย · ขวา: แถวการดำเนินการ
      return `
            <li class="feature-svc" style="--i:${i}">
              <div class="feature-svc-main">
                ${it.icon ? `<span class="feature-svc-icon" aria-hidden="true">${icon(it.icon, 'icon-lg')}</span>` : `<span class="feature-svc-no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>`}
                <h3>${esc(it.title)}</h3>
                ${it.body ? `<p>${esc(it.body)}</p>` : ''}
              </div>
              ${links ? `<div class="feature-rows">${links}</div>` : ''}
            </li>`;
    }
    if (it.details?.length || b.cardStyle === 'panel') {
      // การ์ดแบบแผง: หัวการ์ดมีพื้นสี (highlight = เขียวเข้ม) + รายละเอียด ป้ายบน/ค่าล่าง 2 คอลัมน์ + ลิงก์
      return `
            <li class="block-feature feature-panel${it.highlight ? ' is-highlight' : ''}">
              <div class="feature-panel-head">
                <span class="block-feature-icon">${icon(it.icon || 'i-shield', 'icon-lg')}</span>
                <div>
                  <strong>${esc(it.title)}</strong>
                  ${it.body && it.details?.length ? `<p>${esc(it.body)}</p>` : ''}
                </div>
                ${icon(it.icon || 'i-shield', 'icon feature-panel-mark')}
              </div>
              ${it.body && !it.details?.length ? `<p class="feature-panel-body">${esc(it.body)}</p>` : ''}
              ${featureDetails(it.details)}
              ${links ? `<div class="block-feature-links${asRows ? ' feature-rows' : ''}">${links}</div>` : ''}
            </li>`;
    }
    return `
            <li class="block-feature"${b.image ? ` style="--i:${i}"` : ''}>
              <span class="block-feature-icon">${icon(it.icon || 'i-shield', 'icon-lg')}</span>
              <div>
                <strong>${esc(it.title)}</strong>
                ${it.body ? `<p>${esc(it.body)}</p>` : ''}
                ${featureDetails(it.details)}
                ${links ? `<div class="block-feature-links${asRows ? ' feature-rows' : ''}">${links}</div>` : ''}
              </div>
            </li>`;
  }).join('');
  const foot = b.footnote?.body ? `
        <div class="block-footnote" role="note">
          ${icon('i-shield')}
          <p>${b.footnote.title ? `<strong>${esc(b.footnote.title)}</strong> ` : ''}${esc(b.footnote.body)}</p>
        </div>` : '';
  // image = ภาพพื้นหลังเต็มแถบ ใต้สีเขียวเข้ม · การ์ดโปร่งแสง เผยทีละใบเมื่อเลื่อนถึง (ภาพประดับ ไม่มี alt)
  const media = b.image ? `<div class="feature-media" aria-hidden="true"><img src="${esc(b.image)}" alt="" loading="lazy"${b.imagePosition ? ` style="object-position:${esc(b.imagePosition)}"` : ''}></div>` : '';
  const listCls = rowsLayout ? 'block-feature-list feature-svc-list'
    : `${colsClass(b.columns)} block-feature-list${b.layout === 'cards' ? ' block-feature-cards' : ''}`;
  const list = `<ul class="${listCls}"${b.image || rowsLayout ? ' data-reveal' : ''}>${items}
        </ul>`;
  return b.image
    ? section({ ...b, variant: 'dark' }, `${media}${list}${foot}`, 'has-media feature-band')
    : section(b, `${list}${foot}`);
}

/* ---------- Block: stat-row ---------- */
/* ตัวเลขสถิติ  { type, heading?, items: [{ value, label, note?, progress? }] }
   progress = 0-100 → แสดงเป็นวงแหวนความคืบหน้า (ตัวเลข % ในวง) แทนตัวเลขใหญ่ — value ยังอ่านโดย screen reader
   variant "dark" = การ์ดโปร่งบนแถบเขียวเข้ม ตัวเลขสีทอง */
/* countUp: true = ตัวเลขนับขึ้นจาก 0 เมื่อเลื่อนถึง (components.js initCountUp) — หน่วยท้ายตัวเลข เช่น "ปี" แสดงตัวเล็ก
   image (+ imageAlt, imageCredit { text, href }) = ภาพพื้นหลังเต็มแถบใต้สีเข้ม ตัวเลขใหญ่ไม่มีกรอบ (ใช้คู่ variant: "dark") */
function statValue(v, countUp) {
  const m = countUp ? String(v ?? '').match(/^([\d][\d.,]*)\s*(.*)$/) : null;
  if (!m) return esc(v);
  return `<span data-count="${esc(m[1].replace(/,/g, ''))}">${esc(m[1])}</span>${m[2] ? `<small class="stat-unit">${esc(m[2])}</small>` : ''}`;
}

function statRow(b) {
  const items = (b.items || []).map((it, i) => {
    const p = Number(it.progress);
    const ring = Number.isFinite(p) && it.progress !== undefined && it.progress !== '';
    const pct = Math.min(Math.max(ring ? p : 0, 0), 100);
    return ring ? `
            <div class="block-stat has-ring">
              <span class="block-stat-ring" style="--p:${pct}" aria-hidden="true"><b>${pct}<small>%</small></b></span>
              <span class="block-stat-text">
                <strong class="sr-only">${esc(it.value)}</strong>
                <span>${esc(it.label)}</span>
                ${it.note ? `<small>${esc(it.note)}</small>` : ''}
              </span>
            </div>` : `
            <div class="block-stat" style="--i:${i}">
              <strong>${statValue(it.value, b.countUp)}</strong>
              <span>${esc(it.label)}</span>
              ${it.note ? `<small>${esc(it.note)}</small>` : ''}
            </div>`;
  }).join('');
  const credit = b.imageCredit?.text
    ? `<small class="stat-credit">ภาพ: ${b.imageCredit.href ? `<a href="${esc(b.imageCredit.href)}" target="_blank" rel="noopener noreferrer">${esc(b.imageCredit.text)}</a>` : esc(b.imageCredit.text)}</small>`
    : '';
  const media = b.image ? `<div class="stat-media" aria-hidden="true"><img src="${esc(b.image)}" alt="" loading="lazy"></div>` : '';
  return section(b, `${media}<div class="block-stat-row"${b.countUp || b.image ? ' data-reveal' : ''}>${items}
        </div>${credit}`, b.image ? 'has-media' : '');
}

/* ---------- Block: link-list ---------- */
/* รายการเอกสาร/ลิงก์ พร้อมชนิดไฟล์และวันที่
   { type, heading?, lead?, items: [{ title, desc?, meta?, href, tag?, icon? }] } */
/* รายการยาวเกิน pageSize (ค่าเริ่มต้น 10) แบ่งหน้าให้อัตโนมัติ — ใช้ตัวแบ่งหน้าเดียวกับ document-list (components.js initDocLists)
   { ..., pageSize? } — ตัวแบ่งหน้าซ่อนอยู่จนกว่ารายการจะเกินหนึ่งหน้า */
function linkList(b) {
  const pageSize = Number(b.pageSize) || 10;
  const items = (b.items || []).map(it => `
            <li class="block-link-item">
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
  return section(b, `<div class="block-link-pages" data-doc-list data-doc-item=".block-link-item" data-page-size="${pageSize}">
          <ul class="block-link-list">${items}
          </ul>
          <nav class="doc-pager" data-doc-pager aria-label="การแบ่งหน้า" hidden></nav>
        </div>`);
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
  // pageSize = แบ่งหน้า + ช่องค้นหา (ใช้ตัวจัดการเดียวกับ document-list: initDocLists ใน components.js)
  // ไม่ใส่ = 24 — รายการเกิน 24 แบ่งหน้าให้อัตโนมัติ (ข้อมูลจาก CMS เพิ่มขึ้นแล้วหน้าไม่ยาวเกิน) · ไม่เกิน = กริดธรรมดาเหมือนเดิม
  const size = Number(b.pageSize) > 0 ? Number(b.pageSize) : 24;
  // layout album มีแถบเครื่องมือเสมอ (จำนวน · ค้นหา · สลับตาราง/รายการ) แม้มีไม่ถึงหนึ่งหน้า — ตัวแบ่งหน้าซ่อนเองจนรายการเกิน
  const paged = (b.items || []).length > size || b.layout === 'album';
  const pg = paged ? ' doc-item' : '';
  // layout "album" = การ์ดอัลบั้มภาพ: ภาพ | หมวด (category) | ชื่อ 2 บรรทัด | เส้นคั่น | วันที่ (desc) · จำนวนภาพ (tag ไม่มีไอคอน) — ไม่มีปุ่ม "เปิดดู"
  const album = b.layout === 'album';
  const items = (b.items || []).map(it => {
    if (album) {
      // ใช้ได้ทั้งอัลบั้มภาพ (href) และวิดีโอ (youtube = เล่นในป๊อปอัป) · ท้ายการ์ดซ่อนเมื่อไม่มีทั้งวันที่และจำนวน
      const ayt = it.youtube ? String(it.youtube) : '';
      const ahref = ayt ? `https://www.youtube.com/watch?v=${encodeURIComponent(ayt)}` : it.href;
      const foot = it.desc || it.tag ? `
              <span class="media-foot">
                <span>${esc(it.desc || '')}</span>
                ${it.tag ? `<span class="media-count">${esc(it.tag)}</span>` : ''}
              </span>` : '';
      const albumInner = `
            <span class="block-media-thumb">
              <img src="${esc(it.image)}" alt="${esc(it.alt || it.title || '')}" loading="lazy">
              ${ayt ? '<span class="media-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"></path></svg></span>' : ''}
            </span>
            <span class="block-media-body">
              ${it.category ? `<small class="media-kicker">${esc(it.category)}</small>` : ''}
              <strong${paged ? ' class="doc-title"' : ''}>${esc(it.title)}</strong>${foot}
            </span>
            <span class="media-row-end" aria-hidden="true">
              ${it.desc ? `<span class="media-row-date">${esc(it.desc)}</span>` : ''}
              ${it.tag ? `<span class="media-row-count">${esc(it.tag)}</span>` : ''}
              ${ahref ? `<span class="media-row-btn">${ayt ? 'ดูวิดีโอ' : 'ดูอัลบั้ม'}<span class="media-row-go">${icon('i-arrow')}</span></span>` : ''}
            </span>`;
      if (!ahref) return `<div class="block-media-card${pg}">${albumInner}
          </div>`;
      const aext = !ayt && isExternal(ahref) ? ' target="_blank" rel="noopener noreferrer"' : '';
      const aplay = ayt ? ` data-yt="${esc(ayt)}" data-yt-title="${esc(it.title)}"` : '';
      return `<a class="block-media-card is-link${ayt ? ' is-video' : ''}${pg}" href="${esc(ahref)}"${aext}${aplay}>${albumInner}${ayt ? '<span class="sr-only"> (เล่นวิดีโอ)</span>' : ''}
          </a>`;
    }
    // youtube = รหัสวิดีโอ YouTube — ลิงก์ไป YouTube แต่กดแล้วเล่นในป๊อปอัป (initVideoPlayer ใน components.js)
    const yt = it.youtube ? String(it.youtube) : '';
    const href = yt ? `https://www.youtube.com/watch?v=${encodeURIComponent(yt)}` : it.href;
    const goLabel = yt ? 'ดูวิดีโอ' : isImageUrl(href) ? 'ดูภาพ' : 'เปิดดู';
    const inner = `
            <span class="block-media-thumb">
              <img src="${esc(it.image)}" alt="${esc(it.alt || it.title || '')}" loading="lazy">
              ${yt ? '<span class="media-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"></path></svg></span>' : ''}
              ${it.tag && !yt ? `<span class="block-tag">${esc(it.tag)}</span>` : ''}
            </span>
            <span class="block-media-body">
              ${it.tag && yt ? `<small class="media-kicker">${esc(it.tag)}</small>` : ''}
              <strong${paged ? ' class="doc-title"' : ''}>${esc(it.title)}</strong>
              ${it.desc ? `<span>${esc(it.desc)}</span>` : ''}
              ${(paged || yt) && href ? `<span class="media-go" aria-hidden="true">${goLabel} ${icon('i-arrow')}</span>` : ''}
            </span>`;
    if (!href) return `<div class="block-media-card${pg}">${inner}
          </div>`;
    const lightbox = isImageUrl(href) ? ` data-lightbox="${esc(b.id || 'gallery')}"` : '';
    const ext = !lightbox && isExternal(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
    const play = yt ? ` data-yt="${esc(yt)}" data-yt-title="${esc(it.title)}"` : '';
    return `<a class="block-media-card is-link${yt ? ' is-video' : ''}${pg}" href="${esc(href)}"${lightbox}${ext}${play}>${inner}${yt ? '<span class="sr-only"> (เล่นวิดีโอ)</span>' : ''}
          </a>`;
  }).join('\n          ');
  const grid = `<div class="${colsClass(b.columns)} block-media-grid media-ratio-${ratio}${fit}${album ? ' media-album' : ''}${paged ? ' doc-items' : ''}">
          ${items}
        </div>`;
  if (!paged) return section(b, grid);
  const unit = b.unit || 'รายการ';
  return section(b, `<div class="media-list" data-doc-list data-page-size="${size}" data-unit="${esc(unit)}" data-view-key="media-view">
          <form class="doc-toolbar is-news media-toolbar" data-doc-toolbar hidden role="search" aria-label="ค้นหา${esc(unit)}">
            <p class="doc-count" data-doc-count aria-live="polite">พบ ${(b.items || []).length} ${esc(unit)}</p>
            <div class="doc-tools">
              <label class="doc-search-pill">
                ${icon('i-search')}
                <span class="sr-only">ค้นหา${esc(unit)}</span>
                <input type="search" data-doc-search placeholder="ค้นหาชื่อ${esc(unit)}" autocomplete="off">
              </label>
              <div class="doc-view" role="group" aria-label="รูปแบบการแสดงผล">
                <button type="button" data-doc-view="grid" aria-pressed="true">${icon('i-grid')}<span>ตาราง</span></button>
                <button type="button" data-doc-view="list" aria-pressed="false">${icon('i-list')}<span>รายการ</span></button>
              </div>
            </div>
          </form>
          ${grid}
          <p class="doc-empty" data-doc-empty hidden>ไม่พบ${esc(unit)}ที่ตรงกับคำค้น</p>
          <nav class="doc-pager" data-doc-pager aria-label="การแบ่งหน้า" hidden></nav>
        </div>`);
}

/* ---------- Block: person-grid  (แม่แบบ T5 บุคคล / ผู้บริหาร) ---------- */
/* รูปแนวตั้ง 3:4 ไม่ครอปศีรษะ + ชื่อ ตำแหน่ง และช่องทางติดต่อ (ลิงก์โทร/อีเมลได้)
   { type, eyebrow?, heading?, lead?, columns?: 1-4 (ค่าเริ่มต้น 4), layout?: "card" | "row" | "feature",
     source?: { type: "people", ids: [...] },   ← ดึงจาก content/people/index.json (แนะนำ — แก้ข้อมูลที่เดียว)
     items?: [{ name, position, roles?, image?, alt?, phone?, fax?, email?, note?, href? }] }
   layout  card    = การ์ดแนวตั้ง 2-4 คอลัมน์ (ค่าเริ่มต้น)
           row     = รูปมีกรอบ + ข้อมูลด้านข้าง 2 คอลัมน์ (รองผู้บริหาร / ผู้อำนวยการ)
           feature = คนเดียวขนาดใหญ่ + ตารางข้อมูลติดต่อ (ผู้บริหารสูงสุด)
   href = หน้าประวัติ (person.html?id=<id> — content-sources.js ใส่ให้เมื่อใช้ source) → กดได้ทั้งการ์ด */
const telHref = v => `tel:${String(v).replace(/[^0-9+]/g, '')}`;

function personContacts(it, cls) {
  const rows = [
    it.phone ? `<li>${icon('i-phone')}<span class="sr-only">โทรศัพท์</span><a href="${esc(telHref(it.phone))}">${esc(it.phone)}</a></li>` : '',
    it.fax ? `<li>${icon('i-print')}<span class="person-contact-label">โทรสาร</span> <span>${esc(it.fax)}</span></li>` : '',
    it.email ? `<li>${icon('i-mail')}<span class="sr-only">อีเมล</span><a href="mailto:${esc(it.email)}" lang="en">${esc(it.email)}</a></li>` : '',
  ].join('');
  return rows ? `<ul class="${cls}">${rows}</ul>` : '';
}

/** ตารางข้อมูล (หัวข้อ | ค่า) — ใช้ใน layout feature และหน้าประวัติ · extra = [[หัวข้อ, HTML ที่ esc แล้ว]] */
function personFacts(it, cls, extra = []) {
  const rows = [
    ...extra,
    it.phone ? ['โทรศัพท์', `<a href="${esc(telHref(it.phone))}">${esc(it.phone)}</a>`] : null,
    it.fax ? ['โทรสาร', esc(it.fax)] : null,
    it.email ? ['อีเมล', `<a href="mailto:${esc(it.email)}" lang="en">${esc(it.email)}</a>`] : null,
  ].filter(Boolean);
  return rows.length
    ? `<dl class="${cls}">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`
    : '';
}

function personPhoto(it, cls = 'person-photo', lazy = true) {
  return `<div class="${cls}">${it.image
    ? `<img src="${esc(it.image)}" alt="${esc(it.alt || it.name)}"${lazy ? ' loading="lazy"' : ''}>`
    : `<span class="person-photo-empty" aria-hidden="true">${icon('i-user', 'icon-lg')}</span>`}</div>`;
}

const personRoles = it => (it.roles || []).length
  ? `<ul class="person-roles">${it.roles.map(r => `<li>${esc(r)}</li>`).join('')}</ul>`
  : '';

function personGrid(b) {
  const layout = ['row', 'feature'].includes(b.layout) ? b.layout : 'card';
  const items = (b.items || []).map(it => {
    const name = it.href ? `<a class="person-link" href="${esc(it.href)}">${esc(it.name)}</a>` : esc(it.name);
    const more = it.href
      ? `<span class="person-more" aria-hidden="true">ดูประวัติ ${icon('i-arrow', 'icon person-more-ic')}</span>`
      : '';
    const cls = `person-card${it.href ? ' is-link' : ''}`;
    if (layout === 'card') {
      return `
          <article class="${cls}">
            ${personPhoto(it)}
            <div class="person-body">
              <h3>${name}</h3>
              ${it.position ? `<p class="person-position">${esc(it.position)}</p>` : ''}
              ${personRoles(it)}
              ${personContacts(it, 'person-contact')}
              ${it.note ? `<p class="person-note">${esc(it.note)}</p>` : ''}
              ${more}
            </div>
          </article>`;
    }
    const big = layout === 'feature';
    const bigMore = it.href
      ? `<span class="person-more is-button" aria-hidden="true">ดูประวัติ ${icon('i-arrow', 'icon person-more-ic')}</span>`
      : '';
    return `
          <article class="${cls}">
            ${personPhoto(it, 'person-photo is-framed', !big)}
            <div class="person-body">
              ${it.position ? `<p class="person-position">${esc(it.position)}</p>` : ''}
              <h3>${name}</h3>
              ${personRoles(it)}
              ${big ? personFacts(it, 'person-facts') : personContacts(it, 'person-contact')}
              ${it.note ? `<p class="person-note">${esc(it.note)}</p>` : ''}
              ${big ? bigMore : more}
            </div>
          </article>`;
  }).join('');
  const cls = layout === 'card'
    ? `${colsClass(b.columns || 4)} person-grid`
    : `person-grid is-${layout}`;
  return section(b, `<div class="${cls}">${items}
        </div>`);
}

/* ---------- Block: person-profile  (หน้าประวัติบุคคล person.html?id=<id>) ---------- */
/* { type, source: { type: "person", id? }, breadcrumb?: [{label, href}], backHref?, backLabel? }
   ข้อมูลจาก content/people/index.json (content-sources.js ใส่ให้ใน b.person) — id ไม่ใส่ = ใช้ ?id= จาก URL
   ส่วนบน (พื้นเขียวเข้มแบบ page-hero is-plain): เส้นทางหน้า ตำแหน่ง ชื่อ ตำแหน่งอื่น
   ส่วนล่างสองคอลัมน์: ซ้าย = รูป (ยกขึ้นซ้อนขอบแถบบน) + การ์ดข้อมูลติดต่อ/แชร์/พิมพ์
                       ขวา = ประวัติโดยย่อ · ประวัติการทำงาน / การศึกษา (เส้นเวลา) · หน้าที่ความรับผิดชอบ */
const PROFILE_SECTIONS = [
  ['career', 'ประวัติการทำงาน', 'i-service'],
  ['education', 'ประวัติการศึกษา', 'i-book'],
];

/* ข้อความรอข้อมูลแบบ [...] ไม่แสดงบนหน้าประวัติ — ยังเก็บไว้ใน JSON เป็นตัวเตือน (validate นับให้)
   รายการที่ทั้งข้อความเป็น [...] = ซ่อนทั้งรายการ · ช่วงเวลาที่มี [...] ปน (เช่น "[ปี พ.ศ.] – ปัจจุบัน") = ตัดส่วนนั้นออก */
const isPlaceholder = s => /^\s*\[[^\]]*\]\s*$/.test(String(s ?? ''));
const stripPlaceholder = s => String(s ?? '').replace(/\[[^\]]*\]/g, '').replace(/^[\s–—-]+|[\s–—-]+$/g, '').trim();

/** รายการประวัติที่แสดงได้จริง — [{ period, title }] (ข้อความล้วนแปลงเป็น { title }) */
function profileItems(list) {
  return (list || [])
    .map(x => (typeof x === 'string' ? { title: x } : (x || {})))
    .filter(it => it.title && !isPlaceholder(it.title))
    .map(it => ({ period: stripPlaceholder(it.period), title: it.title }));
}

function profileTimeline(list) {
  return `<ol class="pf-timeline">${list.map(it => {
    return `
              <li>
                ${it.period ? `<span class="pf-period">${esc(it.period)}</span>` : ''}
                <span class="pf-text">${esc(it.title)}</span>
              </li>`;
  }).join('')}
            </ol>`;
}

function profileSection(title, ic, body, count = 0) {
  return `
          <section class="pf-card">
            <header class="pf-card-head">
              <span class="pf-card-ic" aria-hidden="true">${icon(ic)}</span>
              <h2>${esc(title)}</h2>
              ${count ? `<span class="pf-count">${count} รายการ</span>` : ''}
            </header>
            ${body}
          </section>`;
}

function personProfile(b) {
  const p = b.person;
  const back = b.backHref || 'executives.html';
  const backLabel = b.backLabel || 'ผู้บริหารทั้งหมด';
  if (!p) {
    return `
    <section class="section album-section"${attr('id', b.id)}>
      <div class="container">
        <div class="album-missing">
          ${icon('i-user', 'icon album-missing-icon')}
          <h2>ไม่พบข้อมูลบุคคลนี้</h2>
          <p>ข้อมูลอาจถูกย้ายหรือลบไปแล้ว เลือกดูรายชื่อทั้งหมดได้จากหน้าผู้บริหาร</p>
          <a class="album-btn is-primary" href="${esc(back)}">${esc(backLabel)}</a>
        </div>
      </div>
    </section>`;
  }
  const shareLink = (kind, label) => `<a href="#" data-share="${kind}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only"> (เปิดในแท็บใหม่)</span></a>`;
  const roles = (p.roles || []).length
    ? `<ul class="pf-roles">${p.roles.map(r => `<li>${esc(r)}</li>`).join('')}</ul>`
    : '';
  const contact = personContacts(p, 'pf-contact');
  const bio = p.bio && !isPlaceholder(p.bio) ? p.bio : '';
  const duties = (p.duties || []).filter(d => d && !isPlaceholder(d));
  const sections = [
    bio ? profileSection('ประวัติโดยย่อ', 'i-user', `<p class="pf-bio">${esc(bio)}</p>`) : '',
    ...PROFILE_SECTIONS.map(([k, label, ic]) => [profileItems(p[k]), label, ic])
      .filter(([items]) => items.length)
      .map(([items, label, ic]) => profileSection(label, ic, profileTimeline(items), items.length)),
    duties.length
      ? profileSection('หน้าที่ความรับผิดชอบ', 'i-check', `<ul class="pf-duties">${duties.map(d => `<li>${esc(d)}</li>`).join('')}</ul>`)
      : '',
  ].join('');
  return `
    <section class="page-hero is-plain pf-hero"${attr('id', b.id)}>
      <span class="page-hero-mark" aria-hidden="true"></span>
      <div class="container">
        ${breadcrumbNav([...(b.breadcrumb || []), { label: p.name }], { home: true })}
        <div class="pf-hero-text">
          ${p.position ? `<p class="pf-kicker">${esc(p.position)}</p>` : ''}
          <h1>${esc(p.name)}</h1>
          ${p.nameEn ? `<p class="pf-name-en" lang="en">${esc(p.nameEn)}</p>` : ''}
          ${roles}
        </div>
      </div>
    </section>
    <section class="section pf-body">
      <div class="container pf-layout">
        <aside class="pf-aside">
          ${personPhoto(p, 'person-photo pf-photo', false)}
          <div class="pf-side-card">
            ${contact ? `<h2>ข้อมูลติดต่อ</h2>${contact}` : ''}
            <div class="pf-actions">
              <details class="article-share">
                <summary class="article-tool">${icon('i-share')}<span>แชร์</span></summary>
                <div class="article-share-menu">${shareLink('facebook', 'Facebook')}${shareLink('line', 'LINE')}${shareLink('x', 'X')}</div>
              </details>
              <button type="button" class="article-tool" data-share="print">${icon('i-print')}<span>พิมพ์</span></button>
              <span class="share-status" data-share-status aria-live="polite"></span>
            </div>
          </div>
          <a class="pf-back" href="${esc(back)}">${icon('i-arrow', 'icon is-back')}<span>${esc(backLabel)}</span></a>
        </aside>
        <div class="pf-main">${sections || `
          <p class="pf-empty">ยังไม่มีข้อมูลประวัติ</p>`}
        </div>
      </div>
    </section>`;
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
   { type, heading?, lead?, search?: true (ช่องค้นหา + จำนวน + ปุ่มขยายทั้งหมด), items: [{ q, a }] }
   คำตอบที่เขียนเป็นข้อ "๑. … ๒. …" (หรือ 1. 2.) จะแยกเป็นย่อหน้าให้อัตโนมัติ และ " - " ในข้อเป็นรายการย่อย */
function faqAnswer(a) {
  const text = String(a || '').trim();
  const NUM = /\s+(?=(?:[๑-๙]{1,2}|\d{1,2})\.\s)/;
  const parts = /^(?:๑|1)\.\s/.test(text) ? text.split(NUM) : [text];
  return parts.map(part => {
    const sub = parts.length > 1 ? part.split(/\s+-\s+/) : [part];
    if (sub.length < 3) return `<p>${esc(part)}</p>`;
    const [lead, ...rest] = sub;
    const last = rest[rest.length - 1];
    // ข้อย่อยสุดท้ายอาจมีประโยคสรุปต่อท้าย ("… แปลว่า แสงสว่าง ดังนั้น …") — แยกออกเป็นย่อหน้า
    const m = last.match(/^(.*?)\s+((?:ดังนั้น|ด้วยเหตุ|Therefore|Thus|Since)[\s,].*)$/);
    if (m) rest[rest.length - 1] = m[1];
    return `<p>${esc(lead)}</p>
                  <ul>${rest.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${m ? `
                  <p>${esc(m[2])}</p>` : ''}`;
  }).join('\n                  ');
}

function faq(b) {
  const id = esc(b.id || 'x');
  const all = b.items || [];
  const items = all.map((it, i) => `
            <div class="faq-item">
              <button class="faq-q" type="button" aria-expanded="false" aria-controls="faq-a-${id}-${i}">
                <span class="faq-mark" aria-hidden="true">Q</span>
                <span class="faq-q-text">${esc(it.q)}</span>
                ${icon('i-chevron')}
              </button>
              <div class="faq-a" id="faq-a-${id}-${i}" hidden>
                <span class="faq-mark is-a" aria-hidden="true">A</span>
                <div class="faq-a-body">
                  ${faqAnswer(it.a)}
                </div>
              </div>
            </div>`).join('');
  const tools = b.search ? `
        <div class="faq-tools" data-faq-tools hidden>
          <label class="faq-search">
            ${icon('i-search')}
            <span class="sr-only">ค้นหาคำถาม</span>
            <input type="search" placeholder="ค้นหาคำถาม" autocomplete="off" data-faq-search>
          </label>
          <span class="faq-count" aria-live="polite"><b data-faq-n>${all.length}</b> <span>คำถาม</span></span>
          <button type="button" class="faq-all" data-faq-all aria-pressed="false">
            <span>ขยายทั้งหมด</span><span hidden>ย่อทั้งหมด</span>
          </button>
        </div>` : '';
  return section(b, `${tools}
        <div class="faq-compact-list${b.search ? ' is-qa' : ''}">${items}
        </div>${b.search ? `
        <p class="faq-empty" data-faq-empty hidden>ไม่พบคำถามที่ตรงกับคำค้น</p>` : ''}`);
}

/* ---------- Block: steps ---------- */
/* ขั้นตอนการทำงาน มีเลขลำดับให้อัตโนมัติ
   { type, heading?, lead?, layout?: "list"|"timeline", items: [{ title, body? }] }
   layout "timeline" = เรียงแนวนอนต่อกันด้วยเส้น (จอเล็กกลับเป็นแนวตั้ง) — เหมาะกับ 3-5 ขั้น */
function steps(b) {
  if (b.layout === 'timeline') {
    const items = (b.items || []).map((it, i) => `
            <li class="block-step">
              <span class="block-step-no" aria-hidden="true">${i + 1}</span>
              <strong>${esc(it.title)}</strong>
              ${it.body ? `<p>${esc(it.body)}</p>` : ''}
            </li>`).join('');
    return section(b, `<ol class="block-steps block-steps-timeline">${items}
        </ol>`);
  }
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

/* ปกแม่แบบสำหรับข่าวที่ไม่มีรูป — พื้นเขียวเข้มไล่ทอง + ตราสัญลักษณ์กลางภาพ + ประเภท + วันที่
   (CSS: .news-cover-tpl ใน blocks.css) ใช้แทนการปล่อยช่องรูปว่าง */
function newsCover(it, d) {
  // ปกแม่แบบ (ข่าวที่ไม่มีรูป): ป้ายประเภทบนซ้าย · ปี พ.ศ. ตัวใหญ่ · ตราสำนักงานจางมุมขวาล่าง
  // โทนเขียวเข้มแบบเดียวทุกใบ (ผู้ใช้เลือก) · วันเต็มอยู่ที่ป้ายวันที่ (.news-row-date)
  return `<span class="news-cover-tpl nct-t0">
                ${it.category ? `<span class="nct-kicker">${esc(it.category)}</span>` : ''}
                ${d ? `<span class="nct-year"><small>พ.ศ.</small>${d.y + 543}</span>` : ''}
                <img src="assets/images/orst-emblem.png" alt="" loading="lazy">
              </span>`;
}

/* ---------- Block: photo-album  (หน้าอัลบั้มภาพ album.html?id=<id>) ---------- */
/* ภาพทั้งหมดของข่าวหนึ่งเรื่อง กดแล้วเปิดดูภาพเต็มพร้อมแถบภาพย่อ (lightbox)
   { type, id?, source: { type: "album", id? }, backHref?, backLabel? }
   source.id ไม่ใส่ = ใช้ ?id= จาก URL · ข้อมูลเติมให้ใน b.album โดย content-sources.js            */
function photoAlbum(b) {
  const back = b.backHref || 'media-gallery.html';
  const backLabel = b.backLabel || 'อัลบั้มทั้งหมด';
  const al = b.album;
  if (!al) {
    return `
    <section class="section album-section"${attr('id', b.id)}>
      <div class="container">
        <div class="album-missing">
          ${icon('i-grid', 'icon album-missing-icon')}
          <h2>ไม่พบอัลบั้มภาพนี้</h2>
          <p>อัลบั้มอาจถูกย้ายหรือลบไปแล้ว เลือกดูอัลบั้มอื่นได้จากคลังภาพ</p>
          <a class="album-btn is-primary" href="${esc(back)}">${esc(backLabel)}</a>
        </div>
      </div>
    </section>`;
  }
  const group = `album-${esc(al.id)}`;
  const photos = al.images.map((im, i) => {
    const full = im.href || im.image;
    const cap = im.caption || '';
    return `
          <a class="album-photo" href="${esc(full)}" data-lightbox="${group}"${cap ? ` data-lb-caption="${esc(cap)}"` : ''}>
            <img src="${esc(im.image)}" alt="${esc(im.alt || `${al.title} ภาพที่ ${i + 1}`)}" loading="${i < 8 ? 'eager' : 'lazy'}">
          </a>`;
  }).join('');
  return `
    <section class="section album-section"${attr('id', b.id)}>
      <div class="container">
        <header class="album-head">
          <div class="album-head-text">
            <h2 class="album-title">${esc(al.title)}</h2>
            <p class="album-meta">
              ${al.tag ? `<span class="album-tag">${esc(al.tag)}</span>` : ''}
              ${al.date ? `<span>${icon('i-calendar')}<time datetime="${esc(al.date)}">${esc(formatThaiDate(al.date, true))}</time></span>` : ''}
              <span>${icon('i-grid')}${al.images.length} ภาพ</span>
            </p>
          </div>
          <div class="album-actions">
            <a class="album-btn" href="${esc(back)}">${icon('i-arrow', 'icon is-back')}<span>${esc(backLabel)}</span></a>
            <a class="album-btn is-primary" href="${esc(al.newsHref)}"><span>อ่านข่าว</span>${icon('i-arrow')}</a>
          </div>
        </header>
        <div class="album-grid">${photos}
        </div>
      </div>
    </section>`;
}

/* ---------- Block: event-calendar  (ปฏิทินกิจกรรม) ---------- */
/* ซ้าย: รายการกิจกรรม (จาก content/events.json ผ่าน "source": { "type": "events" } หรือ items เอง)
   ขวา: ปฏิทินออนไลน์ฝัง (Google Calendar) — จอแคบใช้มุมมองกำหนดการ (agenda) ที่อ่านบนมือถือได้
   { type, id?, heading?, listHeading?, embed (URL ปฏิทินฝัง), calendarUrl? (ลิงก์เปิดปฏิทินเต็ม),
     limit?, items: [{ id?, title, start (YYYY-MM-DD), end?, location?, unit? }] }                  */
function eventCalendar(b) {
  const all = [...(b.items || [])].filter(it => it && it.title && it.start)
    .sort((x, y) => String(y.start).localeCompare(String(x.start)));
  const items = b.limit ? all.slice(0, b.limit) : all;
  const range = it => {
    const s = parseIsoDate(it.start);
    const e = it.end && it.end !== it.start ? parseIsoDate(it.end) : null;
    if (!s) return '';
    if (!e) return formatThaiDate(it.start, true);
    return s.m === e.m && s.y === e.y
      ? `${s.d}–${e.d} ${TH_MONTHS_FULL[s.m - 1]} ${s.y + 543}`
      : `${formatThaiDate(it.start, true)} – ${formatThaiDate(it.end, true)}`;
  };
  // จัดกลุ่มตามเดือน (หัวเดือนติดบนเมื่อเลื่อน) · แถวกะทัดรัด: วันที่ | ชื่อ + ช่วงวัน · สถานที่ · หน่วยงาน
  const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const groups = [];
  for (const it of items) {
    const d = parseIsoDate(it.start);
    const key = d ? `${d.y}-${d.m}` : '';
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) groups.push(g = { key, d, items: [] });
    g.items.push(it);
  }
  const units = [...new Set(all.map(it => it.unit).filter(Boolean))];
  // สีตามหน่วยงาน (ใช้ร่วมกันทั้งปฏิทินและรายการด้านข้าง)
  const colorOf = {};
  units.forEach((u, i) => { colorOf[u] = Number(b.colors?.[u]) || (i % 6) + 1; });
  const cvar = u => (u && colorOf[u] ? ` style="--c:var(--cal-${colorOf[u]})"` : '');
  const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const row = it => {
    const d = parseIsoDate(it.start);
    const wd = d ? WEEKDAYS[new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay()] : '';
    const multi = it.end && it.end !== it.start;
    return `
              <li class="evcal-item"${attr('data-unit', it.unit)}${cvar(it.unit)}>
                ${d ? `<time class="evcal-date" datetime="${esc(it.start)}"><small>${wd}</small><b>${d.d}</b><span>${TH_MONTHS_SHORT[d.m - 1]}</span></time>` : '<span class="evcal-date"></span>'}
                <div class="evcal-body">
                  <strong class="evcal-title">${esc(it.title)}</strong>
                  <span class="evcal-meta">
                    ${multi ? `<span>${icon('i-calendar')}${esc(range(it))}</span>` : ''}
                    ${it.location ? `<span>${icon('i-pin')}${esc(it.location)}</span>` : ''}
                  </span>
                  ${it.unit ? `<span class="evcal-unit">${esc(it.unit)}</span>` : ''}
                </div>
              </li>`;
  };
  const list = groups.map(g => `
            <li class="evcal-month">
              <h3 class="evcal-month-head">${g.d ? `${TH_MONTHS_FULL[g.d.m - 1]} ${g.d.y + 543}` : ''}</h3>
              <ol class="evcal-month-list">${g.items.map(row).join('')}
              </ol>
            </li>`).join('');
  const filters = units.length > 1 ? `
            <div class="evcal-filter" role="group" aria-label="กรองตามหน่วยงาน" data-evcal-filter hidden>
              <button type="button" aria-pressed="true" data-unit="">ทั้งหมด</button>
              ${units.map(u => `<button type="button" aria-pressed="false" data-unit="${esc(u)}"${cvar(u)}><i aria-hidden="true"></i>${esc(u)}</button>`).join('')}
            </div>` : '';
  // ปฏิทินของเว็บเอง (แบบ Google Calendar) — ข้อมูลจาก CMS ฝังเป็น JSON ให้ components.js initCalendars วาดมุมมองเดือน/สัปดาห์/วัน/กำหนดการ
  // สีตามหน่วยงาน: เรียงตามลำดับที่พบในข้อมูล → --cal-1..6 (กำหนดเองได้ด้วย b.colors: { "ชื่อหน่วยงาน": 1..6 })
  const unitColor = colorOf;
  const data = {
    events: all.map(it => ({ id: it.id || '', title: it.title, start: it.start, end: it.end || '', location: it.location || '',
      unit: it.unit || '', url: it.url || '', color: unitColor[it.unit] || 1 })),
    units: units.map(u => ({ name: u, color: unitColor[u] })),
  };
  // JSON ใน <script> — กัน "</script>" และ "<!--" ด้วยการแปลง < เป็น < (ไม่มีค่าใดถูกตีความเป็น HTML)
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const uid = esc(b.id || 'evcal');
  const legend = data.units.length ? `
              <div class="gcal-legend" role="group" aria-label="แสดงตามหน่วยงาน">
                ${data.units.map(u => `<button type="button" class="gcal-chip" aria-pressed="true" data-gcal-unit="${esc(u.name)}" style="--c:var(--cal-${u.color})"><span class="gcal-chip-box" aria-hidden="true">${icon('i-check')}</span><span>${esc(u.name)}</span></button>`).join('')}
              </div>` : '';
  const views = [['day', 'วัน'], ['week', 'สัปดาห์'], ['month', 'เดือน'], ['schedule', 'กำหนดการ']];
  const board = `
          <div class="gcal" data-gcal aria-labelledby="${uid}-board">
            <script type="application/json" data-gcal-data>${json}</script>
            <div class="gcal-head">
              <h2 class="gcal-board-title" id="${uid}-board">${icon('i-calendar')}${esc(b.boardHeading || 'ปฏิทินกิจกรรม')}</h2>
              <div class="gcal-toolbar">
                <button type="button" class="gcal-today" data-gcal-today>วันนี้</button>
                <span class="gcal-nav">
                  <button type="button" class="gcal-icon-btn" data-gcal-prev aria-label="ก่อนหน้า">${icon('i-chevron', 'icon gcal-prev-ic')}</button>
                  <button type="button" class="gcal-icon-btn" data-gcal-next aria-label="ถัดไป">${icon('i-chevron')}</button>
                </span>
                <p class="gcal-title" data-gcal-title aria-live="polite"></p>
                <div class="gcal-views" role="group" aria-label="มุมมองปฏิทิน">
                  ${views.map(([v, label]) => `<button type="button" data-gcal-view="${v}" aria-pressed="false">${label}</button>`).join('')}
                </div>
              </div>${legend}
            </div>
            <div class="gcal-body" data-gcal-body>
              <p class="gcal-noscript">${esc(b.emptyText || 'เปิด JavaScript เพื่อดูปฏิทิน — รายการกิจกรรมทั้งหมดอยู่ในแผงด้านข้าง')}</p>
            </div>
            <div class="gcal-pop" data-gcal-pop role="dialog" aria-modal="false" aria-labelledby="${uid}-pop-title" hidden></div>
          </div>`;
  return `
    <section class="section evcal-section"${attr('id', b.id)}>
      <div class="container">${sectionHead(b)}
        <div class="evcal">${board}
          <aside class="evcal-side" aria-labelledby="${uid}-list">
            <div class="evcal-side-head">
              <h2 id="${uid}-list">${esc(b.listHeading || 'กิจกรรมล่าสุด')}</h2>
              <span class="evcal-count">${all.length} กิจกรรม</span>
            </div>
            ${filters}
            ${items.length ? `<ol class="evcal-list" data-evcal-list>${list}
            </ol>
            <p class="evcal-empty" data-evcal-empty hidden>ไม่มีกิจกรรมของหน่วยงานนี้</p>` : `<p class="evcal-empty">${esc(b.emptyText || 'ยังไม่มีกิจกรรม')}</p>`}
          </aside>
        </div>
      </div>
    </section>`;
}

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
  // ข่าว: เรียงชิปประเภทตามจำนวนรายการ (มากไปน้อย)
  if (news) cats.sort((x, y) => items.filter(it => it.category === y).length - items.filter(it => it.category === x).length);
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
      // บรรทัดรายละเอียด: วันที่เต็ม (มุมมองรายการ — มุมมองตารางมีป้ายวันที่บนภาพแล้ว) · PDF จำนวนหน้า ขนาดไฟล์
      const fileBits = type === 'PDF' ? ['PDF', it.pages ? `${it.pages} หน้า` : '', size].filter(Boolean) : [];
      const newsMeta = (it.publishedAt || fileBits.length) ? `<p class="news-row-meta">${[
        it.publishedAt ? `<time class="nrm-date" datetime="${esc(it.publishedAt)}">${esc(formatThaiDate(it.publishedAt, true))}</time>` : '',
        fileBits.length ? `<span class="nrm-file">${fileBits.map(esc).join(' · ')}</span>` : '',
      ].filter(Boolean).join('')}</p>` : '';
      // ปกการ์ดข่าว: ค่าเริ่มต้นใช้ปกแม่แบบทุกใบ (ผู้ใช้: ไม่เอาปกที่เป็นภาพสแกนเอกสาร)
      // keepImages: true = ข่าวที่มีรูปจริงใช้รูปเดิม (หน้าข่าวกิจกรรม — ภาพเป็นภาพถ่ายกิจกรรม)
      const useImage = b.keepImages && it.image;
      const thumb = (useImage ? `<img src="${esc(it.image)}" alt="" loading="lazy">` : newsCover(it, d))
        + (type === 'PDF' ? '<span class="news-row-pdf">PDF</span>' : '');
      return `
            <li class="doc-item news-row${useImage ? ' has-image' : ''}"${attr('data-year', it._year)}${attr('data-cat', it.category)}>
              ${url ? `<a class="news-row-thumb" href="${esc(url)}" tabindex="-1" aria-hidden="true"${newTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>${thumb}</a>`
                    : `<span class="news-row-thumb" aria-hidden="true">${thumb}</span>`}
              ${d ? `<time class="news-row-date" datetime="${esc(it.publishedAt)}" aria-label="${esc(formatThaiDate(it.publishedAt, true))}"><b>${d.d}</b><span>${TH_MONTHS[d.m - 1]} ${String(d.y + 543).slice(-2)}</span></time>` : ''}
              <div class="doc-body">
                ${title}
                ${it.byline ? `<p class="news-row-byline">${icon('i-user')}<span>${esc(it.byline)}</span></p>` : ''}
                ${it.excerpt ? `<p class="news-row-excerpt">${esc(it.excerpt)}</p>` : ''}
                ${newsMeta}
              </div>
              ${type === 'PDF' && url ? `
              <div class="news-row-foot news-row-foot--doc">
                <a class="doc-btn is-primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-doc-preview="${esc(url)}" data-doc-title="${esc(it.title)}">${icon('i-eye')}<span>เปิดเอกสาร</span><span class="sr-only"> ${esc(it.title)}</span></a>
                <a class="doc-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer" download>${icon('i-download')}<span>ดาวน์โหลด</span><span class="sr-only"> ${esc(it.title)}</span></a>
              </div>` : `
              <div class="news-row-foot">
                ${d ? `<time class="news-row-when" datetime="${esc(it.publishedAt)}">${d.d} ${TH_MONTHS[d.m - 1]} ${d.y + 543}</time>` : it.category ? `<span class="news-row-type">${esc(it.category)}</span>` : '<span></span>'}
                ${url ? `<span class="news-row-go" aria-hidden="true">อ่านต่อ<span class="news-row-go-ic">${icon(newTab ? 'i-external' : 'i-arrow')}</span></span>` : ''}
              </div>`}
            </li>`;
    }
    if (type === 'PDF' && url) {
      // PDF: ป้าย PDF + ชนิด/ขนาดไฟล์ในบรรทัดรอง + ปุ่ม "เปิดเอกสาร" (หน้าต่างซ้อน) และ "ดาวน์โหลด"
      // "เปิดเอกสาร" เป็นลิงก์ — initDocPreview() ใน components.js เปิดในหน้าต่างซ้อน เบราว์เซอร์ที่แสดง PDF ในหน้าไม่ได้จะเปิดแท็บใหม่ตามลิงก์
      const fileMeta = [type, size].filter(Boolean).join('<span aria-hidden="true"> · </span>');
      return `
            <li class="doc-item is-pdf"${attr('data-year', it._year)}${attr('data-cat', it.category)}>
              <span class="doc-icon doc-icon-pdf" aria-hidden="true">${icon('i-file')}<b>PDF</b></span>
              <div class="doc-body">
                ${title}
                <div class="doc-meta">${[meta, fileMeta].filter(Boolean).join('<span aria-hidden="true"> · </span>')}</div>
                ${it.note ? `<p class="doc-note">${esc(it.note)}</p>` : ''}
              </div>
              <div class="doc-actions">
                <a class="doc-btn is-primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-doc-preview="${esc(url)}" data-doc-title="${esc(it.title)}">${icon('i-eye')}<span>เปิดเอกสาร</span><span class="sr-only"> ${esc(it.title)}</span></a>
                <a class="doc-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer" download>${icon('i-download')}<span>ดาวน์โหลด</span><span class="sr-only"> ${esc(it.title)}</span></a>
              </div>
            </li>`;
    }
    // ไม่ใช่ PDF: โครงเดียวกับแถว PDF (ป้ายชนิด + ปุ่มด้านขวา) — ลิงก์ไปหน้าอื่น = "เปิดลิงก์" · ไฟล์ชนิดอื่น = "เปิดไฟล์" · ไม่มีไฟล์ = ไม่มีปุ่ม
    const badge = type || (url ? 'ลิงก์' : '');
    const fileMeta = [type, size].filter(Boolean).map(esc).join('<span aria-hidden="true"> · </span>');
    const go = url ? (type ? 'เปิดไฟล์' : 'เปิดลิงก์') : '';
    return `
            <li class="doc-item is-file${url ? '' : ' is-empty'}"${attr('data-year', it._year)}${attr('data-cat', it.category)}>
              <span class="doc-icon doc-icon-pdf doc-icon-file" aria-hidden="true">${icon('i-file')}${badge ? `<b>${esc(badge)}</b>` : ''}</span>
              <div class="doc-body">
                ${title}
                ${meta || fileMeta ? `<div class="doc-meta">${[meta, fileMeta].filter(Boolean).join('<span aria-hidden="true"> · </span>')}</div>` : ''}
                ${it.note ? `<p class="doc-note">${esc(it.note)}</p>` : ''}
              </div>
              ${url ? `<div class="doc-actions">
                <a class="doc-btn is-primary" href="${esc(url)}"${newTab ? ' target="_blank" rel="noopener noreferrer"' : ''} tabindex="-1" aria-hidden="true">${icon(newTab ? 'i-external' : 'i-arrow')}<span>${go}</span></a>
              </div>` : ''}
            </li>`;
  }).join('');

  const newsToolbar = `
          <form class="doc-toolbar is-news" data-doc-toolbar hidden role="search" aria-label="ค้นหาข่าว">
            ${cats.length > 1 ? `<div class="doc-chips" role="group" aria-label="ประเภทข่าว">
              <button type="button" data-doc-chip="" aria-pressed="true">ทั้งหมด</button>
              ${cats.map(c => `<button type="button" data-doc-chip="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}
            </div>` : ''}
            <div class="doc-tools">
              <label class="doc-search-pill">
                ${icon('i-search')}
                <span class="sr-only">ค้นหาข่าว</span>
                <input type="search" data-doc-search placeholder="ค้นหาข่าว" autocomplete="off">
              </label>
              ${years.length > 1 ? `<label class="doc-year-pill">
                <span class="sr-only">${yearLabel}</span>
                <select data-doc-year>
                  <option value="">ทุก${yearLabel}</option>
                  ${years.map(y => `<option value="${esc(y)}">${yearLabel === 'ปีงบประมาณ' ? 'ปีงบ ' : ''}${esc(thaiNum(y))}</option>`).join('')}
                </select>
              </label>` : ''}
              <div class="doc-view" role="group" aria-label="รูปแบบการแสดงผล">
                <button type="button" data-doc-view="grid" aria-pressed="true">${icon('i-grid')}<span>ตาราง</span></button>
                <button type="button" data-doc-view="list" aria-pressed="false">${icon('i-list')}<span>รายการ</span></button>
              </div>
            </div>
          </form>`;
  // รายการเอกสาร: แถบค้นหาแบบเดียวกับหน้าข่าว + สลับมุมมอง รายการ (ค่าเริ่มต้น) / ตาราง
  const docsToolbar = `
          <form class="doc-toolbar is-news is-docs" data-doc-toolbar hidden role="search" aria-label="ค้นหาเอกสาร">
            <div class="doc-tools">
              <label class="doc-search-pill">
                ${icon('i-search')}
                <span class="sr-only">ค้นหาชื่อเอกสาร</span>
                <input type="search" data-doc-search placeholder="ค้นหาชื่อเอกสาร" autocomplete="off">
              </label>
              ${years.length > 1 ? `<label class="doc-year-pill">
                <span class="sr-only">${yearLabel}</span>
                <select data-doc-year>
                  <option value="">ทุก${yearLabel}</option>
                  ${years.map(y => `<option value="${esc(y)}">${yearLabel === 'ปีงบประมาณ' ? 'ปีงบ ' : ''}${esc(thaiNum(y))}</option>`).join('')}
                </select>
              </label>` : ''}
              ${cats.length > 1 ? `<label class="doc-year-pill">
                <span class="sr-only">หมวด</span>
                <select data-doc-cat>
                  <option value="">ทุกหมวด</option>
                  ${cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
                </select>
              </label>` : ''}
              <div class="doc-view" role="group" aria-label="รูปแบบการแสดงผล">
                <button type="button" data-doc-view="list" aria-pressed="true">${icon('i-list')}<span>รายการ</span></button>
                <button type="button" data-doc-view="grid" aria-pressed="false">${icon('i-grid')}<span>ตาราง</span></button>
              </div>
            </div>
          </form>`;
  const toolbar = compact ? '' : news ? newsToolbar : docsToolbar;

  const unit = news ? 'ข่าว' : 'รายการ';
  // compact (เอกสารแนบท้ายหน้า) แบ่งหน้าละ 10 — ตัวแบ่งหน้าซ่อนอยู่จนกว่ารายการจะเกินหนึ่งหน้า (components.js initDocLists)
  const pageSize = Number(b.pageSize) || (news ? 12 : compact ? 10 : 20);
  return section(b, `<div class="doc-list${compact ? ' is-compact' : ''}${news ? ' is-news' : ''}" data-doc-list data-page-size="${pageSize}" data-unit="${unit}"${news ? ' data-view="grid"' : compact ? '' : ' data-view="list" data-view-default="list" data-view-key="doc-file-view"'}>${toolbar}
          ${compact ? '' : `<p class="doc-count" data-doc-count aria-live="polite">พบ ${items.length} ${unit}</p>`}
          <ul class="doc-items" id="${uid}-items">${rows}
          </ul>
          <p class="doc-empty" data-doc-empty hidden>${news ? 'ไม่พบข่าวที่ตรงกับเงื่อนไข' : 'ไม่พบเอกสารที่ตรงกับเงื่อนไข'}</p>
          <nav class="doc-pager" data-doc-pager aria-label="การแบ่งหน้า" hidden></nav>
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

  // layout "cards" = แต่ละหัวข้อเป็นการ์ด เรียงกริด 2 คอลัมน์เต็มความกว้าง · หัวข้อใส่ icon ได้ · wide = การ์ดเต็มแถว เนื้อความแบ่ง 2 คอลัมน์
  const cards = b.layout === 'cards';
  const body = secs.map(s => `
            <section class="article-section${cards && s.wide ? ' is-wide' : ''}"${s.heading ? ` id="${esc(s._id)}" aria-labelledby="${esc(s._id)}-h"` : ''}>
              ${s.heading ? `<h3 id="${esc(s._id)}-h">${cards && s.icon ? `<span class="article-card-ic" aria-hidden="true">${icon(s.icon)}</span>` : ''}${esc(s.heading)}</h3>` : ''}
              ${(s.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join('\n              ')}
              ${s.list?.length ? `<ul>${s.list.map(li => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}
              ${s.html || ''}
            </section>`).join('');

  return section(b, `<div class="article${toc ? ' has-toc' : ''}${cards ? ' is-cards' : ''}">${toc}
          <div class="article-body block-prose">
            ${(b.intro || []).map(p => `<p class="article-intro">${esc(p)}</p>`).join('')}${body}
          </div>
        </div>`);
}

/* ---------- Block: timeline  (เส้นเวลา — ประวัติความเป็นมา) ---------- */
/* { type, heading?, lead?, eyebrow?,
     items: [{ id?, year, date?, title, lead?, paragraphs?: [string], body?,
               image?, alt?, caption?, portrait?, images?: [{ image, alt, caption? }], stat?: { value, label } }] }
   portrait = ภาพแนวตั้ง (เช่น พระบรมฉายาลักษณ์) — แสดงสัดส่วน 4:5 ไม่ครอปพระพักตร์
   จอกว้าง: เส้นกลางแนวตั้ง การ์ดเนื้อหาสลับซ้าย/ขวา อีกฝั่งเป็น ภาพ | ภาพชุด (images) | ตัวเลขเด่น (stat) | ปีตัวใหญ่จาง
   lead = ประโยคสรุปเด่น แสดงเสมอ · paragraphs = เนื้อความเต็ม พับใน "อ่านรายละเอียด" เมื่อมี lead (ไม่มี lead = แสดงเลย)
   id ของแต่ละรายการ = <block id>-<ลำดับ> (หรือ id ที่ใส่เอง) — ใช้กับ anchor-nav ทำแถบปีติดบน
   ภาพเคลื่อนไหวตอนเลื่อน (ค่อย ๆ ปรากฏ + เส้นเวลาเติมสี) อยู่ใน components.js initTimeline — ไม่มี JS ก็แสดงครบ */
/* credit = ที่มาของภาพ { text, href } — แสดงตัวเล็กใต้คำบรรยาย (จำเป็นสำหรับภาพสัญญาอนุญาต CC BY / CC BY-SA) */
function timelineFigure(src, alt, caption, cls = 'tl-figure', credit = null) {
  const cr = credit?.text
    ? `<small class="tl-credit">ภาพ: ${credit.href ? `<a href="${esc(credit.href)}" target="_blank" rel="noopener noreferrer">${esc(credit.text)}</a>` : esc(credit.text)}</small>`
    : '';
  return `<figure class="${cls}"><img src="${esc(src)}" alt="${esc(alt || '')}" loading="lazy">${caption || cr ? `<figcaption>${caption ? `<span>${esc(caption)}</span>` : ''}${cr}</figcaption>` : ''}</figure>`;
}

function timeline(b) {
  const base = esc(b.id || 'tl');
  const items = (b.items || []).map((it, i) => {
    const paras = [...(it.body ? [it.body] : []), ...(it.paragraphs || [])];
    const gallery = (it.images || []).filter(x => x && x.image);
    const year = it.year ? `<span class="tl-year">${esc(it.year)}</span>` : '';
    let side = '';
    let kind = 'is-year';
    if (gallery.length) {
      kind = 'is-gallery';
      side = `<div class="tl-side tl-gallery">${gallery.map(g => timelineFigure(g.image, g.alt, g.caption, 'tl-figure', g.credit)).join('')}</div>`;
    } else if (it.image) {
      kind = 'is-media';
      side = `<div class="tl-side">${timelineFigure(it.image, it.alt, it.caption, `tl-figure${it.portrait ? ' is-portrait' : ''}`, it.credit)}</div>`;
    } else if (it.stat?.value) {
      kind = 'is-stat';
      side = `<div class="tl-side tl-stat"><strong>${esc(it.stat.value)}</strong>${it.stat.label ? `<span>${esc(it.stat.label)}</span>` : ''}</div>`;
    } else if (it.year) {
      side = `<div class="tl-side tl-ghost" aria-hidden="true">${esc(it.year)}</div>`;
    }
    const body = paras.map(p => `<p>${esc(p)}</p>`).join('');
    const more = it.lead && paras.length
      ? `<details class="tl-more"><summary><span class="tl-more-open">อ่านรายละเอียด</span><span class="tl-more-close">ย่อรายละเอียด</span>${icon('i-chevron', 'icon tl-more-ic')}</summary><div class="tl-more-body">${body}</div></details>`
      : body;
    return `
            <li class="tl-item ${kind}" id="${esc(it.id || `${base}-${i + 1}`)}" data-tl-item>
              <span class="tl-dot" aria-hidden="true"></span>
              <article class="tl-card">
                <header class="tl-head">
                  ${year}
                  ${it.date ? `<span class="tl-date">${icon('i-calendar')}${esc(it.date)}</span>` : ''}
                </header>
                <h3>${esc(it.title)}</h3>
                ${it.lead ? `<p class="tl-lead">${esc(it.lead)}</p>` : ''}
                ${more}
              </article>${side}
            </li>`;
  }).join('');
  return section(b, `<ol class="tl" data-tl>${items}
        </ol>`, 'tl-section');
}

/* ---------- Block: pillars  (เสาหลัก — เทียบ 2-3 ส่วนงาน/องค์กร เคียงกัน) ---------- */
/* { type, heading?, lead?, eyebrow?,
     items: [{ icon?, eyebrow?, title, lead?, facts?: [{ label, value }], listHeading?, list?: [string],
               tagsHeading?, tags?: [string], more?: [string], action?: { label, href } }] }
   แต่ละแผง: หัวสีเข้ม (ไอคอน · ป้าย · ชื่อ · คำอธิบายสั้น) → ตาราง ตำแหน่ง | ผู้ดำรงตำแหน่ง → รายการหน้าที่ (เครื่องหมายถูก)
   → ป้ายคำ (tags) → ข้อความฉบับเต็มพับใน "อ่านข้อความฉบับเต็ม" (more) → ลิงก์ (action)
   แผงที่ 2 ใช้หัวสีทอง — เห็นชัดว่าเป็นคนละส่วน · จอแคบเรียงลงแถวเดียว */
function pillars(b) {
  const items = (b.items || []).map(it => {
    const facts = (it.facts || []).filter(f => f && f.label).map(f =>
      `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value || '')}</dd></div>`).join('');
    const list = (it.list || []).map(x => `<li>${icon('i-check')}<span>${esc(x)}</span></li>`).join('');
    const tags = (it.tags || []).map(t => `<li>${esc(t)}</li>`).join('');
    const more = (it.more || []).length
      ? `<details class="pillar-more"><summary>${icon('i-file')}<span>อ่านข้อความฉบับเต็ม</span>${icon('i-chevron', 'icon pillar-more-ic')}</summary>
                <div class="pillar-more-body">${it.more.map(p => `<p>${esc(p)}</p>`).join('')}</div></details>`
      : '';
    return `
          <article class="pillar">
            <header class="pillar-head">
              ${it.icon ? `<span class="pillar-ic" aria-hidden="true">${icon(it.icon, 'icon-lg')}</span>` : ''}
              <div>
                ${it.eyebrow ? `<small>${esc(it.eyebrow)}</small>` : ''}
                <h3>${esc(it.title)}</h3>
              </div>
              ${it.lead ? `<p>${esc(it.lead)}</p>` : ''}
            </header>
            <div class="pillar-body">
              ${facts ? `<dl class="pillar-facts">${facts}</dl>` : ''}
              ${list ? `${it.listHeading ? `<h4>${esc(it.listHeading)}</h4>` : ''}<ul class="pillar-list">${list}</ul>` : ''}
              ${tags ? `${it.tagsHeading ? `<h4>${esc(it.tagsHeading)}</h4>` : ''}<ul class="pillar-tags">${tags}</ul>` : ''}
              ${more}
              ${it.action?.href ? `<a class="pillar-action" href="${esc(it.action.href)}">${esc(it.action.label || 'ดูเพิ่มเติม')}${icon('i-arrow')}</a>` : ''}
            </div>
          </article>`;
  }).join('');
  return section(b, `<div class="pillars">${items}
        </div>`);
}

/* ---------- Block: org-chart  (แผนผังโครงสร้างองค์กร) ---------- */
/* { type, heading?, lead?, eyebrow?,
     tiers: [{ eyebrow?, title, tone?: "deep"|"gold"|"plain", roles?: [{ role, holder }], note?,
               childrenLabel?, children?: [string] }],
     columns?: [{ title, items: [string], more?: [string] }] }
   tiers = ชั้นของผัง เรียงบนลงล่าง เชื่อมด้วยเส้นแนวตั้ง · children = หน่วยย่อยของชั้นนั้น (เส้นแยกกิ่ง)
   columns = อำนาจหน้าที่ใต้ผัง (รายการลำดับเลข) — more = ข้อความฉบับเต็ม พับใน "อ่านข้อความฉบับเต็ม"
   ภาพเคลื่อนไหว: data-reveal → components.js ใส่ .is-in เมื่อเลื่อนมาถึง (ชั้นค่อย ๆ ปรากฏต่อกัน) */
/** แถบภาพเต็มความกว้าง (เช่น วิสัยทัศน์ / พันธกิจ)
 *  ภาพกินครึ่งแถบด้านหนึ่ง ไล่สีกลืนเข้าพื้น ข้อความอยู่อีกด้าน · จอแคบภาพอยู่บน ข้อความอยู่ล่าง
 *  imageSide: right | left | cover (ภาพเต็มแถบใต้สีพื้นโปร่ง เลื่อนช้ากว่าหน้า · ข้อความเด่นเติมสีตามการเลื่อน · รายการ 2 คอลัมน์)
 *  statement = ข้อความเด่น · highlights = วลีในข้อความเด่นที่ระบายสีทอง (ปาดเข้าเมื่อเลื่อนถึง)
 *  ไม่ใส่ image = แบบเรียบพื้นขาว (.no-media) · รายการเป็น { title, text } ได้ = หัวข้อสั้นตัวหนา + ข้อความเต็มตัวเล็ก
 *  icons = ไอคอนคู่กับ list ทีละข้อ (ไม่บังคับ) · list = รายการลำดับเลข ข้อความขึ้นต้น "(๑)" ใช้เลขนั้นเป็นหมายเลข */
/** ใส่ <mark> รอบวลีที่ต้องการเน้น — วลีต้องตรงกับข้อความทุกตัวอักษร (ไม่ตรง = ข้ามเฉย ๆ) */
function markPhrases(text, phrases = []) {
  let html = esc(text);
  (phrases || []).forEach((p, i) => {
    const e = esc(p);
    if (e && html.includes(e)) html = html.split(e).join(`<mark class="ib-hl" style="--i:${i}">${e}</mark>`);
  });
  return html;
}

function imageBand(b) {
  const side = ['left', 'cover'].includes(b.imageSide) ? b.imageSide : 'right';
  const tone = b.tone === 'dark' ? 'dark' : 'light';
  const paras = (b.paragraphs || []).map(p => `<p class="ib-text">${esc(p)}</p>`).join('');
  const list = (b.list || []).map((item, i) => {
    // รายการเป็นข้อความ หรือ { title, text } — ข้อความขึ้นต้น "(๑)" ใช้เลขนั้นเป็นหมายเลข
    const obj = item && typeof item === 'object';
    const t = obj ? item.text || '' : item;
    const m = String(t).match(/^\(([^)]+)\)\s*([\s\S]*)$/);
    const ic = (b.icons || [])[i];
    const body = m ? m[2] : t;
    const textHtml = obj && item.title
      ? `<span class="ib-item-body"><span class="ib-item-title">${esc(item.title)}</span>${body ? `<span class="ib-item-text">${esc(body)}</span>` : ''}</span>`
      : `<span class="ib-item-text">${esc(body)}</span>`;
    return `<li style="--i:${i}">${ic ? `<span class="ib-ico" aria-hidden="true">${icon(ic)}</span>` : ''}<span class="ib-num" aria-hidden="true">${esc(m ? m[1] : String(i + 1))}</span>${textHtml}</li>`;
  }).join('');
  return `
    <section class="block-image-band is-${tone} is-img-${side}${b.image ? '' : ' no-media'}${(b.list || []).length && b.list.length <= 3 ? ' is-short' : ''}"${attr('id', b.id)} data-reveal>
      ${b.image ? `<div class="ib-media"><img src="${esc(b.image)}" alt="${esc(b.imageAlt || '')}" loading="lazy"${b.imagePosition ? ` style="object-position:${esc(b.imagePosition)}"` : ''}></div>` : ''}
      <div class="container ib-inner">
        <div class="ib-content">
          <div class="ib-head">
          ${b.eyebrow ? `<p class="ib-eyebrow">${esc(b.eyebrow)}</p>` : ''}
          <h2 class="ib-heading">${esc(b.heading)}</h2>
          ${b.statement ? `<p class="ib-statement">${side === 'cover'
            ? `<span class="ib-fill" data-fill>${markPhrases(b.statement, b.highlights)}</span>`
            : markPhrases(b.statement, b.highlights)}</p>` : ''}
          ${paras}
          </div>
          ${list ? `<ol class="ib-list">${list}</ol>` : ''}
        </div>
      </div>
    </section>`;
}

/* ---------- Block: org-tree ----------
   แผนผังการบริหารงานแบบ 2 สาย (เช่น ราชบัณฑิตยสภา | สำนักงานราชบัณฑิตยสภา) ใต้ผู้บังคับบัญชาสูงสุด
   + เอกสารแผนผังฉบับเผยแพร่ (ภาพย่อ + ดูตัวอย่าง / เปิดเอกสาร)
   { top: { title, note?, aside? },
     branches: [{ title, note?, tone: deep|gold,
                  nodes: [{ title, note?, chips?: [], rolesLabel?, roles?: [], side?: [{ title, note? }] }],
                  unitsLabel?, units: [{ title, note?, roles?: [] }],
                  extrasLabel?, extras?: [{ title, note? }] }],
     legend?, document?: { heading?, title, lead?, file, fileSize?, thumb } } */
function orgTree(b) {
  const node = (n, cls = '') => `
            <div class="ot-node${cls}">
              <h3 class="ot-title">${esc(n.title)}</h3>
              ${(n.chips || []).length ? `<p class="ot-chips">${n.chips.map(c => `<span>${esc(c)}</span>`).join('')}</p>` : ''}
              ${n.note ? `<p class="ot-note">${esc(n.note)}</p>` : ''}
              ${(n.roles || []).length ? `<div class="ot-roles">${n.rolesLabel ? `<span class="ot-roles-label">${esc(n.rolesLabel)}</span>` : ''}<ul>${n.roles.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
            </div>`;
  const side = list => (list || []).length ? `
            <ul class="ot-side">${list.map(s => `<li><strong>${esc(s.title)}</strong>${s.note ? `<small>${esc(s.note)}</small>` : ''}</li>`).join('')}</ul>` : '';
  const unit = u => `
              <li class="ot-unit">
                <strong>${esc(u.title)}</strong>
                ${u.note ? `<small>${esc(u.note)}</small>` : ''}
                ${(u.roles || []).length ? `<p class="ot-unit-roles">${u.roles.map(r => `<span>${esc(r)}</span>`).join(`<span class="ot-arrow" aria-hidden="true">${icon('i-arrow')}</span>`)}</p>` : ''}
              </li>`;
  const branches = (b.branches || []).map((br, i) => `
        <div class="ot-branch is-${br.tone === 'gold' ? 'gold' : 'deep'}" style="--i:${i}">
          <div class="ot-node is-head">
            <h3 class="ot-title">${esc(br.title)}</h3>
            ${br.note ? `<p class="ot-note">${esc(br.note)}</p>` : ''}
          </div>
          <ol class="ot-chain">${(br.nodes || []).map(n => `
            <li>${node(n)}${side(n.side)}</li>`).join('')}
          </ol>
          ${(br.units || []).length ? `
          <div class="ot-units">
            ${br.unitsLabel ? `<p class="ot-label">${esc(br.unitsLabel)}</p>` : ''}
            <ul>${br.units.map(unit).join('')}</ul>
          </div>` : ''}
          ${(br.extras || []).length ? `
          <div class="ot-extras">
            ${br.extrasLabel ? `<p class="ot-label">${esc(br.extrasLabel)}</p>` : ''}
            <ul>${br.extras.map(x => `<li><strong>${esc(x.title)}</strong>${x.note ? `<small>${esc(x.note)}</small>` : ''}</li>`).join('')}</ul>
          </div>` : ''}
        </div>`).join('');
  const t = b.top;
  const top = t ? `
        <div class="ot-top">
          <div class="ot-node is-top">
            <h3 class="ot-title">${esc(t.title)}</h3>
            ${t.note ? `<p class="ot-note">${esc(t.note)}</p>` : ''}
          </div>
          ${t.aside ? `<p class="ot-aside"><span class="ot-arrow" aria-hidden="true">${icon('i-arrow')}</span>${esc(t.aside)}</p>` : ''}
        </div>` : '';
  const d = b.document;
  const doc = d && d.file ? (() => {
    const size = formatFileSize(d.fileSize);
    return `
      <div class="ot-doc">
        ${d.thumb ? `<a class="ot-doc-thumb" href="${esc(d.file)}" target="_blank" rel="noopener noreferrer" data-doc-preview="${esc(d.file)}" data-doc-title="${esc(d.title)}" aria-label="${esc(d.title)}"><img src="${esc(d.thumb)}" alt="" loading="lazy"></a>` : ''}
        <div class="ot-doc-body">
          ${d.heading ? `<p class="ot-label">${esc(d.heading)}</p>` : ''}
          <h3 class="ot-doc-title">${esc(d.title)}</h3>
          ${d.lead ? `<p class="ot-doc-lead">${esc(d.lead)}</p>` : ''}
          <div class="doc-list is-compact ot-doc-list">
            <ul class="doc-items">
              <li class="doc-item is-pdf">
                <span class="doc-icon doc-icon-pdf" aria-hidden="true">${icon('i-file')}<b>PDF</b></span>
                <div class="doc-body">
                  <a class="doc-title" href="${esc(d.file)}" target="_blank" rel="noopener noreferrer">${esc(d.title)}<span class="sr-only"> (${esc(['PDF', size, 'เปิดในแท็บใหม่'].filter(Boolean).join(' '))})</span></a>
                  <div class="doc-meta">${['PDF', size].filter(Boolean).map(esc).join('<span aria-hidden="true"> · </span>')}</div>
                </div>
                <div class="doc-actions">
                  <a class="doc-btn is-primary" href="${esc(d.file)}" target="_blank" rel="noopener noreferrer" data-doc-preview="${esc(d.file)}" data-doc-title="${esc(d.title)}">${icon('i-eye')}<span>เปิดเอกสาร</span><span class="sr-only"> ${esc(d.title)}</span></a>
                  <a class="doc-btn" href="${esc(d.file)}" target="_blank" rel="noopener noreferrer" download>${icon('i-download')}<span>ดาวน์โหลด</span><span class="sr-only"> ${esc(d.title)}</span></a>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>`;
  })() : '';
  return section(b, `
      <div class="ot" data-reveal>${top}
        <div class="ot-branches">${branches}
        </div>
        ${b.legend ? `<p class="ot-legend">${esc(b.legend)}</p>` : ''}
      </div>${doc}`, 'block-org-tree');
}

/* ---------- Block: annotated-figure ----------
   ภาพ + หมุดตัวเลขชี้ส่วนต่าง ๆ ของภาพ คู่กับรายการความหมายของแต่ละส่วน (เช่น เครื่องหมายราชการ)
   ชี้/โฟกัสที่หมุดหรือรายการ = ไฮไลต์คู่กัน (components.js initAnnotated)
   + คำอธิบายฉบับเต็ม 2 ภาษาเคียงกัน (ไม่บังคับ) — โหมดภาษาอังกฤษแสดงเฉพาะฉบับภาษาอังกฤษทางการ
   { image, imageAlt?, parts: [{ title, text?, x, y }],  x / y = ตำแหน่งหมุดเป็น % ของภาพ
     full?: { heading?, th, en, enLabel? } } */
function annotatedFigure(b) {
  const parts = b.parts || [];
  const pins = parts.map((p, i) => `
              <button type="button" class="af-pin" style="--x:${Number(p.x) || 50}%;--y:${Number(p.y) || 50}%;--pin-i:${i}" data-af="${i}" aria-describedby="${esc(b.id || 'af')}-p${i}"><span aria-hidden="true">${i + 1}</span><span class="sr-only">${esc(p.title)}</span></button>`).join('');
  const list = parts.map((p, i) => `
            <li class="af-part" data-af="${i}" id="${esc(b.id || 'af')}-p${i}" tabindex="-1" style="--i:${i}">
              <span class="af-num" aria-hidden="true">${i + 1}</span>
              <div>
                <h3>${esc(p.title)}</h3>
                ${p.text ? `<p>${esc(p.text)}</p>` : ''}
              </div>
            </li>`).join('');
  const f = b.full;
  const full = f && (f.th || f.en) ? `
      <div class="af-full">
        ${f.heading ? `<h3 class="af-full-heading">${esc(f.heading)}</h3>` : ''}
        <div class="af-full-cols">
          ${f.th ? `<div class="af-col is-th"><p class="af-col-label">ภาษาไทย</p><p class="af-col-text">${esc(f.th)}</p></div>` : ''}
          ${f.en ? `<div class="af-col is-en" lang="en" data-i18n-skip><p class="af-col-label">${esc(f.enLabel || 'English')}</p><p class="af-col-text">${esc(f.en)}</p></div>` : ''}
        </div>
      </div>` : '';
  return section(b, `
      <div class="af" data-af-root data-reveal>
        <figure class="af-figure">
          <div class="af-stage">
            <div class="af-canvas">
              <img src="${esc(b.image)}" alt="${esc(b.imageAlt || '')}" loading="lazy">${pins}
            </div>
          </div>
        </figure>
        <ol class="af-parts">${list}
        </ol>
      </div>${full}`, 'block-annotated-figure');
}

function orgChart(b) {
  const tiers = (b.tiers || []).map((t, i) => {
    const roles = (t.roles || []).map(r =>
      `<li><span>${esc(r.role)}</span><b>${esc(r.holder || '')}</b></li>`).join('');
    const kids = (t.children || []).map(c => `<li>${esc(c)}</li>`).join('');
    return `
          <li class="org-tier is-${['deep', 'gold'].includes(t.tone) ? t.tone : 'plain'}" style="--i:${i}">
            <div class="org-node">
              ${t.eyebrow ? `<small>${esc(t.eyebrow)}</small>` : ''}
              <h3>${esc(t.title)}</h3>
              ${roles ? `<ul class="org-roles">${roles}</ul>` : ''}
              ${t.note ? `<p>${esc(t.note)}</p>` : ''}
            </div>
            ${kids ? `<div class="org-kids">${t.childrenLabel ? `<span class="org-kids-label">${esc(t.childrenLabel)}</span>` : ''}<ul style="--n:${(t.children || []).length}">${kids}</ul></div>` : ''}
          </li>`;
  }).join('');
  const cols = (b.columns || []).map(c => `
          <section class="org-col">
            <h3>${esc(c.title)}</h3>
            <ol>${(c.items || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
            ${(c.more || []).length ? `<details class="pillar-more"><summary>${icon('i-file')}<span>อ่านข้อความฉบับเต็ม</span>${icon('i-chevron', 'icon pillar-more-ic')}</summary>
              <div class="pillar-more-body">${c.more.map(p => `<p>${esc(p)}</p>`).join('')}</div></details>` : ''}
          </section>`).join('');
  return section(b, `<ol class="org" data-reveal>${tiers}
        </ol>${cols ? `
        <div class="org-cols">${cols}
        </div>` : ''}`);
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
    // หัวกลุ่มแบบ "หมวด · หัวข้อย่อย" → หมวดเป็นป้ายเล็กสีทองเหนือหัวข้อ (อ่านง่ายขึ้นในแผนผังเว็บไซต์)
    const [sec, sub] = String(g.heading || '').includes(' · ') ? String(g.heading).split(' · ', 2) : ['', g.heading];
    const title = g.href ? `<a href="${esc(g.href)}">${esc(sub)}</a>` : esc(sub);
    return `
            <section class="index-group"${attr('data-index-sec', sec || sub)}>
              <header class="index-group-head">
                ${g.icon ? `<span class="index-group-icon">${icon(g.icon, 'icon-lg')}</span>` : ''}
                <div>
                  ${sec ? `<small class="index-group-sec">${esc(sec)}</small>` : ''}
                  <h3>${title}</h3>
                  ${g.desc ? `<p>${esc(g.desc)}</p>` : ''}
                </div>
              </header>
              <ul class="index-list">${items}
              </ul>
            </section>`;
  }).join('');
  const cols = Math.min(Math.max(Number(b.columns) || 2, 1), 3);
  // ดัชนียาว (≥ 6 กลุ่ม เช่น แผนผังเว็บไซต์): สมุดรายชื่อตามหมวดใหญ่ — แถวละหมวด คั่นเส้น ไม่มีกรอบการ์ด
  // ซ้าย: เลขลำดับทอง + ไอคอน + ชื่อหมวด + จำนวนหน้า · ขวา: กลุ่มย่อยเรียงเป็นคอลัมน์ รายการลิงก์เรียบ ๆ
  // พร้อมช่องค้นหาหน้า + ทางลัดไปหมวด (components.js initPageIndex)
  const big = (b.groups || []).length >= 6;
  if (!big) {
    return section(b, `<div class="page-index index-cols-${cols}">${groups}
        </div>`);
  }
  const secMap = new Map();
  for (const g of b.groups || []) {
    const h = String(g.heading || '');
    const [sec, sub] = h.includes(' · ') ? h.split(' · ', 2) : [h, ''];
    if (!secMap.has(sec)) secMap.set(sec, { name: sec, icon: g.icon, href: '', groups: [] });
    const S = secMap.get(sec);
    if (!sub && g.href) S.href = g.href;
    // แผนผังเว็บไซต์แสดงเฉพาะหน้าที่เปิดได้ — รายการ "รอเนื้อหา" (ชื่อหมวดในเมนูที่ไม่มีหน้าของตัวเอง) ซ้ำกับหัวหมวดด้านล่างอยู่แล้ว
    const items = (g.items || []).filter(it => it && it.href);
    if (items.length) S.groups.push({ sub, items });
  }
  const link = it => {
    const ext = isExternal(it.href);
    if (!it.href) {
      return `<li class="index-item is-pending"><span class="smap-link"><span>${esc(it.title)}</span><small>รอเนื้อหา</small></span></li>`;
    }
    return `<li class="index-item"><a class="smap-link" href="${esc(it.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}><span>${esc(it.title)}</span>${icon(ext ? 'i-external' : 'i-arrow', 'icon smap-go')}${ext ? '<span class="sr-only"> (เปิดในแท็บใหม่)</span>' : ''}</a></li>`;
  };
  const secs = [...secMap.values()];
  const rows = secs.map((S, i) => {
    const total = S.groups.reduce((n, g) => n + g.items.length, 0);
    const name = S.href ? `<a href="${esc(S.href)}">${esc(S.name)}</a>` : esc(S.name);
    return `
          <section class="smap-sec" data-index-sec="${esc(S.name)}">
            <header class="smap-head">
              ${S.icon ? `<span class="smap-icon" aria-hidden="true">${icon(S.icon)}</span>` : ''}
              <div class="smap-title">
                <p class="smap-kicker"><span class="smap-no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><small>${total} หน้า</small></p>
                <h3>${name}</h3>
              </div>
            </header>
            <div class="smap-groups">${S.groups.map(g => `
              <div class="smap-group index-group">
                ${g.sub ? `<h4><span>${esc(g.sub)}</span><small>${g.items.length}</small></h4>` : ''}
                <ul class="smap-list">${g.items.map(link).join('')}</ul>
              </div>`).join('')}
            </div>
          </section>`;
  }).join('');
  const tools = `
        <div class="index-tools">
          <label class="index-search">
            ${icon('i-search')}
            <span class="sr-only">ค้นหาหน้าในเว็บไซต์</span>
            <input type="search" placeholder="ค้นหาหน้าในเว็บไซต์" data-index-search autocomplete="off">
          </label>
          <nav class="index-jump" aria-label="ไปยังหมวด">
            ${secs.map(S => `<button type="button" data-index-jump="${esc(S.name)}">${esc(S.name)}</button>`).join('')}
          </nav>
        </div>`;
  return section(b, `<div class="page-index-wrap smap" data-page-index>${tools}
          <p class="index-empty" data-index-empty hidden>ไม่พบหน้าที่ค้นหา</p>
          <div class="smap-secs" data-reveal>${rows}
          </div>
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

/* ---------- Block: news-media  (ท้ายหน้าข่าว: เอกสารแนบ | ภาพประกอบข่าว — สองคอลัมน์) ---------- */
/* { type, id?, attachments?: [{ title, file, fileType?, fileSize? }],
     images?: [{ image, href?, alt? }] }
   ภาพ: ภาพใหญ่ 1 + ภาพเล็ก 4 · มีมากกว่า 5 ภาพ ช่องสุดท้ายแสดง "+N" — กดภาพใดก็เปิด lightbox เลื่อนดูได้ทุกภาพ
   เอกสาร: ป้ายชนิดไฟล์ · ชื่อ · ชนิด/ขนาด · ปุ่ม "ดูตัวอย่าง" (PDF) และ "ดาวน์โหลด" */
function newsMedia(b) {
  const files = b.attachments || [];
  const imgs = b.images || [];
  if (!files.length && !imgs.length) return '';
  const group = esc(b.id || 'news-gallery');
  const head = (label, n) => `<h2 class="nm-head">${esc(label)} <span class="nm-count">${n}</span></h2>`;

  // เอกสาร: 1 ไฟล์ = การ์ด · ตั้งแต่ 2 ไฟล์ = รายการกะทัดรัดในกรอบเดียว (ปุ่มไอคอนชิดขวา) · เกิน 5 ไฟล์ ซ่อนที่เหลือใต้ "แสดงเอกสารอีก N ไฟล์"
  const many = files.length > 1;
  const fileRow = f => {
    const url = f.file || f.href || '';
    const type = f.fileType || fileTypeOf(url) || 'ไฟล์';
    const meta = [type === 'PDF' ? 'เอกสาร PDF' : `ไฟล์ ${type}`, f.fileSize].filter(Boolean).map(esc).join(' · ');
    const t = esc(f.title);
    const preview = type === 'PDF'
      ? `<button type="button" class="doc-btn" data-doc-preview="${esc(url)}" data-doc-title="${t}"${many ? ' title="ดูตัวอย่าง"' : ''} hidden>${icon('i-eye')}<span${many ? ' class="sr-only"' : ''}>ดูตัวอย่าง</span><span class="sr-only"> ${t}</span></button>`
      : '';
    return `
              <li class="nm-file">
                <span class="nm-file-badge is-${esc(type.toLowerCase())}" aria-hidden="true">${esc(type)}</span>
                <span class="nm-file-text"><strong>${t}</strong><small>${meta}</small></span>
                <span class="nm-file-actions">
                  ${preview}
                  <a class="doc-btn is-primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer" download${many ? ' title="ดาวน์โหลด"' : ''}>${icon('i-download')}<span${many ? ' class="sr-only"' : ''}>ดาวน์โหลด</span><span class="sr-only"> ${t} (เปิดในแท็บใหม่)</span></a>
                </span>
              </li>`;
  };
  const LIMIT = 5;
  const extra = files.slice(LIMIT);
  const fileCol = files.length ? `
          <div class="nm-col nm-files${many ? ' is-many' : ''}">
            ${head('เอกสารแนบ', files.length)}
            <ul>${files.slice(0, LIMIT).map(fileRow).join('')}</ul>
            ${extra.length ? `<details class="nm-files-more">
              <summary>แสดงเอกสารอีก ${extra.length} ไฟล์</summary>
              <ul>${extra.map(fileRow).join('')}</ul>
            </details>` : ''}
          </div>` : '';

  const shown = imgs.slice(0, 5);
  const more = imgs.length - shown.length;
  const tile = (it, i, extra = '') => {
    const img = `<img src="${esc(it.image)}" alt="${esc(it.alt || `ภาพประกอบข่าว ภาพที่ ${i + 1}`)}" loading="lazy">`;
    return it.href
      ? `<a class="nm-tile${i === 0 ? ' is-main' : ''}" href="${esc(it.href)}" data-lightbox="${group}">${img}${extra}<span class="sr-only">ดูภาพขนาดเต็ม</span></a>`
      : `<span class="nm-tile${i === 0 ? ' is-main' : ''}">${img}${extra}</span>`;
  };
  const imgCol = imgs.length ? `
          <div class="nm-col nm-gallery">
            ${head('ภาพประกอบข่าว', imgs.length)}
            <div class="nm-mosaic is-${Math.min(shown.length, 5)}">
              ${shown.map((it, i) => tile(it, i, i === shown.length - 1 && more > 0 ? `<span class="nm-more" aria-hidden="true">+${more}</span>` : '')).join('')}
            </div>
            ${imgs.slice(5).filter(it => it.href).map(it => `<a href="${esc(it.href)}" data-lightbox="${group}" hidden><img src="${esc(it.image)}" alt="${esc(it.alt || '')}"></a>`).join('')}
          </div>` : '';

  return section({ ...b, heading: '', lead: '' }, `<div class="news-media${fileCol && imgCol ? ' is-split' : ''}">${fileCol}${imgCol}</div>`, 'news-media-section');
}

/* ---------- Block: news-related  (ข่าวอื่น ๆ ท้ายหน้าข่าว) ---------- */
/* { type, heading?, eyebrow?, href? (ลิงก์ "ดูทั้งหมด"), items: [{ title, href, image?, category?, publishedAt? }] }
   การ์ดหน้าตาเดียวกับหน้ารวมข่าวและหน้าแรก (ภาพ · ป้ายวันที่ · ชื่อ · ป้ายประเภท | อ่านต่อ) */
function newsRelated(b) {
  const items = (b.items || []).slice(0, 4);
  if (!items.length) return '';
  const cards = items.map(it => {
    const d = parseIsoDate(it.publishedAt);
    // ข่าวเก่าส่วนใหญ่ยังอยู่บนเว็บเดิม — เปิดแท็บใหม่ + บอกผู้ใช้
    const ext = isExternal(it.href);
    const tgt = ext ? ' target="_blank" rel="noopener noreferrer"' : '';
    const thumb = newsCover(it, d);   // ปกแม่แบบเดียวกับรายการข่าว
    return `
            <li class="doc-item news-row">
              <a class="news-row-thumb" href="${esc(it.href)}" tabindex="-1" aria-hidden="true"${tgt}>${thumb}</a>
              ${d ? `<time class="news-row-date" datetime="${esc(it.publishedAt)}" aria-label="${esc(formatThaiDate(it.publishedAt, true))}"><b>${d.d}</b><span>${TH_MONTHS[d.m - 1]} ${String(d.y + 543).slice(-2)}</span></time>` : ''}
              <div class="doc-body"><a class="doc-title" href="${esc(it.href)}"${tgt}>${esc(it.title)}${ext ? '<span class="sr-only"> (เปิดในแท็บใหม่)</span>' : ''}</a></div>
              <div class="news-row-foot">
                ${d ? `<time class="news-row-when" datetime="${esc(it.publishedAt)}">${d.d} ${TH_MONTHS[d.m - 1]} ${d.y + 543}</time>` : it.category ? `<span class="news-row-type">${esc(it.category)}</span>` : '<span></span>'}
                <span class="news-row-go" aria-hidden="true">อ่านต่อ<span class="news-row-go-ic">${icon(ext ? 'i-external' : 'i-arrow')}</span></span>
              </div>
            </li>`;
  }).join('');
  const viewAll = b.href ? `<a class="view-all" href="${esc(b.href)}">ดูทั้งหมด ${icon('i-arrow', 'icon view-all-ic')}</a>` : '';
  return `
    <section class="section alt news-related"${attr('id', b.id)} aria-labelledby="${esc(b.id || 'related')}-h">
      <div class="container">
        <div class="news-related-head">
          <h2 id="${esc(b.id || 'related')}-h">${esc(b.heading || 'ข่าวอื่น ๆ')}</h2>
          ${viewAll}
        </div>
        <div class="doc-list is-news" data-view="grid"><ul class="doc-items">${cards}
        </ul></div>
      </div>
    </section>`;
}

/* ---------- ทะเบียน block ทั้งหมด ---------- */

export const BLOCKS = {
  'page-hero': pageHero,
  'news-media': newsMedia,
  'news-related': newsRelated,
  'anchor-nav': anchorNav,
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
  'person-profile': personProfile,
  'timeline': timeline,
  'pillars': pillars,
  'org-chart': orgChart,
  'image-band': imageBand,
  'org-tree': orgTree,
  'annotated-figure': annotatedFigure,
  'figure': figure,
  'share': share,
  'event-calendar': eventCalendar,
  'photo-album': photoAlbum,
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
            ${sec.href ? `<a class="section-nav-up" href="${esc(sec.href)}">${icon('i-arrow')} ทั้งหมดในหมวด${esc(sec.title)}</a>` : ''}
          </nav>
        </details>
      </aside>`;
}

/**
 * แปลงทั้งหน้า = block ทั้งหมด
 * nav + slug (ไม่บังคับ) = แสดงแถบเมนูย่อยของหมวดข้างเนื้อหา (หน้าย่อย layout แบบสองคอลัมน์)
 * แถบ "ปรับปรุงข้อมูลล่าสุด" ท้ายหน้าถูกเอาออกตามที่ผู้ใช้สั่ง (16 พ.ย. 2569) — ฟิลด์ updatedAt ยังเก็บใน JSON
 * (มาตรฐานเว็บไซต์ภาครัฐ ข้อ 7.1 / 7 Pillars P4.6 ข้อ 10 ให้แสดงวันที่ปรับปรุง — ถ้าจะแสดงอีกครั้ง ให้ใส่กลับที่นี่)
 */
export function renderPage(page, nav = null, slug = '') {
  const updated = '';
  const blocks = page?.blocks || [];
  // แถบเมนูย่อยของหมวด (ซ้ายมือ) แสดงเป็นค่าเริ่มต้น — sideNav: false = หน้าเต็มความกว้าง
  // (ใช้กับหน้าที่ออกแบบใหม่แบบเต็มจอ เช่น หน้าในกลุ่มข้อมูลองค์กร ผู้บริหาร หน้ารวมข่าว)
  const aside = page?.sideNav === false ? '' : sectionNav(page, nav, slug);
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
