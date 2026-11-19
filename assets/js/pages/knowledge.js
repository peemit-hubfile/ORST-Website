/* =============================================================================
   pages/knowledge.js — สคริปต์เฉพาะหน้า คลังองค์ความรู้ของชาติ (knowledge.html)
   -----------------------------------------------------------------------------
   ต้องโหลด "หลัง" assets/js/components.js เสมอ

   รายการทั้งหมดมาจากข้อมูลจริงที่ย้ายจากเว็บเดิม (ไฟล์ JSON ของหน้าย่อย)
   ตั้งค่าหน้า (ประเภท/วิดีโอ/ระบบสืบค้น/คำค้นยอดนิยม) อยู่ที่ content/knowledge-hub.json — ให้ CMS แก้ไฟล์นี้
   ตอนต่อ CMS: เปลี่ยน loadConfig()/loadSources() ให้อ่านจาก endpoint ที่คืนโครงสร้างเดียวกัน

   ความสามารถ
     - แถบประเภทเนื้อหาด้านซ้าย (นับจำนวนจากข้อมูลจริง)
     - ค้นหา (ช่องใน hero + ช่องในรายการ) รองรับเลขไทย/อารบิก
     - เรียงลำดับ, มุมมองตาราง/รายการ (จำค่าไว้ในเบราว์เซอร์), แบ่งหน้า + เลือกจำนวนต่อหน้า
     - สถานะอยู่ใน URL (?cat= &q= &page= &view=) ส่งต่อ/บุ๊กมาร์กได้ — เมนู "องค์ความรู้" ใน header ลิงก์มาด้วย ?cat=
   ============================================================================= */

(() => {   // ห่อทั้งไฟล์ — กันชื่อตัวแปรชนกับ components.js (classic script ใช้ชื่อ icon, esc ฯลฯ เป็น global)

const qs = (s, r = document) => r ? r.querySelector(s) : null;
// โหลด JSON ตามภาษา (ภาษาอังกฤษ: content/pages/en/... ไม่มีค่อยใช้ไฟล์ไทย) — orstI18n ใน components.js
const jsonFor = async path => window.orstI18n ? (await window.orstI18n.fetchJSON(path)).data : (await fetch(path, { cache: 'no-cache' })).json();
const qsa = (s, r = document) => r ? [...r.querySelectorAll(s)] : [];
const reduce = () => document.body.classList.contains('no-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;

/* แหล่งข้อมูล: หน้าย่อยที่มีรายการจริง (block ที่มี items)
   ค่าเริ่มต้น — ปกติถูกแทนที่ด้วย categories ใน content/knowledge-hub.json (ตั้งค่าจาก CMS) */
const DEFAULT_SOURCES = [
  // preview = จำนวนที่แสดงในส่วนของประเภทนั้นบนหน้านี้, kind = รูปแบบ (cards ภาพ / covers ปกหนังสือ / list รายการ)
  { cat: 'infographic', label: 'อินโฟกราฟิก', icon: 'i-eye', page: 'infographics', action: 'ดูภาพ', preview: 8, kind: 'cards' },
  { cat: 'publications', label: 'หนังสือและสิ่งพิมพ์', icon: 'i-book', page: 'publications', action: 'รายละเอียด', preview: 6, kind: 'covers' },
  { cat: 'guidelines', label: 'หลักเกณฑ์ภาษาไทย', icon: 'i-file', page: 'language-guidelines', action: 'อ่านต่อ', preview: 8, kind: 'list' },
  { cat: 'audio', label: 'ข้อมูลเสียงภาษาถิ่น', icon: 'i-megaphone', page: 'ethnic-language-audio', action: 'รายละเอียด', preview: 8, kind: 'list' },
  { cat: 'documents', label: 'เอกสารความรู้เผยแพร่', icon: 'i-database', page: 'knowledge-base', action: 'อ่านต่อ', preview: 8, kind: 'list' },
];
let SOURCES = DEFAULT_SOURCES;
const PER_PAGE = [12, 24, 48];
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const toThai = v => String(v).replace(/[0-9]/g, d => '๐๑๒๓๔๕๖๗๘๙'[d]);
const toArabic = v => String(v).replace(/[๐-๙]/g, d => '๐๑๒๓๔๕๖๗๘๙'.indexOf(d));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (id, cls = 'icon') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"></use></svg>`;
const isImage = href => /\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(href || '');
const hostOf = href => /^https?:/i.test(href || '') ? href.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].replace(/^www\./, '') : '';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* โหมดส่วนตัว — ข้าม */ } },
};

const state = { items: [], meta: {}, cat: 'all', q: '', sort: 'default', view: 'grid', page: 1, per: 12 };

/* ---------- โหลดข้อมูล ---------- */
async function loadSources() {
  const results = await Promise.all(SOURCES.map(async src => {
    try {
      if (src.source === 'videos') {   // วิดีโอ: รายการอยู่ใน knowledge-hub.json เอง
        state.meta[src.cat] = { ...src, description: src.description || '', href: src.href || '#' };
        return HUB.videos.map((v, i) => normalize({ ...v, href: `https://www.youtube.com/watch?v=${v.id}` }, src, i));
      }
      const page = await jsonFor(`content/pages/${src.page}.json`);
      state.meta[src.cat] = { ...src, description: src.description || page.description || '', href: src.href || `${src.page}.html` };
      const block = (page.blocks || []).find(b => ['media-grid', 'document-list', 'card-grid'].includes(b.type) && (b.items || []).length);   // card-grid = หน้ารวมหลักเกณฑ์ภาษาไทย (ลิงก์ไปหน้าเนื้อหาในเว็บ)
      return (block?.items || []).map((it, i) => normalize(it, src, i));
    } catch {
      return [];
    }
  }));
  state.items = results.flat();
}

function normalize(it, src, i) {
  const href = it.file || it.href || (it.youtube ? `https://www.youtube.com/watch?v=${it.youtube}` : '');
  return {
    id: `${src.cat}-${i}`,
    cat: src.cat,
    label: src.label,
    icon: src.icon,
    action: src.action,
    title: it.title || it.alt || '',
    image: it.image || '',
    href,
    date: it.publishedAt || '',
    host: hostOf(href),
    desc: it.body || it.desc || '',
    meta: it.meta || '',
    itemIcon: it.icon || '',
    vid: it.youtube || it.id || '',   // รหัส YouTube (media-grid: youtube)
    tag: it.tag || '',
    order: i,
    search: toArabic(`${it.title || ''} ${it.alt || ''} ${it.body || ''} ${it.desc || ''} ${it.tag || ''} ${src.label}`).toLowerCase(),
  };
}

/* ---------- ตั้งค่าจาก CMS: content/knowledge-hub.json ----------
   ประเภทเนื้อหา (ลำดับ/ชื่อ/ไอคอน/หน่วย), วิดีโอแนะนำ, ระบบสืบค้น, คำค้นยอดนิยม
   ถ้าโหลดไม่ได้ ใช้ DEFAULT_SOURCES ด้านบน (หน้ายังใช้งานได้) */
let HUB = { videos: [], systems: [], popular: [] };

async function loadConfig() {
  try {
    const cfg = await jsonFor('content/knowledge-hub.json');
    if (Array.isArray(cfg.categories) && cfg.categories.length) SOURCES = cfg.categories;
    HUB = { videos: cfg.videos || [], systems: cfg.systems || [], popular: cfg.popular || [] };
  } catch { /* ใช้ค่าเริ่มต้น */ }
}

/* ชิปคำค้นยอดนิยมใน hero — มาจาก config (ไม่มี = คงชุดที่เขียนไว้ใน HTML) */
function renderChips() {
  const box = qs('.kb-chips');
  if (!box || !HUB.popular.length) return;
  box.innerHTML = `<span>ค้นหายอดนิยม</span>${HUB.popular.map(q => `<button type="button" data-query="${esc(q)}">${esc(q)}</button>`).join('')}`;
}

/* ภาพรวมประเภท: การ์ดแต่ละประเภท (ไอคอน · ชื่อ · จำนวนจริง · ภาพตัวอย่าง) กดแล้วเลื่อนไปส่วนนั้น */
function overviewHTML() {
  const cats = SOURCES.map(src => ({ src, list: state.items.filter(it => it.cat === src.cat) })).filter(c => c.list.length);
  const total = cats.reduce((n, c) => n + c.list.length, 0);
  return `
    <section class="kb-overview" aria-labelledby="kb-ov-h">
      <div class="container">
        <div class="kb-ov-card">
          <div class="kb-ov-head">
            <h2 id="kb-ov-h">สำรวจตามประเภท</h2>
            <p>${toThai(total.toLocaleString('en-US'))} รายการ จาก ${toThai(cats.length)} ประเภท</p>
          </div>
          <ul class="kb-ov-grid">${cats.map(({ src, list }) => {
            const thumbs = list.filter(it => it.image).slice(0, 3);
            return `
            <li><a class="kb-ov" href="#kb-${esc(src.cat)}">
              <span class="kb-ov-ic" aria-hidden="true">${icon(src.icon)}</span>
              <span class="kb-ov-text"><strong>${esc(src.label)}</strong><small>${toThai(list.length.toLocaleString('en-US'))} ${esc(src.unit || 'รายการ')}</small></span>
              ${thumbs.length ? `<span class="kb-ov-thumbs" aria-hidden="true">${thumbs.map(t => `<img src="${esc(t.image)}" alt="" loading="lazy">`).join('')}</span>` : ''}
            </a></li>`;
          }).join('')}</ul>
        </div>
      </div>
    </section>`;
}

/* ระบบสืบค้นออนไลน์ (แถบเข้มท้ายหน้า) */
function systemsHTML() {
  if (!HUB.systems.length) return '';
  return `
    <section class="kb-systems" aria-labelledby="kb-systems-h">
      <div class="container">
        <div class="kb-systems-head">
          <h2 id="kb-systems-h">ระบบสืบค้นออนไลน์</h2>
          <p>พจนานุกรม ศัพท์บัญญัติ และฐานข้อมูลคำศัพท์สำหรับค้นคว้าต่อ</p>
        </div>
        <ul class="kb-systems-grid">${HUB.systems.map(s => {
          const ext = /^https?:/i.test(s.href || '');
          return `
          <li><a class="kb-system" href="${esc(s.href || '#')}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>
            <span class="kb-system-ic" aria-hidden="true">${icon(s.icon || 'i-search')}</span>
            <span class="kb-system-text"><strong>${esc(s.title)}</strong>${s.desc ? `<small>${esc(s.desc)}</small>` : ''}</span>
            ${icon(ext ? 'i-external' : 'i-arrow', 'icon kb-system-go')}${ext ? '<span class="sr-only"> (เปิดในแท็บใหม่)</span>' : ''}
          </a></li>`;
        }).join('')}</ul>
      </div>
    </section>`;
}

/* ปุ่มเล่นบนภาพวิดีโอ — กดแล้วเล่นในป๊อปอัป (initVideoPlayer ใน components.js ผ่าน data-yt) */
const PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"></path></svg>';

/* ---------- สถานะ <-> URL ---------- */
function readUrl() {
  const p = new URLSearchParams(location.search);
  const cat = p.get('cat');
  state.cat = SOURCES.some(s => s.cat === cat) ? cat : 'all';   // หมวดเก่าที่ไม่มีแล้ว -> ทั้งหมด
  state.q = p.get('q') || '';
  state.page = Math.max(1, parseInt(p.get('page'), 10) || 1);
  state.view = p.get('view') || store.get('kb-view') || 'grid';
  if (!['grid', 'list'].includes(state.view)) state.view = 'grid';
  const per = parseInt(p.get('per'), 10);
  state.per = PER_PAGE.includes(per) ? per : 12;
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.q && state.page > 1) p.set('page', state.page);
  if (state.q && state.per !== 12) p.set('per', state.per);
  const url = `${location.pathname}${p.toString() ? `?${p}` : ''}${location.hash}`;
  history.replaceState(null, '', url);
}

/* ---------- กรอง/เรียง ---------- */
function filtered() {
  const q = toArabic(state.q.trim()).toLowerCase();
  let list = state.items.filter(it => !q || it.search.includes(q));   // ค้นจากทุกประเภท
  if (state.sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'th'));
  return list;
}

/* ---------- โหมดปกติ: ส่วนละประเภท ----------
   แต่ละส่วนมีสถานะของตัวเอง (หน้า / มุมมอง / คำค้นในส่วน) — สลับตาราง/รายการ และแบ่งหน้าได้ในส่วนนั้นเลย
   รองรับข้อมูลจำนวนมาก (วาดเฉพาะหน้าที่แสดง) */
const SECTION_PER = { cards: 12, covers: 12, list: 10, video: 6, topics: 9 };
const secState = {};

function previewItems(src, items, view) {
  const ext = href => /^https?:/i.test(href || '') && !isImage(href);
  const linkAttrs = href => isImage(href) ? ` data-lightbox="kb-${src.cat}"` : ext(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
  const sr = href => ext(href) ? '<span class="sr-only"> (เปิดในแท็บใหม่)</span>' : '';
  // รายการ (แถว) ใช้การ์ดแบบเดียวกับผลการค้นหาในมุมมอง list
  if (view === 'list' && src.kind !== 'list') {
    return `<div class="kb-grid is-animating" data-view="list">${items.map((it, i) => card(it, i, { showType: false })).join('')}</div>`;
  }
  if (src.kind === 'video') {
    const vcard = (it, i, big) => `
      <a class="kb-video${big ? ' is-feature' : ''}" href="${esc(it.href)}" target="_blank" rel="noopener noreferrer" data-yt="${esc(it.vid)}" data-yt-title="${esc(it.title)}" style="--i:${i}">
        <span class="kb-video-thumb"><img src="${esc(it.image)}" alt="" loading="lazy"><span class="kb-video-play">${PLAY_SVG}</span></span>
        <span class="kb-video-text">${it.tag ? `<small>${esc(it.tag)}</small>` : ''}<strong>${esc(it.title)}</strong></span>
        <span class="sr-only"> (เล่นวิดีโอ)</span>
      </a>`;
    const [first, ...rest] = items;
    return `<div class="kb-videos is-animating">${vcard(first, 0, true)}<div class="kb-video-list">${rest.map((it, i) => vcard(it, i + 1, false)).join('')}</div></div>`;
  }
  if (src.kind === 'topics') {
    return `<div class="kb-topics is-animating">${items.map((it, i) => `
      <a class="kb-topic" href="${esc(it.href || '#')}" style="--i:${Math.min(i, 11)}">
        <span class="kb-topic-ic" aria-hidden="true">${icon(it.itemIcon || src.icon)}</span>
        <strong>${esc(it.title)}</strong>
        ${it.desc ? `<span class="kb-topic-desc">${esc(it.desc)}</span>` : ''}
        <span class="kb-topic-foot"><small>${esc(it.meta || src.action || '')}</small>${icon('i-arrow', 'icon kb-topic-go')}</span>
      </a>`).join('')}</div>`;
  }
  if (src.kind === 'cards') {
    return `<div class="kb-grid kb-grid-preview is-animating" data-view="grid">${items.map((it, i) => card(it, i, { showType: false })).join('')}</div>`;
  }
  if (src.kind === 'covers') {
    return `<div class="kb-covers is-animating">${items.map((it, i) => `
      <a class="kb-cover-card" href="${esc(it.href || '#')}"${linkAttrs(it.href)} style="--i:${Math.min(i, 11)}">
        <span class="kb-cover-img" aria-hidden="true">${it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy">` : ''}</span>
        <strong>${esc(it.title)}</strong>${sr(it.href)}
      </a>`).join('')}</div>`;
  }
  return `<ul class="kb-list is-animating">${items.map((it, i) => {
    const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(it.date);
    return `
      <li style="--i:${Math.min(i, 11)}"><a class="kb-list-row" href="${esc(it.href || '#')}"${linkAttrs(it.href)}>
        <span class="kb-list-ic" aria-hidden="true">${icon(src.icon)}</span>
        <span class="kb-list-text"><strong>${esc(it.title)}</strong>${d ? `<small>${+d[3]} ${TH_MONTHS[+d[2] - 1]} ${+d[1] + 543}</small>` : ''}</span>
        ${icon(ext(it.href) ? 'i-external' : 'i-arrow', 'icon kb-list-go')}${sr(it.href)}
      </a></li>`;
  }).join('')}</ul>`;
}

function sectionPagerHTML(cat, total, page, per) {
  const pages = Math.ceil(total / per);
  if (pages <= 1) return '';
  const from = (page - 1) * per + 1;
  const to = Math.min(total, page * per);
  const btn = (label, p, attrs = '') => `<button type="button" data-sec-page="${p}"${attrs}>${label}</button>`;
  const nums = pageList(pages, page).map(n => n === '…'
    ? '<span class="kb-ellipsis" aria-hidden="true">…</span>'
    : btn(toThai(n), n, n === page ? ' class="kb-num is-current" aria-current="page"' : ` class="kb-num" aria-label="หน้า ${n}"`)).join('');
  return `
    <p class="kb-range">แสดง ${toThai(from)}–${toThai(to)} จาก ${toThai(total.toLocaleString('en-US'))} รายการ</p>
    <div class="kb-pages">
      ${btn(`${icon('i-chevron', 'icon kb-flip')}<span>ก่อนหน้า</span>`, page - 1, `${page === 1 ? ' disabled' : ''} class="kb-step" aria-label="หน้าก่อนหน้า"`)}
      ${nums}
      ${btn(`<span>ถัดไป</span>${icon('i-chevron')}`, page + 1, `${page === pages ? ' disabled' : ''} class="kb-step" aria-label="หน้าถัดไป"`)}
    </div>`;
}

function renderSectionBody(src, { scroll = false } = {}) {
  const st = secState[src.cat];
  const q = toArabic(st.q.trim()).toLowerCase();
  const all = state.items.filter(it => it.cat === src.cat && (!q || it.search.includes(q)));
  const per = SECTION_PER[src.kind] || 12;
  const pages = Math.max(1, Math.ceil(all.length / per));
  st.page = Math.min(Math.max(1, st.page), pages);
  const slice = all.slice((st.page - 1) * per, st.page * per);
  const sec = qs(`#kb-${src.cat}`);
  const body = qs('[data-sec-body]', sec);
  body.innerHTML = slice.length ? previewItems(src, slice, st.view)
    : `<div class="kb-empty"><strong>ไม่พบรายการที่ตรงกับ “${esc(st.q)}”</strong><button type="button" data-sec-clear>ล้างคำค้น</button></div>`;
  const pager = qs('[data-sec-pager]', sec);
  pager.innerHTML = sectionPagerHTML(src.cat, all.length, st.page, per);
  pager.hidden = !pager.innerHTML.trim();
  qs('[data-sec-count]', sec).textContent = `${toThai(all.length.toLocaleString('en-US'))} ${src.unit || 'รายการ'}`;
  qsa('[data-sec-view]', sec).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.secView === st.view)));
  window.orstHeader?.bindDynamicContent?.();   // lightbox ของอินโฟกราฟิกที่เพิ่งวาด
  if (scroll) sec.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
}

function renderSections() {
  const host = qs('#kb-sections');
  if (host.dataset.ready === '1') return;
  host.dataset.ready = '1';
  host.innerHTML = overviewHTML() + SOURCES.map((src, i) => {
    const count = state.items.filter(it => it.cat === src.cat).length;
    if (!count) return '';
    const meta = state.meta[src.cat] || {};
    // หน้านี้แสดงตัวอย่างแบบตารางเท่านั้น — ค้นหา/สลับมุมมองอยู่ที่หน้า "ดูทั้งหมด" ของแต่ละประเภท
    secState[src.cat] = { page: 1, q: '', view: 'grid' };
    return `
      <section class="kb-sec kb-sec-${src.kind}${i % 2 ? ' is-alt' : ''}" id="kb-${src.cat}" aria-labelledby="kb-${src.cat}-h">
        <div class="container">
          <div class="kb-sec-head">
            <div>
              <h2 id="kb-${src.cat}-h">${esc(src.label)}</h2>
              ${meta.description ? `<p>${esc(meta.description)}</p>` : ''}
            </div>
            <div class="kb-sec-meta">
              <span class="kb-sec-count" data-sec-count aria-live="polite"></span>
              ${/^https?:/i.test(meta.href || '')
                ? `<a class="view-all" href="${esc(meta.href)}" target="_blank" rel="noopener noreferrer" aria-label="ดู${esc(src.label)}ทั้งหมด (เปิดในแท็บใหม่)">ดูทั้งหมด ${icon('i-external', 'icon view-all-ic')}</a>`
                : `<a class="view-all" href="${esc(meta.href || '#')}" aria-label="ดู${esc(src.label)}ทั้งหมด">ดูทั้งหมด ${icon('i-arrow', 'icon view-all-ic')}</a>`}
            </div>
          </div>
          <div data-sec-body></div>
          <nav class="kb-pager kb-sec-pager" data-sec-pager aria-label="การแบ่งหน้า ${esc(src.label)}" hidden></nav>
        </div>
      </section>`;
  }).join('') + systemsHTML();

  SOURCES.forEach(src => { if (secState[src.cat]) renderSectionBody(src); });

  // ตัวควบคุมของแต่ละส่วน (event delegation)
  const srcOf = el => SOURCES.find(s => `kb-${s.cat}` === el.closest('.kb-sec')?.id);
  host.addEventListener('click', e => {
    const src = srcOf(e.target);
    if (!src) return;
    const st = secState[src.cat];
    const view = e.target.closest('[data-sec-view]');
    const page = e.target.closest('[data-sec-page]');
    if (view) {
      st.view = view.dataset.secView;
      store.set(`kb-view-${src.cat}`, st.view);
      renderSectionBody(src);
    } else if (page && !page.disabled) {
      st.page = Number(page.dataset.secPage);
      renderSectionBody(src, { scroll: true });
    } else if (e.target.closest('[data-sec-clear]')) {
      st.q = '';
      st.page = 1;
      qs(`#kb-${src.cat} [data-sec-search]`).value = '';
      renderSectionBody(src);
    }
  });
  let timer;
  host.addEventListener('input', e => {
    if (!e.target.matches('[data-sec-search]')) return;
    const src = srcOf(e.target);
    clearTimeout(timer);
    timer = setTimeout(() => {
      secState[src.cat].q = e.target.value;
      secState[src.cat].page = 1;
      renderSectionBody(src);
    }, 200);
  });
}

/* ---------- การ์ด ---------- */
// showType = แสดงป้ายประเภท (ใช้ในผลการค้นหาที่รวมหลายประเภท — ในส่วนของประเภทนั้นเองไม่ต้องแสดงซ้ำ)
function card(it, i, { showType = true } = {}) {
  const lightbox = isImage(it.href);
  const ext = !lightbox && /^https?:/i.test(it.href);
  const video = it.vid ? ` data-yt="${esc(it.vid)}" data-yt-title="${esc(it.title)}"` : '';
  const linkAttrs = (lightbox ? ' data-lightbox="kb"' : ext ? ' target="_blank" rel="noopener noreferrer"' : '') + video;
  const sr = ext ? '<span class="sr-only"> (เปิดในแท็บใหม่)</span>' : '';
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(it.date);
  const date = d ? `<time datetime="${esc(it.date)}">${+d[3]} ${TH_MONTHS[+d[2] - 1]} ${+d[1] + 543}</time>` : '';
  const cover = it.image
    ? `<img src="${esc(it.image)}" alt="" loading="lazy">`
    : `<span class="kb-cover-mark"><img src="assets/images/orst/about/emblem.png" alt="" loading="lazy"><span>${esc(it.label)}</span></span>`;
  return `
    <article class="kb-card is-${it.cat}${it.image ? '' : ' no-image'}" style="--i:${Math.min(i, 11)}">
      <a class="kb-card-link" href="${esc(it.href || '#')}"${linkAttrs}>
        <span class="kb-cover" aria-hidden="true">${cover}</span>
        <span class="kb-body">
          ${showType ? `<span class="kb-meta">${esc(it.label)}</span>` : ''}
          <strong class="kb-title">${esc(it.title)}</strong>
          <span class="kb-foot">
            ${date || '<span></span>'}
            <span class="kb-go">${esc(it.action)}<span class="kb-go-ic">${icon(ext ? 'i-external' : 'i-arrow')}</span></span>
          </span>
        </span>${sr}
      </a>
    </article>`;
}

/* ---------- แบ่งหน้า ---------- */
function pageList(total, cur) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, cur - 1, cur, cur + 1].filter(n => n >= 1 && n <= total));
  const arr = [...set].sort((a, b) => a - b);
  const out = [];
  arr.forEach((n, i) => { if (i && n - arr[i - 1] > 1) out.push('…'); out.push(n); });
  return out;
}

function renderPager(totalItems) {
  const pager = qs('#kb-pager');
  const pages = Math.max(1, Math.ceil(totalItems / state.per));
  if (!totalItems) { pager.hidden = true; return; }
  pager.hidden = false;
  const from = (state.page - 1) * state.per + 1;
  const to = Math.min(totalItems, state.page * state.per);
  const btn = (label, page, { disabled = false, cls = '', aria = '' } = {}) =>
    `<button type="button" class="${cls}" data-page="${page}"${disabled ? ' disabled' : ''}${aria}>${label}</button>`;
  const nums = pageList(pages, state.page).map(n => n === '…'
    ? '<span class="kb-ellipsis" aria-hidden="true">…</span>'
    : btn(toThai(n), n, { cls: 'kb-num' + (n === state.page ? ' is-current' : ''), aria: n === state.page ? ' aria-current="page"' : ` aria-label="หน้า ${n}"` })).join('');
  pager.innerHTML = `
    <p class="kb-range">แสดง ${toThai(from)}–${toThai(to)} จาก ${toThai(totalItems.toLocaleString('en-US'))} รายการ</p>
    <div class="kb-pages">
      ${btn(`${icon('i-chevron', 'icon kb-flip')}${icon('i-chevron', 'icon kb-flip kb-dbl')}<span>หน้าแรก</span>`, 1, { disabled: state.page === 1, cls: 'kb-edge', aria: ' aria-label="หน้าแรก"' })}
      ${btn(`${icon('i-chevron', 'icon kb-flip')}<span>ก่อนหน้า</span>`, state.page - 1, { disabled: state.page === 1, cls: 'kb-step', aria: ' aria-label="หน้าก่อนหน้า"' })}
      ${nums}
      ${btn(`<span>ถัดไป</span>${icon('i-chevron')}`, state.page + 1, { disabled: state.page === pages, cls: 'kb-step', aria: ' aria-label="หน้าถัดไป"' })}
      ${btn(`<span>สุดท้าย</span>${icon('i-chevron')}${icon('i-chevron', 'icon kb-dbl')}`, pages, { disabled: state.page === pages, cls: 'kb-edge', aria: ' aria-label="หน้าสุดท้าย"' })}
    </div>
    <label class="kb-per">แสดงต่อหน้า
      <select data-per>${PER_PAGE.map(n => `<option value="${n}"${n === state.per ? ' selected' : ''}>${toThai(n)}</option>`).join('')}</select>
    </label>`;
  qsa('[data-page]', pager).forEach(b => b.addEventListener('click', () => {
    state.page = Number(b.dataset.page);
    update({ scroll: true });
  }));
  qs('[data-per]', pager).addEventListener('change', e => {
    state.per = Number(e.target.value);
    state.page = 1;
    update({ scroll: true });
  });
}

/* ---------- วาดทั้งหมด ---------- */
function update({ scroll = false } = {}) {
  const searching = Boolean(state.q.trim());
  qs('#kb-results').hidden = !searching;
  qs('#kb-sections').hidden = searching;
  if (!searching) {
    renderSections();
    if (qs('#content-search').value) qs('#content-search').value = '';
    writeUrl();
    window.orstHeader?.bindDynamicContent?.();
    if (scroll) qs('#knowledge-content')?.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
    return;
  }
  const list = filtered();
  const pages = Math.max(1, Math.ceil(list.length / state.per));
  state.page = Math.min(state.page, pages);
  const slice = list.slice((state.page - 1) * state.per, state.page * state.per);

  qs('#kb-title').textContent = 'ผลการค้นหา';
  qs('#result-count').innerHTML = state.q
    ? `พบ <strong>${toThai(list.length.toLocaleString('en-US'))}</strong> รายการ สำหรับ “${esc(state.q)}”`
    : `พบ <strong>${toThai(list.length.toLocaleString('en-US'))}</strong> รายการ`;

  const grid = qs('#knowledge-grid');
  grid.dataset.view = state.view;
  grid.innerHTML = slice.map((it, i) => card(it, i)).join('');
  grid.classList.remove('is-animating');
  if (!reduce()) { void grid.offsetWidth; grid.classList.add('is-animating'); }
  qs('#empty-state').hidden = list.length > 0;

  qsa('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
  if (qs('#content-search').value !== state.q) qs('#content-search').value = state.q;
  renderPager(list.length);
  writeUrl();
  window.orstHeader?.bindDynamicContent?.();   // ผูก lightbox ให้อินโฟกราฟิกที่เพิ่งสร้าง

  if (scroll) qs('#kb-results')?.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
}

/* ---------- ตัวควบคุม ---------- */
function bindControls() {
  const main = qs('#main-search');
  const content = qs('#content-search');
  let timer;

  qs('#hero-search-form')?.addEventListener('submit', e => {
    e.preventDefault();
    state.q = main.value.trim();
    state.page = 1;
    update({ scroll: true });
  });
  qsa('[data-query]').forEach(b => b.addEventListener('click', () => {
    state.q = b.dataset.query;
    main.value = state.q;
    state.page = 1;
    update({ scroll: true });
  }));
  content.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = content.value.trim(); state.page = 1; update(); }, 200);
  });
  qs('#sort-select').addEventListener('change', e => { state.sort = e.target.value; state.page = 1; update(); });
  qsa('[data-view]').forEach(b => b.addEventListener('click', () => {
    state.view = b.dataset.view;
    store.set('kb-view', state.view);
    update();
  }));
  qsa('[data-reset]').forEach(b => b.addEventListener('click', () => {
    state.q = '';
    state.cat = 'all';
    state.page = 1;
    main.value = '';
    update();
  }));
}

async function init() {
  await loadConfig();
  renderChips();
  readUrl();
  qs('#main-search').value = state.q;
  bindControls();
  await loadSources();
  update();
  // ลิงก์จากเมนู ?cat=infographic -> เลื่อนไปส่วนของประเภทนั้น
  if (!state.q && state.cat !== 'all') qs(`#kb-${state.cat}`)?.scrollIntoView({ block: 'start' });
}

init();

})();
