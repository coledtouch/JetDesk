import { json, err, readJson, rateLimit } from '../../../lib/util.js';
import { hashPassword, verifyPassword, sha256hex } from '../../../lib/crypto.js';
import { getUser, bearer } from '../../../lib/auth.js';

/* POST {current, password}: changes the password and signs out every other device. */
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  if (!(await rateLimit(env, 'pw-change:' + user.id, 10, 600))) return err('Too many attempts. Try again later.', 429);
  const b = (await readJson(request)) || {};
  const current = String(b.current || ''), password = String(b.password || '');
  if (password.length < 8) return err('New password needs at least 8 characters.');
  if (!(await verifyPassword(current, user.pw_hash, user.salt, env.AUTH_PEPPER || ''))) return err('Current password did not match.', 401);
  const { hash, salt } = await hashPassword(password, env.AUTH_PEPPER || '');
  const keep = await sha256hex(bearer(request));
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET pw_hash = ?, salt = ? WHERE id = ?').bind(hash, salt, user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(user.id, keep),
  ]);
  return json({ ok: true });
}
