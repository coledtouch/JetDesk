import { json, err, readJson } from '../../../lib/util.js';
import { sha256hex } from '../../../lib/crypto.js';
import { getUser, bearer } from '../../../lib/auth.js';

/* GET: this account's signed-in devices. POST {revoke:'others'}: sign out everywhere else. */
export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  const cur = await sha256hex(bearer(request));
  const rows = await env.DB.prepare('SELECT token_hash, created, expires, ua FROM sessions WHERE user_id = ? ORDER BY created DESC').bind(user.id).all();
  return json({ sessions: (rows.results || []).map((s) => ({
    current: s.token_hash === cur, created: s.created, expires: s.expires, device: describe(s.ua),
  })) });
}

export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  const b = (await readJson(request)) || {};
  if (b.revoke !== 'others') return err('bad request');
  const cur = await sha256hex(bearer(request));
  const r = await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(user.id, cur).run();
  return json({ ok: true, revoked: (r.meta && r.meta.changes) || 0 });
}

function describe(ua) {
  ua = String(ua || '');
  let os = 'Unknown device';
  if (/iPhone/.test(ua)) os = 'iPhone'; else if (/iPad/.test(ua)) os = 'iPad'; else if (/Android/.test(ua)) os = 'Android';
  else if (/Windows/.test(ua)) os = 'Windows'; else if (/Mac OS X/.test(ua)) os = 'Mac'; else if (/Linux/.test(ua)) os = 'Linux';
  let br = '';
  if (/CriOS|Chrome\//.test(ua) && !/Edg/.test(ua)) br = 'Chrome'; else if (/Safari/.test(ua) && !/Chrome/.test(ua)) br = 'Safari';
  else if (/Firefox/.test(ua)) br = 'Firefox'; else if (/Edg/.test(ua)) br = 'Edge'; else if (/curl/i.test(ua)) br = 'API';
  return br ? os + ' · ' + br : os;
}
