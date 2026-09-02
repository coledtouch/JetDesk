import { json, err, readJson } from '../../lib/util.js';
import { getUser, activeOp, isPro, needsVerify } from '../../lib/auth.js';
import { readOp, writeOp, applyOp } from '../../lib/data.js';
import { notifyUsers, opUserIds } from '../../lib/push.js';
import { newId } from '../../lib/util.js';

/* GET: the active operation's data blob. POST: one mutation op (see lib/data.js). */
export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  const op = await activeOp(env, user);
  if (!op) return err('No operation.', 404);
  const blob = await readOp(env, op.id);
  return json(Object.assign({ op_id: op.id }, blob));
}

async function afterPriceAdd(env, op, user, b, blob) {
  const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const price = Math.round(parseFloat(b.price) * 100) / 100;
  if (!code || !isFinite(price)) return;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || '')) ? String(b.date) : new Date().toISOString().slice(0, 10);
  /* community: one anonymized row per report when the operation shares */
  try {
    const row = await env.DB.prepare('SELECT share_prices FROM ops WHERE id = ?').bind(op.id).first();
    if (row && row.share_prices) {
      await env.DB.prepare('INSERT INTO price_reports (id, code, price, date, op_id, created) VALUES (?, ?, ?, ?, ?, ?)').bind(newId('pr_'), code, price, date, op.id, Date.now()).run();
    }
  } catch (e) { /* best effort */ }
  /* crew: tell the rest of the operation when the airport is on a saved trip */
  try {
    const onTrip = (blob.trips || []).some((t) => (t.legs || []).some((l) => l.from === code || l.to === code || l.alt === code));
    if (!onTrip) return;
    const ids = await opUserIds(env, op.id, user.id);
    if (!ids.length) return;
    const who = (user.name || user.email).split(' ')[0];
    await notifyUsers(env, ids, { title: code + ' Jet A $' + price.toFixed(2), body: who + ' logged a price at ' + code + (b.fbo ? ' (' + String(b.fbo).slice(0, 30) + ')' : '') + '. It is on one of your trips.', url: '/?apt=' + code, tag: 'price-' + code }, 'prices');
  } catch (e) { /* best effort */ }
}

export async function onRequestPost({ request, env, waitUntil }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  if (needsVerify(user, env)) return err('Verify your email to sync across devices.', 403, 'verify');
  const op = await activeOp(env, user);
  if (!op) return err('No operation.', 404);
  if (op.role === 'viewer') return err('This workspace is view only for your account.', 403, 'viewer');
  const b = await readJson(request);
  if (!b || !b.op) return err('bad request');
  const blob = await readOp(env, op.id);
  const r = applyOp(blob, b, isPro(user, env));
  if (r.error) return err(r.error, r.status || 400, r.status === 402 ? 'pro' : undefined);
  await writeOp(env, op.id, r.blob);
  if (b.op === 'add') { const p = afterPriceAdd(env, op, user, b, r.blob); if (waitUntil) waitUntil(p); else await p; }
  return json(Object.assign({ op_id: op.id }, r.blob));
}
