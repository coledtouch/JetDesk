import { json, err, readJson, clientIp, rateLimit, normEmail, validEmail, newId, randomCode, now, DAY } from '../../../lib/util.js';
import { hashPassword } from '../../../lib/crypto.js';
import { createSession, meShape, isAdmin, TRIAL_DAYS, emailReady } from '../../../lib/auth.js';
import { sendEmail, verifyEmailHtml, welcomeEmailHtml } from '../../../lib/email.js';
import { readOp, writeOp } from '../../../lib/data.js';
import { bump } from '../../../lib/metrics.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return err('accounts not configured', 503);
  if (!(await rateLimit(env, 'reg:' + clientIp(request), 8, 3600))) return err('Too many sign-ups from this network. Try later.', 429);
  const b = await readJson(request);
  if (!b) return err('bad json');
  const email = normEmail(b.email);
  const password = String(b.password || '');
  const name = String(b.name || '').trim().slice(0, 60);
  if (!validEmail(email)) return err('Enter a valid email address.');
  if (password.length < 8) return err('Password needs at least 8 characters.');

  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) return err('That email already has an account. Sign in instead.', 409, 'exists');

  const { hash, salt } = await hashPassword(password, env.AUTH_PEPPER || '');
  const id = newId('u_');
  const t = now();
  const admin = isAdmin({ email }, env);
  const opId = newId('op_');
  const code = randomCode(6);

  await env.DB.batch([
    env.DB.prepare('INSERT INTO users (id, email, name, pw_hash, salt, created, verified, verify_code, verify_exp, plan, trial_until, op_id) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)')
      .bind(id, email, name, hash, salt, t, code, t + 30 * 60000, admin ? 'comp' : 'free', t + TRIAL_DAYS * DAY, opId),
    env.DB.prepare('INSERT INTO ops (id, name, owner_id, created) VALUES (?, ?, ?, ?)')
      .bind(opId, (name ? name.split(' ')[0] + "'s" : 'My') + ' operation', id, t),
    env.DB.prepare('INSERT INTO op_members (op_id, email, role, added) VALUES (?, ?, ?, ?)')
      .bind(opId, email, 'owner', t),
  ]);

  /* first admin inherits the legacy shared store seeded before accounts existed */
  if (admin && env.PRICES) {
    try {
      const legacy = await env.PRICES.get('prices');
      if (legacy) {
        const L = JSON.parse(legacy);
        const blob = await readOp(env, opId);
        blob.prices = L.prices || {};
        blob.fbos = L.fbos || {};
        if (!blob.trips.length) {
          blob.trips = [
            { id: 't1', name: 'HPN Drop-off', legs: [{ from: 'KPVD', to: 'KHPN' }, { from: 'KHPN', to: 'KPVD' }] },
            { id: 't2', name: 'Vineyard Run', legs: [{ from: 'KPVD', to: 'KMVY' }, { from: 'KMVY', to: 'KPVD' }] },
          ];
        }
        await writeOp(env, opId, blob);
        await env.PRICES.delete('prices');
      }
    } catch (e) { /* non-fatal */ }
  }

  if (emailReady(env)) {
    const brand = env.BRAND || 'JetDesk';
    await sendEmail(env, email, brand + ' verification code: ' + code, verifyEmailHtml(brand, code));
    await sendEmail(env, email, 'Welcome to ' + brand, welcomeEmailHtml(brand, name, TRIAL_DAYS));
  }

  /* referral: ?ref=<first 8 of a user id> kept by the app until sign-up */
  try {
    const ref = String(b.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 12);
    if (ref) {
      const r = await env.DB.prepare('SELECT id FROM users WHERE substr(id, 1, ?) = ? AND id != ? LIMIT 1').bind(ref.length, ref, id).first();
      if (r) { await env.DB.prepare('UPDATE users SET referred_by = ? WHERE id = ?').bind(r.id, id).run(); await bump(env, 'referred_signup'); }
    }
  } catch (e) { /* optional */ }

  await bump(env, 'signup');
  const token = await createSession(env, id, request.headers.get('user-agent'));
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  const me = await meShape(env, user);
  return json({ token, me });
}
