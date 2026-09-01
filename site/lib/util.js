/* Shared helpers for JetDesk Pages Functions */

export function json(obj, status, extraHeaders) {
  const h = Object.assign({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  }, extraHeaders || {});
  return new Response(JSON.stringify(obj), { status: status || 200, headers: h });
}
export function err(message, status, code) {
  return json({ error: message, code: code || undefined }, status || 400);
}
export async function readJson(request) {
  try { return await request.json(); } catch (e) { return null; }
}
export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '0.0.0.0';
}
export function now() { return Date.now(); }
export const DAY = 86400000;

export function normEmail(e) {
  return String(e || '').trim().toLowerCase();
}
export function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;
}

/* Fixed-window rate limiter. Returns true when allowed.
   Counts live in the D1 rate_limits table so a burst inside one window is counted exactly.
   KV is only a fallback: its reads are edge-cached for 60 s, so a KV counter cannot see
   its own increments inside a burst and lets brute-force attempts through. */
export async function rateLimit(env, key, limit, windowSec) {
  const win = Math.floor(Date.now() / (windowSec * 1000));
  const k = 'rl:' + key + ':' + win;
  if (env.DB) {
    try {
      const exp = (win + 1) * windowSec * 1000 + 5000;
      const row = await env.DB.prepare(
        'INSERT INTO rate_limits (k, n, exp) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n'
      ).bind(k, exp).first();
      if (Math.random() < 0.02) {
        try { await env.DB.prepare('DELETE FROM rate_limits WHERE exp < ?').bind(Date.now()).run(); } catch (e) { /* housekeeping only */ }
      }
      return !row || row.n <= limit;
    } catch (e) { /* table missing or D1 hiccup: fall through to KV */ }
  }
  if (!env.PRICES) return true;
  try {
    const cur = parseInt((await env.PRICES.get(k)) || '0', 10);
    if (cur >= limit) return false;
    await env.PRICES.put(k, String(cur + 1), { expirationTtl: windowSec + 5 });
    return true;
  } catch (e) { return true; }
}

export function newId(prefix) {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return (prefix || '') + Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomCode(digits) {
  const width = Math.min(9, Math.max(4, Number(digits) || 6));
  const range = Math.pow(10, width);
  const ceiling = Math.floor(0x100000000 / range) * range;
  const a = new Uint32Array(1);
  do { crypto.getRandomValues(a); } while (a[0] >= ceiling);
  return String(a[0] % range).padStart(width, '0');
}
