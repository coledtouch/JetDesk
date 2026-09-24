import { json, err, readJson } from '../../lib/util.js';
import { getUser, meShape } from '../../lib/auth.js';
import { touch } from '../../lib/lifecycle.js';
import { stripe, isLiveSubscription } from '../../lib/stripe.js';

export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  try { await touch(env, user); } catch (e) { /* housekeeping only */ }
  return json(await meShape(env, user));
}

/* Update profile fields */
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  const b = (await readJson(request)) || {};
  const name = b.name !== undefined ? String(b.name).trim().slice(0, 60) : user.name;
  const tail = b.tail !== undefined ? String(b.tail).trim().toUpperCase().slice(0, 10) : user.tail;
  const home = b.home_base !== undefined ? String(b.home_base).trim().toUpperCase().slice(0, 4) : user.home_base;
  await env.DB.prepare('UPDATE users SET name = ?, tail = ?, home_base = ? WHERE id = ?').bind(name, tail, home, user.id).run();
  user.name = name; user.tail = tail; user.home_base = home;
  if (b.op_name !== undefined) {
    const on = String(b.op_name).trim().slice(0, 60);
    if (on) await env.DB.prepare('UPDATE ops SET name = ? WHERE id = ? AND owner_id = ?').bind(on, user.op_id, user.id).run();
  }
  return json(await meShape(env, user));
}

/* Cancel every subscription that could still bill this user, immediately. Lists by customer so a
   stray second subscription is caught too, not only the one recorded in stripe_sub. */
async function cancelBilling(env, user) {
  const ids = new Set();
  if (user.stripe_customer) {
    const list = await stripe(env, 'GET', '/subscriptions?status=all&limit=100&customer=' + encodeURIComponent(user.stripe_customer));
    (list.data || []).filter(isLiveSubscription).forEach((s) => ids.add(s.id));
  }
  if (user.stripe_sub && !ids.has(user.stripe_sub)) {
    const s = await stripe(env, 'GET', '/subscriptions/' + encodeURIComponent(user.stripe_sub));
    if (isLiveSubscription(s)) ids.add(s.id);
  }
  for (const id of ids) await stripe(env, 'DELETE', '/subscriptions/' + encodeURIComponent(id));
  return ids.size;
}

/* Delete account and everything it owns */
export async function onRequestDelete({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  /* billing first: never leave a pilot paying for an account that no longer exists */
  if (user.stripe_customer || user.stripe_sub) {
    if (!env.STRIPE_SECRET_KEY) return err('Billing is unavailable right now, so your subscription cannot be cancelled. Try again later.', 503, 'billing_unavailable');
    try { await cancelBilling(env, user); }
    catch (e) { return err('Could not cancel your subscription, so the account was not deleted. Try again, or cancel it from Manage billing first.', 502, 'cancel_failed'); }
  }
  const ops = await env.DB.prepare('SELECT id FROM ops WHERE owner_id = ?').bind(user.id).all();
  for (const o of (ops.results || [])) {
    try { await env.PRICES.delete('op:' + o.id); } catch (e) {}
    await env.DB.prepare('DELETE FROM op_members WHERE op_id = ?').bind(o.id).run();
    await env.DB.prepare('DELETE FROM ops WHERE id = ?').bind(o.id).run();
  }
  await env.DB.prepare('DELETE FROM op_members WHERE email = ?').bind(user.email).run();
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();
  return json({ ok: true });
}
