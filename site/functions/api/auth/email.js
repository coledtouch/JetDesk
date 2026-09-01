import { json, err, readJson, rateLimit, normEmail, validEmail, randomCode, now } from '../../../lib/util.js';
import { verifyPassword } from '../../../lib/crypto.js';
import { getUser, meShape, emailReady } from '../../../lib/auth.js';
import { sendEmail, changeEmailHtml } from '../../../lib/email.js';

/* POST {email, password}: emails a code to the new address.
   POST {code}: applies the pending change and moves crew memberships with it. */
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  const b = (await readJson(request)) || {};
  const brand = env.BRAND || 'JetDesk';
  if (b.code !== undefined) {
    if (!(await rateLimit(env, 'email-confirm:' + user.id, 10, 600))) return err('Too many attempts. Start over later.', 429);
    const code = String(b.code || '').replace(/\D/g, '');
    if (!user.pending_email || !user.pending_code || code !== String(user.pending_code) || !user.pending_exp || user.pending_exp < now()) {
      return err('That code is wrong or expired.', 400);
    }
    const taken = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(user.pending_email, user.id).first();
    if (taken) return err('That email already has an account.', 409);
    const oldEmail = user.email, newEmail = user.pending_email;
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET email = ?, verified = 1, pending_email = NULL, pending_code = NULL, pending_exp = NULL WHERE id = ?').bind(newEmail, user.id),
      env.DB.prepare('UPDATE op_members SET email = ? WHERE email = ?').bind(newEmail, oldEmail),
    ]);
    user.email = newEmail; user.verified = 1; user.pending_email = null;
    return json({ me: await meShape(env, user) });
  }
  if (!emailReady(env)) return err('Email is not configured yet.', 503);
  if (!(await rateLimit(env, 'email-change:' + user.id, 3, 3600))) return err('Too many requests. Try again later.', 429);
  const email = normEmail(b.email);
  if (!validEmail(email)) return err('Enter a valid email address.');
  if (email === normEmail(user.email)) return err('That is already your email.');
  if (!(await verifyPassword(String(b.password || ''), user.pw_hash, user.salt, env.AUTH_PEPPER || ''))) return err('Password did not match.', 401);
  const taken = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (taken) return err('That email already has an account.', 409);
  const code = randomCode(6);
  await env.DB.prepare('UPDATE users SET pending_email = ?, pending_code = ?, pending_exp = ? WHERE id = ?').bind(email, code, now() + 30 * 60000, user.id).run();
  await sendEmail(env, email, brand + ' email change code: ' + code, changeEmailHtml(brand, code));
  return json({ ok: true, pending: email });
}
