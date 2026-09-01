import { getUser, isPro } from '../../lib/auth.js';
/* GET /api/market -> wholesale benchmarks for a rough pricing floor.
   Sources (keys held as Pages secrets, response shapes verified live):
     Jet A:  EIA v2 series EER_EPJK_PF4_RGC_DPG.D, US Gulf Coast spot $/gal,
             daily official, with a ~30-day delta computed from history.
             Fallback: OilPriceAPI JET_FUEL_USD (itself EIA-derived).
     Crude:  OilPriceAPI WTI_USD, intraday spot $/bbl with a 24 h change.
             Fallback: EIA RWTC.D daily.
   Wholesale market prices, not FBO ramp prices. */

function json(obj, status) {
  status = status || 200;
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=900' : 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

async function eiaSeries(env, seriesId, cacheTtl) {
  if (!env.EIA_API_KEY) return null;
  try {
    const u = 'https://api.eia.gov/v2/seriesid/' + seriesId +
      '?api_key=' + env.EIA_API_KEY +
      '&data[]=value&sort[0][column]=period&sort[0][direction]=desc&length=30';
    const r = await fetch(u, {
      headers: { 'user-agent': 'MeridianFlightDesk/1.0' },
      cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': cacheTtl, '400-499': 300, '500-599': 0 } },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const rows = (((j || {}).response || {}).data || [])
      .map((d) => ({ date: d.period, v: parseFloat(d.value) }))
      .filter((d) => d.date && isFinite(d.v));
    if (!rows.length) return null;
    const latest = rows[0]; // sorted desc
    const cutoff = new Date(Date.parse(latest.date) - 28 * 86400000).toISOString().slice(0, 10);
    const prev = rows.find((d) => d.date <= cutoff) || null;
    return {
      v: latest.v,
      date: latest.date,
      live: false,
      delta: prev ? +(latest.v - prev.v).toFixed(3) : null,
      dlabel: '30 d',
    };
  } catch (e) { return null; }
}

async function oilPrice(env, code, cacheTtl) {
  if (!env.OILPRICE_API_KEY) return null;
  try {
    const r = await fetch('https://api.oilpriceapi.com/v1/prices/latest?by_code=' + code, {
      headers: { Authorization: 'Token ' + env.OILPRICE_API_KEY, 'user-agent': 'MeridianFlightDesk/1.0' },
      cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': cacheTtl, '400-499': 300, '500-599': 0 } },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const d = (j || {}).data;
    if (!d || !isFinite(parseFloat(d.price))) return null;
    const chg = d.changes && d.changes['24h'] ? parseFloat(d.changes['24h'].amount) : null;
    return {
      v: parseFloat(d.price),
      date: d.as_of || d.updated_at || d.created_at || '',
      live: true,
      delta: isFinite(chg) ? chg : null,
      dlabel: '24 h',
    };
  } catch (e) { return null; }
}

export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return json({ error: 'Sign in first.' }, 401);
  if (!isPro(user, env)) return json({ error: 'Pro feature', code: 'pro' }, 402);
  const [jetEia, wtiLive] = await Promise.all([
    eiaSeries(env, 'PET.EER_EPJK_PF4_RGC_DPG.D', 21600),
    oilPrice(env, 'WTI_USD', 900),
  ]);
  let jet = jetEia, wti = wtiLive;
  const srcs = [];
  if (!jet) jet = await oilPrice(env, 'JET_FUEL_USD', 21600);
  if (!wti) wti = await eiaSeries(env, 'PET.RWTC.D', 21600);
  if (jetEia || (!wtiLive && wti)) srcs.push('EIA');
  if (wtiLive || (!jetEia && jet)) srcs.push('OilPriceAPI');
  if (!jet && !wti) return json({ error: 'upstream unavailable' }, 502);
  return json({ jet, wti, source: srcs.join(' + '), fetched: Date.now() });
}
