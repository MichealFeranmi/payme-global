// PayMe Global demo API: one shared workspace (Tobi) stored as a single JSON document.
// GET  /api/state           -> full state
// POST /api/state {action}  -> applies the action, returns the new state
// Storage: Upstash Redis REST (added from Vercel's Storage tab). Falls back to memory when no store is connected.

const KEY = 'payme:state:v1';
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
let MEM = null;

async function load() {
  if (!URL_) return MEM;
  const r = await fetch(URL_ + '/get/' + KEY, { headers: { Authorization: 'Bearer ' + TOKEN } });
  const j = await r.json();
  return j.result ? JSON.parse(j.result) : null;
}
async function save(s) {
  if (!URL_) { MEM = s; return; }
  await fetch(URL_ + '/set/' + KEY, { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(s) });
}

const H = 3600e3, D = 24 * H;
const AB = '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const code = () => Array.from({ length: 12 }, () => AB[Math.floor(Math.random() * AB.length)]).join('');
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
    profile: { name: 'Tobi Adeyemi', head: 'UI/UX Designer', campus: 'University of Lagos', site: 'behance.net/tobiadeyemi', verified: true, acct: '4821' },
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

function apply(s, b) {
  const n = nowTs();
  const note = (k, p, html, sub) => s.notes.unshift({ id: s.nid++, k, p, html, sub, ts: n, unread: true });
  switch (b.action) {
    case 'reset': return seed();
    case 'profile': { const allowed = ['name', 'head', 'campus', 'site', 'verified', 'photo', 'skill']; for (const k of allowed) if (k in (b.profile || {})) s.profile[k] = b.profile[k];
      if (s.profile.photo && s.profile.photo.length > 400e3) delete s.profile.photo; return s; }
    case 'create': {
      const i = b.invoice || {}; const c = code(); const id = 'p' + c.slice(0, 6).toLowerCase();
      const items = (i.items || []).slice(0, 20).map(x => [String(x[0] || 'Item').slice(0, 120), Math.max(0, +x[1] || 0), Math.max(0, +x[2] || 0)]);
      const amt = items.reduce((t, x) => t + x[1] * x[2], 0);
      const stages = (i.stages && i.stages.length === 5) ? i.stages : ['Payment received', 'Kick-off', 'First concepts', 'Refinement', 'Final files'];
      const no = 'PMG-' + String(46 + s.projects.length).padStart(4, '0');
      s.projects.unshift({ id, code: c, no, title: String(i.title || 'Untitled project').slice(0, 120), client: String(i.client || 'Client').slice(0, 80), co: String(i.co || '').slice(0, 80), city: String(i.city || '').slice(0, 60),
        email: String(i.email || '').slice(0, 120), desc: String(i.desc || '').slice(0, 400), items, niche: (i.niche || []).slice(0, 4), chips: (i.chips || []).slice(0, 8), terms: (i.terms || []).slice(0, 6), sign: String(i.sign || '').slice(0, 160),
        net: +i.net || 14, issuedTs: n, dueTs: n + (+i.net || 0) * D, sentTs: n, color: /^#[0-9A-F]{6}$/i.test(i.color) ? i.color : '#2E5BFF', split: i.split === 'half' ? 'half' : 'full',
        status: 'sent', stage: 0, stages, subs: ['', '', '', '', ''], paid: null, updatedTs: n, req: null, tl: [], amt });
      s.lastCode = c; return s;
    }
  }
  const p = find(s, b); if (!p) throw new Error('Project not found');
  const fn = first(p.client);
  switch (b.action) {
    case 'pay': {
      if (p.paid) return s;
      const m = b.method === 'card' ? 'card' : 'usdt';
      p.paid = { ts: n, method: m, tx: m === 'usdt' ? 'Tron · ' + code().slice(0, 6).toLowerCase() + '…' + code().slice(0, 8).toLowerCase() : 'Visa •••• 4242 · Auth ' + code().slice(0, 6).toUpperCase() };
      p.status = 'progress'; p.stage = 1; p.subs[0] = 'Paid'; p.subs[1] = 'Started today'; p.updatedTs = n;
      const amt = m === 'usdt' ? usdt(p.amt) : money(p.amt) + ' by card';
      p.tl.unshift({ k: 'pay', text: fn + ' paid ' + amt, ts: n });
      p.tl.unshift({ k: 'stage', text: 'Moved to ' + p.stages[1], ts: n + 1 });
      p.tl.unshift({ k: 'update', text: 'Payment received, thank you ' + fn + '. I\'m starting today and will post the first update soon.', ts: n + 2, auto: true });
      note('pay', p.id, '<b>Payment received:</b> ' + esc(amt) + ' from ' + esc(p.client), 'Settled to Cleva •••• 4821 · ' + esc(p.title));
      return s;
    }
    case 'request': {
      if (!p.paid) throw new Error('Invoice not paid yet');
      if (p.req) throw new Error('A request is already open');
      p.req = { q: String(b.q || 'How is it going?').slice(0, 140), note: String(b.note || '').slice(0, 300), ts: n }; p.updatedTs = n;
      note('ask', p.id, '<b>' + esc(p.client) + '</b> asked for an update', '"' + esc(p.req.q) + '" · ' + esc(p.title));
      return s;
    }
    case 'post': {
      const text = String(b.text || '').trim().slice(0, 1000); if (!text) throw new Error('Write an update first');
      const link = String(b.link || '').trim().slice(0, 200) || null;
      if (b.advance) advance(p, n);
      if (p.req) { const d = dur(n - p.req.ts); p.tl.unshift({ k: 'answer', q: p.req.q, text, link, ts: n, fast: 'Replied in ' + d }); p.answered = 'Answered. ' + fn + ' got your reply ' + d + ' after asking.'; p.req = null;
        s.notes.forEach(x => { if (x.p === p.id && x.k === 'ask') x.unread = false; }); }
      else { p.answered = null; p.tl.unshift({ k: 'update', text, link, ts: n }); }
      p.updatedTs = n; return s;
    }
    case 'stage': {
      if (b.dir === 'next') advance(p, n);
      if (b.dir === 'back' && p.stage > 1) { p.tl.unshift({ k: 'stage', text: 'Moved back to ' + p.stages[p.stage - 1], ts: n }); p.stage--; if (p.status === 'review') p.status = 'progress'; }
      if (b.dir === 'deliver') { p.status = 'delivered'; p.stage = 4; p.deliveredTs = n; p.subs[4] = 'Delivered'; p.tl.unshift({ k: 'stage', text: 'Marked as delivered', ts: n }); }
      p.updatedTs = n; return s;
    }
    case 'read': { s.notes.forEach(x => { if (b.all || x.id === b.note) x.unread = false; }); return s; }
  }
  throw new Error('Unknown action');
}
function advance(p, n) {
  if (p.stage >= p.stages.length - 1) return;
  p.subs[p.stage] = 'Done'; p.stage++; p.subs[p.stage] = 'Started today';
  if (p.stage === p.stages.length - 1 && p.status === 'progress') p.status = 'review';
  p.tl.unshift({ k: 'stage', text: 'Moved to ' + p.stages[p.stage], ts: n });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    let s = await load(); if (!s) { s = seed(); await save(s); }
    if (req.method === 'GET') { s.now = nowTs(); return res.status(200).json(s); }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    s = apply(s, b); s.v = (s.v || 0) + 1; await save(s);
    s.now = nowTs(); return res.status(200).json(s);
  } catch (e) { return res.status(400).json({ error: e.message }); }
};
module.exports.apply = apply; module.exports.seed = seed;
