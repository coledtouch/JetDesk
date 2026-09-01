/* JetDesk scheduled jobs. Runs daily; each job is idempotent and safe to re-run.
   1. Trial lifecycle emails for people who have not opened the app (the app also sends them lazily).
   2. Housekeeping: expired sessions, expired rate-limit counters, old daily counters.
   Shares the app's own lib code so the emails and rules cannot drift. */
import { trialNotices } from '../../lib/lifecycle.js';
import { bump } from '../../lib/metrics.js';

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env));
  },
  async fetch(request, env) {
    /* manual trigger for testing: GET /run?key=<CRON_KEY> */
    const url = new URL(request.url);
    if (url.pathname === '/run' && env.CRON_KEY && url.searchParams.get('key') === env.CRON_KEY) {
      return new Response(JSON.stringify(await run(env)), { headers: { 'content-type': 'application/json' } });
    }
    return new Response('jetdesk-cron', { status: 200 });
  },
};

async function run(env) {
  const t = Date.now();
  const out = { trial_ending: 0, trial_ended: 0, sessions_pruned: 0, limits_pruned: 0 };
  /* free accounts whose trial ends within 2 days or ended within the last 7 */
  const rows = await env.DB.prepare(
    "SELECT * FROM users WHERE plan = 'free' AND trial_until IS NOT NULL AND trial_until BETWEEN ? AND ? AND (stripe_sub IS NULL OR stripe_sub = '')"
  ).bind(t - 7 * 86400000, t + 2 * 86400000).all();
  for (const u of (rows.results || [])) {
    try {
      const sent = await trialNotices(env, u);
      if (sent) out[sent] = (out[sent] || 0) + 1;
    } catch (e) { /* keep going */ }
  }
  const s = await env.DB.prepare('DELETE FROM sessions WHERE expires < ?').bind(t).run();
  out.sessions_pruned = (s.meta && s.meta.changes) || 0;
  const r = await env.DB.prepare('DELETE FROM rate_limits WHERE exp < ?').bind(t).run();
  out.limits_pruned = (r.meta && r.meta.changes) || 0;
  await env.DB.prepare("DELETE FROM events WHERE day < date('now', '-400 days')").run();
  await bump(env, 'cron_run');
  return out;
}
