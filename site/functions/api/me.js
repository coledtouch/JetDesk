import { json, err, readJson } from '../../lib/util.js';
import { getUser, meShape } from '../../lib/auth.js';
import { touch } from '../../lib/lifecycle.js';

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

/* Delete account and everything it owns */
export async function onRequestDelete({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
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
