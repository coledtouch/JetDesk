import { json, err, readJson, clientIp, rateLimit, normEmail } from '../../../lib/util.js';
import { verifyPassword } from '../../../lib/crypto.js';
import { createSession, meShape, isAdmin } from '../../../lib/auth.js';
import { bump } from '../../../lib/metrics.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return err('accounts not configured', 503);
  if (!(await rateLimit(env, 'login:' + clientIp(request), 12, 60))) return err('Too many attempts. Wait a minute.', 429);
  const b = await readJson(request);
  if (!b) return err('bad json');
  const email = normEmail(b.email);
  const password = String(b.password || '');
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  const ok = user && (await verifyPassword(password, user.pw_hash, user.salt, env.AUTH_PEPPER || ''));
  if (!ok) return err('Email or password did not match.', 401);
  if (isAdmin(user, env) && user.plan !== 'comp') {
    await env.DB.prepare("UPDATE users SET plan = 'comp' WHERE id = ?").bind(user.id).run();
    user.plan = 'comp';
  }
  await bump(env, 'login');
  const token = await createSession(env, user.id, request.headers.get('user-agent'));
  const me = await meShape(env, user);
  return json({ token, me });
}
