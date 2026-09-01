import { json, err, readJson, normEmail, validEmail } from '../../../lib/util.js';
import { getUser, isAdmin } from '../../../lib/auth.js';
import { sendEmail, testEmailHtml, emailConfigured } from '../../../lib/email.js';

/* Admin: POST {to} sends a test email through the configured provider */
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user || !isAdmin(user, env)) return err('Admins only.', 403);
  if (!emailConfigured(env)) return err('Email is not configured (EMAIL binding or RESEND_API_KEY, plus EMAIL_FROM).', 503);
  const b = (await readJson(request)) || {};
  const to = normEmail(b.to || user.email);
  if (!validEmail(to)) return err('Bad address.');
  const r = await sendEmail(env, to, (env.BRAND || 'JetDesk') + ' test email', testEmailHtml(env.BRAND || 'JetDesk'));
  return json({ sent: !!r.ok, to, via: r.via || null, error: r.error || null });
}
