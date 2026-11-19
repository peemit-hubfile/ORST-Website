/* =============================================================================
   components.js — Header / Top bar / Mega menu / Mobile menu / Footer
   -----------------------------------------------------------------------------
   ไฟล์นี้ใช้ร่วมกันทุกหน้า แก้ที่นี่ที่เดียวมีผลทั้งเว็บ

   วิธีทำงาน
     หน้า HTML วางแค่ <div id="app-header"></div> และ <div id="app-footer"></div>
     ไฟล์นี้จะ render HTML ใส่ให้ตอน DOMContentLoaded แล้วผูก event ทั้งหมด
     ส่วน CSS ของ component อยู่ที่ assets/css/components.css (ต้องโหลดท้ายสุด)

   สารบัญ
     icons              คลัง SVG symbol ใช้ผ่านฟังก์ชัน icon('i-book')
     navItems           รายการเมนูหลัก [key, ชื่อที่แสดง, ลิงก์]
                        key ต้องตรงกับ <body data-page="..."> ของแต่ละหน้า
     megaMenuData       เนื้อหา mega menu ของแต่ละหมวด
     renderMegaMenu()   สร้าง HTML ของ mega menu
     renderDesktopNav() / renderDrawer()   (renderDrawer = แผงเมนูมือถือ/แท็บเล็ต)
     renderHeader()     topbar + header + เมนู + modal ค้นหา/การเข้าถึง
     renderFooter()     footer ทั้งหมด
     init*()            ผูก event ต่าง ๆ (ดูรายการใน initComponents ท้ายไฟล์)
     initFixedHeader()  คำนวณความสูง header ที่ position:fixed แล้วดัน body ลงมา
     window.orstHeader  export ออกไปให้หน้าอื่นเรียกใช้ได้
   ============================================================================= */

// รองรับกรณีย้ายหน้าไปไว้ในโฟลเดอร์ย่อยชื่อ pages/ ในอนาคต
// ตอนนี้ทุกหน้าอยู่ที่ root จึงได้ค่า './' เสมอ
const basePath = location.pathname.includes('/pages/') ? '../' : './';

// ลิงก์ไปเว็บไซต์/ระบบของราชบัณฑิตยสภา — ใช้กับปุ่มบน topbar และในเมนูมือถือ (เปิดแท็บใหม่)
// ที่มา: ลิงก์ "ข้อมูลราชบัณฑิตยสภา" ในเมนูของเว็บไซต์เดิม orst.go.th
const ROYAL_SOCIETY_URL = 'https://royalsociety.go.th/';

// ลิงก์แชท Facebook Messenger ของเพจสำนักงาน — ใช้กับปุ่ม "เริ่มแชทใน Messenger" ในการ์ดแชทมุมขวาล่าง (เปิดแท็บใหม่)
// รูปแบบ: https://m.me/<ชื่อผู้ใช้ของเพจ>  (ดูได้จาก URL เพจ facebook.com/<ชื่อผู้ใช้ของเพจ>)
// ที่มา: กล่อง Facebook ของเพจ "ราชบัณฑิตยสภา" (page id 206167399441363) บนเว็บไซต์เดิม orst.go.th
// ใช้ page id เพราะเว็บเดิมไม่ได้ระบุชื่อผู้ใช้ของเพจ — ถ้าหน่วยงานมีชื่อผู้ใช้ เปลี่ยนเป็น https://m.me/<ชื่อผู้ใช้> ได้
const MESSENGER_URL = 'https://m.me/206167399441363';

/* =============================================================================
   สองภาษา TH / EN
   -----------------------------------------------------------------------------
   ภาษาที่เลือก: ?lang=en|th ใน URL (แล้วจำไว้ใน localStorage "orst-lang") — ค่าเริ่มต้น th
   ภาษาอังกฤษมี 2 แหล่ง
     1) หน้า JSON  -> content/pages/en/<slug>.json (โครงเดียวกับไฟล์ไทย) โหลดโดย page-runtime.js / orstI18n.fetchJSON()
                     ไม่มีไฟล์แปล = แสดงภาษาไทย + แถบแจ้ง "This page is available in Thai only"
     2) ข้อความอื่นทั้งหมด (header footer เมนู ปุ่ม หน้า index/knowledge/contact ข้อความที่สคริปต์สร้าง)
                  -> content/i18n/en.json  { "strings": { "ข้อความไทย": "English" }, "patterns": [{ "re", "en" }] }
                     แปลข้อความบนหน้า + attribute (placeholder, aria-label, title, alt) อัตโนมัติ รวมเนื้อหาที่ใส่ทีหลัง (MutationObserver)
   วันที่ไทย (เช่น "2 พ.ย. 2569", "๑๗ สิงหาคม ๒๕๖๓") แปลงเป็นวันที่สากลอัตโนมัติ · ภาษาอังกฤษไม่แปลงเลขไทย
   ข้อความที่ยังไม่มีคำแปล: ดูได้จาก window.orstI18n.missing() ในคอนโซล (ใช้เติม en.json)
   ============================================================================= */
const ORST_LANG = (() => {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'th') {
    try { localStorage.setItem('orst-lang', q); } catch { /* โหมดส่วนตัว */ }
    return q;
  }
  try { return localStorage.getItem('orst-lang') === 'en' ? 'en' : 'th'; } catch { return 'th'; }
})();
document.documentElement.lang = ORST_LANG;
globalThis.ORST_LANG = ORST_LANG;
// ซ่อนหน้าชั่วคราวระหว่างโหลดคำแปล (กันข้อความไทยกะพริบ) — ปลดเองภายใน 2.5 วินาทีเสมอ
if (ORST_LANG === 'en') {
  document.documentElement.classList.add('i18n-pending');
  setTimeout(() => document.documentElement.classList.remove('i18n-pending'), 2500);
}

const I18N = (() => {
  const TH_MON = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const TH_MON_S = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const EN_MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const EN_MON_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const THAI = /[฀-๿]/;
  const toArabic = s => s.replace(/[๐-๙]/g, d => '๐๑๒๓๔๕๖๗๘๙'.indexOf(d));
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const monRe = `(${[...TH_MON, ...TH_MON_S].map(esc).join('|')})`;
  const monIdx = m => { const i = TH_MON.indexOf(m); return i >= 0 ? [i, false] : [TH_MON_S.indexOf(m), true]; };
  const ce = y => { const n = Number(y); return n >= 2400 ? n - 543 : n < 100 ? (n + 2500 - 543) % 100 : n; };
  const yStr = (y, src) => String(ce(y)).padStart(src.length === 2 ? 2 : 0, '0');
  const pad = n => String(n);
  // วันที่ไทย -> สากล: "2 พ.ย. 2569" -> "2 Nov 2026" · "17 สิงหาคม 2563" -> "17 August 2020" · "พ.ย. 69" -> "Nov 26"
  const DATE_RULES = [
    [new RegExp(`(\\d{1,2})\\s*${monRe}\\s*(?:พ\\.ศ\\.\\s*)?(\\d{4}|\\d{2})(?!\\d)`, 'g'),
      (_, d, m, y) => { const [i, s] = monIdx(m); return `${pad(d)} ${(s ? EN_MON_S : EN_MON)[i]} ${yStr(y, y)}`; }],
    [new RegExp(`(\\d{1,2})\\s*${monRe}`, 'g'),
      (_, d, m) => { const [i, s] = monIdx(m); return `${pad(d)} ${(s ? EN_MON_S : EN_MON)[i]}`; }],
    // เดือน + ปี (ไม่มีวัน): ห้ามติดอักษรไทยหรือจุดด้านหน้า — กันคำย่ออื่น เช่น "อ.ก.พ." "ก.ค.ศ." ถูกแปลงเป็นเดือน
    [new RegExp(`(?<![\\u0E00-\\u0E7F.])${monRe}\\s*(?:พ\\.ศ\\.\\s*)?(\\d{4}|\\d{2})(?!\\d)`, 'g'),
      (_, m, y) => { const [i, s] = monIdx(m); return `${(s ? EN_MON_S : EN_MON)[i]} ${yStr(y, y)}`; }],
    // ชื่อเดือนเดี่ยว ๆ: เฉพาะชื่อเต็ม (ชื่อย่อ เช่น ก.พ. ซ้ำกับคำย่อหน่วยงาน)
    [new RegExp(`(?<![\\u0E00-\\u0E7F.])(${TH_MON.map(esc).join('|')})`, 'g'), (_, m) => EN_MON[TH_MON.indexOf(m)]],
    [/พ\.ศ\.\s*(\d{4})/g, (_, y) => String(ce(y))],
    [/(?:ปีงบประมาณ|ปีงบ)\s*(?:พ\.ศ\.\s*)?(\d{4})/g, (_, y) => `Fiscal year ${ce(y)}`],
    [/วัน(อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัสบดี|พฤหัสฯ|ศุกร์|เสาร์)(?:ที่)?\s*/g, (_, d) => `${{ อาทิตย์: 'Sunday', จันทร์: 'Monday', อังคาร: 'Tuesday', พุธ: 'Wednesday', พฤหัสบดี: 'Thursday', 'พฤหัสฯ': 'Thursday', ศุกร์: 'Friday', เสาร์: 'Saturday' }[d]}, `],
  ];

  let dict = { strings: {}, patterns: [] };
  let compiled = [];
  const missing = new Set();

  function translate(raw) {
    if (!raw || !THAI.test(raw)) return raw;
    const lead = raw.match(/^\s*/)[0];
    const tail = raw.match(/\s*$/)[0];
    const core = raw.trim();
    const norm = core.replace(/\s+/g, ' ');
    let out = dict.strings[core] ?? dict.strings[norm] ?? dict.strings[toArabic(norm)];
    if (out == null) {
      let s = toArabic(norm);
      // กฎข้อความที่มีตัวแปร (content/i18n/en.json -> patterns) — ส่วนที่จับได้ (\$1 \$2 …) แปลซ้ำได้อีกชั้น
      for (const [re, en] of compiled) {
        const m = s.match(re);
        if (m) {
          s = en.replace(/\$(\d)/g, (_, i) => { const g = m[+i] ?? ''; return THAI.test(g) ? translate(g) : g; });
          break;
        }
      }
      for (const [re, fn] of DATE_RULES) s = s.replace(re, fn);
      // คำไทยที่เหลือในประโยคยาว: แทนคำ/วลีที่รู้จัก (เรียงยาวไปสั้น) — ใช้กับข้อความผสม เช่น "พบ 12 ข่าว"
      if (THAI.test(s)) {
        out = null;
        missing.add(norm);
        // ถ้าแปลได้บางส่วน (เช่น เฉพาะวันที่) ก็ใช้ส่วนนั้น
        if (s !== toArabic(norm)) out = s;
      } else {
        out = s;
      }
    }
    return out == null ? raw : lead + out + tail;
  }

  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'data-doc-title', 'data-yt-title', 'data-mm-title', 'content'];
  // ไม่แปล: โค้ด ช่องกรอก ส่วนที่ระบุ data-i18n-skip / lang="th" และคำไทยตัวใหญ่บนการ์ดอินโฟกราฟิกหน้าแรก (เป็นตัวคำที่สอน)
  const SKIP = 'script,style,code,pre,textarea,[data-i18n-skip],[lang="th"],.ig-cover';
  // attribute (placeholder / aria-label) แปลได้แม้เป็นช่องกรอก — ข้ามเฉพาะส่วนที่ระบุว่าไม่แปล
  const ATTR_SKIP = 'script,style,[data-i18n-skip],[lang="th"],.ig-cover';

  function translateTree(root) {
    if (!root || ORST_LANG !== 'en') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!THAI.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        const el = node.parentElement;
        return !el || el.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => { const t = translate(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; });
    const els = root.nodeType === 1 ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll?.('*') || []];
    els.forEach(el => {
      if (el.closest(ATTR_SKIP)) return;
      ATTRS.forEach(a => {
        const v = el.getAttribute(a);
        if (v && THAI.test(v)) { const t = translate(v); if (t !== v) el.setAttribute(a, t); }
      });
      // ตัวเลือกใน <select> (ข้อความใน option)
      if (el.tagName === 'OPTION' && THAI.test(el.textContent)) {
        const t = translate(el.textContent);
        if (t !== el.textContent) el.textContent = t;   // เขียนเฉพาะเมื่อเปลี่ยน — กัน MutationObserver วนไม่จบ
      }
    });
  }

  async function load() {
    if (ORST_LANG !== 'en') return;
    try {
      const r = await fetch(`${basePath}content/i18n/en.json`, { cache: 'no-cache' });
      if (r.ok) dict = await r.json();
    } catch { /* ไม่มีไฟล์คำแปล — ใช้เฉพาะการแปลงวันที่ */ }
    dict.strings = dict.strings || {};
    compiled = (dict.patterns || []).map(p => [new RegExp(p.re), p.en]);
  }

  function start() {
    if (ORST_LANG !== 'en') return;
    translateTree(document.body);
    document.title = translate(document.title);
    document.querySelectorAll('meta[name="description"]').forEach(m => m.setAttribute('content', translate(m.getAttribute('content') || '')));
    new MutationObserver(records => {
      const targets = new Set();
      records.forEach(r => {
        if (r.type === 'characterData') targets.add(r.target.parentElement);
        else if (r.type === 'attributes') targets.add(r.target);
        else r.addedNodes.forEach(n => targets.add(n.nodeType === 3 ? n.parentElement : n));
      });
      targets.forEach(el => el && el.isConnected && translateTree(el));
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    document.documentElement.classList.remove('i18n-pending');
  }

  /** โหลด JSON ตามภาษา: ภาษาอังกฤษลอง content/.../en/<file> ก่อน ไม่มีค่อยใช้ไฟล์ไทย — คืน { data, translated } */
  async function fetchJSON(path, opts = { cache: 'no-cache' }) {
    if (ORST_LANG === 'en') {
      // content/pages/<slug>.json -> content/pages/en/<slug>.json · content/{news,people}/<f>.json -> content/en/{news,people}/<f>.json
      // content/<file>.json -> content/en/<file>.json
      const enPath = path
        .replace(/(^|\/)content\/(news|people)\/([^/]+\.json)$/, '$1content/en/$2/$3')
        .replace(/(^|\/)(content\/pages|content)\/(?!en\/)([^/]+\.json)$/, '$1$2/en/$3');
      if (enPath !== path) {
        try {
          const r = await fetch(enPath, opts);
          if (r.ok) return { data: await r.json(), translated: true };
        } catch { /* ใช้ไฟล์ไทย */ }
      }
    }
    const r = await fetch(path, opts);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { data: await r.json(), translated: ORST_LANG !== 'en' };
  }

  /** ลิงก์สลับภาษา: ตั้งค่าแล้วโหลดหน้าเดิมใหม่ */
  function switchTo(lang) {
    try { localStorage.setItem('orst-lang', lang); } catch { /* ข้าม */ }
    const u = new URL(location.href);
    u.searchParams.delete('lang');
    if (lang === 'en') u.searchParams.set('lang', 'en');
    location.href = u.toString();
  }

  return { lang: ORST_LANG, translate, translateTree, load, start, fetchJSON, switchTo, missing: () => [...missing].sort() };
})();
window.orstI18n = I18N;

/* ปุ่มสลับภาษา TH | EN (topbar + เมนูมือถือ) */
function langSwitch(cls = '') {
  const a = (code, label, name) => `<a href="?lang=${code}" data-lang-switch="${code}" lang="${code}" hreflang="${code}"${ORST_LANG === code ? ' aria-current="true"' : ''} aria-label="${name}">${label}</a>`;
  return `<span class="lang-switch ${cls}" role="group" aria-label="Language / ภาษา" data-i18n-skip>${icon('i-globe')}<span class="lang-switch-track">${a('th', 'TH', 'ภาษาไทย')}${a('en', 'EN', 'English')}</span></span>`;
}
document.addEventListener('click', e => {
  const a = e.target.closest('[data-lang-switch]');
  if (!a) return;
  e.preventDefault();
  if (a.dataset.langSwitch !== ORST_LANG) I18N.switchTo(a.dataset.langSwitch);
});


const icons = `
<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4.2-4.2"></path></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"></path></symbol>
  <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="2"></rect><rect x="13.5" y="3.5" width="7" height="7" rx="2"></rect><rect x="3.5" y="13.5" width="7" height="7" rx="2"></rect><rect x="13.5" y="13.5" width="7" height="7" rx="2"></rect></symbol>
  <symbol id="i-list" viewBox="0 0 24 24"><rect x="3" y="4" width="5" height="5" rx="1.5"></rect><rect x="3" y="15" width="5" height="5" rx="1.5"></rect><path d="M11.5 5.5h9.5M11.5 8.5h6M11.5 16.5h9.5M11.5 19.5h6"></path></symbol>
  <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"></path></symbol>
  <symbol id="i-eye" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path><circle cx="12" cy="12" r="3"></circle></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h16"></path></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v4h4"></path><path d="M12 7v5l3 2"></path></symbol>
  <symbol id="i-trend" viewBox="0 0 24 24"><path d="m3 17 6-6 4 4 8-8"></path><path d="M15 7h6v6"></path></symbol>
  <symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></symbol>
  <symbol id="i-user" viewBox="0 0 24 24"><path d="M20 21a8 8 0 1 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></symbol>
  <symbol id="i-access" viewBox="0 0 24 24"><circle cx="12" cy="4" r="2"></circle><path d="M4 8h16"></path><path d="M12 6v16"></path><path d="m8 22 4-10 4 10"></path></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-5"></path></symbol>
  <symbol id="i-people" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></symbol>
  <symbol id="i-file" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></symbol>
  <symbol id="i-video" viewBox="0 0 24 24"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2"></rect></symbol>
  <symbol id="i-form" viewBox="0 0 24 24"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></symbol>
  <symbol id="i-dictionary" viewBox="0 0 24 24"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v19H7.5A2.5 2.5 0 0 1 5 18.5z"></path><path d="M5 18.5A2.5 2.5 0 0 1 7.5 16H20"></path><path d="M9 6h6"></path><path d="M9 10h8"></path></symbol>
  <symbol id="i-database" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"></ellipse><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"></path><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"></path></symbol>
  <symbol id="i-journal" viewBox="0 0 24 24"><path d="M7 3h10a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path><path d="M9 7h6"></path><path d="M9 11h6"></path><path d="M9 15h4"></path></symbol>
  <symbol id="i-ebook" viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M9 7h6"></path><path d="M9 11h6"></path><path d="M9 15h3"></path><path d="M12 19h.01"></path></symbol>
  <symbol id="i-megaphone" viewBox="0 0 24 24"><path d="M3 11v2a2 2 0 0 0 2 2h3l7 4V5l-7 4H5a2 2 0 0 0-2 2z"></path><path d="M19 9a4 4 0 0 1 0 6"></path></symbol>
  <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></symbol>
  <symbol id="i-map" viewBox="0 0 24 24"><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z"></path><path d="M9 3v15"></path><path d="M15 6v15"></path></symbol>
  <symbol id="i-phone" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"></rect><path d="M11 18h2"></path></symbol>
  <symbol id="i-pen" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></symbol>
  <symbol id="i-puzzle" viewBox="0 0 24 24"><path d="M19 13h-2v-2a2 2 0 1 0-4 0v2h-2V9h2V7a2 2 0 1 0-4 0v2H5v10h14Z"></path></symbol>
  <symbol id="i-home" viewBox="0 0 24 24"><path d="M3 11 12 4l9 7"></path><path d="M5 10v10h14V10"></path><path d="M10 20v-6h4v6"></path></symbol>
  <symbol id="i-phone-call" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.7 2.6a2 2 0 0 1-.4 2.1L8.1 9.7a16 16 0 0 0 6.2 6.2l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2z"></path></symbol>
  <symbol id="i-mail" viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path><path d="m22 6-10 7L2 6"></path></symbol>
  <symbol id="i-share" viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="19" r="2.5"></circle><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"></path></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="12" height="12" rx="2.5"></rect><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"></path></symbol>
  <symbol id="i-print" viewBox="0 0 24 24"><path d="M7 8.5V3.5h10v5"></path><rect x="3.5" y="8.5" width="17" height="8" rx="2"></rect><path d="M7 14h10v6.5H7z"></path></symbol>
  <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"></path></symbol>
  <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"></rect><path d="M8 3v4M16 3v4M3.5 10h17"></path></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"></path><circle cx="12" cy="9.5" r="2.5"></circle></symbol>
  <symbol id="i-external" viewBox="0 0 24 24"><path d="M14 4h6v6"></path><path d="M10 14 20 4"></path><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"></path></symbol>
  <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"></path></symbol>
  <symbol id="i-service" viewBox="0 0 24 24"><path d="M12 3l8 4v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7z"></path><path d="M9 12l2 2 4-5"></path></symbol>
</svg>`;

function icon(id, className = 'icon') {
  return `<svg class="${className}" aria-hidden="true"><use href="#${id}"></use></svg>`;
}

const navItems = [
  ['home', 'หน้าหลัก', `${basePath}index.html`],
  ['about', 'เกี่ยวกับเรา', ''],
  ['operations', 'การปฏิบัติราชการ', ''],   // ไม่มีหน้าหมวด — เปิดได้จากเมนูใหญ่/เมนูมือถือเท่านั้น
  ['news', 'ข่าวสารและกิจกรรม', ''],
  ['services', 'บริการวิชาการ', ''],
  ['contact', 'ติดต่อเรา', `${basePath}contact.html`],
];

// ลิงก์ออกนอกเว็บในเมนู: เปิดแท็บใหม่ + บอกผู้ใช้ (ไอคอนเล็ก + ข้อความสำหรับโปรแกรมอ่านหน้าจอ)
const isExtUrl = url => /^https?:\/\//i.test(url);
const extAttrs = url => isExtUrl(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
const extMark = url => isExtUrl(url) ? `<svg class="icon mega-ext" aria-hidden="true"><use href="#i-external"></use></svg><span class="sr-only"> (เปิดในแท็บใหม่)</span>` : '';

// เมนูใหญ่ของแต่ละหมวด — ลำดับตามผังเว็บไซต์ ORST (หมวด 3-7) ตรงกับ page-index ของหน้าหมวดและ content/site-nav.json
// [ชื่อ, ลิงก์] · image = รูปพื้นหลังแผงซ้าย assets/images/menu/<image>.jpg
const megaMenuData = {
  about: {
    title: 'เกี่ยวกับเรา',
    image: 'about',
    description: 'ผู้บริหาร ศูนย์ปฏิบัติการต่อต้านการทุจริต ข้อมูลองค์กร และการบริหารทรัพยากรบุคคลของสำนักงาน',
    groups: [
      {
        heading: 'ผู้บริหาร',
        links: [
          ['ผู้บริหารสำนักงานราชบัณฑิตยสภา', `${basePath}executives.html`],
          ['ผู้บริหารเทคโนโลยีสารสนเทศระดับสูง (CIO)', `${basePath}cio.html`],
          ['การบริหารงานด้านเทคโนโลยีสารสนเทศของ CIO', `${basePath}cio-it-management.html`],
        ]
      },
      {
        heading: 'ศูนย์ปฏิบัติการต่อต้านการทุจริต (ศปท.)',
        links: [
          ['ข้อมูลของ ศปท.', `${basePath}anti-corruption-center.html`],
          ['ช่องทางแจ้งเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ', `${basePath}corruption-complaints.html`],
          ['แนวปฏิบัติการจัดการเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ', `${basePath}complaint-guidelines.html`],
          ['ข้อมูลเชิงสถิติเรื่องร้องเรียนการทุจริตและประพฤติมิชอบ', `${basePath}complaint-statistics.html`],
          ['มาตรการป้องกันการรับสินบน (No Gift Policy)', `${basePath}no-gift-policy.html`],
          ['การประเมินความเสี่ยงและแผนป้องกันการทุจริต', `${basePath}anti-corruption-plan.html`],
          ['จริยธรรมและมาตรการส่งเสริมคุณธรรมและความโปร่งใส', `${basePath}ethics.html`],
        ]
      },
      {
        heading: 'ข้อมูลองค์กร',
        links: [
          ['ประวัติความเป็นมา', `${basePath}history.html`],
          ['วิสัยทัศน์ พันธกิจ', `${basePath}vision-mission.html`],
          ['ค่านิยม', `${basePath}core-values.html`],
          ['โครงสร้างหน่วยงานและการแบ่งส่วนราชการ', `${basePath}organization-structure.html`],
          ['เครื่องหมายราชการ', `${basePath}emblem.html`],
          ['กฎหมาย ระเบียบ และข้อบังคับที่เกี่ยวข้อง', `${basePath}laws-regulations.html`],
          ['อำนาจหน้าที่และภารกิจ', `${basePath}duties.html`],
        ]
      },
      {
        heading: 'บุคลากรและการบริหารทรัพยากรบุคคล',
        links: [
          ['คณะกรรมการวิชาการ และกรรมการอื่น', `${basePath}committees.html`],
          ['นโยบายและแผนการบริหารทรัพยากรบุคคล', `${basePath}hr-plan.html`],
          ['หลักเกณฑ์การบริหารและพัฒนาทรัพยากรบุคคล', `${basePath}hr-criteria.html`],
          ['รายงานผลการบริหารและพัฒนาทรัพยากรบุคคลประจำปี', `${basePath}hr-annual-report.html`],
        ]
      }
    ]
  },
  operations: {
    title: 'การปฏิบัติราชการ',
    image: 'dictionary',
    description: 'แผนปฏิบัติราชการ ผลการปฏิบัติราชการ และข้อมูลเปิดภาครัฐของสำนักงาน',
    groups: [
      {
        heading: 'แผนปฏิบัติราชการ',
        links: [
          ['กฎหมายที่เกี่ยวข้อง', `${basePath}related-laws.html`],
          ['คู่มือหรือมาตรฐานการปฏิบัติงาน', `${basePath}operation-manuals.html`],
          ['แผนยุทธศาสตร์และแผนปฏิบัติการราชการ ๕ ปี', `${basePath}strategic-plans.html`],
          ['แผนปฏิบัติราชการประจำปี', `${basePath}annual-action-plan.html`],
          ['แผนบริหารความต่อเนื่อง', `${basePath}continuity-plan.html`],
          ['แผนแม่บทเทคโนโลยีสารสนเทศ', `${basePath}it-master-plan.html`],
          ['แผนบริหารความเสี่ยง', `${basePath}risk-management-plan.html`],
          ['การลดใช้พลังงานของสำนักงานราชบัณฑิตยสภา', `${basePath}energy-saving.html`],
          ['กฎบัตรการตรวจสอบภายใน', `${basePath}internal-audit-charter.html`],
          ['แผนการดำเนินงานและงบประมาณรายจ่ายประจำปี', `${basePath}annual-budget-plan.html`],
        ]
      },
      {
        heading: 'ผลการปฏิบัติราชการ',
        links: [
          ['คู่มือหรือมาตรฐานการให้บริการ', `${basePath}service-manuals.html`],
          ['ผลการปฏิบัติราชการรายเดือน แยกตามผลผลิตและกิจกรรม', `${basePath}monthly-performance.html`],
          ['มาตรฐานระยะเวลาการให้บริการ', `${basePath}service-time-standards.html`],
          ['สรุปผลการปฏิบัติราชการตามคำรับรองการปฏิบัติราชการ', `${basePath}performance-agreement.html`],
          ['รายงานสรุปผลการวิเคราะห์ต้นทุนต่อหน่วยผลผลิต / งบทดลอง', `${basePath}unit-cost.html`],
          ['แบบรับฟังความคิดเห็น/ข้อเสนอแนะที่มีต่อการดำเนินงาน', 'https://forms.gle/mc1qF9RCDQbvLnho6'],
          ['รายงานการกำกับติดตามการดำเนินงานและการใช้งบประมาณ รอบ ๖ เดือน', `${basePath}six-month-report.html`],
          ['รายงานผลการดำเนินงานประจำปี', `${basePath}annual-report.html`],
          ['รายงานผลการใช้จ่ายงบประมาณประจำปี', `${basePath}budget-spending-report.html`],
          ['ข้อมูลเชิงสถิติการให้บริการ', `${basePath}service-statistics.html`],
          ['รายงานผลการสำรวจความพึงพอใจการให้บริการ', `${basePath}satisfaction-survey.html`],
        ]
      },
      {
        heading: 'ข้อมูลเปิดภาครัฐและการเปิดเผยข้อมูล',
        links: [
          ['ข้อมูลข่าวสารตามพระราชบัญญัติข้อมูลข่าวสารของราชการ พ.ศ. ๒๕๔๐', `${basePath}official-information.html`],
          ['ชุดข้อมูลเปิดภาครัฐ (Open Data)', `${basePath}open-data.html`],
          ['แบบคำขอชุดข้อมูลเปิด', `${basePath}open-data-request.html`],
          ['นโยบายและแผนด้านข้อมูล (ธรรมาภิบาลข้อมูล การเปิดเผยข้อมูล และการคุ้มครองข้อมูลส่วนบุคคล)', `${basePath}data-policy.html`],
          ['การเปิดเผยข้อมูลสาธารณะ (ITA / OIT)', `${basePath}public-disclosure.html`],
          ['ช่องทางยื่นคำขอใช้สิทธิของเจ้าของข้อมูลส่วนบุคคล', `${basePath}data-subject-request.html`],
        ]
      }
    ]
  },
  news: {
    title: 'ข่าวสารและกิจกรรม',
    image: 'news',
    description: 'ข่าวประชาสัมพันธ์ กิจกรรม การบรรยายทางวิชาการ และประกาศต่าง ๆ ของสำนักงาน',
    groups: [
      {
        heading: 'ข่าวประชาสัมพันธ์',
        links: [
          ['ข่าวประชาสัมพันธ์ทั่วไป', `${basePath}general-news.html`],
          ['ข่าวกิจกรรม', `${basePath}activity-news.html`],
          ['การบรรยายทางวิชาการ', `${basePath}academic-lectures.html`],
          ['ปฏิทินกิจกรรม', `${basePath}event-calendar.html`],
          ['คำถาม-คำตอบ (Q&A)', `${basePath}qa.html`],
          ['คลังภาพ', `${basePath}media-gallery.html`],
          ['คลังวิดีโอ', `${basePath}videos.html`],
          ['RSS ข่าวสาร', `${basePath}rss.html`],
        ]
      },
      {
        heading: 'ประกาศ',
        links: [
          ['ประกาศการจัดซื้อจัดจ้าง', `${basePath}procurement-notices.html`],
          ['ประกาศผลจัดซื้อจัดจ้าง', `${basePath}procurement-results.html`],
          ['ประกาศราคากลาง', `${basePath}reference-prices.html`],
          ['สรุปผลการจัดซื้อจัดจ้างรายเดือน (แบบ สขร.1)', `${basePath}procurement-summary.html`],
          ['ประกาศผลการจัดซื้อจัดจ้าง (รายไตรมาส)', `${basePath}procurement-quarterly.html`],
          ['ประกาศแผนจัดซื้อจัดจ้าง', `${basePath}procurement-plans.html`],
          ['ประกาศขายทอดตลาด', `${basePath}auctions.html`],
          ['ประกาศรับสมัครงานและประกาศด้านการบริหารงานบุคคล', `${basePath}job-announcements.html`],
          ['ข่าวสารทางราชการ', `${basePath}official-news.html`],
          ['ประกาศเผยแพร่สัญญา', `${basePath}contracts.html`],
        ]
      }
    ]
  },
  services: {
    title: 'บริการวิชาการ',
    image: 'knowledge',
    description: 'พจนานุกรม ฐานข้อมูลภาษาไทย คลังความรู้ และงานบริการออนไลน์ของสำนักงาน',
    groups: [
      {
        heading: 'ฐานข้อมูลและคลังความรู้',
        links: [
          ['พจนานุกรม', 'https://dictionary.orst.go.th/'],
          ['ศัพท์บัญญัติ', 'https://coined-word.orst.go.th/'],
          ['สารานุกรมและอนุกรมวิธาน', 'https://lst.nectec.or.th/encyclopedia/'],
          ['คลังเอกสารเก่า', 'https://da3.thaidlt.org/'],
          ['ระบบฐานข้อมูลคำทับศัพท์', 'https://transliteration.orst.go.th/search'],
          ['อักขรานุกรมภูมิศาสตร์ไทย', 'https://gazetteer.orst.go.th/'],
          ['คลังความรู้', `${basePath}knowledge-base.html`],
        ]
      },
      {
        heading: 'สื่อความรู้และหลักเกณฑ์',
        links: [
          ['ขั้นตอนการสั่งซื้อหนังสือและวิธีการชำระเงิน', `${basePath}book-ordering.html`],
          ['อินโฟกราฟิก', `${basePath}infographics.html`],
          ['ระบบทดสอบความรู้ด้านภาษาไทย', 'https://etest.orst.go.th/'],
          ['พจนานุกรมภาษามือไทย', 'http://164.115.33.116/'],
          ['หลักเกณฑ์ต่าง ๆ', `${basePath}language-guidelines.html`],
          ['ข้อมูลเสียง คู่มือระบบเขียนภาษาท้องถิ่นของกลุ่มชาติพันธุ์ด้วยอักษรไทย', `${basePath}ethnic-language-audio.html`],
        ]
      },
      {
        heading: 'งานบริการออนไลน์',
        links: [
          ['งานบริการ (E-Service)', `${basePath}e-services.html`],
          ['คู่มือสำหรับประชาชน', `${basePath}citizen-manual.html`],
          ['ดาวน์โหลดแบบฟอร์ม', `${basePath}download-forms.html`],
          ['ประกาศช่องทางอิเล็กทรอนิกส์ในการติดต่อราชการ', `${basePath}e-channels.html`],
          ['ข้อมูลการอนุญาตที่ดำเนินการแล้ว', `${basePath}permits-issued.html`],
          ['ติดตามสถานะคำขอรับบริการ', `${basePath}track-request.html`],
          ['คำแนะนำการใช้บริการออนไลน์', `${basePath}e-service-guide.html`],
        ]
      }
    ]
  },
  contact: {
    title: 'ติดต่อเรา',
    image: 'services',
    description: 'ช่องทางติดต่อ ร้องเรียน แบบฟอร์มสอบถาม และเครือข่ายสังคมออนไลน์ของสำนักงาน',
    featured: ['ข้อมูลติดต่อและแผนที่', `${basePath}contact.html`],
    groups: [
      {
        heading: 'ติดต่อเรา',
        links: [
          ['รับเรื่องร้องเรียน ร้องทุกข์ และติดตามสถานะ', `${basePath}complaints.html`],
          ['แบบฟอร์มติดต่อสอบถามและข้อเสนอแนะ (e-Form)', `${basePath}contact.html#message-form`],
          ['แบบสำรวจความพึงพอใจการใช้งานเว็บไซต์', `${basePath}website-survey.html`],
          ['เครือข่ายสังคมออนไลน์ (Social Media)', `${basePath}social-media.html`],
        ]
      }
    ]
  }
};

// หน้าที่เปิดอยู่ (ชื่อไฟล์) — ใช้ไฮไลต์ลิงก์ในเมนูใหญ่/เมนูมือถือ และหาหมวดของหน้า
const HERE_FILE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
const isHereUrl = url => !isExtUrl(url) && String(url).split(/[?#]/)[0].split('/').pop().toLowerCase() === HERE_FILE
  && !String(url).includes('#');
// หมวดของหน้า: ถ้าหน้านี้อยู่ในเมนูใหญ่ของหมวดใด ใช้หมวดนั้น (เช่น หน้าในหมวด 4 การปฏิบัติราชการ)
// ไม่อยู่ในเมนูไหน ใช้ data-page ของหน้า — navKey เดิมที่ไม่มีในเมนูหลักแล้ว (พจนานุกรม องค์ความรู้ สิ่งพิมพ์) อยู่ใต้บริการวิชาการ
const NAV_ALIAS = { dictionary: 'services', knowledge: 'services', publications: 'services' };
function activeNavKey() {
  for (const [key, data] of Object.entries(megaMenuData)) {
    if (data.featured && isHereUrl(data.featured[1])) return key;
    if (data.groups.some(g => g.links.some(([, url]) => isHereUrl(url)))) return key;
  }
  const page = document.body.dataset.page || 'home';
  return NAV_ALIAS[page] || page;
}

/* เมนูใหญ่ (megax) — แผงเต็มความกว้างใต้ header
   ซ้าย: ชื่อหมวด + คำอธิบาย + ปุ่มดูทั้งหมด แล้วตามด้วยหัวข้อย่อยของหมวด (ระดับ 3 ในผังเว็บไซต์)
   ขวา: รายการของหัวข้อที่เลือก เป็นแถวใน 2 คอลัมน์กว้าง — ชื่อยาวก็ไม่ตกบรรทัดถี่
   ชี้/โฟกัส/ลูกศรขึ้นลงที่หัวข้อเพื่อสลับ · เปิดมาที่หัวข้อของหน้าที่เปิดอยู่ (ถ้ามี) */
function renderMegaMenu(key) {
  const data = megaMenuData[key];
  if (!data) return '';
  const single = data.groups.length === 1;
  const curGroup = Math.max(0, data.groups.findIndex(g => g.links.some(([, url]) => isHereUrl(url))));

  const tabs = single ? '' : `
          <div class="megax-tabs" role="tablist" aria-orientation="vertical" aria-label="หัวข้อในหมวด${data.title}">
            ${data.groups.map((g, i) => `
            <button class="megax-tab" type="button" role="tab" id="megax-tab-${key}-${i}" aria-controls="megax-panel-${key}-${i}"
              aria-selected="${i === curGroup}" tabindex="${i === curGroup ? 0 : -1}" data-megax-tab="${i}">
              <span>${g.heading}</span>${icon('i-chevron', 'icon megax-tab-go')}
            </button>`).join('')}
          </div>`;

  const panels = data.groups.map((g, i) => `
          <section class="megax-panel${i === curGroup ? ' is-active' : ''}"${single ? '' : ` role="tabpanel" id="megax-panel-${key}-${i}" aria-labelledby="megax-tab-${key}-${i}"`} data-megax-panel="${i}">
            <p class="megax-panel-head">${single ? data.title : g.heading}</p>
            <ul class="megax-list" style="--rows:${Math.ceil(g.links.length / 2)}">
              ${g.links.map(([text, url], k) => {
                const cur = isHereUrl(url);
                // แถวสุดท้ายของแต่ละคอลัมน์ ไม่มีเส้นคั่นด้านล่าง
                const rows = Math.ceil(g.links.length / 2);
                const end = k === rows - 1 || k === g.links.length - 1;
                return `<li${end ? ' class="is-col-end"' : ''}><a class="megax-row${cur ? ' is-current' : ''}" href="${url}"${extAttrs(url)}${cur ? ' aria-current="page"' : ''}><span>${text}${extMark(url)}</span>${icon(isExtUrl(url) ? 'i-external' : 'i-arrow', 'icon megax-go')}</a></li>`;
              }).join('')}
            </ul>
          </section>`).join('');

  return `
    <div class="megax" role="region" aria-label="เมนูย่อย ${data.title}">
      <div class="megax-in">
        <div class="megax-side">
          <img class="megax-mark" src="${basePath}assets/images/orst-emblem.png" alt="" aria-hidden="true" width="181" height="320" loading="lazy">
          <div class="megax-intro">
            <p class="megax-eyebrow">สำนักงานราชบัณฑิตยสภา</p>
            <p class="megax-title">${data.title}</p>
            <p class="megax-desc">${data.description}</p>
          </div>${tabs}
        </div>
        <div class="megax-panels">${panels}
        </div>
      </div>
    </div>
  `;
}

/* สลับหัวข้อในเมนูใหญ่ — ชี้เมาส์ (หน่วงเล็กน้อย กันสลับเองตอนลากเมาส์ทแยง) / โฟกัส / ลูกศรขึ้นลง Home End / ลูกศรขวาเข้ารายการ */
function bindMegaTabs(root) {
  const tabs = [...root.querySelectorAll('[data-megax-tab]')];
  const panels = [...root.querySelectorAll('[data-megax-panel]')];
  if (tabs.length < 2) return;
  let timer;
  const select = (i, focus = false) => {
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === i));
      t.tabIndex = k === i ? 0 : -1;
      panels[k].classList.toggle('is-active', k === i);
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('mouseenter', () => { clearTimeout(timer); timer = setTimeout(() => select(i), 80); });
    t.addEventListener('mouseleave', () => clearTimeout(timer));
    t.addEventListener('click', () => select(i));
    t.addEventListener('focus', () => select(i));
    t.addEventListener('keydown', e => {
      const last = tabs.length - 1;
      const next = { ArrowDown: i === last ? 0 : i + 1, ArrowUp: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
      if (next !== undefined) { e.preventDefault(); select(next, true); }
      if (e.key === 'ArrowRight') { e.preventDefault(); panels[i].querySelector('a')?.focus(); }
    });
  });
}

function renderDesktopNav(active) {
  return navItems.map(([key, label, href]) => {
    const hasMega = Boolean(megaMenuData[key]);
    const classes = `${active === key ? 'active' : ''}`.trim();

    if (hasMega) {
      return `
        <a class="${classes}" href="${href || '#'}" data-mega="${key}"${href ? '' : ' data-no-hub role="button"'} aria-haspopup="true" aria-expanded="false">
          ${label}<span class="nav-caret" aria-hidden="true">
  <svg viewBox="0 0 20 20">
    <path d="M5.5 7.5 10 12l4.5-4.5"></path>
  </svg>
</span>
        </a>
      `;
    }

    return `<a class="${classes}" href="${href}">${label}</a>`;
  }).join('');
}

// ไอคอนของแต่ละเมนู ใช้ในแผงเมนูมือถือ/แท็บเล็ต
const navIcons = {
  home: 'i-home',
  dictionary: 'i-dictionary',
  knowledge: 'i-book',
  news: 'i-megaphone',
  services: 'i-service',
  about: 'i-shield',
  operations: 'i-journal',
  contact: 'i-phone',
};

/* แผงเมนูสำหรับจอ <= 1365px (เลื่อนเข้าจากขวา) — ถูกวางไว้ท้าย <body>
   ไม่ใส่ไว้ใน .site-header เพราะ backdrop-filter ของ header ทำให้ position:fixed
   ข้างในไม่อิงกับหน้าจอ */
function renderDrawer(active) {
  // ลิงก์ของหน้าที่เปิดอยู่ — ไฮไลต์ในเมนูย่อย (ผู้ใช้รู้ว่าอยู่ตรงไหน)
  const isHere = isHereUrl;
  const items = navItems.map(([key, label, href]) => {
    const data = megaMenuData[key];
    const isActive = active === key;
    const ico = `<span class="drawer-ico">${icon(navIcons[key] || 'i-book')}</span>`;

    if (!data) {
      return `
        <li>
          <a class="drawer-item${isActive ? ' is-active' : ''}" href="${href}"${isActive ? ' aria-current="page"' : ''}>
            ${ico}<span class="drawer-label">${label}</span>${icon('i-chevron', 'icon drawer-chev')}
          </a>
        </li>`;
    }

    // หมวดของหน้าที่เปิดอยู่ กางเมนูย่อยไว้ตั้งแต่แรก
    return `
      <li>
        <button class="drawer-item${isActive ? ' is-active' : ''}" type="button" data-drawer-sub
          aria-expanded="${isActive}" aria-controls="drawer-sub-${key}">
          ${ico}<span class="drawer-label">${label}</span>${icon('i-chevron', 'icon drawer-chev')}
        </button>
        <div class="drawer-sub${isActive ? ' is-open' : ''}" id="drawer-sub-${key}">
          <div class="drawer-sub-inner">
            <div class="drawer-sub-body">
              ${data.groups.map(group => {
                // หัวข้อย่อยพับ/กางได้ — กางไว้เมื่อมีหน้าที่เปิดอยู่ หรือหมวดมีหัวข้อเดียว
                const open = data.groups.length === 1 || group.links.some(([, url]) => isHere(url));
                return `
                <details class="drawer-sub-group"${open ? ' open' : ''}>
                  <summary class="drawer-sub-title"><span>${group.heading}</span>${icon('i-chevron', 'icon drawer-sub-chev')}</summary>
                  <div class="drawer-sub-links">
                  ${group.links.map(([text, url]) => {
                    const cur = isHere(url);
                    return `<a class="drawer-sub-link${cur ? ' is-current' : ''}" href="${url}"${extAttrs(url)}${cur ? ' aria-current="page"' : ''}><span>${text}${extMark(url)}</span>${isExtUrl(url) ? '' : icon('i-chevron', 'icon drawer-sub-go')}</a>`;
                  }).join('')}
                  </div>
                </details>`;
              }).join('')}
            </div>
          </div>
        </div>
      </li>`;
  }).join('');

  return `
    <div class="drawer" id="site-drawer" hidden>
      <div class="drawer-backdrop" data-drawer-close></div>
      <div class="drawer-panel" role="dialog" aria-modal="true" aria-label="เมนูหลัก">
        <div class="drawer-head">
          <a class="drawer-brand" href="${basePath}index.html" aria-label="สำนักงานราชบัณฑิตยสภา หน้าแรก">
            <img src="${basePath}assets/images/orst-emblem.png" alt="" aria-hidden="true" width="181" height="320">
            <span><span class="drawer-brand-th">สำนักงานราชบัณฑิตยสภา</span><span class="drawer-brand-en" lang="en">Office of the Royal Society</span></span>
          </a>
          <button class="drawer-close" type="button" data-drawer-close aria-label="ปิดเมนู">${icon('i-x')}</button>
        </div>
        <button class="drawer-search" type="button" data-open-search>
          ${icon('i-search')}<span>ค้นหาคำศัพท์ บทความ หรือบริการ…</span>
        </button>
        <nav aria-label="เมนูนำทาง">
          <ul class="drawer-list">${items}</ul>
        </nav>
        <div class="drawer-foot">
          <div class="drawer-contact" aria-label="ติดต่อสำนักงาน">
            <a class="drawer-contact-btn" href="tel:021411718">${icon('i-phone-call')}<span>โทร 0 2141 1718</span></a>
            <a class="drawer-contact-btn" href="mailto:saraban@orst.go.th">${icon('i-mail')}<span>ส่งอีเมล</span></a>
          </div>
          <div class="drawer-links">
            ${langSwitch('is-drawer')}
            <a class="drawer-ext" href="${ROYAL_SOCIETY_URL}" target="_blank" rel="noopener noreferrer">ราชบัณฑิตยสภา ${icon('i-external')}<span class="sr-only">(เปิดในแท็บใหม่)</span></a>
          </div>
        </div>
      </div>
    </div>`;
}

function renderHeader() {
  const active = activeNavKey();

  return `
    ${icons}
    <a class="skip-link" href="#main-content">ข้ามไปยังเนื้อหาหลัก</a>
    <div class="topbar">
      <div class="container topbar-inner">
        <!-- ปุ่มช่วยการเข้าถึง (ขนาดตัวอักษร/ความคมชัด) อยู่ที่ปุ่มลอย "ช่วยการเข้าถึง" มุมขวาล่าง -->
        <div class="topbar-group topbar-right">
          <a class="topbar-ext" href="${ROYAL_SOCIETY_URL}" target="_blank" rel="noopener noreferrer">ราชบัณฑิตยสภา ${icon('i-external')}<span class="sr-only">(เปิดในแท็บใหม่)</span></a>
          <a href="${basePath}contact.html">ติดต่อเรา</a>
          ${langSwitch()}
        </div>
      </div>
    </div>
    <header class="site-header" id="site-header">
      <div class="container header-inner">
        <a class="brand brand-image" href="${basePath}index.html" aria-label="สำนักงานราชบัณฑิตยสภา หน้าแรก">
          <img src="${basePath}assets/images/orst-emblem.png" alt="" aria-hidden="true" class="brand-emblem" width="181" height="320">
          <span class="brand-text">
            <span class="brand-text-th">สำนักงานราชบัณฑิตยสภา</span>
            <span class="brand-text-en" lang="en">Office of the Royal Society</span>
          </span>
        </a>
        <nav class="main-nav" aria-label="เมนูหลัก">
          ${renderDesktopNav(active)}
        </nav>
        <div class="header-actions">
          <button class="round-btn" type="button" data-open-search aria-label="ค้นหา">${icon('i-search')} <span>ค้นหา</span></button>
          <button class="mobile-menu-btn" type="button" aria-expanded="false" aria-controls="site-drawer" aria-haspopup="dialog" data-drawer-open>
            <span></span><span></span><span></span><span class="sr-only">เปิดเมนู</span>
          </button>
        </div>
        <div class="mega-menu mega-a" id="mega-menu" hidden></div>
      </div>
    </header>
  `;
}

// function renderFooter() {
  // หัวคอลัมน์: เส้นทองสั้น + ชื่อไทย + ชื่ออังกฤษ
  const colHead = (th, en) => `<h3 class="orst-footer-head"><span>${th}</span><small lang="en">${en}</small></h3>`;
//   return `
//     <footer class="footer" id="footer">
//       <div class="container footer-grid">
//         <div>
//           <h3>ติดตามข่าวสารและองค์ความรู้ใหม่</h3>
//           <p>ไม่พลาดข่าวสาร กิจกรรม และองค์ความรู้จากราชบัณฑิตยสภา</p>
//           <form class="newsletter" onsubmit="return false">
//             <input type="email" placeholder="อีเมลของคุณ" aria-label="อีเมลสำหรับรับข่าวสาร">
//             <button class="round-btn primary" type="button">สมัครรับข่าวสาร</button>
//           </form>
//         </div>
//         <div>
//           <h3>ลิงก์ด่วน</h3>
//           <ul>
//             <li><a href="${basePath}dictionary.html">พจนานุกรม</a></li>
//             <li><a href="${basePath}knowledge.html">คลังความรู้</a></li>
//             <li><a href="${basePath}publications.html">สื่อสิ่งพิมพ์</a></li>
//             <li><a href="${basePath}news.html">ข่าวและประกาศ</a></li>
//           </ul>
//         </div>
//         <div>
//           <h3>บริการยอดนิยม</h3>
//           <ul>
//             <li><a href="${basePath}services.html">สอบถามข้อมูลทางวิชาการ</a></li>
//             <li><a href="${basePath}services.html">ขออนุญาตจัดพิมพ์</a></li>
//             <li><a href="${basePath}services.html">ร้องเรียน / เสนอแนะ</a></li>
//             <li><a href="${basePath}services.html">คำถามที่พบบ่อย</a></li>
//           </ul>
//         </div>
//         <div>
//           <h3>ติดต่อเรา</h3>
//           <p>สำนักงานราชบัณฑิตยสภา<br>เลขที่ ๑๒๐ หมู่ ๓ ศูนย์ราชการเฉลิมพระเกียรติ ๘๐ พรรษา ๕ ธันวาคม ๒๕๕๐ (อาคารซี) ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร ๑๐๒๑๐</p>
//           <p>โทรศัพท์: 0 2141 1718<br>อีเมล: saraban@orst.go.th</p>
//         </div>
//       </div>
//       <div class="container footer-bottom">
//         <span>© 2569 สำนักงานราชบัณฑิตยสภา</span>
//         <span>นโยบายความเป็นส่วนตัว · เงื่อนไขการใช้งาน · แผนผังเว็บไซต์</span>
//       </div>
//     </footer>

//     <button class="access-float" type="button" data-open-access>${icon('i-access')} ช่วยการเข้าถึง</button>

//     <div class="modal" id="search-modal" hidden role="dialog" aria-modal="true" aria-labelledby="search-title">
//       <div class="modal-backdrop" data-close-modal></div>
//       <div class="modal-card">
//         <div class="modal-header">
//           <h2 id="search-title">ค้นหาองค์ความรู้</h2>
//           <button class="modal-close" type="button" data-close-modal aria-label="ปิด">×</button>
//         </div>
//         <div class="modal-body">
//           <form class="shared-search-form" id="shared-search-form">
//             <input id="shared-search-input" type="search" placeholder="ค้นหาคำศัพท์ บทความ หนังสือ หรือบริการ...">
//             <button type="submit" aria-label="ค้นหา">${icon('i-search')}</button>
//           </form>
//           <div class="search-results" id="shared-search-results" aria-live="polite"></div>
//         </div>
//       </div>
//     </div>

//     <div class="modal" id="access-modal" hidden role="dialog" aria-modal="true" aria-labelledby="access-title">
//       <div class="modal-backdrop" data-close-modal></div>
//       <div class="modal-card">
//         <div class="modal-header">
//           <h2 id="access-title">เครื่องมือช่วยการเข้าถึง</h2>
//           <button class="modal-close" type="button" data-close-modal aria-label="ปิด">×</button>
//         </div>
//         <div class="modal-body">
//           <div class="tool-grid">
//             <button type="button" data-font="plus">ก+ เพิ่มตัวอักษร</button>
//             <button type="button" data-font="minus">ก- ลดตัวอักษร</button>
//             <button type="button" data-font="reset">ก ขนาดปกติ</button>
//             <button type="button" data-contrast>สีตัดกันสูง</button>
//             <button type="button" data-readable>โหมดอ่านง่าย</button>
//             <button type="button" data-motion>หยุดเคลื่อนไหว</button>
//           </div>
//         </div>
//       </div>
//     </div>
//   `;
// }


/* =============================================================================
   ปุ่มแชท Facebook Messenger (ลอยมุมขวาล่าง เหนือปุ่ม "ช่วยการเข้าถึง")
   หน่วยงานมีช่องทางแชทเฉพาะ Facebook — กดปุ่มแล้วเปิดการ์ดเล็กก่อน
   (บอกว่าจะไปที่ Messenger + ทางเลือกอื่น) แทนการเด้งออกนอกเว็บทันที
   ไอคอน: โลโก้ Messenger แบบทางการ (ฟองคำพูด + สายฟ้าเจาะทะลุ) ใช้ fill-rule evenodd
   ============================================================================= */
const MESSENGER_GLYPH = `
  <svg class="chat-glyph" viewBox="0 0 24 24" aria-hidden="true">
    <path fill-rule="evenodd" d="M.001 11.639C.001 4.949 5.241 0 12.001 0S24 4.95 24 11.639c0 6.689-5.24 11.638-12 11.638-1.21 0-2.38-.16-3.47-.46a.96.96 0 0 0-.64.05l-2.39 1.05a.96.96 0 0 1-1.35-.85l-.07-2.14a.97.97 0 0 0-.32-.68A11.39 11.39 0 0 1 .002 11.64zm8.32-2.19-3.52 5.6c-.35.53.32 1.139.82.75l3.79-2.87c.26-.2.6-.2.87 0l2.8 2.1c.84.63 2.04.4 2.6-.48l3.52-5.6c.35-.53-.32-1.13-.82-.75l-3.79 2.87c-.25.2-.6.2-.86 0l-2.8-2.1a1.8 1.8 0 0 0-2.61.48z"/>
  </svg>`;

function renderChat() {
  return `
    <div class="chat-widget" data-chat>
      <div class="chat-panel" id="chat-panel" role="dialog" aria-labelledby="chat-title" hidden>
        <div class="chat-panel-head">
          <span class="chat-avatar">
            <img src="${basePath}assets/images/orst-emblem.png" alt="" width="181" height="320" loading="lazy">
          </span>
          <span class="chat-panel-title">
            <strong id="chat-title">สำนักงานราชบัณฑิตยสภา</strong>
            <small>แชทผ่าน Facebook Messenger</small>
          </span>
          <button class="chat-close" type="button" data-chat-close aria-label="ปิดหน้าต่างแชท">${icon('i-x')}</button>
        </div>
        <div class="chat-panel-body">
          <p class="chat-bubble">ยินดีให้บริการ<br>สอบถามเรื่องคำศัพท์ การใช้ภาษาไทย หรือบริการของสำนักงาน ส่งข้อความถึงเราทาง Messenger ได้เลย</p>
          <a class="chat-cta" href="${MESSENGER_URL}" target="_blank" rel="noopener">
            ${MESSENGER_GLYPH}
            <span>เริ่มแชทใน Messenger</span>
          </a>
          <p class="chat-note">เปิดในแท็บใหม่ · ต้องเข้าสู่ระบบ Facebook</p>
          <a class="chat-alt" href="${basePath}contact.html">ช่องทางติดต่ออื่น ${icon('i-arrow')}</a>
        </div>
      </div>
      <button class="chat-fab" type="button" aria-expanded="false" aria-controls="chat-panel" aria-label="แชทกับเรา" data-chat-toggle>
        ${MESSENGER_GLYPH}
        <span class="chat-fab-label" aria-hidden="true">แชทกับเรา</span>
      </button>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// FOOTER — ลำดับตามผังเว็บไซต์ ORST (ส่วน FOOTER)
//   จำนวนผู้เข้าชม · บริการทั่วไป · ติดต่อ (ที่อยู่ โทรศัพท์ โทรสาร อีเมล) · เมนูหลักแบบข้อความ
//   · Webmaster · ผังเว็บไซต์ · เว็บลิงก์ · ลิขสิทธิ์ · Disclaimer · นโยบายเว็บไซต์ · Privacy · Cookies · Security
//   · การเข้าถึงเว็บไซต์ · วันที่ปรับปรุงข้อมูลล่าสุด
// ---------------------------------------------------------------------------
// อีเมลผู้ดูแลเว็บไซต์ — เว็บเดิมไม่ได้ระบุ ใส่เมื่อสำนักงานยืนยัน (ว่าง = ลิงก์ไปฟอร์มติดต่อแทน)
const WEBMASTER_EMAIL = '';
// วันที่ปรับปรุงเว็บไซต์ (ค.ศ.) — หน้าที่มี updatedAt ใน JSON จะแสดงวันที่ของหน้านั้นแทน
const SITE_UPDATED = '2026-11-17';
// จำนวนผู้เข้าชม — ยังไม่มีระบบนับ (เว็บเดิมใช้ตัวนับของระบบหลังบ้าน) ตอนต่อ CMS ให้เติมตัวเลขใน [data-visitor-*]
const FOOTER_SERVICES = [
  ['พจนานุกรม', 'https://dictionary.orst.go.th/'],
  ['ศัพท์บัญญัติ สำนักงานราชบัณฑิตยสภา ออนไลน์', 'https://coined-word.orst.go.th/'],
  ['ระบบฐานข้อมูลคำทับศัพท์สำนักงานราชบัณฑิตยสภา', 'https://transliteration.orst.go.th/'],
  ['ระบบทดสอบความรู้ด้านภาษาไทย', 'https://etest.orst.go.th/'],
  ['พจนานุกรมภาษามือไทย ฉบับราชบัณฑิตยสภา', 'http://164.115.33.116/'],
  ['คลังความรู้', `${basePath}knowledge-base.html`],
  ['สั่งซื้อหนังสือและวิธีชำระเงิน', `${basePath}book-ordering.html`],   // ชื่อย่อให้อยู่บรรทัดเดียวในคอลัมน์ footer (ชื่อเต็มในเมนูและหน้า)
  ['คำถามที่พบบ่อย (FAQ)', `${basePath}qa.html`],
];

function footerDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return '';
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d} ${months[m - 1]} ${y + 543}`;
}
// หน้าที่ render จาก JSON: ใช้ updatedAt ของหน้านั้น
document.addEventListener('orst:content-rendered', e => {
  const iso = e.detail?.page?.updatedAt;
  const el = document.querySelector('[data-footer-updated]');
  if (iso && el) el.textContent = footerDate(iso);
});

function renderFooter() {
  // footer แสดงเฉพาะลิงก์ภายในเว็บไซต์ (ลิงก์ออกนอกเว็บตัดออก — ผู้ใช้สั่ง)
  const links = items => items.filter(([, url]) => url && !isExtUrl(url)).map(([text, url]) => `<li><a href="${url}">${text}</a></li>`).join('');
  // เมนูหลัก: หมวดที่ไม่มีหน้าของตัวเอง ใช้หน้าภายในหน้าแรกของเมนูย่อย
  const firstInternal = key => (megaMenuData[key]?.groups || []).flatMap(g => g.links || []).map(l => l[1]).find(u => u && !isExtUrl(u));
  const webmaster = WEBMASTER_EMAIL
    ? ['อีเมลผู้ดูแลเว็บไซต์', `mailto:${WEBMASTER_EMAIL}`]
    : ['อีเมลผู้ดูแลเว็บไซต์', `${basePath}contact.html#message-form`];
  // ข้อมูลเว็บไซต์และนโยบาย: คอลัมน์ที่ 4 ของแถวบน (ผู้ใช้: เอากลับขึ้นไปไว้ที่เดิม)
  const policies = [
    webmaster,
    ['ผังเว็บไซต์', `${basePath}sitemap.html`],
    ['เว็บลิงก์หน่วยงานที่เกี่ยวข้อง', `${basePath}related-links.html`],
    ['การปฏิเสธความรับผิด', `${basePath}disclaimer.html`],
    ['นโยบายเว็บไซต์', `${basePath}website-policy.html`],
    ['นโยบายคุ้มครองข้อมูลส่วนบุคคล', `${basePath}privacy-policy.html`],
    ['นโยบายคุกกี้', `${basePath}cookie-policy.html`],
    ['นโยบายความมั่นคงปลอดภัยเว็บไซต์', `${basePath}security-policy.html`],
    ['การเข้าถึงเว็บไซต์', `${basePath}accessibility.html`],
  ];

  return `
    <footer class="footer orst-footer" id="footer">
      <div class="container">

        <div class="orst-footer-main">
          <div class="orst-footer-brand">
            <a class="orst-footer-logo-wrap" href="${basePath}index.html" aria-label="สำนักงานราชบัณฑิตยสภา หน้าแรก">
              <img src="${basePath}assets/images/orst-emblem.png" alt="" aria-hidden="true"
                class="orst-footer-emblem" width="181" height="320" loading="lazy">
              <span class="orst-footer-wordmark">
                <span class="orst-footer-wordmark-th">สำนักงานราชบัณฑิตยสภา</span>
                <span class="orst-footer-wordmark-en" lang="en">Office of the Royal Society</span>
              </span>
            </a>

            <h3 class="orst-footer-subhead">ติดต่อ สำนักงานราชบัณฑิตยสภา</h3>
            <ul class="orst-footer-reach">
              <li>${icon('i-pin')}<span>เลขที่ ๑๒๐ หมู่ ๓ ศูนย์ราชการเฉลิมพระเกียรติ ๘๐ พรรษา ๕ ธันวาคม ๒๕๕๐ (อาคารซี) ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร ๑๐๒๑๐</span></li>
              <li>${icon('i-phone-call')}<span>โทรศัพท์ <a href="tel:021411718">0 2141 1718</a></span></li>
              <li>${icon('i-print')}<span>โทรสาร -</span></li>
              <li>${icon('i-mail')}<span>อีเมล <a href="mailto:saraban@orst.go.th" lang="en">saraban@orst.go.th</a></span></li>
            </ul>

            <div class="orst-footer-actions">
              <a class="orst-footer-primary" href="${basePath}contact.html">ติดต่อเรา ${icon('i-arrow')}</a>
              <a class="orst-footer-secondary" href="${basePath}contact.html#map">${icon('i-pin')} แผนที่และการเดินทาง</a>
            </div>
          </div>

          <nav class="orst-footer-col orst-footer-col--services" aria-label="บริการทั่วไป">
            ${colHead('บริการทั่วไป', 'Services')}
            <ul>${links(FOOTER_SERVICES)}</ul>
          </nav>

          <nav class="orst-footer-col orst-footer-col--menu" aria-label="เมนูหลักในรูปแบบข้อความ">
            ${colHead('เมนูหลัก', 'Text Menu')}
            <ul>${links(navItems.map(([key, label, href]) => [label, href || firstInternal(key)]))}</ul>
          </nav>

          <nav class="orst-footer-col orst-footer-col--policies" aria-label="ข้อมูลเว็บไซต์และนโยบาย">
            ${colHead('ข้อมูลเว็บไซต์และนโยบาย', 'Website Info')}
            <ul>${links(policies)}</ul>
          </nav>
        </div>

        <div class="orst-footer-bottom">
          <div class="orst-footer-legal">
          <span class="orst-footer-copy">${ORST_LANG === 'en' ? '© 2026' : 'สงวนลิขสิทธิ์ © พ.ศ. 2569'} สำนักงานราชบัณฑิตยสภา${ORST_LANG === 'en' ? ' · สงวนลิขสิทธิ์' : ''}</span>
          <span class="orst-footer-meta">
            <span>วันที่ปรับปรุงข้อมูลล่าสุด <time data-footer-updated>${footerDate(SITE_UPDATED)}</time></span>
            <span class="orst-footer-visitors" aria-label="จำนวนผู้เข้าชมเว็บไซต์">จำนวนผู้เข้าชมเว็บไซต์ · วันนี้ <b data-visitor-today>–</b> · สถิติรวม <b data-visitor-total>–</b></span>
          </span>
          </div>
        </div>

      </div>
    </footer>

    ${renderA11y()}

    ${renderChat()}

    <div class="modal ss-modal" id="search-modal" hidden role="dialog" aria-modal="true" aria-labelledby="search-title">
      <div class="modal-backdrop" data-close-modal></div>
      <div class="ss-sheet">
        <div class="ss-inner">
          <h2 id="search-title" class="sr-only">ค้นหาในเว็บไซต์</h2>
          <div class="ss-top">
            <form class="ss-bar" id="shared-search-form" role="search">
              ${icon('i-search', 'icon ss-bar-ic')}
              <label class="sr-only" for="shared-search-input">ค้นหาในเว็บไซต์</label>
              <input id="shared-search-input" type="search" placeholder="ค้นหาชื่อหน้า บริการ หลักเกณฑ์ หรือองค์ความรู้..." autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="shared-search-results" aria-autocomplete="list">
              <button class="ss-submit" type="submit">${icon('i-arrow')}<span>ค้นหา</span></button>
            </form>
            <button class="ss-close" type="button" data-close-modal aria-label="ปิด">${icon('i-x')}</button>
          </div>
          <p class="sr-only" id="shared-search-status" aria-live="polite"></p>
          <div class="ss-results" id="shared-search-results" role="listbox" aria-labelledby="search-title"></div>
          <p class="ss-hint" aria-hidden="true">กด / เพื่อเปิดการค้นหา · Esc เพื่อปิด</p>
        </div>
      </div>
    </div>
    </div>

  `;
}

// ---------------------------------------------------------------------------
// ช่วยการเข้าถึง (ทุกหน้า) — ปุ่มกลมมุมขวาล่าง + แผงตั้งค่าแบบป๊อปโอเวอร์ (มือถือ = แผ่นเลื่อนขึ้นจากล่าง)
//   ค่าที่ตั้งจำไว้ใน localStorage ของเครื่องผู้ใช้ · ปุ่ม "ขึ้นด้านบน" มีวงแหวนบอกระยะที่อ่านไปแล้ว
//   เปิดแผงจากที่อื่นได้ด้วยปุ่มที่มี data-open-access
// ---------------------------------------------------------------------------
const A11Y_GLYPH = `<svg class="a11y-glyph" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.4" r="2.2"></circle><path d="M4.5 8.4c2.5.7 5 1 7.5 1s5-.3 7.5-1M12 9.4v5m0 0-3.2 6.4M12 14.4l3.2 6.4"></path></svg>`;
const A11Y_TOOLS = [
  // [key, คลาสบน body, ชื่อ, ไอคอน]
  ['contrast', 'high-contrast', 'คอนทราสต์สูง', '<circle cx="12" cy="12" r="8.5"></circle><path class="is-fill" d="M12 3.5a8.5 8.5 0 0 1 0 17Z"></path>'],
  ['readable', 'readable-mode', 'โหมดอ่านง่าย', '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"></path>'],
  ['links', 'access-link-mode', 'เน้นลิงก์', '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"></path><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"></path>'],
  ['headings', 'access-heading-mode', 'เน้นหัวข้อ', '<path d="M6 5v14M16 5v14M6 12h10"></path><path d="M19 10l2-1v10"></path>'],
  ['spacing', 'access-spacing-mode', 'ระยะบรรทัดกว้าง', '<path d="M11 6h10M11 12h10M11 18h10"></path><path d="M5 4v16M3 6.5 5 4l2 2.5M3 17.5 5 20l2-2.5"></path>'],
  ['motion', 'no-motion', 'ลดการเคลื่อนไหว', '<circle cx="12" cy="12" r="8.5"></circle><path d="M10 9v6M14 9v6"></path>'],
  ['cursor', 'access-cursor-mode', 'เคอร์เซอร์ใหญ่', '<path d="M6 3.5 19 10l-5.8 1.7L11 18Z"></path><path d="m13.5 12 4.5 4.5"></path>'],
  ['reader', '', 'อ่านออกเสียง', '<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5Z"></path><path d="M16.5 9a4.5 4.5 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"></path>'],
];
const A11Y_FONT = { min: -1, max: 3, step: 0.1 };   // ระดับ -1..3 = 90% .. 130%

function renderA11y() {
  const tiles = A11Y_TOOLS.map(([key, , label, svg], i) => `
          <button class="a11y-tile" type="button" aria-pressed="false" data-a11y-tool="${key}" style="--i:${i}">
            <span class="a11y-tile-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${svg}</svg>${key === 'reader' ? '<span class="a11y-eq" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}</span>
            <span class="a11y-tile-label">${label}</span>
            <span class="a11y-tile-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"></path></svg></span>
          </button>`).join('');
  const dots = Array.from({ length: A11Y_FONT.max - A11Y_FONT.min + 1 }, () => '<i></i>').join('');
  return `
    <div class="a11y" data-a11y>
      <div class="a11y-scrim" data-a11y-close aria-hidden="true"></div>
      <section class="a11y-panel" id="a11y-panel" role="dialog" aria-labelledby="a11y-title" inert>
        <header class="a11y-head">
          <span class="a11y-head-ic">${A11Y_GLYPH}</span>
          <span class="a11y-head-text">
            <strong id="a11y-title">ช่วยการเข้าถึง</strong>
            <small>ปรับการแสดงผลให้อ่านสบายตา</small>
          </span>
          <button class="a11y-x" type="button" data-a11y-close aria-label="ปิดเครื่องมือช่วยการเข้าถึง">${icon('i-x')}</button>
        </header>
        <div class="a11y-body">
          <div class="a11y-font" style="--i:0">
            <span class="a11y-font-label">ขนาดตัวอักษร</span>
            <div class="a11y-stepper">
              <button type="button" data-a11y-font="-1" aria-label="ลดขนาดตัวอักษร"><span aria-hidden="true">ก</span><svg class="a11y-step-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"></path></svg></button>
              <span class="a11y-font-meter">
                <output data-a11y-font-val aria-live="polite">100%</output>
                <span class="a11y-dots" aria-hidden="true">${dots}</span>
              </span>
              <button type="button" data-a11y-font="1" aria-label="เพิ่มขนาดตัวอักษร"><span aria-hidden="true">ก</span><svg class="a11y-step-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12"></path></svg></button>
            </div>
          </div>
          <div class="a11y-grid">${tiles}
          </div>
        </div>
        <footer class="a11y-foot">
          <button class="a11y-reset" type="button" data-a11y-reset><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"></path><path d="M3.5 4v5h5"></path></svg>คืนค่าเริ่มต้น</button>
          <button class="a11y-done" type="button" data-a11y-close>เสร็จสิ้น</button>
        </footer>
      </section>
      <button class="a11y-top" type="button" data-a11y-top aria-label="กลับขึ้นด้านบน" tabindex="-1">
        <svg class="a11y-top-ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20" pathLength="100"></circle></svg>
        <svg class="a11y-top-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"></path><path d="m5 12 7-7 7 7"></path></svg>
      </button>
      <button class="a11y-fab" type="button" aria-expanded="false" aria-controls="a11y-panel" aria-label="ช่วยการเข้าถึง" data-a11y-toggle>
        <span class="a11y-fab-ic">${A11Y_GLYPH}</span>
        <span class="a11y-fab-x">${icon('i-x')}</span>
        <span class="a11y-badge" data-a11y-badge aria-hidden="true"></span>
        <span class="a11y-fab-label" aria-hidden="true">ช่วยการเข้าถึง</span>
      </button>
    </div>
  `;
}



function initMegaMenu() {
  const mega = document.querySelector('#mega-menu');
  const links = Array.from(document.querySelectorAll('[data-mega]'));
  if (!mega || !links.length) return;

  let closeTimer;
  let currentKey = '';

  function setOpenState(key, isOpen) {
    links.forEach(link => {
      const open = isOpen && link.dataset.mega === key;
      link.classList.toggle('is-open', open);
      link.setAttribute('aria-expanded', String(open));
    });
  }

  function openMega(key) {
    const html = renderMegaMenu(key);
    if (!html) return;
    currentKey = key;
    mega.innerHTML = html;
    mega.hidden = false;
    bindMegaTabs(mega);
    setOpenState(key, true);
  }

  function closeMega() {
    currentKey = '';
    mega.hidden = true;
    mega.innerHTML = '';
    setOpenState('', false);
  }

  links.forEach(link => {
    link.addEventListener('mouseenter', () => {
      clearTimeout(closeTimer);
      openMega(link.dataset.mega);
    });

    link.addEventListener('focus', () => {
      clearTimeout(closeTimer);
      openMega(link.dataset.mega);
    });

    link.addEventListener('click', event => {
      const key = link.dataset.mega;
      if (!megaMenuData[key]) return;

      // อุปกรณ์ที่มีเมาส์: เมนูใหญ่เปิดเองตอนชี้อยู่แล้ว การคลิกชื่อหมวดจึงพาไปหน้าหมวดนั้นตามปกติ
      // จอสัมผัส (ไม่มี hover): แตะครั้งแรกเปิดเมนูใหญ่ แตะชื่อหมวดซ้ำขณะเมนูเปิดอยู่จึงไปหน้าหมวด
      const canHover = window.matchMedia('(hover: hover)').matches;
      // หมวดที่ไม่มีหน้าหมวด (data-no-hub): คลิกแล้วเปิด/ปิดเมนูใหญ่เสมอ ไม่พาไปไหน
      if (!('noHub' in link.dataset) && (canHover || (!mega.hidden && currentKey === key))) return;

      event.preventDefault();
      clearTimeout(closeTimer);
      if (!mega.hidden && currentKey === key) {
        closeMega();
      } else {
        openMega(key);
      }
    });
  });

  const header = document.querySelector('#site-header');
  header?.addEventListener('mouseleave', () => {
    closeTimer = setTimeout(closeMega, 180);
  });

  mega.addEventListener('mouseenter', () => clearTimeout(closeTimer));
  mega.addEventListener('mouseleave', () => {
    closeTimer = setTimeout(closeMega, 180);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMega();
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('#site-header')) closeMega();
  });
}

function initDrawer() {
  const btn = document.querySelector('[data-drawer-open]');
  const drawer = document.getElementById('site-drawer');
  if (!btn || !drawer) return;

  const panel = drawer.querySelector('.drawer-panel');
  const noMotion = () => document.body.classList.contains('no-motion')
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hideTimer;

  function open() {
    clearTimeout(hideTimer);
    drawer.hidden = false;
    document.documentElement.classList.add('drawer-lock');
    void drawer.offsetWidth;            // บังคับ reflow ให้ transition เริ่มจากสถานะปิด
    drawer.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    drawer.querySelector('.drawer-close').focus({ preventScroll: true });
  }

  function close(restoreFocus = true) {
    if (drawer.hidden) return;
    drawer.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('drawer-lock');
    hideTimer = setTimeout(() => { drawer.hidden = true; }, noMotion() ? 0 : 280);
    if (restoreFocus) btn.focus({ preventScroll: true });   // คืนโฟกัสให้ปุ่มเมนู
  }

  btn.addEventListener('click', open);
  drawer.querySelectorAll('[data-drawer-close]').forEach(el => el.addEventListener('click', () => close()));
  // ปุ่มค้นหาในแผง: ปิดแผงก่อน แล้วโมดัลค้นหา (initSharedModals) จะเปิดต่อ
  drawer.querySelector('[data-open-search]')?.addEventListener('click', () => close(false));

  drawer.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(); return; }
    if (event.key !== 'Tab') return;
    // วนโฟกัสอยู่ในแผงขณะเปิด
    const items = [...panel.querySelectorAll('a[href], button:not([disabled])')]
      .filter(el => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden');
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  // เปิดได้ทีละหมวด (เปิดหมวดใหม่ = ปิดหมวดเดิม) — เมนูไม่ยาวจนต้องเลื่อนหา
  const subToggles = [...drawer.querySelectorAll('[data-drawer-sub]')];
  subToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      subToggles.forEach(t => {
        const open = t === toggle ? !expanded : false;
        t.setAttribute('aria-expanded', String(open));
        document.getElementById(t.getAttribute('aria-controls'))?.classList.toggle('is-open', open);
      });
      // หมวดที่เพิ่งเปิดอยู่ล่างจอ -> เลื่อนให้เห็นหัวหมวด
      if (!expanded) setTimeout(() => toggle.scrollIntoView({ block: 'nearest', behavior: noMotion() ? 'auto' : 'smooth' }), 200);
    });
  });

  // ขยายจอเป็นเดสก์ท็อป (ตรงกับ breakpoint ใน CSS) -> ปิดแผงอัตโนมัติ
  const desktopMq = window.matchMedia('(min-width: 1366px)');
  const closeOnDesktop = () => { if (desktopMq.matches) close(false); };
  desktopMq.addEventListener('change', closeOnDesktop);
  window.addEventListener('resize', closeOnDesktop);
}

function initSharedModals() {
  const searchModal = document.querySelector('#search-modal');

  document.querySelectorAll('[data-open-search]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!searchModal) return;
      searchModal.hidden = false;
      document.dispatchEvent(new CustomEvent('orst:search-open'));
      setTimeout(() => document.querySelector('#shared-search-input')?.focus(), 40);
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) modal.hidden = true;
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.modal:not([hidden])').forEach(modal => { modal.hidden = true; });
  });
}

/* ค้นหาในเว็บไซต์ (ปุ่มค้นหาบน header) — ค้นจากรายการหน้าทั้งหมดในเมนู (navItems + megaMenuData) ทันทีที่พิมพ์
   ว่าง = ทางลัดบริการยอดนิยม · มีคำค้น = หน้าที่ตรง (ชื่อตรงต้นคำมาก่อน) + ตัวเลือก "ค้นหาในคลังองค์ความรู้"
   แป้นพิมพ์: ↑ ↓ เลือก · Enter เปิด · Esc ปิด (combobox + listbox ตาม ARIA) · โหมดอังกฤษค้นได้ทั้งชื่อไทยและชื่อแปล */
function initSharedSearch() {
  const form = document.querySelector('#shared-search-form');
  const input = document.querySelector('#shared-search-input');
  const results = document.querySelector('#shared-search-results');
  const status = document.querySelector('#shared-search-status');
  if (!form || !input || !results) return;

  const en = I18N.lang === 'en';
  const T = str => (en ? I18N.translate(str) : str);
  const escH = str => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = str => String(str || '').replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d))).toLowerCase().replace(/\s+/g, ' ').trim();

  // ดัชนีหน้า: [ชื่อ, ลิงก์, หมวด › กลุ่ม] — สร้างตอนเปิดโมดัล (โหมดอังกฤษต้องรอคำแปลโหลดเสร็จก่อน)
  let index = [];
  const buildIndex = () => {
    index = [];
    const seen = new Set();
    const add = (title, href, path) => {
      if (!title || !href || seen.has(href)) return;
      seen.add(href);
      const shown = T(title);
      const shownPath = path ? path.split(' › ').map(T).join(' › ') : '';
      index.push({ title: shown, href, path: shownPath, key: norm(`${title} ${shown}`), pathKey: norm(`${path} ${shownPath}`) });
    };
    navItems.forEach(([, label, href]) => add(label, href, ''));
    Object.values(megaMenuData).forEach(cat => (cat.groups || []).forEach(g => (g.links || []).forEach(link => {
      if (Array.isArray(link)) add(link[0], link[1], [cat.title, g.heading].filter(Boolean).join(' › '));
    })));
  };

  // คำค้นแนะนำ (กดแล้วเติมลงช่องค้นหา) · บริการที่เกี่ยวข้อง (ลิงก์ตรง) · คำค้นล่าสุด (จำในเบราว์เซอร์ 5 คำ)
  const SUGGEST = ['หลักเกณฑ์', 'พจนานุกรม', 'หนังสือ', 'ข่าว', 'ร้องเรียน', 'ติดต่อ'];
  const SERVICES = [
    ['i-dictionary', 'พจนานุกรมออนไลน์', 'dictionary.html'],
    ['i-book', 'คลังองค์ความรู้', 'knowledge.html'],
    ['i-pen', 'หลักเกณฑ์ภาษาไทย', 'language-guidelines.html'],
    ['i-ebook', 'หนังสือและสิ่งพิมพ์', 'publications.html'],
  ];
  const RECENT_KEY = 'orst-recent-search';
  const getRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter(x => typeof x === 'string').slice(0, 5); } catch { return []; } };
  const saveRecent = term => {
    const t = String(term || '').trim();
    if (!t || window.orstConsent?.() === 'necessary') return;
    try { localStorage.setItem(RECENT_KEY, JSON.stringify([t, ...getRecent().filter(x => x !== t)].slice(0, 5))); } catch { /* ไม่จำก็ได้ */ }
  };

  let active = -1;
  const options = () => [...results.querySelectorAll('[role="option"]')];
  const setActive = i => {
    const opts = options();
    if (!opts.length) { active = -1; input.removeAttribute('aria-activedescendant'); return; }
    active = (i + opts.length) % opts.length;
    opts.forEach((o, k) => o.setAttribute('aria-selected', String(k === active)));
    input.setAttribute('aria-activedescendant', opts[active].id);
    opts[active].scrollIntoView({ block: 'nearest' });
  };
  const optAttrs = (href, n) => `id="ss-opt-${n}" role="option" aria-selected="false" href="${escH(href)}"${extAttrs(href)}`;
  const mark = (title, q) => {
    const at = q ? title.toLowerCase().indexOf(q) : -1;
    if (at < 0) return escH(title);
    return `${escH(title.slice(0, at))}<b>${escH(title.slice(at, at + q.length))}</b>${escH(title.slice(at + q.length))}`;
  };

  const renderQuick = () => {
    if (status) status.textContent = '';
    const recent = getRecent();
    let n = 0;
    results.className = 'ss-results is-quick';
    results.innerHTML = `
      <section class="ss-col">
        <h3>${icon('i-clock')}${escH(T('คำค้นล่าสุด'))}</h3>
        ${recent.length ? `<ul class="ss-recent">${recent.map(t => `<li><button type="button" class="ss-term" data-term="${escH(t)}">${icon('i-clock')}<span>${escH(t)}</span></button></li>`).join('')}</ul>`
          : `<p class="ss-empty">${escH(T('ยังไม่มีคำค้นล่าสุด'))}</p>`}
      </section>
      <section class="ss-col">
        <h3>${icon('i-trend')}${escH(T('คำค้นแนะนำ'))}</h3>
        <div class="ss-chips">${SUGGEST.map(t => `<button type="button" class="ss-chip" data-term="${escH(T(t))}">${escH(T(t))}</button>`).join('')}</div>
      </section>
      <section class="ss-col">
        <h3>${icon('i-grid')}${escH(T('บริการที่เกี่ยวข้อง'))}</h3>
        <ul class="ss-links">${SERVICES.map(([ic, title, href]) => `<li><a class="ss-link" ${optAttrs(`${basePath}${href}`, n++)}>${icon(ic, 'icon ss-link-ic')}<span>${escH(T(title))}</span>${icon('i-arrow', 'icon ss-link-go')}</a></li>`).join('')}</ul>
      </section>`;
    active = -1; input.removeAttribute('aria-activedescendant');
  };

  const render = () => {
    const raw = input.value.trim();
    const q = norm(raw);
    if (!q) { renderQuick(); return; }
    const hits = index
      .map(it => ({ it, score: it.key.startsWith(q) ? 0 : it.key.includes(` ${q}`) ? 1 : it.key.includes(q) ? 2 : it.pathKey.includes(q) ? 3 : 9 }))
      .filter(h => h.score < 9)
      .sort((a, b) => a.score - b.score || a.it.title.length - b.it.title.length)
      .slice(0, 8);
    const kbHref = `${basePath}knowledge.html?q=${encodeURIComponent(raw)}`;
    const kbText = en ? `Search “${raw}” in the Knowledge Hub` : `ค้นหา “${raw}” ในคลังองค์ความรู้`;
    if (status) status.textContent = hits.length ? (en ? `${hits.length} matching page${hits.length > 1 ? 's' : ''}` : `พบ ${hits.length} หน้า`) : T('ไม่พบหน้าที่ตรงกับคำค้น');
    results.className = 'ss-results is-hits';
    results.innerHTML = `<p class="ss-count">${escH(status ? status.textContent : '')}</p>` + hits.map(({ it }, n) => `
      <a class="ss-item" ${optAttrs(it.href, n)}>
        <span class="ss-item-title">${mark(it.title, raw.toLowerCase())}${isExtUrl(it.href) ? icon('i-external', 'icon ss-ext') : ''}</span>
        ${it.path ? `<small>${escH(it.path)}</small>` : ''}
      </a>`).join('') + `
      <a class="ss-more" ${optAttrs(kbHref, hits.length)}>${escH(kbText)} ${icon('i-arrow')}</a>`;
    setActive(0);
  };

  input.addEventListener('input', render);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
  });
  results.addEventListener('mousemove', e => {
    const opt = e.target.closest('[role="option"]');
    if (opt) { const k = options().indexOf(opt); if (k !== active) setActive(k); }
  });
  results.addEventListener('click', e => {
    const term = e.target.closest('[data-term]');
    if (term) { input.value = term.dataset.term; render(); input.focus(); return; }
    if (e.target.closest('[role="option"]') && input.value.trim()) saveRecent(input.value);
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const opts = options();
    if (input.value.trim()) saveRecent(input.value);
    (opts[active] || opts[0])?.click();
  });
  // กด / ที่ใดก็ได้ (ที่ไม่ใช่ช่องพิมพ์) เพื่อเปิดการค้นหา
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
    const btn = document.querySelector('[data-open-search]');
    if (btn) { e.preventDefault(); btn.click(); }
  });
  document.addEventListener('orst:search-open', () => { buildIndex(); input.value = ''; renderQuick(); });
  buildIndex();
  renderQuick();
}

/* ช่วยการเข้าถึง — ผูกกับ renderA11y()
   - คลาสบน body เหมือนเดิม (high-contrast, readable-mode, no-motion, access-*-mode) CSS เดิมใช้ต่อได้
   - ขนาดตัวอักษร: คูณขนาดฐานของ <html> (ซึ่งโตตามจอ) ด้วย 90–130% แล้วคำนวณใหม่เมื่อย่อ/ขยายหน้าต่าง
   - จำค่าไว้ใน localStorage (อ่าน/เขียนไม่ได้ก็ใช้งานได้ตามปกติ แค่ไม่จำ) — ยกเว้นอ่านออกเสียง */
const A11Y_KEY = 'orst-a11y';
function initA11y() {
  const root = document.querySelector('[data-a11y]');
  if (!root) return;
  const panel = root.querySelector('.a11y-panel');
  const fab = root.querySelector('[data-a11y-toggle]');
  const badge = root.querySelector('[data-a11y-badge]');
  const fontVal = root.querySelector('[data-a11y-font-val]');
  const dots = [...root.querySelectorAll('.a11y-dots i')];
  const tiles = new Map([...root.querySelectorAll('[data-a11y-tool]')].map(t => [t.dataset.a11yTool, t]));
  const html = document.documentElement;
  const reduced = () => document.body.classList.contains('no-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  const state = { font: 0, on: [] };
  try { Object.assign(state, JSON.parse(localStorage.getItem(A11Y_KEY) || '{}')); } catch { /* ใช้ค่าเริ่มต้น */ }
  state.on = (Array.isArray(state.on) ? state.on : []).filter(k => tiles.has(k) && k !== 'reader');
  state.font = Math.min(A11Y_FONT.max, Math.max(A11Y_FONT.min, Math.round(Number(state.font) || 0)));
  const save = () => { try { localStorage.setItem(A11Y_KEY, JSON.stringify({ font: state.font, on: state.on })); } catch { /* ไม่จำก็ได้ */ } };

  // ---- ขนาดตัวอักษร ----
  const applyFont = () => {
    html.style.removeProperty('font-size');
    const scale = 1 + state.font * A11Y_FONT.step;
    if (state.font) html.style.fontSize = `${(parseFloat(getComputedStyle(html).fontSize) * scale).toFixed(2)}px`;
    fontVal.textContent = `${Math.round(scale * 100)}%`;
    dots.forEach((d, i) => d.classList.toggle('is-on', i <= state.font - A11Y_FONT.min));
    root.querySelector('[data-a11y-font="-1"]').disabled = state.font <= A11Y_FONT.min;
    root.querySelector('[data-a11y-font="1"]').disabled = state.font >= A11Y_FONT.max;
  };
  let resizeTimer;
  window.addEventListener('resize', () => {
    if (!state.font) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyFont, 150);
  });

  // ---- อ่านออกเสียง: ข้อความที่เลือกไว้ หรือเนื้อหาหลักของหน้า แบ่งเป็นช่วงสั้น ๆ (Chrome ตัดเสียงที่ยาวเกินทิ้ง) ----
  let speaking = false;
  const stopSpeak = () => { speaking = false; if ('speechSynthesis' in window) speechSynthesis.cancel(); };
  const speak = () => {
    if (!('speechSynthesis' in window)) return false;
    const picked = String(window.getSelection?.() || '').trim();
    const main = document.querySelector('#main-content, main') || document.body;
    const text = (picked || main.innerText || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    const chunks = text.match(/.{1,220}(?:\s|$)/g) || [text];
    speechSynthesis.cancel();
    speaking = true;
    chunks.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(c);
      u.lang = ORST_LANG === 'en' ? 'en-US' : 'th-TH';
      if (i === chunks.length - 1) u.onend = () => { if (speaking) setTool('reader', false); };
      speechSynthesis.speak(u);
    });
    return true;
  };

  // ---- เปิด/ปิดเครื่องมือ ----
  const bodyClass = Object.fromEntries(A11Y_TOOLS.map(([k, c]) => [k, c]));
  const syncBadge = () => {
    const n = state.on.length + (state.font ? 1 : 0) + (speaking ? 1 : 0);
    const was = badge.textContent;
    badge.textContent = n ? String(n) : '';
    root.classList.toggle('has-active', n > 0);
    if (n && badge.textContent !== was && !reduced()) replay(badge, 'is-pop');
  };
  function setTool(key, on, { animate = false } = {}) {
    const tile = tiles.get(key);
    if (key === 'reader') {
      if (on) on = speak(); else stopSpeak();
    } else {
      document.body.classList.toggle(bodyClass[key], on);
      state.on = on ? [...new Set([...state.on, key])] : state.on.filter(k => k !== key);
    }
    tile.setAttribute('aria-pressed', String(on));
    if (animate && !reduced()) replay(tile, 'is-pop');
    syncBadge();
  }

  // ค่าที่จำไว้จากครั้งก่อน
  state.on.forEach(k => setTool(k, true));
  applyFont();
  syncBadge();

  tiles.forEach((tile, key) => tile.addEventListener('click', () => {
    setTool(key, tile.getAttribute('aria-pressed') !== 'true', { animate: true });
    save();
  }));
  root.querySelectorAll('[data-a11y-font]').forEach(btn => btn.addEventListener('click', () => {
    state.font = Math.min(A11Y_FONT.max, Math.max(A11Y_FONT.min, state.font + Number(btn.dataset.a11yFont)));
    applyFont();
    syncBadge();
    save();
    if (!reduced()) replay(fontVal, 'is-bump');
  }));
  root.querySelector('[data-a11y-reset]').addEventListener('click', e => {
    tiles.forEach((_, k) => setTool(k, false));
    state.font = 0;
    applyFont();
    syncBadge();
    save();
    if (!reduced()) replay(e.currentTarget, 'is-spin');
  });

  // ---- แผง ----
  const isOpen = () => root.classList.contains('is-open');
  const setOpen = (open, { focus = true } = {}) => {
    if (open === isOpen()) return;
    root.classList.toggle('is-open', open);
    panel.inert = !open;
    fab.setAttribute('aria-expanded', String(open));
    if (open) {
      // ปิดการ์ดแชทถ้าเปิดอยู่ — ไม่ให้แผงซ้อนกัน
      document.querySelector('.chat-widget.is-open [data-chat-close]')?.click();
      if (focus) setTimeout(() => root.querySelector('[data-a11y-font="1"]:not(:disabled), [data-a11y-font]:not(:disabled)')?.focus(), 60);
    } else if (focus) fab.focus();
  };
  fab.addEventListener('click', () => setOpen(!isOpen()));
  root.querySelectorAll('[data-a11y-close]').forEach(b => b.addEventListener('click', () => setOpen(false)));
  document.addEventListener('click', e => { const b = e.target.closest('[data-open-access]'); if (!b) return; e.preventDefault(); setOpen(true); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) setOpen(false); });
  document.addEventListener('click', e => {
    if (isOpen() && !root.contains(e.target) && !e.target.closest('[data-open-access]')) setOpen(false, { focus: false });
  });

  // แนะนำปุ่มครั้งแรกที่เข้าเว็บ (ครั้งเดียวต่อแท็บ): ป้ายชื่อเลื่อนออกมา + คลื่นวงกลม
  try {
    if (!sessionStorage.getItem('orst-a11y-hello')) {
      sessionStorage.setItem('orst-a11y-hello', '1');
      root.classList.add('is-hello');
      setTimeout(() => root.classList.remove('is-hello'), 4200);
    }
  } catch { /* ไม่แนะนำก็ได้ */ }

  // ---- ปุ่มขึ้นด้านบน + วงแหวนบอกระยะที่อ่านไปแล้ว ----
  const top = root.querySelector('[data-a11y-top]');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const show = scrollY > Math.min(600, innerHeight * 0.8);
    top.classList.toggle('is-shown', show);
    top.tabIndex = show ? 0 : -1;
    top.style.setProperty('--progress', max > 0 ? Math.min(1, scrollY / max).toFixed(3) : '0');
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  top.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
  });
}


/* ปุ่ม "ดูทั้งหมด" (.view-all) — ข้อความบนปุ่มสั้นเหมือนกันทุกที่ ชื่อเต็มของปลายทางอยู่ใน aria-label */
function setViewAll(link, href, label) {
  if (!link) return;
  link.href = href;
  const ext = /^https?:/.test(href) && !href.includes(location.host);
  if (ext) { link.target = '_blank'; link.rel = 'noopener'; } else { link.removeAttribute('target'); link.removeAttribute('rel'); }
  link.setAttribute('aria-label', label.replace(/\s*→\s*$/, ''));
  link.innerHTML = `ดูทั้งหมด ${icon('i-arrow', 'icon view-all-ic')}`;
}

function initNewsEventsTabs() {
  const tabs = document.querySelectorAll('[data-news-tab]');
  const panels = document.querySelectorAll('[data-news-panel]');
  const viewAllLink = document.querySelector('#news-view-all-link');

  if (!tabs.length || !panels.length) return;

  // หน้ารายการข่าวของแต่ละแท็บ (ข่าวในแท็บ "อบรม" มาจากทั้งข่าวประชาสัมพันธ์และข่าวกิจกรรม จึงชี้ไปหน้ารวมข่าว)
  const links = {
    news: `${basePath}general-news.html`,
    training: `${basePath}academic-lectures.html`,
    event: `${basePath}activity-news.html`,
    announcement: `${basePath}general-news.html`
  };

  const labels = {
    news: 'ดูข่าวเพิ่มเติม →',
    training: 'ดูอบรมเพิ่มเติม →',
    event: 'ดูกิจกรรมเพิ่มเติม →',
    announcement: 'ดูประกาศเพิ่มเติม →'
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.newsTab;

      tabs.forEach(item => {
        const active = item === tab;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });

      panels.forEach(panel => {
        const active = panel.dataset.newsPanel === target;
        panel.classList.toggle('active', active);
        panel.hidden = !active;
      });

      setViewAll(viewAllLink, links[target] || `${basePath}general-news.html`, labels[target] || 'ดูข่าวเพิ่มเติม');
    });
  });
}




function initMediaTabs() {
  const mediaTabs = document.querySelectorAll('[data-media-tab]');
  const mediaPanels = document.querySelectorAll('[data-media-panel]');
  const mediaViewAllLink = document.querySelector('#media-view-all-link');

  if (!mediaTabs.length || !mediaPanels.length) return;

  const mediaLinks = {
    encyclopedia: `${basePath}infographics.html`,
    research: 'research.html',
    multimedia: 'https://www.youtube.com/channel/UCFGKmCXh_pWaawbilPgZ69g'
  };

  const mediaLabels = {
    encyclopedia: 'ดูอินโฟกราฟิกทั้งหมด →',
    research: 'ดู Research ทั้งหมด →',
    multimedia: 'ดูวิดีโอทั้งหมดบนช่อง YouTube ของราชบัณฑิตยสภา (เปิดในแท็บใหม่)'
  };

  mediaTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.mediaTab;

      mediaTabs.forEach(item => {
        const isActive = item === tab;

        item.classList.toggle('active', isActive);
        item.setAttribute('aria-selected', String(isActive));
        item.tabIndex = isActive ? 0 : -1;
      });

      mediaPanels.forEach(panel => {
        const isActive = panel.dataset.mediaPanel === target;

        panel.classList.toggle('active', isActive);
        panel.hidden = !isActive;
      });

      setViewAll(mediaViewAllLink, mediaLinks[target] || mediaViewAllLink?.getAttribute('href'), mediaLabels[target] || 'ดูทั้งหมด');

      const activePanel = document.querySelector(`[data-media-panel="${target}"]`);
      const scrollRow = activePanel?.querySelector('.publication-row, .media-row');

      if (scrollRow) {
        scrollRow.scrollLeft = 0;
      }
    });
  });
}


function initCompactFAQ() {
  document.querySelectorAll('.faq-compact-list .faq-q').forEach(button => {
    // กันผูก event ซ้ำ กรณีถูกเรียกอีกรอบหลังเพิ่มเนื้อหาใหม่เข้า DOM
    if (button.dataset.faqBound === '1') return;
    button.dataset.faqBound = '1';
    button.addEventListener('click', () => {
      const item = button.closest('.faq-item');
      const answer = item?.querySelector('.faq-a');
      const expanded = button.getAttribute('aria-expanded') === 'true';

      button.setAttribute('aria-expanded', String(!expanded));
      if (answer) answer.hidden = expanded;
    });
  });
}

/* -----------------------------------------------------------------------------
   document-list (block รายการเอกสาร จาก blocks.js) — ค้นหา / กรองปี / กรองหมวด / แสดงเพิ่ม
   ทุกรายการอยู่ใน HTML อยู่แล้ว (อ่านได้แม้ปิด JS) ส่วนนี้แค่ซ่อน/แสดง
   ค้นหาได้ทั้งเลขไทยและเลขอารบิก (ชื่อประกาศจำนวนมากพิมพ์ด้วยเลขไทย)
   -------------------------------------------------------------------------- */
function initDocLists() {
  const norm = s => String(s || '').replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)))
    .toLowerCase().replace(/\s+/g, ' ').trim();
  const reduceMotion = () => document.body.classList.contains('no-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* โหมดส่วนตัว */ } },
  };
  // เลขหน้าแบบย่อ: 1 … 4 5 6 … 20
  const pageList = (total, cur) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const arr = [...new Set([1, total, cur - 1, cur, cur + 1])].filter(n => n >= 1 && n <= total).sort((x, y) => x - y);
    const out = [];
    arr.forEach((n, i) => { if (i && n - arr[i - 1] > 1) out.push('…'); out.push(n); });
    return out;
  };

  document.querySelectorAll('[data-doc-list]').forEach(list => {
    if (list.dataset.docBound === '1') return;
    list.dataset.docBound = '1';

    // รายการของแต่ละชนิด: document-list = .doc-item · link-list ใส่ data-doc-item=".block-link-item"
    const items = [...list.querySelectorAll(list.dataset.docItem || '.doc-item')];
    const baseSize = Number(list.dataset.pageSize) || 20;
    const sizes = [baseSize, baseSize * 2, baseSize * 4];
    let pageSize = baseSize;
    const chips = [...list.querySelectorAll('[data-doc-chip]')];
    let chipCat = '';
    const unit = list.dataset.unit || 'รายการ';
    const toolbar = list.querySelector('[data-doc-toolbar]');
    const search = list.querySelector('[data-doc-search]');
    const year = list.querySelector('[data-doc-year]');
    const cat = list.querySelector('[data-doc-cat]');
    const count = list.querySelector('[data-doc-count]');
    const empty = list.querySelector('[data-doc-empty]');
    const pager = list.querySelector('[data-doc-pager]');
    const views = [...list.querySelectorAll('[data-doc-view]')];
    const text = new Map(items.map(it => [it, norm((it.querySelector('.doc-title') || it).textContent)]));
    let page = 1;

    // แถบค้นหามีประโยชน์เมื่อรายการยาวพอ (รายการข่าวแสดงเสมอ เพราะมีปุ่มสลับมุมมอง)
    if (toolbar && (items.length > 5 || views.length)) toolbar.hidden = false;

    // มุมมองตาราง/รายการ (เฉพาะ layout news) — จำค่าที่เลือกไว้ในเบราว์เซอร์
    const setView = v => {
      list.dataset.view = v;
      views.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.docView === v)));
    };
    const viewKey = list.dataset.viewKey || 'doc-view';   // แยกค่าที่จำไว้ของแต่ละชนิดรายการ (ข่าว / ภาพ)
    const saved = store.get(viewKey);
    if (views.length) setView(saved === 'list' || saved === 'grid' ? saved : (list.dataset.viewDefault || 'grid'));
    views.forEach(b => b.addEventListener('click', () => { setView(b.dataset.docView); store.set(viewKey, b.dataset.docView); }));

    function renderPager(total) {
      if (!pager) return;
      const pages = Math.max(1, Math.ceil(total / pageSize));
      // แสดงเมื่อมีมากกว่า 1 หน้า หรือผู้ใช้เปลี่ยนจำนวนต่อหน้าไว้ (ให้เปลี่ยนกลับได้)
      pager.hidden = total <= baseSize && pageSize === baseSize;
      if (pager.hidden) { pager.innerHTML = ''; return; }
      const from = total ? (page - 1) * pageSize + 1 : 0;
      const to = Math.min(total, page * pageSize);
      const btn = (label, p, attrs = '') => `<button type="button" data-doc-page="${p}"${attrs}>${label}</button>`;
      const nums = pageList(pages, page).map(n => n === '…'
        ? '<span class="doc-pager-gap" aria-hidden="true">…</span>'
        : btn(n, n, n === page ? ' class="is-current" aria-current="page"' : ` aria-label="หน้า ${n}"`)).join('');
      const first = page === 1, last = page === pages;
      pager.innerHTML = `
        <p class="doc-pager-range">แสดง ${from}–${to} จาก ${total} ${unit}</p>
        <div class="doc-pager-pages">
          ${btn(`${icon('i-chevron', 'icon doc-pager-prev')}${icon('i-chevron', 'icon doc-pager-prev doc-pager-dbl')}<span>หน้าแรก</span>`, 1, `${first ? ' disabled' : ''} class="doc-pager-edge" aria-label="หน้าแรก"`)}
          ${btn(`${icon('i-chevron', 'icon doc-pager-prev')}<span>ก่อนหน้า</span>`, page - 1, `${first ? ' disabled' : ''} aria-label="หน้าก่อนหน้า"`)}
          ${nums}
          ${btn(`<span>ถัดไป</span>${icon('i-chevron')}`, page + 1, `${last ? ' disabled' : ''} aria-label="หน้าถัดไป"`)}
          ${btn(`<span>สุดท้าย</span>${icon('i-chevron')}${icon('i-chevron', 'icon doc-pager-dbl')}`, pages, `${last ? ' disabled' : ''} class="doc-pager-edge" aria-label="หน้าสุดท้าย"`)}
        </div>
        <label class="doc-pager-size">แสดงต่อหน้า
          <select data-doc-size>${sizes.map(n => `<option value="${n}"${n === pageSize ? ' selected' : ''}>${String(n).replace(/[0-9]/g, d => THAI_DIGITS[d])}</option>`).join('')}</select>
        </label>`;
      enhanceSelects(pager);
    }

    function apply({ focus = false } = {}) {
      const q = norm(search?.value);
      const y = year?.value || '';
      const c = chipCat || cat?.value || '';
      const matched = items.filter(it =>
        (!q || text.get(it).includes(q)) &&
        (!y || it.dataset.year === y) &&
        (!c || it.dataset.cat === c));
      const pages = Math.max(1, Math.ceil(matched.length / pageSize));
      page = Math.min(page, pages);
      const shownItems = matched.slice((page - 1) * pageSize, page * pageSize);
      items.forEach(it => { it.hidden = true; it.classList.remove('is-entering'); });
      shownItems.forEach((it, i) => {
        it.hidden = false;
        if (!reduceMotion()) { it.style.setProperty('--i', Math.min(i, 11)); it.classList.add('is-entering'); }
      });

      const filtered = q || y || c;
      if (count) {
        count.textContent = filtered
          ? `พบ ${matched.length} ${unit} (จากทั้งหมด ${items.length})`
          : `พบ ${items.length} ${unit}`;
      }
      if (empty) empty.hidden = matched.length > 0;
      renderPager(matched.length);
      if (focus) {
        list.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
        shownItems[0]?.querySelector('a')?.focus({ preventScroll: true });
      }
    }

    const reset = () => { page = 1; apply(); };
    search?.addEventListener('input', reset);
    year?.addEventListener('change', reset);
    cat?.addEventListener('change', reset);
    toolbar?.addEventListener('submit', e => e.preventDefault());
    chips.forEach(b => b.addEventListener('click', () => {
      chipCat = b.dataset.docChip;
      chips.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      reset();
    }));
    pager?.addEventListener('change', e => {
      if (!e.target.matches('[data-doc-size]')) return;
      pageSize = Number(e.target.value) || baseSize;
      page = 1;
      apply({ focus: true });
    });
    pager?.addEventListener('click', e => {
      const b = e.target.closest('[data-doc-page]');
      if (!b || b.disabled) return;
      page = Number(b.dataset.docPage);
      apply({ focus: true });
    });
    apply();
  });
}

/* -----------------------------------------------------------------------------
   Lightbox — ลิงก์ที่มี data-lightbox="<กลุ่ม>" (ภาพในแกลเลอรี/ภาพเด่น จาก blocks.js)
   เปิดภาพเต็มในหน้าเดิม เลื่อนภาพในกลุ่มเดียวกันได้ด้วยปุ่ม/ลูกศรซ้ายขวา ปิดด้วย Esc
   -------------------------------------------------------------------------- */
function initLightbox() {
  const links = [...document.querySelectorAll('a[data-lightbox]')].filter(a => a.dataset.lbBound !== '1');
  if (!links.length) return;

  let box = document.getElementById('lightbox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'lightbox';
    box.className = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'ดูภาพขนาดเต็ม');
    box.innerHTML = `
      <div class="lightbox-bar">
        <span data-lb-count aria-live="polite"></span>
        <span>
          <a data-lb-open href="#" target="_blank" rel="noopener noreferrer">เปิดภาพต้นฉบับ<span class="sr-only"> (เปิดในแท็บใหม่)</span></a>
          <button type="button" data-lb-close aria-label="ปิด">ปิด ✕</button>
        </span>
      </div>
      <div class="lightbox-stage"><img alt=""></div>
      <div class="lightbox-foot">
        <p class="lightbox-caption" data-lb-caption hidden></p>
        <div class="lightbox-thumbs" data-lb-thumbs hidden></div>
      </div>
      <button type="button" class="lightbox-prev" data-lb-step="-1" aria-label="ภาพก่อนหน้า">‹</button>
      <button type="button" class="lightbox-next" data-lb-step="1" aria-label="ภาพถัดไป">›</button>`;
    document.body.appendChild(box);
    box.addEventListener('click', e => { if (e.target === box || e.target.classList.contains('lightbox-stage')) box.close(); });
    box.querySelector('[data-lb-close]').addEventListener('click', () => box.close());
    box.querySelectorAll('[data-lb-step]').forEach(b => b.addEventListener('click', () => box.step(Number(b.dataset.lbStep))));
    box.addEventListener('keydown', e => {
      if (e.key === 'Escape') box.close();
      if (e.key === 'ArrowRight') box.step(1);
      if (e.key === 'ArrowLeft') box.step(-1);
    });
    let group = [], index = 0, opener = null;
    box.show = (a) => {
      group = [...document.querySelectorAll(`a[data-lightbox="${CSS.escape(a.dataset.lightbox)}"]`)];
      index = group.indexOf(a); opener = a;
      // แถบภาพย่อ (เมื่อมีตั้งแต่ 2 ภาพ) — ใช้รูปย่อในหน้าเดิม ไม่โหลดภาพเต็มทั้งหมด
      const strip = box.querySelector('[data-lb-thumbs]');
      strip.innerHTML = group.length > 1 ? group.map((g, i) => `<button type="button" data-lb-go="${i}" aria-label="ภาพที่ ${i + 1}"><img src="${g.querySelector('img')?.currentSrc || g.querySelector('img')?.src || g.href}" alt=""></button>`).join('') : '';
      strip.hidden = group.length < 2;
      strip.querySelectorAll('[data-lb-go]').forEach(t => t.addEventListener('click', () => { index = Number(t.dataset.lbGo); box.render(); }));
      box.hidden = false;
      document.documentElement.classList.add('drawer-lock');
      box.render();
      box.querySelector('[data-lb-close]').focus();
    };
    box.render = () => {
      const a = group[index];
      const img = box.querySelector('img');
      const stage = box.querySelector('.lightbox-stage');
      stage.classList.add('is-loading');
      img.onload = img.onerror = () => stage.classList.remove('is-loading');
      img.src = a.href;
      img.alt = a.querySelector('img')?.alt || '';
      box.querySelector('[data-lb-open]').href = a.href;
      box.querySelector('[data-lb-count]').textContent = group.length > 1 ? `ภาพที่ ${index + 1} จาก ${group.length}` : '';
      box.querySelectorAll('[data-lb-step]').forEach(b => { b.hidden = group.length < 2; });
      const cap = box.querySelector('[data-lb-caption]');
      cap.textContent = a.dataset.lbCaption || '';
      cap.hidden = !cap.textContent;
      box.querySelectorAll('[data-lb-go]').forEach((t, i) => {
        t.setAttribute('aria-current', String(i === index));
        if (i === index) t.scrollIntoView({ block: 'nearest', inline: 'center' });
      });
    };
    box.step = d => { if (group.length < 2) return; index = (index + d + group.length) % group.length; box.render(); };
    box.close = () => { box.hidden = true; document.documentElement.classList.remove('drawer-lock'); opener?.focus(); };
  }
  links.forEach(a => {
    a.dataset.lbBound = '1';
    a.addEventListener('click', e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;   // เปิดแท็บใหม่ตามปกติ
      e.preventDefault();
      box.show(a);
    });
  });
}

/* เส้นเวลา (block timeline) — ภาพเคลื่อนไหวตอนเลื่อน
   - รายการค่อย ๆ ปรากฏเมื่อเลื่อนมาถึง (.is-in) การ์ดเข้าจากฝั่งตัวเอง ภาพเข้าจากอีกฝั่ง จุดบนเส้นเปลี่ยนเป็นสีทอง
   - เส้นกลางเติมสีตามตำแหน่งที่อ่าน (--tl-fill 0–1)
   - ลดการเคลื่อนไหว (prefers-reduced-motion / ปุ่มหยุดภาพเคลื่อนไหว) หรือไม่มี IntersectionObserver = แสดงครบทันที */
function initTimeline() {
  const lists = [...document.querySelectorAll('[data-tl]')].filter(l => l.dataset.tlBound !== '1');
  if (!lists.length) return;
  const still = document.body.classList.contains('no-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  lists.forEach(list => {
    list.dataset.tlBound = '1';
    const items = [...list.querySelectorAll('[data-tl-item]')];
    if (still || !('IntersectionObserver' in window)) { items.forEach(it => it.classList.add('is-in')); return; }
    list.classList.add('tl-anim');
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -18% 0px', threshold: 0.12 });
    items.forEach(it => io.observe(it));
    // เส้นเติมสี: จากหัวรายการแรกจนถึงจุดกึ่งกลางจอ
    let ticking = false;
    const fill = () => {
      ticking = false;
      const r = list.getBoundingClientRect();
      const p = (window.innerHeight * 0.55 - r.top) / Math.max(r.height, 1);
      list.style.setProperty('--tl-fill', Math.min(Math.max(p, 0), 1).toFixed(3));
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(fill); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    fill();
  });
}

/* [data-reveal] — ปรากฏเมื่อเลื่อนมาถึง (เช่น แผนผัง org-chart ทีละชั้น)
   ใส่ .reveal-ready ก่อน (CSS ซ่อนเฉพาะเมื่อมีคลาสนี้ — ไม่มี JS ก็เห็นครบ) แล้วใส่ .is-in เมื่อเข้าจอ */
/* image-band แบบ cover (blocks.js imageBand):
   - ภาพเลื่อนช้ากว่าหน้า (parallax) — ตั้ง --py ที่ .ib-media
   - ข้อความเด่น [data-fill] ค่อย ๆ เติมสีตามการเลื่อน (--fill 0..1) เต็มแล้ววลีสำคัญสว่างเป็นสีทอง (.is-lit)
   ผู้ใช้ตั้งลดการเคลื่อนไหว: ไม่ตั้งค่า = CSS แสดงข้อความครบ (--fill ค่าเริ่มต้น 1) และไม่มี parallax */
function initImageBands() {
  const bands = [...document.querySelectorAll('.block-image-band.is-img-cover')].filter(b => b.dataset.ibBound !== '1');
  const fills = [...document.querySelectorAll('[data-fill]')].filter(f => f.dataset.ibBound !== '1');
  if (!bands.length && !fills.length) return;
  [...bands, ...fills].forEach(el => { el.dataset.ibBound = '1'; });
  const still = () => document.body.classList.contains('no-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    const off = still();
    bands.forEach(b => {
      const media = b.querySelector('.ib-media');
      if (!media) return;
      if (off) { media.style.removeProperty('--py'); return; }
      const r = b.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (vh - r.top) / (vh + r.height);          // 0 = เพิ่งโผล่ขอบล่างจอ · 1 = พ้นขอบบนจอ
      media.style.setProperty('--py', `${((p - 0.5) * r.height * 0.18).toFixed(1)}px`);
    });
    fills.forEach(f => {
      const st = f.closest('.ib-statement');
      if (off) { f.style.removeProperty('--fill'); st?.classList.add('is-lit'); return; }
      const r = f.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.92 - r.top) / (vh * 0.42)));
      f.style.setProperty('--fill', p.toFixed(3));
      st?.classList.toggle('is-lit', p >= 0.97);
    });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

/* annotated-figure (blocks.js annotatedFigure): ชี้/โฟกัสที่หมุดหรือรายการ → ไฮไลต์คู่กัน
   กดหมุดบนจอแคบ (ภาพอยู่เหนือรายการ) → เลื่อนไปที่รายการนั้น */
function initAnnotated() {
  document.querySelectorAll('[data-af-root]').forEach(root => {
    if (root.dataset.afBound === '1') return;
    root.dataset.afBound = '1';
    const items = [...root.querySelectorAll('[data-af]')];
    const set = idx => items.forEach(el => el.classList.toggle('is-active', idx !== null && el.dataset.af === idx));
    items.forEach(el => {
      el.addEventListener('pointerenter', () => set(el.dataset.af));
      el.addEventListener('focus', () => set(el.dataset.af));
    });
    root.addEventListener('pointerleave', () => set(null));
    root.addEventListener('focusout', e => { if (!root.contains(e.relatedTarget)) set(null); });
    root.querySelectorAll('.af-pin').forEach(pin => pin.addEventListener('click', () => {
      set(pin.dataset.af);
      const part = root.querySelector(`.af-part[data-af="${pin.dataset.af}"]`);
      if (!part || !window.matchMedia('(max-width: 899px)').matches) return;
      const still = document.body.classList.contains('no-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      part.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
    }));
  });
}

/* stat-row countUp: ตัวเลข [data-count] นับขึ้นจาก 0 เมื่อเลื่อนถึง (ทศนิยมคงจำนวนหลักเดิม)
   ลดการเคลื่อนไหว / ไม่มี IntersectionObserver = แสดงค่าจริงทันที */
/* card-grid layout "guide": ปุ่มสลับมุมมอง ตาราง/รายการ — จำค่าที่เลือกไว้ (localStorage 'orst-guide-view') */
function initGuideViews() {
  document.querySelectorAll('[data-guide]').forEach(root => {
    if (root.dataset.guideBound === '1') return;
    root.dataset.guideBound = '1';
    const btns = [...root.querySelectorAll('[data-guide-view]')];
    const set = v => {
      root.dataset.view = v;
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.guideView === v)));
    };
    let saved = null;
    try { saved = localStorage.getItem('orst-guide-view'); } catch { /* ไม่มีพื้นที่จัดเก็บ */ }
    if (saved === 'list' || saved === 'grid') set(saved);
    btns.forEach(b => b.addEventListener('click', () => {
      set(b.dataset.guideView);
      try { localStorage.setItem('orst-guide-view', b.dataset.guideView); } catch { /* ไม่เป็นไร */ }
    }));
  });
}

/* page-index (แผนผังเว็บไซต์): ค้นหาหน้า (กรองทันทีที่พิมพ์ รองรับเลขไทย/อารบิก) + ปุ่มทางลัดไปหมวด */
function initPageIndex() {
  const norm = s => String(s || '').replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d))).toLowerCase().replace(/\s+/g, ' ').trim();
  document.querySelectorAll('[data-page-index]').forEach(root => {
    if (root.dataset.pidxBound === '1') return;
    root.dataset.pidxBound = '1';
    const input = root.querySelector('[data-index-search]');
    const empty = root.querySelector('[data-index-empty]');
    const groups = [...root.querySelectorAll('.index-group')];
    const secs = [...root.querySelectorAll('[data-index-sec]')].filter(el => !el.classList.contains('index-group'));
    const items = groups.map(g => [...g.querySelectorAll('.index-item')].map(li => [li, norm(li.textContent)]));
    // ชื่อกลุ่มย่อย + ชื่อหมวดใหญ่ ใช้ค้นหาได้ด้วย (พิมพ์ "ผู้บริหาร" แล้วเห็นทั้งกลุ่ม)
    const heads = groups.map(g => norm([g.querySelector('.index-group-head, h4')?.textContent, g.closest('[data-index-sec]')?.dataset.indexSec].join(' ')));
    input?.addEventListener('input', () => {
      const q = norm(input.value);
      let shown = 0;
      groups.forEach((g, i) => {
        const headHit = q && heads[i].includes(q);
        let n = 0;
        items[i].forEach(([li, t]) => { const ok = !q || headHit || t.includes(q); li.hidden = !ok; if (ok) n++; });
        g.hidden = n === 0;
        shown += n;
      });
      secs.forEach(sec => { sec.hidden = ![...sec.querySelectorAll('.index-group')].some(g => !g.hidden); });
      if (empty) empty.hidden = shown > 0;
    });
    root.querySelectorAll('[data-index-jump]').forEach(btn => btn.addEventListener('click', () => {
      if (input && input.value) { input.value = ''; input.dispatchEvent(new Event('input')); }
      const target = [...secs, ...groups].find(g => g.dataset.indexSec === btn.dataset.indexJump);
      if (!target) return;
      const still = document.body.classList.contains('no-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const top = target.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: still ? 'auto' : 'smooth' });
      target.classList.remove('is-flash'); void target.offsetWidth; target.classList.add('is-flash');
      target.querySelector('a')?.focus({ preventScroll: true });
    }));
  });
}

function initCopy() {
  document.querySelectorAll('[data-copy]').forEach(btn => {
    if (btn.dataset.copyBound === '1') return;
    btn.dataset.copyBound = '1';
    // ค่าที่เป็นลิงก์ภายในเว็บ (เช่น rss.xml) แปลงเป็น URL เต็มตามโดเมนที่เปิดอยู่ ทั้งค่าที่คัดลอกและข้อความที่แสดง
    if (btn.hasAttribute('data-copy-url')) {
      try {
        const abs = new URL(btn.dataset.copy, location.href).href;
        const shown = btn.parentElement?.querySelector(':scope > span');
        if (shown && shown.textContent.trim() === btn.dataset.copy) shown.textContent = abs;
        btn.dataset.copy = abs;
      } catch { /* คงค่าเดิม */ }
    }
    btn.addEventListener('click', async () => {
      const label = btn.querySelector('[data-copy-label]');
      const en = document.documentElement.lang === 'en';
      if (label && btn._origLabel == null) btn._origLabel = label.textContent;
      // Clipboard API ก่อน · ถ้าไม่อนุญาต (บางเบราว์เซอร์/iframe) ใช้วิธีเลือกข้อความชั่วคราวแล้ว execCommand('copy')
      const copyText = async text => {
        try { await navigator.clipboard.writeText(text); return true; } catch { /* ใช้วิธีสำรอง */ }
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(ta); ta.select();
        let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
        ta.remove(); btn.focus({ preventScroll: true });
        return ok;
      };
      try {
        if (!(await copyText(btn.dataset.copy))) return;
        btn.classList.add('is-copied');
        if (label) label.textContent = en ? 'Copied' : 'คัดลอกแล้ว';
        clearTimeout(btn._copyT);
        btn._copyT = setTimeout(() => { btn.classList.remove('is-copied'); if (label) label.textContent = btn._origLabel ?? (en ? 'Copy' : 'คัดลอก'); }, 2000);
      } catch { /* เบราว์เซอร์ไม่อนุญาต — ผู้ใช้เลือกข้อความเองได้ */ }
    });
  });
}

function initCountUp() {
  const els = [...document.querySelectorAll('[data-count]')].filter(el => el.dataset.countBound !== '1');
  if (!els.length) return;
  const still = document.body.classList.contains('no-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !('IntersectionObserver' in window)) return;
  const fmt = (n, dec) => n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const run = el => {
    const target = parseFloat(el.dataset.count);
    const dec = (el.dataset.count.split('.')[1] || '').length;
    const t0 = performance.now(), dur = 1600 + Math.min(target, 200) * 3;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * e, dec);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmt(target, dec);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { io.unobserve(e.target); run(e.target); }
  }), { threshold: 0.6 });
  els.forEach(el => {
    el.dataset.countBound = '1';
    el.textContent = fmt(0, (el.dataset.count.split('.')[1] || '').length);
    io.observe(el);
  });
}

/* =============================================================================
   ปฏิทินกิจกรรมแบบ Google Calendar (blocks.js eventCalendar) — ข้อมูลจาก CMS ไม่ใช้ Google
   มุมมอง: วัน · สัปดาห์ · เดือน · กำหนดการ — ปุ่มวันนี้ / ก่อนหน้า / ถัดไป · เลือกหน่วยงานที่แสดง
   เดือน: กิจกรรมหลายวันเป็นแถบยาวต่อกัน เกิน 3 รายการ = "อีก N รายการ" · กดวันที่ = ไปมุมมองวัน
   สัปดาห์/วัน: แถว "ทั้งวัน" + ตารางชั่วโมง (กิจกรรมที่มีเวลา start "YYYY-MM-DDTHH:MM") + เส้นเวลาปัจจุบัน
   กดกิจกรรม = การ์ดรายละเอียด (Esc / คลิกนอก / ปุ่มปิด) · แป้นลัดแบบ Google: t d w m a, j/n ถัดไป, k/p ก่อนหน้า
   จอแคบ: เริ่มที่มุมมองกำหนดการ · เดือนแสดงเป็นจุดสี กดวันเพื่อดูรายการ
   ============================================================================= */
function initCalendars() {
  document.querySelectorAll('[data-gcal]').forEach(root => {
    if (root.dataset.gcalBound === '1') return;
    root.dataset.gcalBound = '1';
    let data;
    try { data = JSON.parse(root.querySelector('[data-gcal-data]')?.textContent || '{}'); } catch { return; }
    calendarApp(root, data);
  });
}

function calendarApp(root, data) {
  const EN = ORST_LANG === 'en';
  const LOCALE = EN ? 'en-GB' : 'th-TH';
  const T = EN
    ? { allDay: 'All day', more: n => `${n} more`, none: 'No events in this period', close: 'Close', unit: 'Unit', place: 'Location', details: 'Details', today: 'Today' }
    : { allDay: 'ทั้งวัน', more: n => `อีก ${n} รายการ`, none: 'ไม่มีกิจกรรมในช่วงนี้', close: 'ปิด', unit: 'หน่วยงาน', place: 'สถานที่', details: 'ดูรายละเอียด', today: 'วันนี้' };
  const body = root.querySelector('[data-gcal-body]');
  const title = root.querySelector('[data-gcal-title]');
  const pop = root.querySelector('[data-gcal-pop]');
  const viewBtns = [...root.querySelectorAll('[data-gcal-view]')];
  const narrow = () => window.matchMedia('(max-width: 719px)').matches;
  const still = () => document.body.classList.contains('no-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const escH = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---- วันที่ ----
  const DAY = 86400000;
  const atMidnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const weekStart = d => addDays(atMidnight(d), -((d.getDay() + 6) % 7));            // สัปดาห์เริ่มวันจันทร์
  const parse = v => {
    const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    return m ? { date: new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0), timed: Boolean(m[4]) } : null;
  };
  const key = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const fmt = (d, o) => new Intl.DateTimeFormat(LOCALE, o).format(d);
  const fmtTime = d => fmt(d, { hour: '2-digit', minute: '2-digit', hour12: false });

  // ---- ข้อมูล ----
  const events = (data.events || []).map((e, i) => {
    const s = parse(e.start);
    if (!s) return null;
    const en = parse(e.end);
    const allDay = !s.timed;
    let end = en ? en.date : s.date;
    if (allDay) end = atMidnight(end);
    else if (!en) end = new Date(s.date.getTime() + 60 * 60000);                   // ไม่มีเวลาจบ = 1 ชั่วโมง
    if (end < s.date) end = s.date;
    return { ...e, i, s: s.date, e: end, allDay, d0: atMidnight(s.date), d1: atMidnight(end) };
  }).filter(Boolean).sort((a, b) => a.s - b.s || (b.d1 - b.d0) - (a.d1 - a.d0));
  const hidden = new Set();
  const visible = () => events.filter(e => !hidden.has(e.unit));
  const onDay = (list, d) => list.filter(e => e.d0 <= d && e.d1 >= d);

  // ---- สถานะเริ่มต้น: วันนี้ — ถ้าเดือนนี้ไม่มีกิจกรรม ไปเดือนของกิจกรรมที่ใกล้วันนี้ที่สุด ----
  const today = atMidnight(new Date());
  let cursor = today;
  if (events.length && !events.some(e => e.d0.getMonth() === today.getMonth() && e.d0.getFullYear() === today.getFullYear())) {
    const next = events.find(e => e.d1 >= today);
    cursor = atMidnight((next || events[events.length - 1]).s);
  }
  let view = narrow() ? 'schedule' : 'month';

  // ---- ชิ้นส่วน HTML ----
  const chip = (e, extra = '') => `<button type="button" class="gcal-ev${e.allDay ? ' is-allday' : ' is-timed'}${extra}" data-ev="${e.i}" style="--c:var(--cal-${e.color || 1})" title="${escH(e.title)}">${e.allDay ? '' : `<span class="gcal-ev-dot" aria-hidden="true"></span><span class="gcal-ev-time">${fmtTime(e.s)}</span>`}<span class="gcal-ev-title">${escH(e.title)}</span></button>`;
  const weekdayNames = Array.from({ length: 7 }, (_, i) => fmt(addDays(new Date(2024, 0, 1), i), { weekday: 'short' }));   // 1 ม.ค. 2024 = วันจันทร์

  // เรียงแถบกิจกรรมในช่วงวัน [from, from+n) เป็นชั้น (lane) ไม่ทับกัน
  function lanes(list, from, n) {
    const to = addDays(from, n - 1);
    const segs = list.filter(e => e.allDay || e.d1 > e.d0 ? e.d0 <= to && e.d1 >= from : false)
      .map(e => ({ e, c0: Math.max(0, Math.round((e.d0 - from) / DAY)), c1: Math.min(n - 1, Math.round((e.d1 - from) / DAY)) }));
    const rows = [];
    segs.forEach(sg => {
      let r = rows.findIndex(row => row.every(o => sg.c1 < o.c0 || sg.c0 > o.c1));
      if (r < 0) { rows.push([]); r = rows.length - 1; }
      rows[r].push(sg); sg.lane = r;
    });
    return segs;
  }

  // ---- มุมมองเดือน ----
  function renderMonth() {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = weekStart(first);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const weeks = Math.ceil((Math.round((last - start) / DAY) + 1) / 7);
    const list = visible();
    const MAX = narrow() ? 0 : 3;
    let html = `<div class="gcal-month" style="--weeks:${weeks}"><div class="gcal-dow">${weekdayNames.map(n => `<span>${n}</span>`).join('')}</div>`;
    for (let w = 0; w < weeks; w++) {
      const ws = addDays(start, w * 7);
      const segs = lanes(list, ws, 7);
      // กิจกรรมที่มีเวลา (วันเดียว) ต่อท้ายชั้นของวันนั้น
      const timed = list.filter(e => !e.allDay && e.d0.getTime() === e.d1.getTime() && e.d0 >= ws && e.d0 <= addDays(ws, 6));
      const used = Array.from({ length: 7 }, () => new Set());
      segs.forEach(sg => { for (let c = sg.c0; c <= sg.c1; c++) used[c].add(sg.lane); });
      timed.forEach(e => {
        const c = Math.round((e.d0 - ws) / DAY);
        let l = 0; while (used[c].has(l)) l++;
        used[c].add(l);
        segs.push({ e, c0: c, c1: c, lane: l });
      });
      const hiddenCount = Array(7).fill(0);
      segs.forEach(sg => { if (sg.lane >= MAX) for (let c = sg.c0; c <= sg.c1; c++) hiddenCount[c]++; });
      html += `<div class="gcal-week"><div class="gcal-cells">`;
      for (let c = 0; c < 7; c++) {
        const d = addDays(ws, c);
        const out = d.getMonth() !== cursor.getMonth();
        const n = onDay(list, d).length;
        html += `<div class="gcal-cell${out ? ' is-out' : ''}${sameDay(d, today) ? ' is-today' : ''}${n ? ' has-ev' : ''}">
          <button type="button" class="gcal-date" data-goto="${key(d)}" aria-label="${escH(fmt(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}${n ? ` · ${n}` : ''}">${d.getDate() === 1 && !narrow() ? escH(fmt(d, { day: 'numeric', month: 'short' })) : d.getDate()}</button>
          ${narrow() && n ? `<span class="gcal-dots" aria-hidden="true">${onDay(list, d).slice(0, 3).map(e => `<i style="--c:var(--cal-${e.color})"></i>`).join('')}</span>` : ''}
        </div>`;
      }
      html += `</div><div class="gcal-bars" style="--lanes:${Math.max(MAX, 1) + 1}">`;
      segs.filter(sg => sg.lane < MAX).forEach(sg => {
        const contL = sg.e.d0 < addDays(ws, sg.c0), contR = sg.e.d1 > addDays(ws, sg.c1);
        html += `<div class="gcal-bar" style="grid-column:${sg.c0 + 1} / ${sg.c1 + 2};grid-row:${sg.lane + 1}">${chip(sg.e, `${contL ? ' cont-l' : ''}${contR ? ' cont-r' : ''}`)}</div>`;
      });
      hiddenCount.forEach((n, c) => { if (n) html += `<div class="gcal-bar" style="grid-column:${c + 1};grid-row:${MAX + 1}"><button type="button" class="gcal-more" data-more="${key(addDays(ws, c))}">${escH(T.more(n))}</button></div>`; });
      html += `</div></div>`;
    }
    html += `</div>`;
    if (narrow()) html += `<div class="gcal-daylist" data-daylist></div>`;
    return html;
  }

  // ---- มุมมองสัปดาห์ / วัน ----
  const HOUR = 48;   // px ต่อชั่วโมง
  function renderTimeGrid(n) {
    const start = n === 7 ? weekStart(cursor) : atMidnight(cursor);
    const list = visible();
    const days = Array.from({ length: n }, (_, i) => addDays(start, i));
    const segs = lanes(list, start, n);
    const laneCount = segs.reduce((m, s) => Math.max(m, s.lane + 1), 0);
    let html = `<div class="gcal-tg" style="--cols:${n}">
      <div class="gcal-tg-head"><span class="gcal-tg-gutter"></span>${days.map(d => `<button type="button" class="gcal-tg-day${sameDay(d, today) ? ' is-today' : ''}" data-goto="${key(d)}"><small>${escH(fmt(d, { weekday: 'short' }))}</small><b>${d.getDate()}</b></button>`).join('')}</div>
      <div class="gcal-tg-allday"><span class="gcal-tg-gutter">${escH(T.allDay)}</span><div class="gcal-bars" style="--lanes:${Math.max(laneCount, 1)};--cols:${n}">${segs.map(sg => {
        const contL = sg.e.d0 < addDays(start, sg.c0), contR = sg.e.d1 > addDays(start, sg.c1);
        return `<div class="gcal-bar" style="grid-column:${sg.c0 + 1} / ${sg.c1 + 2};grid-row:${sg.lane + 1}">${chip(sg.e, `${contL ? ' cont-l' : ''}${contR ? ' cont-r' : ''}`)}</div>`;
      }).join('')}</div></div>
      <div class="gcal-tg-scroll" data-tg-scroll><div class="gcal-tg-grid" style="--hour:${HOUR}px">
        <div class="gcal-tg-hours">${Array.from({ length: 24 }, (_, h) => `<span>${h ? fmtTime(new Date(2024, 0, 1, h)) : ''}</span>`).join('')}</div>`;
    days.forEach(d => {
      const timed = list.filter(e => !e.allDay && e.d0 <= d && e.d1 >= d && !(e.d1 > e.d0));
      // กิจกรรมเวลาทับกัน: แบ่งความกว้างตามจำนวนที่ทับ
      const cols = [];
      timed.forEach(e => { let c = cols.findIndex(end => end <= e.s); if (c < 0) { cols.push(e.e); c = cols.length - 1; } else cols[c] = e.e; e._col = c; });
      html += `<div class="gcal-tg-col${sameDay(d, today) ? ' is-today' : ''}">${timed.map(e => {
        const top = (e.s.getHours() * 60 + e.s.getMinutes()) / 60 * HOUR;
        const h = Math.max(22, (e.e - e.s) / 3600000 * HOUR);
        return `<div class="gcal-tg-ev" style="top:${top}px;height:${h}px;left:calc(${e._col} * 100% / ${cols.length});width:calc(100% / ${cols.length} - 4px)">${chip(e)}</div>`;
      }).join('')}${sameDay(d, today) ? `<span class="gcal-now" style="top:${(new Date().getHours() * 60 + new Date().getMinutes()) / 60 * HOUR}px" aria-hidden="true"></span>` : ''}</div>`;
    });
    html += `</div></div></div>`;
    return html;
  }

  // ---- มุมมองกำหนดการ ----
  function renderSchedule() {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const list = visible().filter(e => e.d1 >= from && e.d0 <= to);
    if (!list.length) return `<p class="gcal-empty">${escH(T.none)}</p>`;
    const byDay = new Map();
    list.forEach(e => {
      const d = e.d0 < from ? from : e.d0;
      const k = key(d);
      if (!byDay.has(k)) byDay.set(k, { d, items: [] });
      byDay.get(k).items.push(e);
    });
    return `<ol class="gcal-sched">${[...byDay.values()].sort((a, b) => a.d - b.d).map(g => `
      <li class="gcal-sched-day${sameDay(g.d, today) ? ' is-today' : ''}">
        <button type="button" class="gcal-sched-date" data-goto="${key(g.d)}"><b>${g.d.getDate()}</b><small>${escH(fmt(g.d, { month: 'short', weekday: 'short' }))}</small></button>
        <ul>${g.items.map(e => `<li><button type="button" class="gcal-sched-ev" data-ev="${e.i}" style="--c:var(--cal-${e.color || 1})">
          <span class="gcal-sched-dot" aria-hidden="true"></span>
          <span class="gcal-sched-time">${e.allDay ? (e.d1 > e.d0 ? escH(rangeText(e)) : escH(T.allDay)) : `${fmtTime(e.s)} – ${fmtTime(e.e)}`}</span>
          <span class="gcal-sched-title">${escH(e.title)}${e.location ? `<small>${escH(e.location)}</small>` : ''}</span>
        </button></li>`).join('')}</ul>
      </li>`).join('')}</ol>`;
  }

  function rangeText(e) {
    const o = { day: 'numeric', month: 'long', year: 'numeric' };
    if (e.allDay) {
      if (e.d1 > e.d0) {
        const f = new Intl.DateTimeFormat(LOCALE, o);
        return f.formatRange ? f.formatRange(e.d0, e.d1) : `${f.format(e.d0)} – ${f.format(e.d1)}`;
      }
      return fmt(e.d0, { weekday: 'long', ...o });
    }
    return `${fmt(e.s, { weekday: 'long', ...o })} · ${fmtTime(e.s)} – ${fmtTime(e.e)}`;
  }

  // ---- วาดใหม่ ----
  function titleText() {
    if (view === 'day') return fmt(cursor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'week') {
      const a = weekStart(cursor), b = addDays(a, 6);
      const f = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
      return f.formatRange ? f.formatRange(a, b) : `${f.format(a)} – ${f.format(b)}`;
    }
    return fmt(cursor, { month: 'long', year: 'numeric' });
  }
  function render({ focusTitle = false } = {}) {
    closePop();
    viewBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.gcalView === view)));
    title.textContent = titleText();
    root.dataset.view = view;
    body.innerHTML = view === 'month' ? renderMonth() : view === 'week' ? renderTimeGrid(7) : view === 'day' ? renderTimeGrid(1) : renderSchedule();
    const sc = body.querySelector('[data-tg-scroll]');
    if (sc) sc.scrollTop = 7 * HOUR;                                                    // เริ่มที่ 07:00 แบบ Google
    if (!still()) { body.classList.remove('is-anim'); void body.offsetWidth; body.classList.add('is-anim'); }
    if (focusTitle) title.focus?.();
  }
  const step = dir => {
    if (view === 'day') cursor = addDays(cursor, dir);
    else if (view === 'week') cursor = addDays(cursor, dir * 7);
    else cursor = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
    render();
  };
  const setView = v => { view = v; render(); };
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m, d); };

  // ---- การ์ดรายละเอียด / รายการของวัน ----
  let popFrom = null;
  function placePop(anchor) {
    pop.hidden = false;
    const r = root.getBoundingClientRect(), a = anchor.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = a.left - r.left + a.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, r.width - w - 8));
    let top = a.bottom - r.top + 8;
    if (a.bottom + h + 16 > window.innerHeight && a.top - h - 8 > 0) top = a.top - r.top - h - 8;
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    if (!still()) { pop.classList.remove('is-in'); void pop.offsetWidth; pop.classList.add('is-in'); }
  }
  function openEvent(i, anchor) {
    const e = events.find(x => x.i === i);
    if (!e) return;
    popFrom = anchor;
    const uid = pop.getAttribute('aria-labelledby');
    pop.innerHTML = `
      <div class="gcal-pop-bar"><button type="button" class="gcal-icon-btn" data-pop-close aria-label="${escH(T.close)}">${icon('i-x')}</button></div>
      <div class="gcal-pop-main" style="--c:var(--cal-${e.color || 1})">
        <span class="gcal-pop-sw" aria-hidden="true"></span>
        <div><h3 id="${escH(uid)}">${escH(e.title)}</h3><p>${escH(rangeText(e))}</p></div>
      </div>
      ${e.location ? `<p class="gcal-pop-row">${icon('i-pin')}<span><span class="sr-only">${escH(T.place)}: </span>${escH(e.location)}</span></p>` : ''}
      ${e.unit ? `<p class="gcal-pop-row">${icon('i-calendar')}<span><span class="sr-only">${escH(T.unit)}: </span>${escH(e.unit)}</span></p>` : ''}
      ${e.url ? `<a class="gcal-pop-link" href="${escH(e.url)}">${escH(T.details)} ${icon('i-arrow')}</a>` : ''}`;
    placePop(anchor);
    pop.querySelector('[data-pop-close]').focus({ preventScroll: true });
  }
  function openDay(d, anchor) {
    const list = onDay(visible(), d);
    popFrom = anchor;
    const uid = pop.getAttribute('aria-labelledby');
    pop.innerHTML = `
      <div class="gcal-pop-bar"><button type="button" class="gcal-icon-btn" data-pop-close aria-label="${escH(T.close)}">${icon('i-x')}</button></div>
      <div class="gcal-pop-day"><small>${escH(fmt(d, { weekday: 'short' }))}</small><button type="button" data-goto="${key(d)}" id="${escH(uid)}">${d.getDate()}</button></div>
      <div class="gcal-pop-list">${list.map(e => chip(e)).join('')}</div>`;
    placePop(anchor);
    pop.querySelector('[data-pop-close]').focus({ preventScroll: true });
  }
  function closePop() {
    if (pop.hidden) return;
    pop.hidden = true;
    pop.innerHTML = '';
    const back = popFrom; popFrom = null;
    if (back && document.contains(back)) back.focus({ preventScroll: true });
  }

  // ---- เหตุการณ์ ----
  root.querySelector('[data-gcal-today]').addEventListener('click', () => { cursor = today; render(); });
  root.querySelector('[data-gcal-prev]').addEventListener('click', () => step(-1));
  root.querySelector('[data-gcal-next]').addEventListener('click', () => step(1));
  viewBtns.forEach(b => b.addEventListener('click', () => setView(b.dataset.gcalView)));
  root.querySelectorAll('[data-gcal-unit]').forEach(b => b.addEventListener('click', () => {
    const u = b.dataset.gcalUnit;
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    if (on) hidden.delete(u); else hidden.add(u);
    render();
  }));
  root.addEventListener('click', e => {
    const ev = e.target.closest('[data-ev]');
    if (ev) { openEvent(Number(ev.dataset.ev), ev); return; }
    const more = e.target.closest('[data-more]');
    if (more) { openDay(fromKey(more.dataset.more), more); return; }
    const go = e.target.closest('[data-goto]');
    if (go) {
      const d = fromKey(go.dataset.goto);
      if (view === 'month' && narrow()) {                                               // จอแคบ: แสดงรายการของวันใต้ปฏิทิน
        body.querySelectorAll('.gcal-cell.is-picked').forEach(c => c.classList.remove('is-picked'));
        go.closest('.gcal-cell')?.classList.add('is-picked');
        const box = body.querySelector('[data-daylist]');
        const list = onDay(visible(), d);
        box.innerHTML = `<p class="gcal-daylist-head">${escH(fmt(d, { weekday: 'long', day: 'numeric', month: 'long' }))}</p>${list.length ? list.map(x => chip(x)).join('') : `<p class="gcal-empty">${escH(T.none)}</p>`}`;
        return;
      }
      cursor = d; view = 'day'; render();
      return;
    }
    if (e.target.closest('[data-pop-close]')) closePop();
  });
  document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('[data-ev],[data-more]')) closePop(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !pop.hidden) { closePop(); return; }
    // แป้นลัดแบบ Google Calendar — ทำงานเมื่อปฏิทินอยู่บนจอ และไม่ได้พิมพ์ในช่องกรอก
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const r = root.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    const k = e.key.toLowerCase();
    const map = { t: () => { cursor = today; render(); }, d: () => setView('day'), w: () => setView('week'), m: () => setView('month'), a: () => setView('schedule'), j: () => step(1), n: () => step(1), k: () => step(-1), p: () => step(-1) };
    if (map[k]) { e.preventDefault(); map[k](); }
  });
  let lastNarrow = narrow();
  window.addEventListener('resize', () => {
    const n = narrow();
    if (n !== lastNarrow) { lastNarrow = n; if (view === 'month') render(); }
  });
  render();
}

function initReveal() {
  const els = [...document.querySelectorAll('[data-reveal]')].filter(e => e.dataset.revealBound !== '1');
  if (!els.length) return;
  const still = document.body.classList.contains('no-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -15% 0px', threshold: 0.1 });
  els.forEach(el => { el.dataset.revealBound = '1'; el.classList.add('reveal-ready'); io.observe(el); });
}

/* ดูตัวอย่างเอกสาร PDF (ปุ่ม "ดูตัวอย่าง" ใน block document-list)
   - เปิดหน้าต่างซ้อน ฝัง PDF ด้วย iframe (ตัวแสดง PDF ของเบราว์เซอร์) โหลดไฟล์เฉพาะตอนกด
   - เบราว์เซอร์ที่แสดง PDF ในหน้าไม่ได้ (navigator.pdfViewerEnabled === false เช่น Chrome บน Android)
     ซ่อนปุ่มนี้ไว้ เหลือ "เปิดเอกสาร" (แท็บใหม่) อย่างเดียว
   - ปิดด้วยปุ่มปิด / Esc / คลิกพื้นหลัง แล้วโฟกัสกลับไปที่ปุ่มเดิม */
function initDocPreview() {
  const btns = [...document.querySelectorAll('[data-doc-preview]')].filter(b => b.dataset.dpBound !== '1');
  if (!btns.length) return;
  if (navigator.pdfViewerEnabled === false) return;   // ปุ่มแบบ <button> ซ่อนอยู่แล้ว · แบบลิงก์ <a> เปิดแท็บใหม่ตามปกติ

  let box = document.getElementById('doc-preview');
  if (!box) {
    box = document.createElement('div');
    box.id = 'doc-preview';
    box.className = 'doc-preview';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'doc-preview-title');
    box.innerHTML = `
      <div class="doc-preview-panel">
        <div class="doc-preview-bar">
          <span class="doc-preview-badge" aria-hidden="true">PDF</span>
          <strong id="doc-preview-title"></strong>
          <a class="doc-btn" data-dp-open href="#" target="_blank" rel="noopener noreferrer">${icon('i-external')}<span>เปิดในแท็บใหม่</span></a>
          <button type="button" class="doc-preview-close" data-dp-close aria-label="ปิดตัวอย่างเอกสาร">${icon('i-x')}</button>
        </div>
        <div class="doc-preview-stage">
          <div class="doc-preview-loading" aria-hidden="true">
            <div class="doc-skel-page"><span class="skel skel-line is-40"></span><span class="skel skel-line is-90"></span><span class="skel skel-line is-90"></span><span class="skel skel-line is-70"></span><span class="skel skel-block"></span><span class="skel skel-line is-90"></span><span class="skel skel-line is-90"></span><span class="skel skel-line is-50"></span></div>
            <p>กำลังโหลดเอกสาร…</p>
          </div>
          <iframe title="ตัวอย่างเอกสาร" src="about:blank"></iframe>
        </div>
      </div>`;
    document.body.appendChild(box);
    const frame = box.querySelector('iframe');
    let opener = null;
    box.show = btn => {
      opener = btn;
      box.querySelector('#doc-preview-title').textContent = btn.dataset.docTitle || 'เอกสาร';
      box.querySelector('[data-dp-open]').href = btn.dataset.docPreview;
      frame.title = `ตัวอย่างเอกสาร: ${btn.dataset.docTitle || ''}`;
      const stage = box.querySelector('.doc-preview-stage');
      stage.classList.add('is-loading');
      frame.onload = () => { if (frame.src !== 'about:blank') stage.classList.remove('is-loading'); };
      frame.src = `${btn.dataset.docPreview}#view=FitH`;
      box.hidden = false;
      document.documentElement.classList.add('drawer-lock');
      box.querySelector('[data-dp-close]').focus();
    };
    box.close = () => {
      box.hidden = true;
      frame.src = 'about:blank';
      document.documentElement.classList.remove('drawer-lock');
      opener?.focus();
    };
    box.addEventListener('click', e => { if (e.target === box) box.close(); });
    box.querySelector('[data-dp-close]').addEventListener('click', () => box.close());
    box.addEventListener('keydown', e => {
      if (e.key === 'Escape') box.close();
      if (e.key === 'Tab') {   // วนโฟกัสอยู่ในหน้าต่าง
        const f = [...box.querySelectorAll('a[href], button, iframe')];
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  btns.forEach(b => {
    b.dataset.dpBound = '1';
    b.hidden = false;
    b.addEventListener('click', e => {
      if (b.tagName === 'A' && (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) return;   // เปิดแท็บใหม่ตามปกติ
      e.preventDefault();
      box.show(b);
    });
  });
}

/* -----------------------------------------------------------------------------
   Dropdown แบบกำหนดหน้าตาเอง — ครอบ <select> ในแถบเครื่องมือ (ปี / เรียงลำดับ / จำนวนต่อหน้า)
   รายการตัวเลือกของ <select> ปกติแต่งหน้าตาไม่ได้ (เบราว์เซอร์วาดเอง พื้นฟ้า) จึงสร้างปุ่ม + listbox แทน
   - <select> เดิมยังอยู่ (ซ่อน) เป็นตัวเก็บค่า เปลี่ยนค่าแล้วส่ง event "change" เหมือนเดิม — โค้ดที่ฟังอยู่ไม่ต้องแก้
   - คีย์บอร์ด: Enter/Space/↓ เปิด, ↑↓ Home End เลื่อน, Enter เลือก, Esc/Tab ปิด, พิมพ์อักษรแรกเพื่อกระโดด
   - เรียกซ้ำได้ (ข้าม select ที่ครอบแล้ว) — ใช้หลังสร้างเนื้อหาใหม่ เช่น ตัวแบ่งหน้า
   -------------------------------------------------------------------------- */
const UI_SELECT_TARGETS = '.doc-year-pill select, .doc-field select, .doc-pager-size select, .kb-select select, .kb-per select, select.ui-select';
let uiSelectSeq = 0;

function enhanceSelects(root = document) {
  root.querySelectorAll(UI_SELECT_TARGETS).forEach(sel => {
    if (sel.dataset.uiSelect === '1' || sel.multiple) return;
    sel.dataset.uiSelect = '1';
    const id = `ui-select-${++uiSelectSeq}`;
    const wrap = document.createElement('span');
    wrap.className = 'ui-select';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('ui-select-native');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');

    const label = sel.getAttribute('aria-label')
      || sel.closest('label')?.querySelector('.sr-only, span')?.textContent?.trim()
      || sel.closest('label')?.childNodes[0]?.textContent?.trim() || '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-select-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', `${id}-list`);
    btn.innerHTML = `<span class="ui-select-value"></span>${icon('i-chevron', 'icon ui-select-caret')}`;
    const list = document.createElement('ul');
    list.className = 'ui-select-list';
    list.id = `${id}-list`;
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;
    list.hidden = true;
    if (label) { btn.setAttribute('aria-label', `${label}: ${sel.selectedOptions[0]?.text || ''}`); list.setAttribute('aria-label', label); }
    wrap.append(btn, list);

    let active = sel.selectedIndex;
    const opts = () => [...list.querySelectorAll('[role="option"]')];
    const render = () => {
      list.innerHTML = [...sel.options].map((o, i) => `
        <li role="option" id="${id}-o${i}" data-index="${i}" aria-selected="${i === sel.selectedIndex}"${o.disabled ? ' aria-disabled="true"' : ''}>
          <span>${o.text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>${icon('i-check', 'icon ui-select-check')}
        </li>`).join('');
      btn.querySelector('.ui-select-value').textContent = sel.selectedOptions[0]?.text || '';
      if (label) btn.setAttribute('aria-label', `${label}: ${sel.selectedOptions[0]?.text || ''}`);
    };
    const setActive = i => {
      const all = opts();
      if (!all.length) return;
      active = Math.max(0, Math.min(all.length - 1, i));
      all.forEach((li, k) => li.classList.toggle('is-active', k === active));
      list.setAttribute('aria-activedescendant', all[active].id);
      all[active].scrollIntoView({ block: 'nearest' });
    };
    const open = () => {
      if (!list.hidden) return;
      render();
      list.hidden = false;
      wrap.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      // ชิดขวาถ้าล้นจอ
      wrap.classList.toggle('is-right', wrap.getBoundingClientRect().left + list.offsetWidth > window.innerWidth - 8);
      setActive(sel.selectedIndex);
      list.focus({ preventScroll: true });
    };
    const close = (focusBtn = true) => {
      if (list.hidden) return;
      list.hidden = true;
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (focusBtn) btn.focus({ preventScroll: true });
    };
    const choose = i => {
      const o = sel.options[i];
      if (!o || o.disabled) return;
      const changed = sel.selectedIndex !== i;
      sel.selectedIndex = i;
      render();
      close();
      if (changed) sel.dispatchEvent(new Event('change', { bubbles: true }));
    };

    btn.addEventListener('click', () => (list.hidden ? open() : close()));
    btn.addEventListener('keydown', e => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); }
    });
    list.addEventListener('click', e => {
      const li = e.target.closest('[role="option"]');
      if (li) choose(Number(li.dataset.index));
    });
    list.addEventListener('mousemove', e => {
      const li = e.target.closest('[role="option"]');
      if (li && Number(li.dataset.index) !== active) setActive(Number(li.dataset.index));
    });
    list.addEventListener('keydown', e => {
      const n = opts().length;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(n - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') close(false);
      else if (e.key.length === 1) {
        const k = e.key.toLowerCase();
        const start = (active + 1) % n;
        for (let j = 0; j < n; j++) {
          const idx = (start + j) % n;
          if (sel.options[idx].text.trim().toLowerCase().startsWith(k)) { setActive(idx); break; }
        }
      }
    });
    document.addEventListener('pointerdown', e => { if (!wrap.contains(e.target)) close(false); });
    // ค่าเปลี่ยนจากโค้ดอื่น (เช่น ปุ่มล้างค่า) — อัปเดตข้อความบนปุ่ม
    sel.addEventListener('change', render);
    render();
  });
}

/* เมนูลัดในหน้า (block "anchor-nav") — ไฮไลต์หัวข้อที่กำลังอ่าน (aria-current) ขณะเลื่อน
   จอแคบ: เมนูเลื่อนแนวนอนได้ เลื่อนลิงก์ที่ไฮไลต์ให้อยู่ในมุมมองอัตโนมัติ */
function initAnchorNav() {
  document.querySelectorAll('[data-anchor-nav]').forEach(nav => {
    if (nav.dataset.anBound === '1') return;
    nav.dataset.anBound = '1';
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const targets = links.map(a => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
    if (!targets.length || !('IntersectionObserver' in window)) return;
    const list = nav.querySelector('ul');
    const setActive = id => links.forEach(a => {
      const on = a.hash.slice(1) === id;
      if (on) {
        a.setAttribute('aria-current', 'true');
        // เลื่อนเมนูแนวนอนเฉพาะในแถบเมนูเอง (ไม่ใช้ scrollIntoView เพื่อไม่ให้ทั้งหน้าเลื่อนตาม)
        if (list && list.scrollWidth > list.clientWidth) {
          list.scrollTo({ left: a.offsetLeft - list.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
        }
      } else a.removeAttribute('aria-current');
    });
    const visible = new Map();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => visible.set(e.target.id, e.isIntersecting));
      const current = targets.find(t => visible.get(t.id));
      if (current) setActive(current.id);
      // ยังเลื่อนไม่ถึงหัวข้อแรก (อยู่ที่ hero) — ไม่ไฮไลต์อะไร
      else if (targets[0].getBoundingClientRect().top > window.innerHeight * 0.45) setActive('');
    }, { rootMargin: '-35% 0px -55% 0px' });
    targets.forEach(t => io.observe(t));
  });
}

/* แถบเมนูย่อยของหมวด — จอใหญ่เปิดค้าง จอเล็ก (< 1024px) พับไว้ แตะเพื่อเปิด */
function initSectionNav() {
  const wide = window.matchMedia('(min-width: 1024px)').matches;
  document.querySelectorAll('[data-section-nav]').forEach(d => { d.open = wide; });
}

/* ปุ่มแชร์ (block "share") — ใส่ลิงก์ของหน้าปัจจุบันตอนเปิดหน้า */
function initShare() {
  document.querySelectorAll('[data-share]').forEach(el => {
    if (el.dataset.shareBound === '1') return;
    el.dataset.shareBound = '1';
    const url = encodeURIComponent(location.href.split('#')[0]);
    const text = encodeURIComponent(document.title);
    const kind = el.dataset.share;
    if (kind === 'facebook') el.href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    if (kind === 'line') el.href = `https://social-plugins.line.me/lineit/share?url=${url}`;
    if (kind === 'x') el.href = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
    if (kind === 'print') {   // ปุ่ม "พิมพ์" ในหัวหน้าเพจข่าว
      el.addEventListener('click', () => window.print());
      return;
    }
    if (kind === 'copy') {
      el.addEventListener('click', async () => {
        const status = el.parentElement.querySelector('[data-share-status]');
        try {
          await navigator.clipboard.writeText(location.href.split('#')[0]);
          if (status) status.textContent = 'คัดลอกลิงก์แล้ว';
        } catch {
          if (status) status.textContent = 'คัดลอกไม่ได้ — คัดลอกจากแถบที่อยู่ของเบราว์เซอร์';
        }
      });
    }
  });
}

/* -----------------------------------------------------------------------------
   Sticky header — คำนวณความสูงของ #app-header (ซึ่ง CSS ตั้งเป็น position:fixed)
   แล้วเก็บไว้ใน --fixed-header-height เพื่อดัน padding-top ให้ <body>
   ทุกหน้าที่มี #app-header จะได้พฤติกรรมนี้อัตโนมัติ ไม่ต้องเขียนซ้ำในหน้าใหม่
   (เดิมโค้ดชุดนี้ถูก copy ไว้ใน index/knowledge/contact แยกกันคนละชุด)
   -------------------------------------------------------------------------- */
function syncFixedHeaderHeight() {
  const header = document.getElementById('app-header');
  if (!header) return;

  document.body.classList.add('has-fixed-header');

  const height = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--fixed-header-height', height + 'px');

  header.classList.toggle('is-scrolled', window.scrollY > 8);
}

function initFixedHeader() {
  const header = document.getElementById('app-header');
  if (!header) return;

  window.addEventListener('load', syncFixedHeaderHeight);
  window.addEventListener('resize', syncFixedHeaderHeight);
  window.addEventListener('scroll', syncFixedHeaderHeight, { passive: true });

  syncFixedHeaderHeight();

  if ('ResizeObserver' in window) {
    new ResizeObserver(syncFixedHeaderHeight).observe(header);
  }

  // header สูงขึ้นได้หลังฟอนต์/รูปโหลดเสร็จ จึงวัดซ้ำอีก 2 รอบ
  setTimeout(syncFixedHeaderHeight, 100);
  setTimeout(syncFixedHeaderHeight, 400);
}

// ปุ่มแชท Messenger: เปิด/ปิดการ์ด, ปิดด้วย Esc / คลิกนอกการ์ด / กดปุ่มปิด
function initChat() {
  const widget = document.querySelector('[data-chat]');
  if (!widget) return;
  const toggle = widget.querySelector('[data-chat-toggle]');
  const panel = widget.querySelector('.chat-panel');

  const setOpen = (open, { focus = true } = {}) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    widget.classList.toggle('is-open', open);
    if (open && focus) widget.querySelector('.chat-cta')?.focus();
    if (!open && focus) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  widget.querySelector('[data-chat-close]').addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) setOpen(false);
  });
  document.addEventListener('click', e => {
    if (!panel.hidden && !widget.contains(e.target)) setOpen(false, { focus: false });
  });
}

// ปุ่ม "ขึ้นบนสุด" ใน footer
function initScrollTop() {
  document.querySelectorAll('[data-scroll-top]').forEach(btn => {
    btn.addEventListener('click', () => {
      const reduce = document.body.classList.contains('no-motion')
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  });
}

function initComponents() {
  const headerMount = document.getElementById('app-header');
  const footerMount = document.getElementById('app-footer');

  if (headerMount) {
    headerMount.innerHTML = renderHeader();
    document.body.insertAdjacentHTML('beforeend', renderDrawer(activeNavKey()));
  }
  if (footerMount) {
    footerMount.innerHTML = renderFooter();
  }

  initMegaMenu();
  initDrawer();
  initSharedModals();
  initSharedSearch();
  initMediaTabs();
  initLightbox();   // หน้าแรก: อินโฟกราฟิกเปิดดูภาพเต็มในหน้าเดิม (หน้า JSON เรียกซ้ำผ่าน bindDynamicContent ได้ ไม่ผูกซ้ำ)
  initCompactFAQ();
  initNewsEventsTabs();
  initPageTransitions();
  initImageSkeletons();
  initA11y();
  initFixedHeader();
  initScrollTop();
  initChat();
  initCookieBar();
  // ภาษาไทย: แปลงเลขเป็นเลขไทย · ภาษาอังกฤษ: โหลดคำแปลแล้วแปลข้อความทั้งหน้า (ไม่แปลงเลขไทย)
  if (ORST_LANG === 'en') I18N.load().then(I18N.start);
  else initThaiDigits();
}

/* faq ที่เปิด "search": true — ค้นหาคำถาม/คำตอบ (เลขไทย = เลขอารบิก) · จำนวนที่พบ · ขยาย/ย่อทั้งหมด */
function initFaqTools() {
  const norm = t => String(t || '').replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d))).toLowerCase().replace(/\s+/g, ' ').trim();
  document.querySelectorAll('[data-faq-tools]').forEach(tools => {
    if (tools.dataset.bound === '1') return;
    tools.dataset.bound = '1';
    tools.hidden = false;
    const list = tools.parentElement.querySelector('.faq-compact-list');
    const empty = tools.parentElement.querySelector('[data-faq-empty]');
    const input = tools.querySelector('[data-faq-search]');
    const n = tools.querySelector('[data-faq-n]');
    const all = tools.querySelector('[data-faq-all]');
    const items = [...list.querySelectorAll('.faq-item')];
    const setOpen = (item, open) => {
      const q = item.querySelector('.faq-q');
      q.setAttribute('aria-expanded', String(open));
      item.querySelector('.faq-a').hidden = !open;
    };
    const syncAll = () => {
      const shown = items.filter(i => !i.hidden);
      const allOpen = shown.length > 0 && shown.every(i => i.querySelector('.faq-q').getAttribute('aria-expanded') === 'true');
      all.setAttribute('aria-pressed', String(allOpen));
      all.children[0].hidden = allOpen;
      all.children[1].hidden = !allOpen;
    };
    input.addEventListener('input', () => {
      const q = norm(input.value);
      let count = 0;
      items.forEach(item => {
        const ok = !q || norm(item.textContent).includes(q);
        item.hidden = !ok;
        if (ok) count++;
      });
      n.textContent = String(count);
      if (empty) empty.hidden = count > 0;
      syncAll();
    });
    all.addEventListener('click', () => {
      const open = all.getAttribute('aria-pressed') !== 'true';
      items.filter(i => !i.hidden).forEach(i => setOpen(i, open));
      syncAll();
    });
    list.addEventListener('click', e => { if (e.target.closest('.faq-q')) setTimeout(syncAll); });
  });
}

/* ปฏิทินกิจกรรม (block event-calendar): ปุ่มกรองตามหน่วยงาน — ซ่อนกิจกรรม/หัวเดือนที่ไม่ตรง */
/* รูปย่อในการ์ด/อัลบั้ม: แสดงพื้นวิบวับ (skeleton) จนกว่ารูปโหลดเสร็จ แล้วค่อย ๆ แสดงรูป */
const IMG_SKEL = '.block-media-thumb, .news-row-thumb, .album-photo, .block-card-media, .person-photo, .article-hero-media';
function initImageSkeletons(root = document) {
  root.querySelectorAll(IMG_SKEL).forEach(box => {
    const img = box.querySelector('img');
    if (!img || box.dataset.skel) return;
    box.dataset.skel = '1';
    const done = () => box.classList.add('img-ready');
    if (img.complete && img.naturalWidth) { done(); return; }
    box.classList.add('img-skel');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
}

/* เปลี่ยนหน้า: กดลิงก์ภายในเว็บ → แถบความคืบหน้าด้านบน + เนื้อหาจางลง (เว็บเป็นหลายหน้า โหลดใหม่ทุกครั้ง)
   ไม่ทำกับลิงก์ที่ตัวอื่นจัดการแล้ว (preventDefault) แท็บใหม่ ดาวน์โหลด หรือ #anchor ในหน้าเดียวกัน */
function initPageTransitions() {
  if (document.documentElement.dataset.navBound) return;
  document.documentElement.dataset.navBound = '1';
  const bar = document.createElement('div');
  bar.className = 'nav-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  const reset = () => document.documentElement.classList.remove('is-leaving');
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;   // #anchor ในหน้าเดิม
    document.documentElement.classList.add('is-leaving');
  });
  window.addEventListener('pageshow', reset);   // กลับมาด้วยปุ่มย้อนกลับ (bfcache)
  window.addEventListener('pagehide', () => setTimeout(reset, 0));
}

function initEventFilters() {
  document.querySelectorAll('[data-evcal-filter]').forEach(bar => {
    if (bar.dataset.bound === '1') return;
    bar.dataset.bound = '1';
    bar.hidden = false;
    const side = bar.closest('.evcal-side');
    const list = side.querySelector('[data-evcal-list]');
    const empty = side.querySelector('[data-evcal-empty]');
    const edge = () => bar.classList.toggle('is-end', bar.scrollLeft + bar.clientWidth >= bar.scrollWidth - 4);
    bar.addEventListener('scroll', edge, { passive: true });
    edge();
    bar.addEventListener('click', e => {
      const btn = e.target.closest('button[data-unit]');
      if (!btn) return;
      const unit = btn.dataset.unit;
      bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      let shown = 0;
      list.querySelectorAll('.evcal-month').forEach(m => {
        let n = 0;
        m.querySelectorAll('.evcal-item').forEach(it => {
          const ok = !unit || it.dataset.unit === unit;
          it.hidden = !ok;
          if (ok) n++;
        });
        m.hidden = n === 0;
        shown += n;
      });
      if (empty) empty.hidden = shown > 0;
      list.scrollTop = 0;
    });
  });
}

/* =============================================================================
   แถบขอความยินยอมคุกกี้ (ผังเว็บไซต์ ORST: นโยบายคุกกี้และแถบขอความยินยอม)
   เว็บนี้ไม่มีคุกกี้ติดตาม/วิเคราะห์ — ใช้ localStorage เท่าที่จำเป็น (ภาษา มุมมองรายการ ค่าความยินยอม)
   ค่าที่เลือกเก็บใน localStorage "orst-cookie-consent" = all | necessary
   ถ้าภายหลังเพิ่มระบบสถิติ (เช่น Google Analytics) ให้โหลดเฉพาะเมื่อ window.orstConsent() === 'all'
   ============================================================================= */
const CONSENT_KEY = 'orst-cookie-consent';
window.orstConsent = () => { try { return localStorage.getItem(CONSENT_KEY) || ''; } catch { return ''; } };

/* หน้านโยบายคุกกี้: แผง "การตั้งค่าคุกกี้ของท่าน" ใน [data-cookie-prefs]
   แสดงสถานะปัจจุบัน + เปลี่ยนได้ทันที (ยอมรับทั้งหมด / เฉพาะที่จำเป็น) + ล้างข้อมูลที่เว็บไซต์นี้จัดเก็บในเบราว์เซอร์
   เลือก "เฉพาะที่จำเป็น" = ลบคำค้นล่าสุดด้วย · เลือกแล้วปิดแถบขอความยินยอม (ถ้ายังแสดงอยู่) */
function initCookiePrefs() {
  document.querySelectorAll('[data-cookie-prefs]').forEach(root => {
    if (root.dataset.bound === '1') return;
    root.dataset.bound = '1';
    const T = s => (I18N.lang === 'en' ? I18N.translate(s) : s);
    const STATUS = { all: 'ยอมรับทั้งหมด', necessary: 'เฉพาะที่จำเป็น', '': 'ยังไม่ได้เลือก' };
    root.innerHTML = `
      <div class="cookie-prefs-status">
        <span class="cookie-prefs-ic" aria-hidden="true">${icon('i-shield')}</span>
        <div>
          <p class="cookie-prefs-label">${T('สถานะปัจจุบัน')}</p>
          <p class="cookie-prefs-value" data-consent-status aria-live="polite"></p>
        </div>
      </div>
      <div class="cookie-prefs-options" role="group" aria-label="${T('เลือกการใช้คุกกี้')}">
        <button type="button" class="cookie-pref" data-set-consent="all" aria-pressed="false">
          <strong>${T('ยอมรับทั้งหมด')}</strong>
          <small>${T('จดจำการตั้งค่าและคำค้นล่าสุด เพื่อความสะดวกในการใช้งาน')}</small>
        </button>
        <button type="button" class="cookie-pref" data-set-consent="necessary" aria-pressed="false">
          <strong>${T('เฉพาะที่จำเป็น')}</strong>
          <small>${T('จดจำเฉพาะภาษา การช่วยการเข้าถึง และมุมมองที่เลือก')}</small>
        </button>
      </div>
      <div class="cookie-prefs-clear">
        <p>${T('ต้องการเริ่มใหม่? ล้างข้อมูลทั้งหมดที่เว็บไซต์นี้จัดเก็บในเบราว์เซอร์ของท่าน การตั้งค่าจะกลับเป็นค่าเริ่มต้น')}</p>
        <button type="button" class="cookie-clear" data-clear-storage>${icon('i-x')}<span>${T('ล้างข้อมูลที่จัดเก็บ')}</span></button>
      </div>
      <p class="cookie-prefs-done" data-cookie-done hidden role="status"></p>`;
    const status = root.querySelector('[data-consent-status]');
    const done = root.querySelector('[data-cookie-done]');
    const flash = msg => { done.textContent = msg; done.hidden = false; clearTimeout(root._t); root._t = setTimeout(() => { done.hidden = true; }, 3000); };
    const paint = () => {
      const v = window.orstConsent();
      status.textContent = T(STATUS[v] ?? STATUS['']);
      root.querySelectorAll('[data-set-consent]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setConsent === v)));
    };
    const hideBar = () => document.querySelector('[data-cookie-bar]')?.remove();
    root.querySelectorAll('[data-set-consent]').forEach(b => b.addEventListener('click', () => {
      try {
        localStorage.setItem(CONSENT_KEY, b.dataset.setConsent);
        if (b.dataset.setConsent === 'necessary') localStorage.removeItem('orst-recent-search');
      } catch { /* โหมดส่วนตัว */ }
      hideBar(); paint();
      flash(T('บันทึกการตั้งค่าแล้ว'));
    }));
    root.querySelector('[data-clear-storage]').addEventListener('click', () => {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
        keys.filter(k => /^(orst-|kb-view|doc-view)/.test(k || '')).forEach(k => localStorage.removeItem(k));
        sessionStorage.removeItem('orst-a11y-hello');
      } catch { /* โหมดส่วนตัว */ }
      paint();
      flash(T('ล้างข้อมูลแล้ว แถบขอความยินยอมจะแสดงอีกครั้งเมื่อเปิดหน้าถัดไป'));
    });
    paint();
  });
}

/* หน้า "การเข้าถึงเว็บไซต์": แผงทดลองเครื่องมือ [data-a11y-showcase]
   การ์ดละเครื่องมือ (ไอคอนชุดเดียวกับแผงช่วยการเข้าถึง) กดเพื่อเปิด/ปิดได้ทันที — สั่งงานผ่านปุ่มในแผงจริง สถานะจึงตรงกันเสมอ
   ขนาดตัวอักษร: ปุ่ม − / + และค่าปัจจุบัน */
function initA11yShowcase() {
  document.querySelectorAll('[data-a11y-showcase]').forEach(root => {
    if (root.dataset.bound === '1') return;
    const panel = document.querySelector('[data-a11y]');
    if (!panel) return;
    root.dataset.bound = '1';
    const T = s => (I18N.lang === 'en' ? I18N.translate(s) : s);
    const DESC = {
      contrast: 'เปลี่ยนสีพื้นและตัวอักษรให้ตัดกันชัดเจน',
      readable: 'พื้นหลังสีนวล ตัวอักษรใหญ่และเข้มขึ้น อ่านสบายตา',
      links: 'ขีดเส้นใต้และเน้นลิงก์ทุกจุดให้เห็นชัด',
      headings: 'เน้นหัวข้อให้เห็นโครงสร้างของหน้าได้ง่าย',
      spacing: 'เพิ่มระยะห่างระหว่างบรรทัดและตัวอักษร',
      motion: 'หยุดภาพเคลื่อนไหวและเอฟเฟกต์ต่าง ๆ',
      cursor: 'ขยายตัวชี้เมาส์ให้มองเห็นง่าย',
      reader: 'อ่านเนื้อหาของหน้า หรือข้อความที่เลือกไว้ออกเสียง',
    };
    const G = I18N.lang === 'en' ? 'A' : 'ก';   // ตัวอย่างตัวอักษรบนปุ่มขนาด
    const svg = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    root.innerHTML = `
      <div class="a11y-sc-font">
        <div>
          <strong>${T('ขนาดตัวอักษร')}</strong>
          <small>${T('ปรับได้ตั้งแต่ 90% ถึง 130%')}</small>
        </div>
        <div class="a11y-sc-font-ctrl">
          <button type="button" data-sc-font="-1" aria-label="${T('ลดขนาดตัวอักษร')}">${G}−</button>
          <output data-sc-font-val aria-live="polite">100%</output>
          <button type="button" data-sc-font="1" aria-label="${T('เพิ่มขนาดตัวอักษร')}">${G}+</button>
        </div>
      </div>
      <ul class="a11y-sc-grid">
        ${A11Y_TOOLS.map(([key, , name, icon]) => `
        <li><button type="button" class="a11y-sc-tile" data-sc-tool="${key}" aria-pressed="false">
          <span class="a11y-sc-ic">${svg(icon)}</span>
          <span class="a11y-sc-text"><strong>${T(name)}</strong><small>${T(DESC[key] || '')}</small></span>
          <span class="a11y-sc-state" aria-hidden="true"><i></i></span>
        </button></li>`).join('')}
      </ul>
      <div class="a11y-sc-foot">
        <button type="button" class="a11y-sc-reset" data-sc-reset>${T('คืนค่าเริ่มต้นทั้งหมด')}</button>
      </div>`;
    const sync = () => {
      root.querySelectorAll('[data-sc-tool]').forEach(b => {
        const tile = panel.querySelector(`[data-a11y-tool="${b.dataset.scTool}"]`);
        b.setAttribute('aria-pressed', tile?.getAttribute('aria-pressed') === 'true' ? 'true' : 'false');
      });
      const val = panel.querySelector('[data-a11y-font-val]')?.textContent || '100%';
      root.querySelector('[data-sc-font-val]').textContent = val;
      root.querySelector('[data-sc-font="-1"]').disabled = !!panel.querySelector('[data-a11y-font="-1"]')?.disabled;
      root.querySelector('[data-sc-font="1"]').disabled = !!panel.querySelector('[data-a11y-font="1"]')?.disabled;
    };
    root.addEventListener('click', e => {
      const tool = e.target.closest('[data-sc-tool]');
      const font = e.target.closest('[data-sc-font]');
      if (tool) panel.querySelector(`[data-a11y-tool="${tool.dataset.scTool}"]`)?.click();
      else if (font) panel.querySelector(`[data-a11y-font="${font.dataset.scFont}"]`)?.click();
      else if (e.target.closest('[data-sc-reset]')) panel.querySelector('[data-a11y-reset]')?.click();
      else return;
      e.stopPropagation();
      sync();
    });
    // เปลี่ยนจากแผงจริง (หรือหยุดอ่านออกเสียงเอง) → อัปเดตการ์ด
    new MutationObserver(sync).observe(panel, { subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'disabled'], childList: true, characterData: true });
    sync();
  });
}

function initCookieBar() {
  if (window.orstConsent()) return;
  // ข้อความอ้างอิงจากหน้านโยบายคุกกี้ (content/pages/cookie-policy.json) และสิ่งที่โค้ดจัดเก็บจริง — แก้คู่กันเสมอ
  const stored = [
    ['การเลือกภาษา', 'จดจำภาษาที่เลือก (ไทย / อังกฤษ)'],
    ['การแสดงผล', 'จดจำขนาดตัวอักษรและเครื่องมือช่วยการเข้าถึงที่เลือก'],
    ['มุมมองรายการ', 'จดจำรูปแบบการแสดงผลแบบตารางหรือรายการ'],
    ['ค่าความยินยอม', 'จดจำการตอบแถบขอความยินยอมคุกกี้'],
  ];
  document.body.insertAdjacentHTML('beforeend', `
    <section class="cookie-bar" aria-labelledby="cookie-title" data-cookie-bar>
      <div class="container cookie-bar-inner">
        <span class="cookie-ic" aria-hidden="true">${icon('i-shield')}</span>
        <div class="cookie-text">
          <h2 class="cookie-title" id="cookie-title">การใช้คุกกี้และพื้นที่จัดเก็บข้อมูลในเบราว์เซอร์</h2>
          <p>เว็บไซต์สำนักงานราชบัณฑิตยสภาใช้คุกกี้และพื้นที่จัดเก็บข้อมูลในเบราว์เซอร์ (Local Storage) เท่าที่จำเป็นต่อการให้บริการ เพื่อจดจำการตั้งค่าของท่าน เช่น ภาษา ขนาดตัวอักษร และรูปแบบการแสดงผล โดยไม่ใช้คุกกี้เพื่อติดตามพฤติกรรมหรือโฆษณา</p>
          <p>ท่านสามารถเลือก “ยอมรับทั้งหมด” หรือ “เฉพาะที่จำเป็น” และลบข้อมูลที่จัดเก็บได้ทุกเมื่อจากการตั้งค่าของเบราว์เซอร์ ศึกษารายละเอียดเพิ่มเติมได้ที่
            <a href="${basePath}cookie-policy.html">นโยบายคุกกี้ (Cookies Policy)</a> และ
            <a href="${basePath}privacy-policy.html">นโยบายการคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy)</a></p>
          <div class="cookie-more" id="cookie-more" inert>
            <div class="cookie-more-inner">
              <p class="cookie-more-head"><strong>คุกกี้ที่จำเป็น</strong><span class="cookie-always">เปิดใช้งานตลอดเวลา</span></p>
              <dl class="cookie-list">
                ${stored.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('')}
              </dl>
            </div>
          </div>
        </div>
        <div class="cookie-actions">
          <button type="button" class="cookie-bar-btn" data-consent="all">ยอมรับทั้งหมด</button>
          <button type="button" class="cookie-bar-btn is-ghost" data-consent="necessary">เฉพาะที่จำเป็น</button>
          <button type="button" class="cookie-toggle" aria-expanded="false" aria-controls="cookie-more" data-cookie-more>
            <span>รายละเอียดคุกกี้</span>${icon('i-chevron', 'icon cookie-toggle-ic')}
          </button>
        </div>
      </div>
    </section>`);
  const bar = document.querySelector('[data-cookie-bar]');
  const more = bar.querySelector('#cookie-more');
  const toggle = bar.querySelector('[data-cookie-more]');
  const reduced = () => document.body.classList.contains('no-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  // แถบเต็มความกว้าง: ปุ่มลอย (ช่วยการเข้าถึง / แชท) ต้องยกขึ้นเหนือแถบ — ส่งความสูงให้ CSS
  const fit = () => document.body.style.setProperty('--cookie-h', `${bar.offsetHeight}px`);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(fit) : null;
  ro ? ro.observe(bar) : window.addEventListener('resize', fit);
  fit();
  requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('is-in')));

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    bar.classList.toggle('is-more', open);
    more.inert = !open;
  });
  bar.addEventListener('click', e => {
    const btn = e.target.closest('[data-consent]');
    if (!btn || bar.classList.contains('is-out')) return;
    try { localStorage.setItem(CONSENT_KEY, btn.dataset.consent); } catch { /* โหมดส่วนตัว — แค่ปิดแถบ */ }
    const close = () => {
      ro?.disconnect();
      window.removeEventListener('resize', fit);
      document.body.style.removeProperty('--cookie-h');
      bar.remove();
    };
    if (reduced()) { close(); return; }
    bar.classList.add('is-out');
    setTimeout(close, 350);
  });
}

/* =============================================================================
   เลขไทย — แปลงตัวเลข 0-9 ในข้อความที่แสดงบนหน้าเป็น ๐-๙ ทั้งเว็บ (ลูกค้าต้องการ)
   - แปลงเฉพาะ "ข้อความ" ไม่แตะ attribute: ลิงก์ tel:/mailto:/URL, value ของฟอร์ม, aria-label คงเดิม
   - ไม่แปลงคำที่มีอักษรละตินหรือ @ ปนอยู่ (อีเมล ชื่อไฟล์ รหัสภาษาอังกฤษ)
   - ข้ามส่วนที่ไม่ควรแปลง: <code> <pre> <textarea> ช่องกรอก และอะไรก็ได้ที่ใส่ data-keep-digits / lang="en"
   - เนื้อหาที่ JS ใส่ทีหลัง (ผลค้นหา หน้า JSON) แปลงอัตโนมัติด้วย MutationObserver
   แหล่งข้อมูล (HTML/JSON) ยังเป็นเลขอารบิก — ค้นหา/แก้ไขเนื้อหาได้ตามปกติ
   ============================================================================= */
const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';
const KEEP_DIGITS = 'script,style,code,pre,textarea,input,select,option,[data-keep-digits],[lang="en"]';

function thaiDigitsIn(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!/[0-9]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      const el = node.parentElement;
      return !el || el.closest(KEEP_DIGITS) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const next = node.nodeValue.replace(/\S+/g, word =>
      /[A-Za-z@]/.test(word) ? word : word.replace(/[0-9]/g, d => THAI_DIGITS[d]));
    if (next !== node.nodeValue) node.nodeValue = next;
  });
}

function initThaiDigits() {
  thaiDigitsIn(document.body);
  document.title = document.title.replace(/\S+/g, w => /[A-Za-z@]/.test(w) ? w : w.replace(/[0-9]/g, d => THAI_DIGITS[d]));
  // MutationObserver รวมการเปลี่ยนแปลงเป็นชุดให้อยู่แล้ว — แปลงในชุดนั้นเลย
  // (การแปลงซ้ำไม่วนไม่จบ เพราะรอบถัดไปไม่เหลือเลข 0-9 ให้แปลง)
  new MutationObserver(records => {
    const targets = new Set();
    records.forEach(r => targets.add(r.type === 'characterData' ? r.target.parentElement : r.target));
    targets.forEach(el => el && el.isConnected && thaiDigitsIn(el));
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComponents);
} else {
  initComponents();
}

/* ---------- เครื่องเล่นวิดีโอ YouTube (ป๊อปอัป) ใช้ได้ทุกหน้า ----------
   ลิงก์ที่มี data-yt="<รหัส YouTube>" (+ data-yt-title) กดแล้วเล่นในป๊อปอัป — ใช้ youtube-nocookie (ไม่ตั้งคุกกี้จนกว่าจะกดเล่น)
   ลิงก์ยังชี้ไป YouTube จริง: เปิด JavaScript ไม่ได้ / กด Ctrl/⌘ = เปิดแท็บใหม่ตามปกติ
   ผูก event ครั้งเดียวที่ document — วิดีโอที่วาดทีหลัง (หน้า JSON / แบ่งหน้า) ใช้ได้ทันที */
function initVideoPlayer() {
  if (document.documentElement.dataset.ytBound === '1') return;
  document.documentElement.dataset.ytBound = '1';
  let box = null;
  let last = null;

  const close = () => {
    if (!box || box.hidden) return;
    box.hidden = true;
    box.querySelector('iframe').src = 'about:blank';
    document.documentElement.classList.remove('yt-player-open');
    last?.focus();
  };

  const open = (id, title, trigger) => {
    if (!box) {
      box = document.createElement('div');
      box.className = 'yt-player';
      box.hidden = true;
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-labelledby', 'yt-player-title');
      box.innerHTML = `
        <div class="yt-player-backdrop" data-yt-close></div>
        <div class="yt-player-box">
          <div class="yt-player-bar">
            <strong id="yt-player-title"></strong>
            <a class="yt-player-ext" href="#" target="_blank" rel="noopener noreferrer">ดูบน YouTube<span class="sr-only"> (เปิดในแท็บใหม่)</span></a>
            <button type="button" class="yt-player-x" data-yt-close aria-label="ปิดวิดีโอ">${icon('i-x')}</button>
          </div>
          <div class="yt-player-frame"><iframe title="" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen src="about:blank"></iframe></div>
        </div>`;
      document.body.append(box);
      box.addEventListener('click', e => { if (e.target.closest('[data-yt-close]')) close(); });
      box.addEventListener('keydown', e => {
        if (e.key === 'Escape') close();
        if (e.key === 'Tab') {   // กักโฟกัสไว้ในป๊อปอัป
          const f = [...box.querySelectorAll('a[href], button, iframe')];
          const i = f.indexOf(document.activeElement);
          if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        }
      });
    }
    last = trigger;
    box.querySelector('#yt-player-title').textContent = title;
    box.querySelector('.yt-player-ext').href = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    const frame = box.querySelector('iframe');
    frame.title = `วิดีโอ: ${title}`;
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    box.hidden = false;
    document.documentElement.classList.add('yt-player-open');
    box.querySelector('.yt-player-x').focus();
  };

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-yt]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    open(a.dataset.yt, a.dataset.ytTitle || '', a);
  });
}

window.orstHeader = {
  basePath,
  navItems,
  megaMenuData,
  renderMegaMenu,
  renderHeader,
  renderFooter,
  syncFixedHeaderHeight,
  // เรียกซ้ำได้หลังจากเพิ่มเนื้อหาเข้า DOM ทีหลัง (เช่น หน้าที่ render จาก JSON)
  bindDynamicContent() {
    initCompactFAQ();
    initDocLists();
    enhanceSelects();
    initLightbox();
    initDocPreview();
    initTimeline();
    initReveal();
    initImageBands();
    initAnnotated();
    initCountUp();
    initCopy();
    initCookiePrefs();
    initA11yShowcase();
    initPageIndex();
    initGuideViews();
    initVideoPlayer();
    initAnchorNav();
    initShare();
    initSectionNav();
    initMediaTabs();
    initNewsEventsTabs();
    initEventFilters();
    initCalendars();
    initFaqTools();
    initImageSkeletons();
    syncFixedHeaderHeight();
  },
};
