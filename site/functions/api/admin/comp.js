import { json, err, readJson, normEmail } from '../../../lib/util.js';
import { getUser, isAdmin } from '../../../lib/auth.js';

/* Admin: POST {email, plan:'comp'|'free'} grants or removes a complimentary Pro plan.
   GET: list users (email, plan, created). */
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user || !isAdmin(user, env)) return err('Admins only.', 403);
  const b = (await readJson(request)) || {};
  const email = normEmail(b.email);
  const plan = b.plan === 'free' ? 'free' : 'comp';
  const r = await env.DB.prepare('UPDATE users SET plan = ? WHERE email = ?').bind(plan, email).run();
  if (!r.meta || !r.meta.changes) return err('No account with that email yet.', 404);
  return json({ ok: true, email, plan });
}

export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  if (!user || !isAdmin(user, env)) return err('Admins only.', 403);
  const rows = await env.DB.prepare('SELECT email, name, plan, plan_until, trial_until, created, verified FROM users ORDER BY created DESC LIMIT 200').all();
  return json({ users: rows.results || [] });
}
