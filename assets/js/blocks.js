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
          ${block.heading ? `<h2>${esc(block.heading)}</h2>` : ''}
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

/* ---------- Block: page-hero ---------- */
/* หัวหน้าเพจ ใช้ได้หน้าละ 1 อันและควรอยู่บนสุด
   { type, heading, lead, eyebrow?, breadcrumb?: [{label, href}], actions?: [],
     image?, imageAlt?, highlights?: [{ icon, label }] }
   image = รูปพื้นหลังเต็มความกว้าง (แนวนอน ≥ 1600px) — มีเงาไล่สีเขียวเข้มด้านซ้ายให้อ่านตัวอักษรได้
           ไม่ใส่ = หัวหน้าเพจแบบเรียบ (พื้นสีอ่อน) เหมือนเดิม
   highlights = จุดเด่นสั้น ๆ ใต้ปุ่ม (ไอคอน + ข้อความ 2-4 คำ) แสดงเฉพาะแบบมีรูป */
function pageHero(b) {
  const crumbs = (b.breadcrumb || []).length
    ? `<nav class="block-breadcrumb" aria-label="เส้นทางหน้า">${b.breadcrumb.map((c, i, arr) =>
        i === arr.length - 1
          ? `<span aria-current="page">${esc(c.label)}</span>`
          : c.href ? `<a href="${esc(c.href)}">${esc(c.label)}</a>` : `<span>${esc(c.label)}</span>`
      ).join(`<span class="crumb-sep" aria-hidden="true">${icon('i-chevron')}</span>`)}</nav>`
    : '';
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

function cardGrid(b) {
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
  return section(b, `<div class="${colsClass(b.columns)}${layout}">
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

function featureList(b) {
  const items = (b.items || []).map(it => {
    const links = (it.links || []).filter(l => l && l.href).map(l => {
      const ext = isExternal(l.href);
      const isEn = /^(tel|mailto):/i.test(l.href) || /^[A-Za-z0-9@._+()\s-]+$/.test(l.label || '');
      return `<a class="block-feature-link" href="${esc(l.href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${icon(l.icon || linkIcon(l.href))}<span${isEn ? ' lang="en"' : ''}>${esc(l.label || l.href)}</span>${ext ? '<span class="sr-only"> (เปิดในแท็บใหม่)</span>' : ''}</a>`;
    }).join('');
    return `
            <li class="block-feature">
              <span class="block-feature-icon">${icon(it.icon || 'i-shield', 'icon-lg')}</span>
              <div>
                <strong>${esc(it.title)}</strong>
                ${it.body ? `<p>${esc(it.body)}</p>` : ''}
                ${links ? `<div class="block-feature-links">${links}</div>` : ''}
              </div>
            </li>`;
  }).join('');
  const foot = b.footnote?.body ? `
        <div class="block-footnote" role="note">
          ${icon('i-shield')}
          <p>${b.footnote.title ? `<strong>${esc(b.footnote.title)}</strong> ` : ''}${esc(b.footnote.body)}</p>
        </div>` : '';
  return section(b, `<ul class="${colsClass(b.columns)} block-feature-list${b.layout === 'cards' ? ' block-feature-cards' : ''}">${items}
        </ul>${foot}`);
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
  // pageSize = แบ่งหน้า + ช่องค้นหา (ใช้ตัวจัดการเดียวกับ document-list: initDocLists ใน components.js)
  const paged = Number(b.pageSize) > 0 && (b.items || []).length > Number(b.pageSize);
  const pg = paged ? ' doc-item' : '';
  const items = (b.items || []).map(it => {
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
  const grid = `<div class="${colsClass(b.columns)} block-media-grid media-ratio-${ratio}${fit}${paged ? ' doc-items' : ''}">
          ${items}
        </div>`;
  if (!paged) return section(b, grid);
  const unit = b.unit || 'รายการ';
  return section(b, `<div class="media-list" data-doc-list data-page-size="${Number(b.pageSize)}" data-unit="${esc(unit)}" data-view-key="media-view">
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
  const row = it => {
    const d = parseIsoDate(it.start);
    const wd = d ? WEEKDAYS[new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay()] : '';
    const multi = it.end && it.end !== it.start;
    return `
              <li class="evcal-item"${attr('data-unit', it.unit)}>
                ${d ? `<time class="evcal-date" datetime="${esc(it.start)}"><small>${wd}</small><b>${d.d}</b></time>` : '<span class="evcal-date"></span>'}
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
              ${units.map(u => `<button type="button" aria-pressed="false" data-unit="${esc(u)}">${esc(u)}</button>`).join('')}
            </div>` : '';
  const embed = b.embed ? String(b.embed) : '';
  const agenda = embed ? embed.replace(/([?&])mode=[A-Z]+/i, '$1').replace(/&+$/, '') + `${embed.includes('?') ? '&' : '?'}mode=AGENDA` : '';
  const open = b.calendarUrl || embed;
  return `
    <section class="section evcal-section"${attr('id', b.id)}>
      <div class="container">${sectionHead(b)}
        <div class="evcal">
          <aside class="evcal-side" aria-labelledby="${esc(b.id || 'evcal')}-list">
            <div class="evcal-side-head">
              <h2 id="${esc(b.id || 'evcal')}-list">${esc(b.listHeading || 'กิจกรรมล่าสุด')}</h2>
              <span class="evcal-count">${all.length} กิจกรรม</span>
            </div>
            ${filters}
            ${items.length ? `<ol class="evcal-list" data-evcal-list>${list}
            </ol>
            <p class="evcal-empty" data-evcal-empty hidden>ไม่มีกิจกรรมของหน่วยงานนี้</p>` : `<p class="evcal-empty">${esc(b.emptyText || 'ยังไม่มีกิจกรรม')}</p>`}
          </aside>
          ${embed ? `
          <div class="evcal-board">
            <div class="evcal-board-head">
              <span class="evcal-board-title">${icon('i-calendar')}${esc(b.boardHeading || 'ปฏิทินออนไลน์')}</span>
              <a class="evcal-open" href="${esc(open)}" target="_blank" rel="noopener noreferrer">${icon('i-external')}<span>เปิดปฏิทินเต็ม</span><span class="sr-only"> (เปิดในแท็บใหม่)</span></a>
            </div>
            <iframe class="evcal-frame is-month" src="${esc(embed)}" title="${esc(b.boardHeading || 'ปฏิทินออนไลน์')}" loading="lazy"></iframe>
            <iframe class="evcal-frame is-agenda" src="${esc(agenda)}" title="${esc(b.boardHeading || 'ปฏิทินออนไลน์')} (กำหนดการ)" loading="lazy"></iframe>
          </div>` : ''}
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
      const thumb = (it.image
        ? `<img src="${esc(it.image)}" alt="" loading="lazy">`
        : newsCover(it, d)) + (type === 'PDF' ? '<span class="news-row-pdf">PDF</span>' : '');
      return `
            <li class="doc-item news-row${it.image ? ' has-image' : ''}"${attr('data-year', it._year)}${attr('data-cat', it.category)}>
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
                ${it.category ? `<span class="news-row-type">${esc(it.category)}</span>` : '<span></span>'}
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
  const pageSize = Number(b.pageSize) || (news ? 12 : 20);
  return section(b, `<div class="doc-list${compact ? ' is-compact' : ''}${news ? ' is-news' : ''}" data-doc-list data-page-size="${pageSize}" data-unit="${unit}"${news ? ' data-view="grid"' : compact ? '' : ' data-view="list" data-view-default="list" data-view-key="doc-file-view"'}>${toolbar}
          ${compact ? '' : `<p class="doc-count" data-doc-count aria-live="polite">พบ ${items.length} ${unit}</p>`}
          <ul class="doc-items" id="${uid}-items">${rows}
          </ul>
          <p class="doc-empty" data-doc-empty hidden>${news ? 'ไม่พบข่าวที่ตรงกับเงื่อนไข' : 'ไม่พบเอกสารที่ตรงกับเงื่อนไข'}</p>
          ${compact ? '' : `<nav class="doc-pager" data-doc-pager aria-label="การแบ่งหน้า" hidden></nav>`}
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
    const thumb = it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy">` : newsCover(it);
    return `
            <li class="doc-item news-row${it.image ? ' has-image' : ''}">
              <a class="news-row-thumb" href="${esc(it.href)}" tabindex="-1" aria-hidden="true"${tgt}>${thumb}</a>
              ${d ? `<time class="news-row-date" datetime="${esc(it.publishedAt)}" aria-label="${esc(formatThaiDate(it.publishedAt, true))}"><b>${d.d}</b><span>${TH_MONTHS[d.m - 1]} ${String(d.y + 543).slice(-2)}</span></time>` : ''}
              <div class="doc-body"><a class="doc-title" href="${esc(it.href)}"${tgt}>${esc(it.title)}${ext ? '<span class="sr-only"> (เปิดในแท็บใหม่)</span>' : ''}</a></div>
              <div class="news-row-foot">
                ${it.category ? `<span class="news-row-type">${esc(it.category)}</span>` : '<span></span>'}
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
  // sideNav: false = หน้าเต็มความกว้าง ไม่มีแถบเมนูย่อยของหมวด (เช่น หน้ารวมข่าวที่มีการ์ดหลายคอลัมน์)
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
