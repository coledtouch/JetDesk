import { json, err } from '../../lib/util.js';
import { getUser, isPro } from '../../lib/auth.js';

/* GET ?icao=KHPN -> { configured, icao, fetched, notams:[{id, text, start, end, closure}] }
   Adapter for the FAA NOTAM Management Service API. Access is granted by the FAA on request
   (notams@faa.gov); until NOTAM_API_BASE and credentials exist this answers configured:false and
   the app hides the card. Two credential styles are supported: client_id/client_secret headers
   (NOTAM_CLIENT_ID, NOTAM_CLIENT_SECRET) or a bearer token (NOTAM_API_KEY). */
export async function onRequestGet({ request, env }) {
  const base = env.NOTAM_API_BASE || '';
  const configured = !!(base && ((env.NOTAM_CLIENT_ID && env.NOTAM_CLIENT_SECRET) || env.NOTAM_API_KEY));
  if (!configured) return json({ configured: false });
  const user = await getUser(request, env);
  if (!user || !isPro(user, env)) return err('NOTAMs are a Pro feature.', 402, 'pro');
  const url = new URL(request.url);
  const icao = (url.searchParams.get('icao') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (icao.length < 3) return err('icao required');

  const key = 'notam:' + icao;
  if (env.PRICES) {
    const cached = await env.PRICES.get(key);
    if (cached) return json(JSON.parse(cached));
  }
  const headers = { accept: 'application/json' };
  if (env.NOTAM_API_KEY) headers.authorization = 'Bearer ' + env.NOTAM_API_KEY;
  if (env.NOTAM_CLIENT_ID) { headers.client_id = env.NOTAM_CLIENT_ID; headers.client_secret = env.NOTAM_CLIENT_SECRET; }
  const q = (env.NOTAM_API_QUERY || 'notams?icaoLocation={icao}&responseFormat=geoJson&pageSize=100').replace('{icao}', icao);
  let out;
  try {
    const r = await fetch(base.replace(/\/$/, '') + '/' + q, { headers });
    if (!r.ok) return err('NOTAM service answered ' + r.status, 502);
    const j = await r.json();
    out = { configured: true, icao, fetched: Date.now(), notams: normalize(j) };
  } catch (e) {
    return err('NOTAM service unreachable.', 502);
  }
  if (env.PRICES) await env.PRICES.put(key, JSON.stringify(out), { expirationTtl: 600 });
  return json(out);
}

/* Accepts the FNS geoJson shape (items[].properties.coreNOTAMData.notam) and a flat items[] fallback. */
function normalize(j) {
  const items = (j && (j.items || j.notams || j.data)) || [];
  return items.map((it) => {
    const core = (it.properties && it.properties.coreNOTAMData && it.properties.coreNOTAMData.notam) || it.notam || it;
    const text = String(core.text || core.icaoMessage || core.message || '').trim();
    return {
      id: String(core.number || core.id || '').slice(0, 24),
      text: text.slice(0, 1200),
      start: core.effectiveStart || core.startDate || null,
      end: core.effectiveEnd || core.endDate || null,
      closure: /\bRWY\b[^.]*\bCLSD\b|\bAD\s+CLSD\b|\bAPRON\b[^.]*\bCLSD\b|\bTWY\b[^.]*\bCLSD\b/i.test(text),
      runway: /\bRWY\b[^.]*\bCLSD\b|\bAD\s+CLSD\b/i.test(text),
    };
  }).filter((n) => n.text).sort((a, b) => (b.runway - a.runway) || (b.closure - a.closure));
}
