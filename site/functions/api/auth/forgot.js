import { json, err, readJson, clientIp, rateLimit, normEmail, validEmail, randomCode, now } from '../../../lib/util.js';
import { emailReady } from '../../../lib/auth.js';
import { sendEmail, resetEmailHtml } from '../../../lib/email.js';

/* POST {email}: emails a 6-digit reset code. Always answers ok so addresses cannot be probed. */
export async function onRequestPost({ request, env }) {
  if (!env.DB) return err('accounts not configured', 503);
  if (!emailReady(env)) return err('Password reset by email is not available yet. Write to hello@jetdesk.ai.', 503);
  if (!(await rateLimit(env, 'forgot-ip:' + clientIp(request), 6, 3600))) return err('Too many requests. Try again later.', 429);
  const b = (await readJson(request)) || {};
  const email = normEmail(b.email);
  if (!validEmail(email)) return err('Enter a valid email address.');
  if (!(await rateLimit(env, 'forgot-email:' + email, 3, 3600))) return json({ ok: true });
  const user = await env.DB.prepare('SELECT id, email, name FROM users WHERE email = ?').bind(email).first();
  if (user) {
    const code = randomCode(6);
    await env.DB.prepare('UPDATE users SET reset_code = ?, reset_exp = ? WHERE id = ?').bind(code, now() + 30 * 60000, user.id).run();
    const brand = env.BRAND || 'JetDesk';
    await sendEmail(env, user.email, brand + ' password reset code: ' + code, resetEmailHtml(brand, code));
  }
  return json({ ok: true });
}
