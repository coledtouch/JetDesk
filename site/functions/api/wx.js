/* GET /api/wx?ids=KPVD,KHPN  ->  { metar:[...], taf:[...], fetched: epoch_ms }
   Proxies the FAA Aviation Weather Center data API (no key required) so the
   browser can read it same-origin, with short edge caching.
   Robustness notes: airports without a published TAF come back as an EMPTY
   BODY (not []) from AWC, and either feed can hiccup independently, so each
   feed is parsed defensively and failures degrade to [] instead of erroring. */

const AWC = 'https://aviationweather.gov/api/data/';

function json(obj, status) {
  status = status || 200;
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=120' : 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

async function feed(url) {
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': 'MeridianFlightDesk/1.0 (personal planning tool)' },
      cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 120, '400-499': 30, '500-599': 0 } },
    });
    if (!r.ok) return [];
    const text = await r.text();
    if (!text || !text.trim()) return [];
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  } catch (e) { return []; }
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const ids = (url.searchParams.get('ids') || '')
    .toUpperCase()
    .replace(/[^A-Z0-9,]/g, '')
    .split(',')
    .filter(Boolean)
    .slice(0, 20)
    .join(',');
  if (!ids) return json({ error: 'ids required' }, 400);

  const [metar, taf] = await Promise.all([
    feed(AWC + 'metar?format=json&ids=' + ids),
    feed(AWC + 'taf?format=json&ids=' + ids),
  ]);
  return json({ metar, taf, fetched: Date.now() });
}
