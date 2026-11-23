// PayMe Global demo API: one shared workspace (Tobi) stored as a single JSON document.
// GET  /api/state           -> full state
// POST /api/state {action}  -> applies the action, returns the new state
// Storage: Upstash Redis REST (added from Vercel's Storage tab). Falls back to memory when no store is connected.

// Pitch-stage hardening (see SECURITY.md): every input is type-checked, length-capped and stripped of HTML;
// the client page only ever receives its own invoice; database errors never reset the data; writes are rate-limited.

const crypto = require('crypto');
const KEY = 'payme:state:v1';
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
let MEM = null;
const MEM_RL = new Map();

// errors that are safe to show the user; anything else becomes a generic message
class UserError extends Error {}
const fail = m => { throw new UserError(m); };

async function redis(cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'content-type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Storage error: ' + (j.error || r.status));
  return j.result;
}
async function load() {
  if (!URL_) return MEM;
  const raw = await redis(['GET', KEY]); // throws on any storage problem, so a hiccup can never wipe the data
  return raw == null ? null : JSON.parse(raw);
}
async function save(s) {
  if (!URL_) { MEM = s; return; }
  await redis(['SET', KEY, JSON.stringify(s)]);
}
// Profile photos live under their own key and are served from a cacheable URL,
// so the 3-second checks never carry the image.
const MEM_PH = new Map();
const PHOTO_URL = /^\/api\/state\?photo=([a-f0-9]{16})$/;
async function putPhoto(h, data) { if (!URL_) { MEM_PH.set(h, data); return; } await redis(['SET', 'payme:photo:' + h, data]); }
async function getPhoto(h) { if (!URL_) return MEM_PH.get(h) || null; return redis(['GET', 'payme:photo:' + h]); }
const photoHash = d => crypto.createHash('sha256').update(d).digest('hex').slice(0, 16);
// older saves kept the image inside the document: move it out once
async function migratePhoto(s) {
  const ph = s && s.profile && s.profile.photo;
  if (typeof ph !== 'string' || !ph.startsWith('data:')) return false;
  const h = photoHash(ph); await putPhoto(h, ph); s.profile.photo = '/api/state?photo=' + h; return true;
}
// 40 writes per minute per visitor: plenty for a live demo, stops scripted flooding
async function limited(ip) {
  const k = 'payme:rl:' + ip + ':' + Math.floor(Date.now() / 60e3);
  try {
    if (!URL_) { const n = (MEM_RL.get(k) || 0) + 1; MEM_RL.set(k, n); if (MEM_RL.size > 5000) MEM_RL.clear(); return n > 40; }
    const n = await redis(['INCR', k]); if (n === 1) await redis(['EXPIRE', k, 70]); return n > 40;
  } catch (e) { return false; }
}

const H = 3600e3, D = 24 * H;
const AB = '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const code = () => Array.from(crypto.randomBytes(12), x => AB[x % AB.length]).join('');

// ---- input cleaning ----
// plain text only: no tags, no control characters, trimmed and capped
const txt = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '').replace(/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
const list = (v, n, max) => (Array.isArray(v) ? v : []).slice(0, n).map(x => txt(x, max)).filter(Boolean);
const pairs = (v, n, max) => (Array.isArray(v) ? v : []).slice(0, n).filter(Array.isArray).map(x => [txt(x[0], max), txt(x[1], max)]).filter(x => x[0] || x[1]);
const num = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo; };
const PHOTO = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
const TRON = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const PROVIDERS = ['Cleva', 'Grey', 'Payoneer', 'USDT wallet'];
const link = v => txt(v, 200).replace(/["'`\s\\]/g, '');
const site = v => txt(v, 120).replace(/["'`\s\\]/g, '').replace(/^(javascript|data|vbscript):/i, '');
const LIMITS = { projects: 150, timeline: 80, notes: 100 };
const nowTs = () => Date.now();
const first = n => String(n || '').split(' ')[0];

function seed() {
  const st = seedRaw();
  st.projects.forEach(p => { p.amt = p.items.reduce((t, x) => t + x[1] * x[2], 0); });
  return st;
}
function seedRaw() {
  const n = nowTs();
  const DEF = ['Payment received', 'Kick-off', 'First concepts', 'Refinement', 'Final files'];
  return {
    v: 1,
    profile: { name: 'Tobi Adeyemi', head: 'UI/UX Designer', campus: 'Lagos, Nigeria', site: 'behance.net/tobiadeyemi', verified: true, acct: '4821', payout: { provider: 'Cleva', mode: 'bank', wallet: '' }, custom: false },
    nid: 20,
    projects: [
      { id: 'northwind', code: 'k3Rf9xQ2mT7a', no: 'PMG-0042', title: 'Northwind mobile app redesign', client: 'Daniel Weber', co: 'Northwind Studio', city: 'Berlin, DE', email: 'daniel@northwind.studio',
        desc: 'UX audit, a new design for 12 core screens and a clickable prototype for user testing.',
        items: [['UX audit and user flows', 1, 200], ['UI design, core screens', 12, 40], ['Clickable prototype', 1, 120], ['Developer handoff and specs', 1, 50]],
        niche: [['Revisions', '2 rounds'], ['Screens', '12'], ['Delivery', '10 days']], chips: ['Figma file', 'Prototype link', 'PNG + PDF exports', 'Style guide'],
        terms: ['Two revision rounds included. Extra rounds are $25 each.', 'Full rights to the files move to Northwind Studio once paid.'], sign: 'Thanks for trusting me with this, Daniel.',
        net: 14, issuedTs: n - 2 * D, dueTs: n + 12 * D, sentTs: n - 2 * D, color: '#2E5BFF',
        status: 'progress', stage: 1, stages: ['Payment received', 'Kick-off and UX audit', 'Wireframes', 'UI design, 12 screens', 'Prototype and handoff'],
        subs: ['Paid', 'Findings in 2 days', '', '', 'Due in 8 days'],
        paid: { ts: n - 2 * D + 3 * H, method: 'usdt', tx: 'Tron · a91f3c…e4c07b2d' }, updatedTs: n - 2 * H,
        req: { q: 'Can I see a preview?', note: 'Even rough wireframes are fine. Our team meets on Thursday.', ts: n - 2 * H },
        tl: [{ k: 'update', text: "Payment received, thank you Daniel. I'm starting the UX audit today. First findings in two days.", ts: n - 2 * D + 3.2 * H },
             { k: 'stage', text: 'Moved to Kick-off and UX audit', ts: n - 2 * D + 3.1 * H }, { k: 'pay', text: 'Daniel paid 850.00 USDT', ts: n - 2 * D + 3 * H }] },
      { id: 'kora', code: 'Qm7dX2pLr9Tz', no: 'PMG-0038', title: 'Kora Coffee brand identity', client: 'James Okoro', co: 'Kora Coffee Roasters', city: 'London, UK', email: 'james@koracoffee.co.uk',
        desc: 'Strategy workshop, logo suite, brand guidelines and a social media kit for the new roastery.',
        items: [['Brand strategy workshop', 1, 250], ['Logo suite (3 concepts)', 1, 400], ['Brand guidelines, 24 pages', 1, 350], ['Social media kit (15 templates)', 1, 180]],
        niche: [['Revisions', '3 rounds'], ['Concepts', '3'], ['Delivery', '14 days']], chips: ['AI + SVG files', 'Guidelines PDF', 'Social templates'],
        terms: ['Three revision rounds included.', 'Full rights to the logo move to Kora Coffee Roasters once paid.'], sign: 'Thanks for choosing me, James.',
        net: 14, issuedTs: n - 8 * D, dueTs: n + 6 * D, sentTs: n - 8 * D, color: '#FFD53D',
        status: 'review', stage: 3, stages: ['Payment received', 'Strategy workshop', 'Logo concepts', 'Guidelines and social kit', 'Final files'],
        subs: ['Paid', 'Done', 'Done', 'Waiting for James', 'Due in 9 days'],
        paid: { ts: n - 8 * D, method: 'card', tx: 'Visa •••• 4242 · Auth 58K21Q' }, updatedTs: n - 1 * D, req: null,
        tl: [{ k: 'update', text: 'Guidelines draft and the 15 social templates are ready for your review.', ts: n - 1 * D, link: 'kora-guidelines-v1.pdf' },
             { k: 'stage', text: 'Moved to Guidelines and social kit', ts: n - 1 * D - 60e3 },
             { k: 'answer', q: 'Which logo route do you recommend?', text: 'Route B. It holds up best at small sizes and on the cup sleeves.', ts: n - 4 * D, fast: 'Replied in 48m' },
             { k: 'pay', text: 'James paid $1,180.00 by card', ts: n - 8 * D }] },
      { id: 'lumi', code: 'Lx4Hn8Wq2cVb', no: 'PMG-0044', title: 'Lumi Studio brand identity', client: 'Clara Jensen', co: 'Lumi Studio', city: 'Copenhagen, DK', email: 'clara@lumistudio.dk',
        desc: 'A logo, colour palette and a one-page brand sheet for a new ceramics studio.',
        items: [['Discovery call and moodboard', 1, 80], ['Logo design (2 concepts)', 1, 250], ['Colour palette and type pairing', 1, 70], ['One-page brand sheet', 1, 50]],
        niche: [['Revisions', '2 rounds'], ['Concepts', '2'], ['Delivery', '7 days']], chips: ['Logo files (SVG, PNG)', 'Brand sheet PDF', 'Colour codes'],
        terms: ['Two revision rounds included.', 'Full rights to the logo move to Lumi Studio once paid.'], sign: 'Thanks, Clara. Excited to start.',
        net: 14, issuedTs: n - 2 * D, dueTs: n + 12 * D, sentTs: n - 2 * D, color: '#CFEFC2',
        status: 'sent', stage: 0, stages: ['Payment received', 'Kick-off', 'Logo concepts', 'Brand sheet', 'Final files'], subs: ['', '', '', '', ''],
        paid: null, updatedTs: n - 2 * D, req: null, tl: [] },
      { id: 'pace', code: 'Pc9Tw3Ry6uKe', no: 'PMG-0045', title: 'Pace app icon set', client: 'Tom Becker', co: 'Pace Running Club', city: 'Munich, DE', email: 'tom@pace.run',
        desc: 'A 24-icon set for the Pace running app.', items: [['App icon set (24 icons)', 1, 300]], niche: [['Icons', '24'], ['Revisions', '1 round'], ['Delivery', '5 days']], chips: ['SVG', 'Figma'],
        terms: ['One revision round included.'], sign: 'Thanks, Tom.', net: 7, issuedTs: n, dueTs: n + 7 * D, color: '#12B5E5',
        status: 'draft', stage: 0, stages: DEF.slice(), subs: ['', '', '', '', ''], paid: null, updatedTs: n - 3 * H, req: null, tl: [] },
      { id: 'nordlys', code: 'Nv3Ks6Ty8pRe', no: 'PMG-0031', title: 'Nordlys 2027 poster series', client: 'Eva Lindqvist', co: 'Nordlys Festival', city: 'Oslo, NO', email: 'eva@nordlys.no',
        desc: 'One key visual adapted into a poster series and social assets.', items: [['Key visual', 1, 300], ['Poster adaptations (A1, A3)', 6, 45], ['Social cut-downs', 10, 15]],
        niche: [['Deliverables', '17 files'], ['Revisions', '2 rounds'], ['Print', 'CMYK, 3mm bleed']], chips: ['Print PDFs', 'Social PNGs', 'Source files'],
        terms: ['Two revision rounds included.', 'Print files are supplied CMYK with 3mm bleed.'], sign: 'Thank you, Eva.', net: 14, issuedTs: n - 18 * D, dueTs: n - 4 * D, sentTs: n - 18 * D, color: '#FF5B1F',
        status: 'delivered', stage: 4, stages: ['Payment received', 'Key visual', 'Poster adaptations', 'Social cut-downs', 'Print files delivered'], subs: ['Paid', 'Done', 'Done', 'Done', 'Delivered'],
        paid: { ts: n - 18 * D, method: 'usdt', tx: 'Tron · 7be04d…19f2aa01' }, deliveredTs: n - 5 * D, updatedTs: n - 5 * D, req: null,
        tl: [{ k: 'stage', text: 'Marked as delivered', ts: n - 5 * D }, { k: 'update', text: 'All 17 print-ready files are in the shared folder. CMYK, 3mm bleed. Thank you Eva!', ts: n - 5 * D - 120e3, link: 'nordlys-print-files.zip' },
             { k: 'pay', text: 'Eva paid 720.00 USDT', ts: n - 18 * D }] },
      { id: 'fieldnotes', code: 'Fh2Bc7Lm5wQa', no: 'PMG-0029', title: 'Fieldnotes cover illustration', client: 'Hannah Clarke', co: 'Fieldnotes Magazine', city: 'Dublin, IE', email: 'hannah@fieldnotes.ie',
        desc: 'A cover illustration for the winter issue, plus two spot illustrations.', items: [['Cover illustration', 1, 220], ['Spot illustrations', 2, 30]],
        niche: [['Revisions', '2 rounds'], ['Size', 'A4 + bleed'], ['Delivery', '9 days']], chips: ['Print PDF', 'Web JPGs'], terms: ['Two revision rounds included.', 'First print rights for the winter issue.'], sign: 'Thank you, Hannah.',
        net: 14, issuedTs: n - 22 * D, dueTs: n - 8 * D, sentTs: n - 22 * D, color: '#7A5CFF',
        status: 'delivered', stage: 4, stages: ['Payment received', 'Sketches', 'Final artwork', 'Revisions', 'Delivered'], subs: ['Paid', 'Done', 'Done', 'Done', 'Delivered'],
        paid: { ts: n - 22 * D, method: 'card', tx: 'Mastercard •••• 8890' }, deliveredTs: n - 13 * D, updatedTs: n - 13 * D, req: null,
        tl: [{ k: 'stage', text: 'Marked as delivered', ts: n - 13 * D }, { k: 'pay', text: 'Hannah paid $280.00 by card', ts: n - 22 * D }] }
    ],
    notes: [
      { id: 1, k: 'ask', p: 'northwind', html: '<b>Daniel Weber</b> asked for an update', sub: '"Can I see a preview?" · Northwind mobile app redesign', ts: n - 2 * H, unread: true },
      { id: 2, k: 'pay', p: 'northwind', html: '<b>Payment received:</b> 850.00 USDT from Daniel Weber', sub: 'Settled to Cleva •••• 4821 · Work can start', ts: n - 2 * D + 3 * H, unread: true },
      { id: 3, k: 'flag', p: 'kora', html: 'You answered <b>James Okoro</b> in 48 min', sub: 'Fast replies keep "Usually replies within 3 hrs" on your invoices', ts: n - 4 * D, unread: false },
      { id: 4, k: 'pay', p: 'kora', html: '<b>Payment received:</b> $1,180.00 by card from James Okoro', sub: 'Settled to Cleva •••• 4821', ts: n - 8 * D, unread: false },
      { id: 5, k: 'bank', p: 'nordlys', html: '<b>$720.00</b> landed in your Cleva account', sub: 'Nordlys 2027 poster series · paid in USDT, converted to USD', ts: n - 18 * D, unread: false }
    ]
  };
}

const money = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdt = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDT';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dur = ms => { const m = Math.max(1, Math.round(ms / 60e3)); return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; };
const find = (s, b) => s.projects.find(p => (b.id && p.id === b.id) || (b.code && p.code === b.code));

const tl = (p, e) => { p.tl.unshift(e); p.tl.length = Math.min(p.tl.length, LIMITS.timeline); };
const DEF_STAGES = ['Payment received', 'Kick-off', 'First concepts', 'Refinement', 'Final files'];

function cleanProfile(cur, inp) {
  const out = { ...cur };
  const T = { name: 80, head: 80, campus: 80, skill: 80, bio: 400 };
  for (const k in T) if (k in inp) out[k] = txt(inp[k], T[k]);
  if ('site' in inp) out.site = site(inp.site);
  if ('verified' in inp) out.verified = inp.verified !== false;
  if ('custom' in inp) out.custom = !!inp.custom;
  if ('photo' in inp) {
    const ph = inp.photo;
    if (typeof ph === 'string' && ph === cur.photo && PHOTO_URL.test(ph)) out.photo = ph; // unchanged
    else if (typeof ph === 'string' && ph.length <= 400e3 && PHOTO.test(ph)) { const h = photoHash(ph); out.photo = '/api/state?photo=' + h; out.__newPhoto = { h, data: ph }; }
    else delete out.photo;
  }
  if ('payout' in inp) {
    const po = inp.payout && typeof inp.payout === 'object' ? inp.payout : {};
    const mode = ['cleva', 'bank', 'usdt'].includes(po.mode) ? po.mode : 'cleva';
    const wallet = typeof po.wallet === 'string' && TRON.test(po.wallet.trim()) ? po.wallet.trim() : '';
    if (mode === 'usdt' && !wallet) fail('Enter a valid TRC-20 wallet address');
    out.payout = { provider: PROVIDERS.includes(po.provider) ? po.provider : (mode === 'usdt' ? 'USDT wallet' : 'Cleva'), mode, wallet: mode === 'usdt' ? wallet : '' };
  }
  return out;
}

function apply(s, b) {
  const n = nowTs();
  if (!b || typeof b !== 'object') fail('Bad request');
  const note = (k, p, html, sub) => { s.notes.unshift({ id: s.nid++, k, p, html, sub, ts: n, unread: true }); s.notes.length = Math.min(s.notes.length, LIMITS.notes); };

  switch (b.action) {
    // sample data for demos, keeping the freelancer's own profile when they have one
    case 'sample': { const fresh = seed(); if (s.profile && s.profile.custom) fresh.profile = s.profile; fresh.v = s.v; return fresh; }
    case 'fresh': { s.projects = []; s.notes = []; return s; }
    case 'profile': { s.profile = cleanProfile(s.profile || {}, b.profile && typeof b.profile === 'object' ? b.profile : {}); return s; }
    case 'create': {
      if (s.projects.length >= LIMITS.projects) fail('This demo workspace is full. Use "Clear all data" in Demo controls.');
      const i = b.invoice && typeof b.invoice === 'object' ? b.invoice : {}; const c = code(); const id = 'p' + c.slice(0, 6).toLowerCase();
      const items = (Array.isArray(i.items) ? i.items : []).slice(0, 20).filter(Array.isArray).map(x => [txt(x[0], 120) || 'Item', num(x[1], 0, 10000), num(x[2], 0, 1e6)]);
      const amt = items.reduce((t, x) => t + x[1] * x[2], 0);
      const st = list(i.stages, 5, 60); const stages = st.length === 5 ? st : DEF_STAGES.slice();
      const net = Math.round(num(i.net || 14, 1, 120));
      const no = 'PMG-' + String(46 + s.projects.length).padStart(4, '0');
      s.projects.unshift({ id, code: c, no, title: txt(i.title, 120) || 'Untitled project', client: txt(i.client, 80) || 'Client', co: txt(i.co, 80), city: txt(i.city, 60),
        email: txt(i.email, 120), desc: txt(i.desc, 400), items, niche: pairs(i.niche, 4, 40), chips: list(i.chips, 8, 40), terms: list(i.terms, 6, 200), sign: txt(i.sign, 160),
        net, issuedTs: n, dueTs: n + net * D, sentTs: n, color: /^#[0-9A-F]{6}$/i.test(i.color) ? i.color : '#2E5BFF', split: i.split === 'half' ? 'half' : 'full',
        status: 'sent', stage: 0, stages, subs: ['', '', '', '', ''], paid: null, updatedTs: n, req: null, tl: [], amt });
      s.lastCode = c; return s;
    }
    case 'read': { s.notes.forEach(x => { if (b.all || x.id === b.note) x.unread = false; }); return s; }
  }
  // an invoice code only unlocks the client actions; freelancer actions need the project id
  const p = ['pay', 'request'].includes(b.action) ? find(s, b) : find(s, { id: b.id }); if (!p) fail('Project not found');
  const fn = first(p.client);
  switch (b.action) {
    case 'pay': {
      if (p.paid) return s;
      if (p.status === 'draft') fail('This invoice has not been sent yet');
      const m = b.method === 'card' ? 'card' : 'usdt';
      p.paid = { ts: n, method: m, tx: m === 'usdt' ? 'Tron · ' + code().slice(0, 6).toLowerCase() + '…' + code().slice(0, 8).toLowerCase() : 'Visa •••• 4242 · Auth ' + code().slice(0, 6).toUpperCase() };
      p.status = 'progress'; p.stage = 1; p.subs[0] = 'Paid'; p.subs[1] = 'Started today'; p.updatedTs = n;
      const amt = m === 'usdt' ? usdt(p.amt) : money(p.amt) + ' by card';
      tl(p, { k: 'pay', text: fn + ' paid ' + amt, ts: n });
      tl(p, { k: 'stage', text: 'Moved to ' + p.stages[1], ts: n + 1 });
      tl(p, { k: 'update', text: 'Payment received, thank you ' + fn + '. I\'m starting today and will post the first update soon.', ts: n + 2, auto: true });
      const pv = (s.profile.payout && s.profile.payout.provider) || 'Cleva';
      note('pay', p.id, '<b>Payment received:</b> ' + esc(amt) + ' from ' + esc(p.client), 'Settled to ' + esc(pv) + ' •••• 4821 · ' + esc(p.title));
      return s;
    }
    case 'request': {
      if (!p.paid) fail('Invoice not paid yet');
      if (p.req) fail('A request is already open');
      p.req = { q: txt(b.q, 140) || 'How is it going?', note: txt(b.note, 300), ts: n }; p.updatedTs = n;
      note('ask', p.id, '<b>' + esc(p.client) + '</b> asked for an update', '"' + esc(p.req.q) + '" · ' + esc(p.title));
      return s;
    }
    case 'post': {
      const text = txt(b.text, 1000); if (!text) fail('Write an update first');
      const lk = link(b.link) || null;
      if (b.advance) advance(p, n);
      if (p.req) { const d = dur(n - p.req.ts); tl(p, { k: 'answer', q: p.req.q, note: p.req.note || '', text, link: lk, ts: n, fast: 'Replied in ' + d }); p.answered = 'Answered. ' + fn + ' got your reply ' + d + ' after asking.'; p.req = null;
        s.notes.forEach(x => { if (x.p === p.id && x.k === 'ask') x.unread = false; }); }
      else { p.answered = null; tl(p, { k: 'update', text, link: lk, ts: n }); }
      p.updatedTs = n; return s;
    }
    case 'stage': {
      if (b.dir === 'next') advance(p, n);
      if (b.dir === 'back' && p.stage > 1) { tl(p,{ k: 'stage', text: 'Moved back to ' + p.stages[p.stage - 1], ts: n }); p.stage--; if (p.status === 'review') p.status = 'progress'; }
      if (b.dir === 'deliver') { p.status = 'delivered'; p.stage = 4; p.deliveredTs = n; p.subs[4] = 'Delivered'; tl(p, { k: 'stage', text: 'Marked as delivered', ts: n }); }
      p.updatedTs = n; return s;
    }
  }
  fail('Unknown action');
}
function advance(p, n) {
  if (p.stage >= p.stages.length - 1) return;
  p.subs[p.stage] = 'Done'; p.stage++; p.subs[p.stage] = 'Started today';
  if (p.stage === p.stages.length - 1 && p.status === 'progress') p.status = 'review';
  tl(p, { k: 'stage', text: 'Moved to ' + p.stages[p.stage], ts: n });
}

// ---- what each kind of visitor gets back ----
const noEmail = p => { const { email, ...rest } = p; return rest; };
// the freelancer dashboard (no login yet, see SECURITY.md): everything except client emails
const fullView = s => ({ ...s, projects: s.projects.map(noEmail), now: nowTs() });
// a client holding one invoice link: that invoice and the freelancer's public card, nothing else
function clientView(s, c) {
  const p = s.projects.find(x => x.code === c && x.status !== 'draft');
  const pr = s.profile || {};
  return { v: s.v, now: nowTs(), projects: p ? [noEmail(p)] : [],
    profile: { name: pr.name, head: pr.head, campus: pr.campus, site: pr.site, verified: pr.verified, photo: pr.photo, custom: pr.custom,
      payout: { provider: pr.payout && pr.payout.provider, mode: pr.payout && pr.payout.mode } } };
}
const CLIENT_ACTIONS = ['pay', 'request'];
const isCode = c => typeof c === 'string' && /^[A-Za-z0-9]{6,20}$/.test(c);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const sp = new URL(req.url || '/', 'http://x').searchParams;
    const q = (req.query && req.query.code) || sp.get('code');
    // the freelancer's photo: an image response the browser keeps for a year (the URL changes when the photo does)
    const ph = (req.query && req.query.photo) || sp.get('photo');
    if (req.method === 'GET' && ph) {
      const data = /^[a-f0-9]{16}$/.test(ph) ? await getPhoto(ph) : null;
      const m = data && /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/.exec(data);
      if (!m) return res.status(404).json({ error: 'Not found' });
      res.setHeader('Content-Type', m[1]); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      const buf = Buffer.from(m[2], 'base64');
      return typeof res.send === 'function' ? res.status(200).send(buf) : (res.statusCode = 200, res.end(buf));
    }
    if (req.method === 'POST') {
      if (+(req.headers && req.headers['content-length']) > 600e3) return res.status(413).json({ error: 'That is too large to save' });
      const ip = String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || (req.socket && req.socket.remoteAddress) || 'local').split(',')[0].trim();
      if (await limited(ip)) return res.status(429).json({ error: 'Too many changes at once. Wait a minute and try again.' });
    }
    let s = await load(); if (!s) { s = seed(); await save(s); }
    if (await migratePhoto(s)) await save(s);
    if (req.method === 'GET') {
      // nothing changed since the version the page already has: answer in a few bytes
      const since = sp.get('since') || (req.query && req.query.since);
      if (since != null && +since === s.v) return res.status(200).json({ same: true, v: s.v, now: nowTs() });
      return res.status(200).json(isCode(q) ? clientView(s, q) : fullView(s));
    }
    let b; try { b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch (e) { fail('Bad request'); }
    // a client page can only pay or ask on its own invoice, and only sees that invoice back
    const asClient = isCode(b && b.code) && CLIENT_ACTIONS.includes(b.action);
    if (asClient) b = { action: b.action, code: b.code, method: b.method, q: b.q, note: b.note };
    s = apply(s, b); s.v = (s.v || 0) + 1;
    const np = s.profile && s.profile.__newPhoto; if (np) { delete s.profile.__newPhoto; await putPhoto(np.h, np.data); }
    await save(s);
    return res.status(200).json(asClient ? clientView(s, b.code) : fullView(s));
  } catch (e) {
    if (e instanceof UserError) return res.status(400).json({ error: e.message });
    console.error(e);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
module.exports.apply = apply; module.exports.seed = seed;
