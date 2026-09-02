/* Weather alerts for dated trips: the evening before a trip, read the TAF at each destination and
   alternate; if any forecast period is below 1,000 ft or 3 statute miles, push it to the crew. */
import { readOp } from './data.js';
import { notifyUsers, opUserIds, pushConfigured } from './push.js';

const AWC = 'https://aviationweather.gov/api/data/taf?format=json&ids=';

function tomorrowISO(now) {
  const d = new Date((now || Date.now()) + 86400000);
  return d.toISOString().slice(0, 10);
}
function ceiling(period) {
  let c = null;
  (period.clouds || []).forEach((cl) => {
    if (/^(BKN|OVC|VV)$/.test(cl.cover || '') && cl.base != null) c = c == null ? cl.base : Math.min(c, cl.base);
  });
  return c;
}
function worstPeriod(taf) {
  let worst = null;
  (taf.fcsts || []).forEach((p) => {
    const vis = p.visib == null ? null : (typeof p.visib === 'string' ? parseFloat(String(p.visib).replace('+', '')) : p.visib);
    const ceil = ceiling(p);
    const bad = (vis != null && vis < 3) || (ceil != null && ceil < 1000);
    if (!bad) return;
    const score = (vis == null ? 10 : vis) + (ceil == null ? 5000 : ceil) / 1000;
    if (!worst || score < worst.score) worst = { score, vis, ceil, from: p.timeFrom, wx: p.wxString || '' };
  });
  return worst;
}
function zulu(epochSec) {
  if (!epochSec) return '';
  const d = new Date(epochSec * 1000);
  return ('0' + d.getUTCDate()).slice(-2) + ('0' + d.getUTCHours()).slice(-2) + 'Z';
}

export async function tafAlerts(env, out) {
  if (!pushConfigured(env)) return;
  const tomorrow = tomorrowISO();
  const ops = (await env.DB.prepare('SELECT DISTINCT o.id FROM ops o JOIN push_subs s ON s.user_id = o.owner_id OR s.user_id IN (SELECT u.id FROM op_members m JOIN users u ON lower(u.email) = lower(m.email) WHERE m.op_id = o.id)').all()).results || [];
  for (const op of ops) {
    try {
      const blob = await readOp(env, op.id);
      const trips = (blob.trips || []).filter((t) => t.date === tomorrow);
      if (!trips.length) continue;
      const codes = new Set();
      trips.forEach((t) => (t.legs || []).forEach((l) => { if (l.to) codes.add(l.to); if (l.alt) codes.add(l.alt); }));
      if (!codes.size) continue;
      const key = 'alert:taf:' + op.id + ':' + tomorrow;
      if (await env.PRICES.get(key)) continue;
      const r = await fetch(AWC + [...codes].join(','), { headers: { 'user-agent': 'JetDesk/1.0 (planning tool)' } });
      const tafs = r.ok ? (await r.json().catch(() => [])) : [];
      const hits = [];
      (Array.isArray(tafs) ? tafs : []).forEach((taf) => {
        const w = worstPeriod(taf);
        if (w) hits.push({ code: taf.icaoId, w });
      });
      await env.PRICES.put(key, '1', { expirationTtl: 3 * 86400 });
      if (!hits.length) continue;
      const first = hits[0];
      const body = hits.map((h) => h.code + ' ' + (h.w.vis != null ? h.w.vis + ' SM ' : '') + (h.w.ceil != null ? 'ceiling ' + h.w.ceil + ' ft ' : '') + (h.w.wx ? h.w.wx + ' ' : '') + 'from ' + zulu(h.w.from)).join(' · ');
      const ids = await opUserIds(env, op.id, null);
      const res = await notifyUsers(env, ids, { title: 'TAF below 1,000/3 for tomorrow', body: body.slice(0, 180), url: '/?apt=' + first.code, tag: 'taf-' + tomorrow }, 'wx');
      out.taf_alerts = (out.taf_alerts || 0) + 1; out.taf_pushes = (out.taf_pushes || 0) + res.sent;
    } catch (e) { out.taf_error = String(e && e.message || e); }
  }
}
