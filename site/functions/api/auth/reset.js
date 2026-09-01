import { json, err, readJson, clientIp, rateLimit, normEmail, now } from '../../../lib/util.js';
import { hashPassword } from '../../../lib/crypto.js';
import { createSession, meShape } from '../../../lib/auth.js';

/* POST {email, code, password}: sets a new password, signs out every device, signs this one in. */
export async function onRequestPost({ request, env }) {
  if (!env.DB) return err('accounts not configured', 503);
  const b = (await readJson(request)) || {};
  const email = normEmail(b.email);
  const code = String(b.code || '').replace(/\D/g, '');
  const password = String(b.password || '');
  if (!(await rateLimit(env, 'reset:' + email, 10, 600)) || !(await rateLimit(env, 'reset-ip:' + clientIp(request), 30, 600))) {
    return err('Too many attempts. Request a new code later.', 429);
  }
  if (password.length < 8) return err('Password needs at least 8 characters.');
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user || !user.reset_code || code !== String(user.reset_code) || !user.reset_exp || user.reset_exp < now()) {
    return err('That code is wrong or expired.', 400);
  }
  const { hash, salt } = await hashPassword(password, env.AUTH_PEPPER || '');
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET pw_hash = ?, salt = ?, reset_code = NULL, reset_exp = NULL, verified = 1, verify_code = NULL, verify_exp = NULL WHERE id = ?').bind(hash, salt, user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
  ]);
  user.pw_hash = hash; user.salt = salt; user.verified = 1;
  const token = await createSession(env, user.id, request.headers.get('user-agent'));
  return json({ token, me: await meShape(env, user) });
}
