import { getUser, isPro } from '../../lib/auth.js';
/* GET /api/winds?region=bos  ->  parsed FB winds/temps aloft
   Source: FAA AWC windtemp product (FD text). Fixed-column decode:
   station rows carry tokens per altitude column; "9900" = light & variable,
   dir>36 encodes dir-50 and +100 kt, temps above FL240 are implied negative. */

const AWC = 'https://aviationweather.gov/api/data/windtemp';
const REGIONS = ['bos', 'mia', 'chi', 'dfw', 'slc', 'sfo'];
const ALTS = [3000, 6000, 9000, 12000, 18000, 24000, 30000, 34000, 39000];
/* column [start, width] for each altitude token in a station row */
const COLS = [[4, 4], [9, 7], [17, 7], [25, 7], [33, 7], [41, 7], [49, 6], [56, 6], [63, 6]];

function json(obj, status) {
  status = status || 200;
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=1800' : 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

function decodeToken(tok, alt) {
  tok = (tok || '').trim();
  if (!tok) return null;
  if (tok.slice(0, 4) === '9900') return { alt, dir: null, spd: 0, temp: tempFrom(tok.slice(4), alt) };
  const m = tok.match(/^(\d{2})(\d{2})([+-]\d{2}|\d{2})?$/);
  if (!m) return null;
  let dir = parseInt(m[1], 10);
  let spd = parseInt(m[2], 10);
  if (dir > 36) { dir -= 50; spd += 100; }
  dir = (dir % 36) * 10;
  if (dir === 0) dir = 360;
  return { alt, dir, spd, temp: tempFrom(m[3], alt) };
}
function tempFrom(t, alt) {
  if (!t) return null;
  if (t[0] === '+' || t[0] === '-') return parseInt(t, 10);
  const v = parseInt(t, 10);
  return isFinite(v) ? (alt > 24000 ? -v : v) : null;
}

function parseFB(text) {
  const out = { based: null, valid: null, use: null, stations: {} };
  const lines = text.split('\n');
  let inData = false;
  for (const line of lines) {
    if (/^DATA BASED ON/.test(line)) out.based = (line.match(/(\d{6}Z)/) || [])[1] || null;
    if (/^VALID/.test(line)) {
      out.valid = (line.match(/VALID (\d{6}Z)/) || [])[1] || null;
      out.use = (line.match(/FOR USE (\S+)/) || [])[1] || null;
    }
    if (/^FT\s+3000/.test(line)) { inData = true; continue; }
    if (!inData) continue;
    const id = line.slice(0, 4).trim();
    if (!/^[A-Z0-9]{3}$/.test(id)) continue;
    const levels = [];
    for (let i = 0; i < ALTS.length; i++) {
      const [s, w] = COLS[i];
      const d = decodeToken(line.slice(s, s + w), ALTS[i]);
      if (d) levels.push(d);
    }
    if (levels.length) out.stations[id] = levels;
  }
  return out;
}

export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return json({ error: 'Sign in first.' }, 401);
  if (!isPro(user, env)) return json({ error: 'Pro feature', code: 'pro' }, 402);
  const url = new URL(request.url);
  let region = (url.searchParams.get('region') || 'bos').toLowerCase();
  if (REGIONS.indexOf(region) === -1) region = 'bos';
  try {
    const r = await fetch(AWC + '?region=' + region + '&level=low&fcst=06', {
      headers: { 'user-agent': 'MeridianFlightDesk/1.0 (personal planning tool)' },
      cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 1800, '400-499': 60, '500-599': 0 } },
    });
    if (!r.ok) return json({ error: 'upstream unavailable' }, 502);
    const text = await r.text();
    const parsed = parseFB(text);
    if (!Object.keys(parsed.stations).length) return json({ error: 'no data' }, 502);
    parsed.region = region;
    parsed.fetched = Date.now();
    return json(parsed);
  } catch (e) {
    return json({ error: 'upstream unavailable' }, 502);
  }
}
