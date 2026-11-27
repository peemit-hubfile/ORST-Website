/* =============================================================================
   content-sources.js — เติมรายการให้ block ที่ดึงข้อมูลจากแหล่งกลาง (เชื่อม CMS)
   -----------------------------------------------------------------------------
   pure module: ไม่แตะ document / window — ใช้ทั้งในเบราว์เซอร์ (page-runtime.js) และ Node (tools/build.mjs)

   block document-list ที่มีฟิลด์ "source" จะไม่เก็บรายการเอง แต่ดึงจาก content/news/index.json

     { "type": "document-list", "layout": "news",
       "source": { "type": "news", "channel": "activity", "limit": 6 } }

     channel   general = ข่าวประชาสัมพันธ์ทั่วไป · activity = ข่าวกิจกรรม · lecture = การบรรยายทางวิชาการ
               ไม่ใส่ = ทุกข่าว
     limit     จำนวนรายการสูงสุด (ใหม่สุดก่อน) ไม่ใส่ = ทั้งหมด

   รูปแบบ content/news/index.json (CMS เขียนไฟล์นี้ / endpoint ที่คืน JSON แบบเดียวกัน)
     { "items": [ { "id", "title", "publishedAt", "channels": [...], "category", "image", "imageLarge", "excerpt", "href", "file" } ] }
     id    = มีหน้ารายละเอียดในเว็บนี้ (content/news/<id>.json) → ลิงก์ news-detail.html?id=<id>
     href  = ไม่มีหน้ารายละเอียด (ข่าวเก่าบนเว็บไซต์เดิม) → ลิงก์ไปที่ href
     file  = ไฟล์ PDF ของข่าว/การบรรยาย → การ์ดมีปุ่ม "ดูตัวอย่าง" (หน้าต่างซ้อน) และ "เปิดเอกสาร"
   ============================================================================= */

export const NEWS_INDEX = 'content/news/index.json';

/** ลิงก์หน้ารายละเอียดข่าว */
export const newsUrl = id => `news-detail.html?id=${encodeURIComponent(id)}`;

/** รายการข่าวจาก index -> รายการของ document-list */
export function newsItems(index, { channel, limit } = {}) {
  const all = Array.isArray(index?.items) ? index.items : [];
  const picked = all
    .filter(it => !channel || (it.channels || []).includes(channel))
    .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
  return (limit ? picked.slice(0, limit) : picked).map(it => {
    const doc = { title: it.title };
    const href = it.id ? newsUrl(it.id) : it.href;
    if (href) doc.href = href;
    for (const k of ['publishedAt', 'image', 'excerpt', 'category', 'file', 'fileSize', 'pages', 'byline']) if (it[k]) doc[k] = it[k];
    return doc;
  });
}

/** เติม items ให้ทุก block ที่มี source — load(path) คืน JSON (เบราว์เซอร์ใช้ fetch, Node ใช้ readFile) */
export const EVENTS = 'content/events.json';

/** อัลบั้มภาพจากหน้าข่าว (content/news/<id>.json) — ภาพจาก block news-media */
export function albumFromNews(id, news) {
  const blocks = news?.blocks || [];
  const hero = blocks.find(b => b.type === 'page-hero') || {};
  const media = blocks.find(b => b.type === 'news-media') || {};
  const images = (media.images || []).filter(im => im && im.image);
  if (!images.length) return null;
  return { id, title: hero.heading || news.title || '', date: hero.date || '', tag: hero.tag || '', images, newsHref: newsUrl(id) };
}

/* บุคคล/ผู้บริหาร: content/people/index.json — แหล่งเดียวของชื่อ ตำแหน่ง รูป ช่องทางติดต่อ และประวัติ
     { "items": [ { id, name, nameEn?, position, roles?: [string], image, alt, phone?, fax?, email?,
                    bio?, education?: [{ period?, title }], career?: [{ period?, title }], duties?: [string] } ] }
   person-grid  "source": { "type": "people", "ids": ["secretary-general", ...] }  (เรียงตาม ids)
   หน้าประวัติ  person.html?id=<id> → block person-profile "source": { "type": "person" } */
export const PEOPLE_INDEX = 'content/people/index.json';
export const personUrl = id => `person.html?id=${encodeURIComponent(id)}`;

export async function resolveSources(page, load, params = {}) {
  const blocks = (page?.blocks || []).filter(b => b && b.source);
  const news = blocks.filter(b => b.source.type === 'news');
  if (news.length) {
    const index = await load(NEWS_INDEX);
    for (const b of news) b.items = newsItems(index, b.source);
  }
  // ปฏิทินกิจกรรม: content/events.json (ไฟล์เดียวกับปฏิทินหน้าแรก) — { "events": [{ id, title, start, end?, location?, unit? }] }
  const events = blocks.filter(b => b.source.type === 'events');
  if (events.length) {
    const data = await load(EVENTS);
    for (const b of events) b.items = Array.isArray(data?.events) ? data.events : [];
  }
  // บุคคล — รายชื่อ (person-grid) และหน้าประวัติ (person-profile)
  const people = blocks.filter(b => b.source.type === 'people' || b.source.type === 'person');
  if (people.length) {
    const all = (await load(PEOPLE_INDEX))?.items || [];
    const byId = new Map(all.map(p => [p.id, p]));
    for (const b of people) {
      if (b.source.type === 'people') {
        const ids = b.source.ids || all.map(p => p.id);
        b.items = ids.map(id => byId.get(id)).filter(Boolean).map(p => ({ ...p, href: personUrl(p.id) }));
        continue;
      }
      const id = String(b.source.id || params.id || '');
      b.person = byId.get(id) || null;
      if (b.person && !b.source.id) {
        page.title = b.person.name;
        page.description = [b.person.name, b.person.position].filter(Boolean).join(' — ');
      }
    }
  }
  // อัลบั้มภาพ (album.html?id=<id>) — "source": { "type": "album" } ใช้ id จาก URL หรือ "id" ใน source
  for (const b of blocks.filter(x => x.source.type === 'album')) {
    const id = String(b.source.id || params.id || '');
    b.album = null;
    if (!/^[a-z0-9-]{1,64}$/i.test(id)) continue;
    try { b.album = albumFromNews(id, await load(`content/news/${id}.json`)); } catch { b.album = null; }
    if (b.album && !b.source.id) {
      page.title = b.album.title;
      const hero = page.blocks.find(x => x.type === 'page-hero');
      if (hero) hero.breadcrumb = [...(hero.breadcrumb || []), { label: b.album.title }];
    }
  }
  return page;
}
