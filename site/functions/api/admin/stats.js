import { json, err } from '../../../lib/util.js';
import { getUser, isAdmin } from '../../../lib/auth.js';
import { stats } from '../../../lib/metrics.js';

/* GET: 30-day event counters plus account totals, admins only. */
export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  if (!user || !isAdmin(user, env)) return err('Admins only.', 403);
  const t = Date.now();
  const rows = await stats(env, 30);
  const totals = {};
  rows.forEach((r) => { totals[r.kind] = (totals[r.kind] || 0) + r.n; });
  const acct = await env.DB.prepare(
    "SELECT COUNT(*) AS users, SUM(verified) AS verified, SUM(plan = 'pro') AS pro, SUM(plan = 'comp') AS comp, " +
    "SUM(plan = 'free' AND trial_until > ?) AS trialing, SUM(plan = 'free' AND (trial_until IS NULL OR trial_until <= ?)) AS free, " +
    "SUM(last_seen > ?) AS active7, SUM(last_seen > ?) AS active30 FROM users"
  ).bind(t, t, t - 7 * 86400000, t - 30 * 86400000).first();
  return json({ days: 30, totals, daily: rows, accounts: acct });
}
