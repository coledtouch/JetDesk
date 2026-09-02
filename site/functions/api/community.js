import { json, err } from '../../lib/util.js';
import { getUser, activeOp } from '../../lib/auth.js';

/* GET ?codes=KACK,KHPN: anonymized community Jet A prices (give-to-get: the operation must share its own).
   A code is reported only when at least two different operations have logged it in the last 60 days. */
export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  const op = await activeOp(env, user);
  if (!op) return err('No operation.', 404);
  const row = await env.DB.prepare('SELECT share_prices FROM ops WHERE id = ?').bind(op.id).first();
  if (!row || !row.share_prices) return json({ sharing: false, prices: {} });
  const url = new URL(request.url);
  const codes = String(url.searchParams.get('codes') || '').toUpperCase().split(',').map((c) => c.replace(/[^A-Z0-9]/g, '')).filter((c) => c.length >= 3 && c.length <= 4).slice(0, 40);
  if (!codes.length) return json({ sharing: true, prices: {} });
  const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  const q = 'SELECT code, price, date, op_id FROM price_reports WHERE date >= ? AND code IN (' + codes.map(() => '?').join(',') + ') ORDER BY date DESC';
  const rows = (await env.DB.prepare(q).bind(since, ...codes).all()).results || [];
  const by = {};
  rows.forEach((r) => { (by[r.code] = by[r.code] || []).push(r); });
  const out = {};
  Object.keys(by).forEach((code) => {
    const list = by[code];
    const ops = new Set(list.map((r) => r.op_id));
    if (ops.size < 2) return;
    /* one price per operation (its latest), then the median */
    const latest = {};
    list.forEach((r) => { if (!latest[r.op_id]) latest[r.op_id] = r; });
    const ps = Object.values(latest).map((r) => r.price).sort((a, b) => a - b);
    const med = ps.length % 2 ? ps[(ps.length - 1) / 2] : (ps[ps.length / 2 - 1] + ps[ps.length / 2]) / 2;
    out[code] = { median: Math.round(med * 100) / 100, low: ps[0], high: ps[ps.length - 1], ops: ps.length, latest: list[0].date };
  });
  return json({ sharing: true, prices: out });
}
