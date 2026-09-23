/* GET /api/wx?ids=KPVD,KHPN  ->  { metar:[...], taf:[...], fetched: epoch_ms }
   Proxies the FAA Aviation Weather Center data API (no key required) so the
   browser can read it same-origin, with short edge caching.
   Robustness notes: airports without a published TAF come back as an EMPTY
   BODY (not []) from AWC, so a 2xx empty body is a real "no data" answer.
   A failed feed (network error, non-2xx, unparseable body) is NOT the same as
   no data: a METAR failure returns 502 with no-store so the app shows a
   weather error and retries, and a TAF-only failure returns the METARs with
   partial:true and a short cache. An all-empty METAR answer is retried once
   past the edge cache and never cached, so an upstream hiccup can't pin
   "no weather" for everyone. */

const AWC = 'https://aviationweather.gov/api/data/';
const UA = { 'user-agent': 'MeridianFlightDesk/1.0 (personal planning tool)' };

function json(obj, status, maxAge) {
  status = status || 200;
  if (maxAge == null) maxAge = status === 200 ? 120 : 0;
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': maxAge > 0 ? 'public, max-age=' + maxAge : 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

// Returns an array (possibly empty) on success, or null when the feed failed.
async function feed(url, fresh) {
  try {
    const r = await fetch(url, fresh
      ? { headers: UA, cache: 'no-store' }
      : { headers: UA, cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 120, '400-499': 0, '500-599': 0 } } });
    if (!r.ok) return null;
    const text = await r.text();
    if (!text || !text.trim()) return [];
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) { return null; }
  } catch (e) { return null; }
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

  const metarUrl = AWC + 'metar?format=json&ids=' + ids;
  const tafUrl = AWC + 'taf?format=json&ids=' + ids;
  let [metar, taf] = await Promise.all([feed(metarUrl), feed(tafUrl)]);

  // Nothing at all may be a cached upstream hiccup: ask AWC again, uncached.
  if (metar && !metar.length) {
    [metar, taf] = await Promise.all([feed(metarUrl, true), taf && taf.length ? taf : feed(tafUrl, true)]);
  }

  if (metar === null) {
    return json({ error: 'Weather service unavailable. Try again shortly.', retry: true }, 502);
  }
  const body = { metar, taf: taf || [], fetched: Date.now() };
  if (taf === null) body.partial = true;
  // Full answers cache 2 min; partial answers 30 s; an empty answer is not cached.
  const maxAge = !metar.length ? 0 : (taf === null ? 30 : 120);
  return json(body, 200, maxAge);
}
