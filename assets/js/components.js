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
      // content/pages/<slug>.json -> content/pages/en/<slug>.json · content/news/<f>.json -> content/en/news/<f>.json
      // content/<file>.json -> content/en/<file>.json
      const enPath = path
        .replace(/(^|\/)content\/news\/([^/]+\.json)$/, '$1content/en/news/$2')
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
  ['ขั้นตอนการสั่งซื้อหนังสือและวิธีการชำระเงิน', `${basePath}book-ordering.html`],
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
  // หัวคอลัมน์: เส้นทองสั้น + ชื่อไทย + ชื่ออังกฤษ
  const colHead = (th, en) => `<h3 class="orst-footer-head"><span>${th}</span><small lang="en">${en}</small></h3>`;
  const links = items => items.map(([text, url]) => `<li><a href="${url}"${extAttrs(url)}>${text}${extMark(url)}</a></li>`).join('');
  const webmaster = WEBMASTER_EMAIL
    ? [`อีเมลผู้ดูแลเว็บไซต์ (Webmaster)`, `mailto:${WEBMASTER_EMAIL}`]
    : ['อีเมลผู้ดูแลเว็บไซต์ (Webmaster)', `${basePath}contact.html#message-form`];

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
            <ul>${links(navItems.map(([key, label, href]) => [label, href || megaMenuData[key]?.groups[0]?.links[0]?.[1]]).filter(([, href]) => href))}</ul>
          </nav>

          <nav class="orst-footer-col" aria-label="ข้อมูลเว็บไซต์และนโยบาย">
            ${colHead('ข้อมูลเว็บไซต์และนโยบาย', 'Website &amp; Policies')}
            <ul>${links([
              webmaster,
              ['ผังเว็บไซต์ (Sitemap)', `${basePath}sitemap.html`],
              ['เว็บลิงก์หน่วยงานที่เกี่ยวข้อง', `${basePath}related-links.html`],
              ['การปฏิเสธความรับผิด (Disclaimer)', `${basePath}disclaimer.html`],
              ['นโยบายเว็บไซต์ (Website Policy)', `${basePath}website-policy.html`],
              ['นโยบายการคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy)', `${basePath}privacy-policy.html`],
              ['นโยบายคุกกี้ (Cookies Policy)', `${basePath}cookie-policy.html`],
              ['นโยบายการรักษาความมั่นคงปลอดภัยเว็บไซต์ (Website Security Policy)', `${basePath}security-policy.html`],
              ['การเข้าถึงเว็บไซต์ (Web Accessibility)', `${basePath}accessibility.html`],
            ])}</ul>
          </nav>
        </div>

        <div class="orst-footer-bottom">
          <span class="orst-footer-copy">${ORST_LANG === 'en' ? '© 2026' : 'สงวนลิขสิทธิ์ © พ.ศ. 2569'} สำนักงานราชบัณฑิตยสภา${ORST_LANG === 'en' ? ' · สงวนลิขสิทธิ์' : ''}</span>
          <span class="orst-footer-meta">
            <span>วันที่ปรับปรุงข้อมูลล่าสุด <time data-footer-updated>${footerDate(SITE_UPDATED)}</time></span>
            <span class="orst-footer-visitors" aria-label="จำนวนผู้เข้าชมเว็บไซต์">จำนวนผู้เข้าชมเว็บไซต์ · วันนี้ <b data-visitor-today>–</b> · สถิติรวม <b data-visitor-total>–</b></span>
          </span>
          <button class="orst-footer-totop" type="button" data-scroll-top>ขึ้นบนสุด ${icon('i-arrow')}</button>
        </div>

      </div>
    </footer>

    <button class="access-float" type="button" data-open-access>${icon('i-access')} ช่วยการเข้าถึง</button>

    ${renderChat()}

    <div class="modal" id="search-modal" hidden role="dialog" aria-modal="true" aria-labelledby="search-title">
      <div class="modal-backdrop" data-close-modal></div>
      <div class="modal-card">
        <div class="modal-header">
          <h2 id="search-title">ค้นหาองค์ความรู้</h2>
          <button class="modal-close" type="button" data-close-modal aria-label="ปิด">×</button>
        </div>
        <div class="modal-body">
          <form class="shared-search-form" id="shared-search-form">
            <input id="shared-search-input" type="search" placeholder="ค้นหาคำศัพท์ บทความ หนังสือ หรือบริการ...">
            <button type="submit" aria-label="ค้นหา">${icon('i-search')}</button>
          </form>
          <div class="search-results" id="shared-search-results" aria-live="polite"></div>
        </div>
      </div>
    </div>

    <div class="modal" id="access-modal" hidden role="dialog" aria-modal="true" aria-labelledby="access-title">
      <div class="modal-backdrop" data-close-modal></div>
      <div class="modal-card">
        <div class="modal-header">
          <h2 id="access-title">เครื่องมือช่วยการเข้าถึง</h2>
          <button class="modal-close" type="button" data-close-modal aria-label="ปิด">×</button>
        </div>
        <div class="modal-body">
          <div class="tool-grid">
            <button type="button" data-font="plus">ก+ เพิ่มตัวอักษร</button>
            <button type="button" data-font="minus">ก- ลดตัวอักษร</button>
            <button type="button" data-font="reset">ก ขนาดปกติ</button>
            <button type="button" data-contrast>สีตัดกันสูง</button>
            <button type="button" data-readable>โหมดอ่านง่าย</button>
            <button type="button" data-motion>หยุดเคลื่อนไหว</button>
          </div>
        </div>
      </div>
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
  const accessModal = document.querySelector('#access-modal');

  document.querySelectorAll('[data-open-search]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!searchModal) return;
      searchModal.hidden = false;
      setTimeout(() => document.querySelector('#shared-search-input')?.focus(), 40);
    });
  });

  document.querySelectorAll('[data-open-access]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!accessModal) return;
      accessModal.hidden = false;
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

function initSharedSearch() {
  const form = document.querySelector('#shared-search-form');
  const input = document.querySelector('#shared-search-input');
  const results = document.querySelector('#shared-search-results');
  if (!form || !input || !results) return;

  const sampleResults = [
    ['พจนานุกรมออนไลน์', 'ค้นความหมายและการใช้คำภาษาไทย', `${basePath}dictionary.html`],
    ['คลังองค์ความรู้', 'บทความ วารสาร เอกสาร และองค์ความรู้สำหรับประชาชน', `${basePath}knowledge.html`],
    ['บริการวิชาการ', 'สอบถามข้อมูลทางวิชาการและติดตามสถานะ', `${basePath}e-services.html`]
  ];

  form.addEventListener('submit', event => {
    event.preventDefault();
    const keyword = input.value.trim();

    results.innerHTML = sampleResults.map(([title, desc, url]) => `
      <a class="search-result-item" href="${url}">
        <strong>${title}</strong><br>
        <small>${desc}${keyword ? ` · คำค้น: ${keyword}` : ''}</small>
      </a>
    `).join('');
  });
}

let componentFontStep = 0;
function initSharedAccessibility() {
  // ขนาดฐานอ่านจาก CSS ตอนเริ่ม (ตอนนี้ 17px) — ถ้าเปลี่ยนฐานใน CSS ปุ่ม ก-/ก/ก+ จะตามเอง
  const baseFontPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 17;
  document.querySelectorAll('[data-font]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.font;
      if (mode === 'plus') componentFontStep = Math.min(componentFontStep + 1, 3);
      if (mode === 'minus') componentFontStep = Math.max(componentFontStep - 1, -2);
      if (mode === 'reset') componentFontStep = 0;
      if (componentFontStep === 0) document.documentElement.style.removeProperty('font-size');
      else document.documentElement.style.fontSize = `${baseFontPx + componentFontStep}px`;
    });
  });

  document.querySelectorAll('[data-contrast]').forEach(btn => {
    btn.addEventListener('click', () => document.body.classList.toggle('high-contrast'));
  });

  document.querySelectorAll('[data-readable]').forEach(btn => {
    btn.addEventListener('click', () => document.body.classList.toggle('readable-mode'));
  });

  document.querySelectorAll('[data-motion]').forEach(btn => {
    btn.addEventListener('click', () => document.body.classList.toggle('no-motion'));
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
    encyclopedia: `${basePath}knowledge.html`,
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

    const items = [...list.querySelectorAll('.doc-item')];
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
    const text = new Map(items.map(it => [it, norm(it.querySelector('.doc-title')?.textContent)]));
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
    // หน้าที่มีปุ่มลอย "ช่วยการเข้าถึง" ของตัวเอง (index.html) ไม่ต้องมีปุ่มกลางซ้อนซ้ำ
    const ownFloat = [...document.querySelectorAll('.access-float')].some(b => !footerMount.contains(b));
    if (ownFloat) footerMount.querySelector('.access-float')?.remove();
  }

  initMegaMenu();
  initDrawer();
  initSharedModals();
  initSharedSearch();
  initMediaTabs();
  initCompactFAQ();
  initNewsEventsTabs();
  initPageTransitions();
  initImageSkeletons();
  initSharedAccessibility();
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

function initCookieBar() {
  if (window.orstConsent()) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="cookie-bar" role="region" aria-label="การใช้คุกกี้" data-cookie-bar>
      <div class="container cookie-bar-inner">
        <p>เว็บไซต์นี้ใช้คุกกี้และพื้นที่จัดเก็บข้อมูลในเบราว์เซอร์เท่าที่จำเป็นต่อการใช้งาน เช่น จดจำภาษาและรูปแบบการแสดงผล
          <a href="${basePath}cookie-policy.html">อ่านนโยบายคุกกี้</a></p>
        <div class="cookie-bar-actions">
          <button type="button" class="cookie-bar-btn is-ghost" data-consent="necessary">เฉพาะที่จำเป็น</button>
          <button type="button" class="cookie-bar-btn" data-consent="all">ยอมรับทั้งหมด</button>
        </div>
      </div>
    </div>`);
  const bar = document.querySelector('[data-cookie-bar]');
  const fit = () => document.body.style.setProperty('--cookie-h', `${bar.offsetHeight}px`);
  fit();
  window.addEventListener('resize', fit);
  bar.addEventListener('click', e => {
    const btn = e.target.closest('[data-consent]');
    if (!btn) return;
    try { localStorage.setItem(CONSENT_KEY, btn.dataset.consent); } catch { /* โหมดส่วนตัว — แค่ปิดแถบ */ }
    window.removeEventListener('resize', fit);
    bar.remove();
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
    initVideoPlayer();
    initAnchorNav();
    initShare();
    initSectionNav();
    initMediaTabs();
    initNewsEventsTabs();
    initEventFilters();
    initFaqTools();
    initImageSkeletons();
    syncFixedHeaderHeight();
  },
};
