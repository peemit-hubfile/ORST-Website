/* =============================================================================
   tools/validate.mjs — ตรวจไฟล์เนื้อหาทั้งหมดก่อน commit
   -----------------------------------------------------------------------------
   รันด้วย:  node tools/validate.mjs
   ไม่ต้องติดตั้งอะไรเพิ่ม ใช้เฉพาะ Node.js มาตรฐาน

   ตรวจอะไรบ้าง
     1. ไฟล์ JSON อ่านได้ และมี title / navKey / blocks ครบ
     2. block ทุกตัวเป็นชนิดที่ระบบรู้จัก และมีฟิลด์บังคับครบ
     3. navKey ตรงกับ data-page ในไฟล์ HTML ของหน้านั้น
     4. ไอคอนที่อ้างถึงมีอยู่จริงใน sprite ของ components.js
     5. รูปภาพที่อ้างถึงมีอยู่จริงในเครื่อง
     6. ลิงก์ภายในที่ชี้ไปหน้า .html มีไฟล์นั้นอยู่จริง
     7. เตือนถ้ายังมี placeholder [...] ค้างอยู่ (ไม่ถือว่าผิด)

   ออกด้วย exit code 1 ถ้าพบ error เพื่อให้ใช้ใน CI ได้
   ============================================================================= */

import { readFile, readdir, access } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCKS, BLOCK_TYPES, validatePage } from '../assets/js/blocks.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES_DIR = join(ROOT, 'content', 'pages');

const errors = [];
const warnings = [];

const err = (file, message) => errors.push(`${file}: ${message}`);
const warn = (file, message) => warnings.push(`${file}: ${message}`);

async function exists(path) {
  try { await access(join(ROOT, path)); return true; } catch { return false; }
}

/* ฟิลด์บังคับของแต่ละชนิด block */
const REQUIRED = {
  'page-hero': ['heading'],
  'anchor-nav': ['items'],
  'rich-text': [],
  'card-grid': ['items'],
  'feature-list': ['items'],
  'stat-row': ['items'],
  'link-list': ['items'],
  'media-grid': ['items'],
  'table': ['columns', 'rows'],
  'faq': ['items'],
  'steps': ['items'],
  'two-column': ['image'],
  'cta-band': ['heading'],
  'notice': ['body'],
  'contact-info': [],
  'document-list': ['items'],
  'article': ['sections'],
  'page-index': ['groups'],
  'person-grid': ['items'],
  'figure': ['image'],
  'share': [],
  'news-media': [],
  'news-related': ['items'],
  'event-calendar': ['items'],
  'photo-album': ['source'],
  'person-profile': ['source'],
  'timeline': ['items'],
  'pillars': ['items'],
  'org-chart': ['tiers'],
  'image-band': ['heading'],
  'org-tree': ['branches'],
  'annotated-figure': ['image', 'parts'],
};

async function spriteIcons() {
  const src = await readFile(join(ROOT, 'assets', 'js', 'components.js'), 'utf8');
  return new Set([...src.matchAll(/<symbol id="([^"]+)"/g)].map(m => m[1]));
}

/** เดินทุกค่าใน object เพื่อเก็บ icon / image / href มาตรวจ */
function collect(node, out) {
  if (Array.isArray(node)) { node.forEach(n => collect(n, out)); return; }
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (key === 'icons' && Array.isArray(value)) value.forEach(v => typeof v === 'string' && out.icons.add(v));
    if (typeof value === 'string') {
      if (key === 'icon') out.icons.add(value);
      if (key === 'image') out.images.add(value);
      if (key === 'href') out.hrefs.add(value);
      if (/\[[^\]]+\]/.test(value)) out.placeholders++;
    } else {
      collect(value, out);
    }
  }
}

async function main() {
  const icons = await spriteIcons();
  const files = (await readdir(PAGES_DIR)).filter(f => f.endsWith('.json')).sort();

  /* --- บุคคล (เชื่อม CMS): content/people/index.json — รายชื่อ (person-grid source people) + หน้าประวัติ person.html?id= --- */
  const PEOPLE = 'content/people/index.json';
  const peopleIds = new Set();
  let people = null;
  try { people = JSON.parse(await readFile(join(ROOT, PEOPLE), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') err(PEOPLE, `อ่าน JSON ไม่ได้ — ${e.message}`); }
  if (people) {
    const found = { icons: new Set(), images: new Set(), hrefs: new Set(), placeholders: 0 };
    (people.items || []).forEach((p, k) => {
      const at = `items[${k}]`;
      if (!p.id || !/^[a-z0-9-]{1,64}$/.test(p.id)) err(PEOPLE, `${at} "id" ต้องเป็น a-z 0-9 - (ใช้ใน person.html?id=)`);
      else if (peopleIds.has(p.id)) err(PEOPLE, `${at} id "${p.id}" ซ้ำ`);
      else peopleIds.add(p.id);
      if (!p.name) err(PEOPLE, `${at} ขาด "name"`);
      for (const key of ['education', 'career']) {
        (p[key] || []).forEach((x, j) => { if (!(typeof x === 'string' || x?.title)) err(PEOPLE, `${at} ${key}[${j}] ต้องเป็นข้อความ หรือ { period, title }`); });
      }
    });
    collect(people.items, found);
    for (const img of found.images) if (!/^https?:/.test(img) && !(await exists(img))) err(PEOPLE, `ไม่พบไฟล์รูป "${img}"`);
    if (found.placeholders) warn(PEOPLE, `ยังมี placeholder แบบ [...] ค้างอยู่ ${found.placeholders} จุด`);
  }

  if (!files.length) {
    console.log('ไม่พบไฟล์เนื้อหาใน content/pages/');
    return;
  }

  for (const file of files) {
    const rel = `content/pages/${file}`;
    let page;
    try {
      page = JSON.parse(await readFile(join(PAGES_DIR, file), 'utf8'));
    } catch (e) {
      err(rel, `อ่าน JSON ไม่ได้ — ${e.message}`);
      continue;
    }

    /* --- 1) ฟิลด์ระดับหน้า --- */
    if (!page.title) err(rel, 'ขาด "title"');
    if (!page.navKey) err(rel, 'ขาด "navKey"');
    if (!page.description) warn(rel, 'ไม่มี "description" — ควรใส่เพื่อ SEO');
    if (page.updatedAt && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(page.updatedAt)) {
      err(rel, `"updatedAt" ต้องเป็นรูปแบบ YYYY-MM-DD (ค.ศ.) — ได้ "${page.updatedAt}"`);
    }
    if (!Array.isArray(page.blocks) || !page.blocks.length) {
      err(rel, 'ขาด "blocks" หรือเป็น array ว่าง');
      continue;
    }

    /* --- 2) block --- */
    page.blocks.forEach((b, i) => {
      const at = `blocks[${i}]`;
      if (!b?.type) { err(rel, `${at} ขาด "type"`); return; }
      if (!BLOCKS[b.type]) {
        err(rel, `${at} ชนิด "${b.type}" ไม่มีอยู่จริง — ที่ใช้ได้: ${BLOCK_TYPES.join(', ')}`);
        return;
      }
      for (const field of REQUIRED[b.type] || []) {
        // document-list ที่ดึงรายการจากแหล่งกลาง (source) ไม่ต้องมี items
        if (field === 'items' && b.source) continue;
        if (b[field] === undefined) err(rel, `${at} (${b.type}) ขาดฟิลด์บังคับ "${field}"`);
      }
      if (b.source && !['news', 'events', 'album', 'people', 'person'].includes(b.source.type)) err(rel, `${at} source.type ต้องเป็น "news" "events" "album" "people" หรือ "person"`);
      // รายชื่อบุคคลจากแหล่งกลาง — รหัสต้องมีใน content/people/index.json
      if (b.source?.type === 'people') {
        for (const id of b.source.ids || []) if (!peopleIds.has(id)) err(rel, `${at} ไม่พบรหัสบุคคล "${id}" ใน content/people/index.json`);
      }
      // page-hero มี variant ของตัวเอง: article = หัวหน้าเพจรายละเอียดข่าว
      if (b.variant && !(b.type === 'page-hero' && b.variant === 'article') && !['default', 'alt', 'dark'].includes(b.variant)) {
        err(rel, `${at} variant ต้องเป็น "default" "alt" หรือ "dark" เท่านั้น`);
      }
      if (b.type === 'table' && Array.isArray(b.rows) && Array.isArray(b.columns)) {
        b.rows.forEach((row, r) => {
          if (row.length !== b.columns.length) {
            err(rel, `${at} rows[${r}] มี ${row.length} ช่อง แต่ columns มี ${b.columns.length}`);
          }
        });
      }
      if (b.type === 'document-list') {
        (b.items || []).forEach((it, k) => {
          if (!it.publishedAt) return;
          if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(it.publishedAt)) {
            err(rel, `${at} items[${k}] publishedAt ต้องเป็น YYYY-MM-DD (ค.ศ.)`);
          } else if (+it.publishedAt.slice(0, 4) > 2400) {
            err(rel, `${at} items[${k}] publishedAt ดูเหมือนเป็น พ.ศ. — ต้องใส่เป็น ค.ศ.`);
          }
        });
      }
      if (b.type === 'media-grid') {
        (b.items || []).forEach((it, k) => {
          if (!it.alt) warn(rel, `${at} items[${k}] ไม่มี "alt" — จำเป็นต่อการเข้าถึง`);
        });
      }
    });
    // หน้าประวัติบุคคล (person-profile) มีหัวหน้าเพจของตัวเอง
    if (!['page-hero', 'person-profile'].includes(page.blocks[0]?.type)) {
      warn(rel, 'block แรกไม่ใช่ "page-hero" — ปกติทุกหน้าควรเริ่มด้วย page-hero');
    }

    /* --- 3) navKey ตรงกับ data-page ใน HTML --- */
    const slug = file.replace(/\.json$/, '');
    if (!slug.startsWith('_')) {
      const htmlPath = `${slug}.html`;
      if (!(await exists(htmlPath))) {
        err(rel, `ไม่พบไฟล์ HTML คู่กัน (${htmlPath}) — คัดลอกจาก _template.html`);
      } else {
        const html = await readFile(join(ROOT, htmlPath), 'utf8');
        const m = html.match(/<body[^>]*data-page="([^"]*)"/);
        if (!m) err(htmlPath, 'ไม่มี data-page ใน <body>');
        else if (m[1] !== page.navKey) {
          err(htmlPath, `data-page="${m[1]}" ไม่ตรงกับ navKey "${page.navKey}" ใน ${rel}`);
        }
        if (!html.includes(`data-content="${rel}"`)) {
          warn(htmlPath, `data-content ไม่ได้ชี้มาที่ ${rel}`);
        }
      }
    }

    /* --- 4-7) ตรวจค่าที่อ้างถึงภายนอก --- */
    const found = { icons: new Set(), images: new Set(), hrefs: new Set(), placeholders: 0 };
    collect(page.blocks, found);

    for (const id of found.icons) {
      if (!icons.has(id)) err(rel, `ไอคอน "${id}" ไม่มีใน sprite — ที่ใช้ได้ดูใน assets/js/components.js`);
    }
    for (const img of found.images) {
      if (!/^https?:/.test(img) && !(await exists(img))) err(rel, `ไม่พบไฟล์รูป "${img}"`);
    }
    for (const href of found.hrefs) {
      if (/^(https?:|mailto:|tel:|#|\/)/.test(href)) continue;
      const newsId = href.match(/^news-detail\.html\?id=([a-z0-9-]+)/i);
      if (newsId && !(await exists(`content/news/${newsId[1]}.json`))) err(rel, `ลิงก์ข่าว "${href}" ไม่มีไฟล์ content/news/${newsId[1]}.json`);
      const target = href.split(/[?#]/)[0];
      if (target && target.endsWith('.html') && !(await exists(target))) {
        err(rel, `ลิงก์ชี้ไปหน้าที่ยังไม่มี "${href}"`);
      }
    }
    if (found.placeholders) {
      warn(rel, `ยังมี placeholder แบบ [...] ค้างอยู่ ${found.placeholders} จุด`);
    }
  }

  /* --- ข่าวสาร (เชื่อม CMS): content/news/index.json + content/news/<id>.json --- */
  const NEWS_DIR = join(ROOT, 'content', 'news');
  const newsFiles = await readdir(NEWS_DIR).then(fs => fs.filter(f => f.endsWith('.json') && f !== 'index.json')).catch(() => []);
  let newsIndex = { items: [] };
  try {
    newsIndex = JSON.parse(await readFile(join(NEWS_DIR, 'index.json'), 'utf8'));
  } catch (e) { if (newsFiles.length) err('content/news/index.json', `อ่านไม่ได้ — ${e.message}`); }
  const ids = new Set();
  (newsIndex.items || []).forEach((it, k) => {
    const at = `content/news/index.json items[${k}]`;
    if (!it.title) err(at, 'ขาด "title"');
    if (it.publishedAt && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(it.publishedAt)) err(at, 'publishedAt ต้องเป็น YYYY-MM-DD (ค.ศ.)');
    if (!Array.isArray(it.channels) || !it.channels.length) err(at, 'ขาด "channels" (general / activity / lecture)');
    // ไม่มีทั้ง id และ href = รายการข้อความล้วน (เช่น บันทึกการบรรยายเก่าที่เว็บเดิมไม่มีหน้า) — แสดงได้ ไม่มีลิงก์
    if (it.id) {
      if (ids.has(it.id)) err(at, `id "${it.id}" ซ้ำ`);
      ids.add(it.id);
      if (!newsFiles.includes(`${it.id}.json`)) err(at, `ไม่มีไฟล์ content/news/${it.id}.json`);
    }
  });
  for (const file of newsFiles) {
    const rel = `content/news/${file}`;
    let page;
    try { page = JSON.parse(await readFile(join(NEWS_DIR, file), 'utf8')); } catch (e) { err(rel, `อ่าน JSON ไม่ได้ — ${e.message}`); continue; }
    validatePage(page).forEach(p => err(rel, p));
    if (!ids.has(file.replace(/\.json$/, ''))) warn(rel, 'ไม่อยู่ใน content/news/index.json — จะไม่แสดงในรายการข่าว');
    const found = { icons: new Set(), images: new Set(), hrefs: new Set(), placeholders: 0 };
    collect(page.blocks || [], found);
    for (const img of found.images) {
      if (!/^https?:/.test(img) && !(await exists(img))) err(rel, `ไม่พบไฟล์รูป "${img}"`);
    }
  }
  if (newsFiles.length) console.log(`ข่าวสาร: ${(newsIndex.items || []).length} รายการใน index · ${newsFiles.length} หน้ารายละเอียด`);

  /* --- ภาษาอังกฤษ: content/pages/en/<slug>.json (สร้างโดย tools/i18n/i18n.py apply) ---
     ต้องมีคู่ภาษาไทย · โครงถูกต้อง · จำนวน/ชนิด block ตรงกับไฟล์ไทย · เตือนถ้ายังมีข้อความไทยค้าง */
  const EN_DIR = join(PAGES_DIR, 'en');
  const enFiles = await readdir(EN_DIR).then(fs => fs.filter(f => f.endsWith('.json')).sort()).catch(() => []);
  let enThai = 0;
  for (const file of enFiles) {
    const rel = `content/pages/en/${file}`;
    if (!files.includes(file)) { err(rel, 'ไม่มีไฟล์ภาษาไทยคู่กันใน content/pages/'); continue; }
    let en, th;
    try {
      en = JSON.parse(await readFile(join(EN_DIR, file), 'utf8'));
      th = JSON.parse(await readFile(join(PAGES_DIR, file), 'utf8'));
    } catch (e) { err(rel, `JSON ไม่ถูกต้อง: ${e.message}`); continue; }
    validatePage(en).forEach(p => err(rel, p));
    const sig = p => (p.blocks || []).map(b => b.type).join(',');
    if (sig(en) !== sig(th)) err(rel, 'ชนิด/ลำดับ block ไม่ตรงกับไฟล์ภาษาไทย — รัน python tools/i18n/i18n.py apply ใหม่');
    const left = (JSON.stringify(en.blocks).match(/[฀-๿]+/g) || []).length;
    if (left) enThai++;
  }
  if (enFiles.length) {
    console.log(`ภาษาอังกฤษ: ${enFiles.length}/${files.length} หน้า${enThai ? ` (${enThai} หน้ายังมีข้อความไทยบางส่วน — ปกติสำหรับคำไทยที่เป็นตัวอย่างในหน้าหลักเกณฑ์ภาษา)` : ''}`);
  }

  /* --- สรุปผล --- */
  console.log(`ตรวจไฟล์เนื้อหา ${files.length} ไฟล์\n`);
  if (warnings.length) {
    console.log(`คำเตือน ${warnings.length} รายการ`);
    warnings.forEach(w => console.log('  ! ' + w));
    console.log('');
  }
  if (errors.length) {
    console.log(`พบข้อผิดพลาด ${errors.length} รายการ`);
    errors.forEach(e => console.log('  x ' + e));
    process.exitCode = 1;
  } else {
    console.log('ผ่านทั้งหมด ไม่พบข้อผิดพลาด');
  }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
