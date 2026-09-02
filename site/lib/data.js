/* Per-operation app data blob in KV: { prices, fbos, trips, notes, updated } */
import { newId as secureId } from './util.js';

const MAX_PER_CODE = 10, MAX_FBO_PER_CODE = 8, MAX_TRIPS = 60, MAX_LEGS = 20;

export function emptyBlob() { return { prices: {}, fbos: {}, trips: [], notes: {}, updated: 0 }; }

export async function readOp(env, opId) {
  try {
    const raw = await env.PRICES.get('op:' + opId);
    const d = raw ? JSON.parse(raw) : null;
    const out = (d && typeof d === 'object') ? d : {};
    const e = emptyBlob();
    Object.keys(e).forEach((k) => { if (out[k] === undefined) out[k] = e[k]; });
    return out;
  } catch (e) { return emptyBlob(); }
}
export async function writeOp(env, opId, blob) {
  blob.updated = Date.now();
  await env.PRICES.put('op:' + opId, JSON.stringify(blob));
  return blob;
}
function newId() {
  return secureId('e_');
}
function codeOf(b) {
  const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{3,4}$/.test(code) ? code : null;
}

const n = (v, max) => { const x = parseFloat(v); return isFinite(x) && x >= 0 ? Math.min(x, max || 1e6) : 0; };
function cleanLeg(l) {
  const code = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const out = { from: code(l.from), to: code(l.to) };
  if (l.alt) out.alt = code(l.alt);
  if (n(l.dep, 20000) > 0) out.dep = Math.round(n(l.dep, 20000));
  if (l.act && typeof l.act === 'object') {
    const a = l.act;
    let date = String(a.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = new Date().toISOString().slice(0, 10);
    out.act = { date, blk: Math.round(n(a.blk, 3000)), used: Math.round(n(a.used, 20000) * 10) / 10, bought: Math.round(n(a.bought, 20000) * 10) / 10, ppg: Math.round(n(a.ppg, 30) * 100) / 100 };
    if (a.est && typeof a.est === 'object') out.act.est = { blk: Math.round(n(a.est.blk, 3000)), burn: Math.round(n(a.est.burn, 20000) * 10) / 10, cost: Math.round(n(a.est.cost, 1e7)) };
  }
  return out;
}

/* Returns {blob} or {error, status} */
export function applyOp(blob, b, pro) {
  const op = b.op;
  if (op === 'add') {
    const code = codeOf(b); if (!code) return { error: 'bad code' };
    const price = Math.round(parseFloat(b.price) * 100) / 100;
    if (!isFinite(price) || price < 0.5 || price > 30) return { error: 'bad price' };
    let date = String(b.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = new Date().toISOString().slice(0, 10);
    const list = blob.prices[code] || [];
    list.push({ id: newId(), fbo: String(b.fbo || '').trim().slice(0, 40), price, date });
    list.sort((x, y) => (x.date < y.date ? -1 : 1));
    while (list.length > MAX_PER_CODE) list.shift();
    blob.prices[code] = list;
  } else if (op === 'del') {
    const code = codeOf(b); if (!code) return { error: 'bad code' };
    const list = (blob.prices[code] || []).filter((e) => e.id !== String(b.id || ''));
    if (list.length) blob.prices[code] = list; else delete blob.prices[code];
  } else if (op === 'fbo_add') {
    if (!pro) return { error: 'Pro feature', status: 402 };
    const code = codeOf(b); if (!code) return { error: 'bad code' };
    const name = String(b.name || '').trim().slice(0, 40);
    if (!name) return { error: 'bad name' };
    const list = blob.fbos[code] || [];
    list.push({ id: newId(), name, car: b.car ? 1 : 0, mx: b.mx ? 1 : 0, note: String(b.note || '').trim().slice(0, 120) });
    while (list.length > MAX_FBO_PER_CODE) list.shift();
    blob.fbos[code] = list;
  } else if (op === 'fbo_del') {
    const code = codeOf(b); if (!code) return { error: 'bad code' };
    const list = (blob.fbos[code] || []).filter((e) => e.id !== String(b.id || ''));
    if (list.length) blob.fbos[code] = list; else delete blob.fbos[code];
  } else if (op === 'trips_set') {
    const trips = Array.isArray(b.trips) ? b.trips : null;
    if (!trips) return { error: 'bad trips' };
    if (!pro && trips.length > 1) return { error: 'Free accounts keep one trip. Upgrade for unlimited.', status: 402 };
    if (trips.length > MAX_TRIPS) return { error: 'too many trips' };
    blob.trips = trips.slice(0, MAX_TRIPS).map((t) => ({
      id: String(t.id || newId()).slice(0, 40),
      name: String(t.name || 'Trip').slice(0, 60),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(t.date || '')) ? String(t.date) : undefined,
      pax: Math.max(0, Math.min(19, parseInt(t.pax, 10) || 0)) || undefined,
      bags: Math.max(0, Math.min(5000, Math.round(parseFloat(t.bags) || 0))) || undefined,
      legs: (Array.isArray(t.legs) ? t.legs : []).slice(0, MAX_LEGS).map(cleanLeg),
    }));
  } else if (op === 'note_set') {
    const code = codeOf(b); if (!code) return { error: 'bad code' };
    const text = String(b.text || '').slice(0, 600);
    if (text.trim()) blob.notes[code] = text; else delete blob.notes[code];
  } else {
    return { error: 'bad op' };
  }
  return { blob };
}
