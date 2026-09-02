import { json, err, readJson } from '../../../lib/util.js';
import { getUser } from '../../../lib/auth.js';
import { pushConfigured, sendPush } from '../../../lib/push.js';

/* POST {subscription, prefs?}: save this device's push subscription. DELETE {endpoint}: remove it.
   POST {test: true}: send a test notification to this user's devices. */
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  if (!pushConfigured(env)) return err('Push is not configured.', 503);
  const b = (await readJson(request)) || {};
  if (b.prefs && typeof b.prefs === 'object') {
    const prefs = { prices: b.prefs.prices !== false, wx: b.prefs.wx !== false, trial: b.prefs.trial !== false };
    await env.DB.prepare('UPDATE users SET push_prefs = ? WHERE id = ?').bind(JSON.stringify(prefs), user.id).run();
  }
  if (b.subscription && b.subscription.endpoint && b.subscription.keys) {
    const s = b.subscription;
    if (!/^https:\/\//.test(s.endpoint) || s.endpoint.length > 1000) return err('bad subscription');
    await env.DB.prepare('INSERT INTO push_subs (endpoint, user_id, p256dh, auth, ua, created) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, ua = excluded.ua')
      .bind(s.endpoint, user.id, String(s.keys.p256dh).slice(0, 200), String(s.keys.auth).slice(0, 100), String(request.headers.get('user-agent') || '').slice(0, 160), Date.now()).run();
  }
  if (b.test) {
    const rows = (await env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id = ?').bind(user.id).all()).results || [];
    let ok = 0;
    for (const r of rows) { if ((await sendPush(env, r, { title: 'JetDesk notifications are on', body: 'You will hear about crew price logs and weather on your trips here.', url: '/', tag: 'test' })) === 'ok') ok++; }
    return json({ ok: true, sent: ok, devices: rows.length });
  }
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subs WHERE user_id = ?').bind(user.id).first();
  return json({ ok: true, devices: count ? count.n : 0 });
}
export async function onRequestDelete({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  const b = (await readJson(request)) || {};
  if (b.endpoint) await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ? AND user_id = ?').bind(String(b.endpoint), user.id).run();
  else await env.DB.prepare('DELETE FROM push_subs WHERE user_id = ?').bind(user.id).run();
  return json({ ok: true });
}
