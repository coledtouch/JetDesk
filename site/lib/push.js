/* Web Push (VAPID + aes128gcm) via WebCrypto. Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (base64url raw / JWK d). */
import { buildPushPayload } from './webpush/main.js';

export function pushConfigured(env) { return !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY); }

function vapid(env) {
  return { subject: 'mailto:hello@jetdesk.ai', publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
}

/* Send one notification to one subscription row. Returns 'ok', 'gone' (drop the row) or 'fail'. */
export async function sendPush(env, sub, note) {
  if (!pushConfigured(env)) return 'fail';
  try {
    const subscription = { endpoint: sub.endpoint, expirationTime: null, keys: { p256dh: sub.p256dh, auth: sub.auth } };
    const payload = await buildPushPayload({ data: JSON.stringify(note), options: { ttl: 6 * 3600, urgency: 'normal' } }, subscription, vapid(env));
    const r = await fetch(sub.endpoint, payload);
    if (r.status === 404 || r.status === 410) return 'gone';
    return r.ok ? 'ok' : 'fail';
  } catch (e) { return 'fail'; }
}

/* Notify every device of the given users (array of user ids). note: {title, body, url, tag}. */
export async function notifyUsers(env, userIds, note, pref) {
  if (!pushConfigured(env) || !userIds.length) return { sent: 0 };
  const ids = [...new Set(userIds)].slice(0, 200);
  const q = 'SELECT s.endpoint, s.p256dh, s.auth, s.user_id, u.push_prefs FROM push_subs s JOIN users u ON u.id = s.user_id WHERE s.user_id IN (' + ids.map(() => '?').join(',') + ')';
  const rows = (await env.DB.prepare(q).bind(...ids).all()).results || [];
  let sent = 0;
  for (const row of rows) {
    let prefs = {};
    try { prefs = JSON.parse(row.push_prefs || '{}'); } catch (e) { prefs = {}; }
    if (pref && prefs[pref] === false) continue;
    const res = await sendPush(env, row, note);
    if (res === 'ok') { sent++; await env.DB.prepare('UPDATE push_subs SET last_ok = ? WHERE endpoint = ?').bind(Date.now(), row.endpoint).run(); }
    else if (res === 'gone') await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(row.endpoint).run();
  }
  return { sent };
}

/* User ids of everyone in an operation (owner plus members with accounts), optionally excluding one. */
export async function opUserIds(env, opId, excludeUserId) {
  const op = await env.DB.prepare('SELECT owner_id FROM ops WHERE id = ?').bind(opId).first();
  const members = (await env.DB.prepare('SELECT u.id FROM op_members m JOIN users u ON lower(u.email) = lower(m.email) WHERE m.op_id = ?').bind(opId).all()).results || [];
  const ids = members.map((m) => m.id);
  if (op) ids.push(op.owner_id);
  return ids.filter((id) => id && id !== excludeUserId);
}
