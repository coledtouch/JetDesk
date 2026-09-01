import { json, err, readJson, rateLimit } from '../../lib/util.js';
import { randHex } from '../../lib/crypto.js';
import { getUser, isPro, needsVerify } from '../../lib/auth.js';

/* POST {trip}: stores a read-only trip brief and returns its share URL (Pro). */
const MAX_LEGS = 20;
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  if (needsVerify(user, env)) return err('Verify your email to share briefs.', 403, 'verify');
  if (!isPro(user, env)) return err('Trip briefs are a Pro feature.', 402, 'pro');
  if (!env.PRICES) return err('Sharing is not configured.', 503);
  if (!(await rateLimit(env, 'brief:' + user.id, 30, 3600))) return err('Too many briefs. Try again later.', 429);
  const b = (await readJson(request)) || {};
  const t = b.trip || {};
  const legs = Array.isArray(t.legs) ? t.legs.slice(0, MAX_LEGS) : [];
  if (!legs.length) return err('Add at least one leg first.');
  const s = (v, n) => String(v == null ? '' : v).slice(0, n || 80);
  const f = (v) => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
  const brief = {
    id: randHex(8),
    created: Date.now(),
    by: s(user.name || user.email, 60),
    tail: s(t.tail, 12),
    aircraft: s(t.aircraft, 40),
    name: s(t.name, 60) || 'Trip',
    price: f(t.price),
    legs: legs.map((l) => ({
      from: s(l.from, 4).toUpperCase(), to: s(l.to, 4).toUpperCase(),
      fromName: s(l.fromName, 60), toName: s(l.toName, 60),
      nm: f(l.nm), block: f(l.block), burn: f(l.burn), cost: f(l.cost), gs: f(l.gs), wind: s(l.wind, 40),
      rw: s(l.rw, 40), note: s(l.note, 200),
    })),
    notes: s(t.notes, 600),
  };
  brief.totals = brief.legs.reduce((a, l) => ({ nm: a.nm + l.nm, block: a.block + l.block, burn: a.burn + l.burn, cost: a.cost + l.cost }), { nm: 0, block: 0, burn: 0, cost: 0 });
  await env.PRICES.put('brief:' + brief.id, JSON.stringify(brief), { expirationTtl: 180 * 86400 });
  const origin = new URL(request.url).origin;
  return json({ ok: true, id: brief.id, url: origin + '/brief/' + brief.id });
}
