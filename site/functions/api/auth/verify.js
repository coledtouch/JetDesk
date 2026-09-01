import { json, err, readJson, now, rateLimit, randomCode } from '../../../lib/util.js';
import { getUser, meShape, emailReady } from '../../../lib/auth.js';
import { sendEmail, verifyEmailHtml } from '../../../lib/email.js';

/* POST {code} verifies; POST {resend:true} sends a fresh code */
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  const b = (await readJson(request)) || {};
  if (b.resend) {
    if (!emailReady(env)) return err('Email is not configured yet.', 503);
    if (!(await rateLimit(env, 'verify-resend:' + user.id, 3, 3600))) return err('Too many codes sent. Try again later.', 429);
    const code = randomCode(6);
    await env.DB.prepare('UPDATE users SET verify_code = ?, verify_exp = ? WHERE id = ?').bind(code, now() + 30 * 60000, user.id).run();
    await sendEmail(env, user.email, (env.BRAND || 'JetDesk') + ' verification code: ' + code, verifyEmailHtml(env.BRAND || 'JetDesk', code));
    return json({ ok: true });
  }
  if (!(await rateLimit(env, 'verify-attempt:' + user.id, 10, 600))) return err('Too many attempts. Request a new code later.', 429);
  const code = String(b.code || '').replace(/\D/g, '');
  if (!user.verify_code || code !== String(user.verify_code) || !user.verify_exp || user.verify_exp < now()) {
    return err('That code is wrong or expired.', 400);
  }
  await env.DB.prepare('UPDATE users SET verified = 1, verify_code = NULL, verify_exp = NULL WHERE id = ?').bind(user.id).run();
  user.verified = 1;
  return json({ me: await meShape(env, user) });
}
