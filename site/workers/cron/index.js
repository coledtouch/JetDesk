/* JetDesk scheduled jobs. Runs daily; each job is idempotent and safe to re-run.
   1. Trial lifecycle emails for people who have not opened the app (the app also sends them lazily).
   2. Housekeeping: expired sessions, expired rate-limit counters, old daily counters.
   Shares the app's own lib code so the emails and rules cannot drift. */
import { trialNotices } from '../../lib/lifecycle.js';
import { bump } from '../../lib/metrics.js';
import { readOp } from '../../lib/data.js';
import { buildReport, storeReport, prevMonth } from '../../lib/report.js';
import { sendEmail, reportEmailHtml } from '../../lib/email.js';
import { isPro } from '../../lib/auth.js';
import { tafAlerts } from '../../lib/alerts.js';

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env));
  },
  async fetch(request, env) {
    /* manual trigger for testing: GET /run?key=<CRON_KEY> */
    const url = new URL(request.url);
    if (url.pathname === '/run' && env.CRON_KEY && url.searchParams.get('key') === env.CRON_KEY) {
      return new Response(JSON.stringify(await run(env, url.searchParams.get('reports') === '1')), { headers: { 'content-type': 'application/json' } });
    }
    return new Response('jetdesk-cron', { status: 200 });
  },
};

async function run(env, forceReports) {
  const t = Date.now();
  const out = { trial_ending: 0, trial_ended: 0, sessions_pruned: 0, limits_pruned: 0, reports: 0, report_emails: 0 };
  /* 3. Monthly owner reports on the first of the month (or on demand with ?reports=1), one per operation. */
  if (new Date(t).getUTCDate() === 1 || forceReports) {
    try { await monthlyReports(env, out); } catch (e) { out.report_error = String(e && e.message || e); }
  }
  /* free accounts on a trial (onboarding day 1, 3, 10 and trial-ending emails) or whose trial ended within the last 7 days */
  const rows = await env.DB.prepare(
    "SELECT * FROM users WHERE plan = 'free' AND trial_until IS NOT NULL AND trial_until BETWEEN ? AND ? AND (stripe_sub IS NULL OR stripe_sub = '')"
  ).bind(t - 7 * 86400000, t + 30 * 86400000).all();
  for (const u of (rows.results || [])) {
    try {
      const sent = await trialNotices(env, u);
      if (sent) out[sent] = (out[sent] || 0) + 1;
    } catch (e) { /* keep going */ }
  }
  /* 4. Evening weather look at tomorrow's dated trips (the cron runs daily; the KV marker keeps it to once per trip day). */
  try { await tafAlerts(env, out); } catch (e) { out.taf_error = String(e && e.message || e); }
  const s = await env.DB.prepare('DELETE FROM sessions WHERE expires < ?').bind(t).run();
  out.sessions_pruned = (s.meta && s.meta.changes) || 0;
  const r = await env.DB.prepare('DELETE FROM rate_limits WHERE exp < ?').bind(t).run();
  out.limits_pruned = (r.meta && r.meta.changes) || 0;
  await env.DB.prepare("DELETE FROM events WHERE day < date('now', '-400 days')").run();
  await bump(env, 'cron_run');
  return out;
}

async function monthlyReports(env, out) {
  const ym = prevMonth(new Date());
  const ops = await env.DB.prepare('SELECT o.id, o.name, o.owner_id, u.email AS owner_email, u.name AS owner_name, u.tail, u.plan, u.plan_until, u.trial_until FROM ops o JOIN users u ON u.id = o.owner_id').all();
  for (const op of (ops.results || [])) {
    try {
      if (!isPro(op, env)) continue;
      const doneKey = 'report:sent:' + op.id + ':' + ym;
      if (await env.PRICES.get(doneKey)) continue;
      const blob = await readOp(env, op.id);
      const r = buildReport(blob, ym, { tail: op.tail, by: op.owner_name || op.owner_email, opName: op.name });
      if (!r.legs.length) continue;
      await storeReport(env, r);
      out.reports++;
      const url = 'https://www.jetdesk.ai/report/' + r.id;
      const members = await env.DB.prepare('SELECT email FROM op_members WHERE op_id = ?').bind(op.id).all();
      const to = {};
      to[String(op.owner_email).toLowerCase()] = 1;
      (members.results || []).forEach((m) => { to[String(m.email).toLowerCase()] = 1; });
      for (const email of Object.keys(to)) {
        const res = await sendEmail(env, email, r.label + ' owner report' + (op.tail ? ' for ' + op.tail : ''), reportEmailHtml(env.BRAND || 'JetDesk', r, url));
        if (res && res.ok) out.report_emails++;
      }
      await env.PRICES.put(doneKey, r.id, { expirationTtl: 400 * 86400 });
    } catch (e) { out.report_error = String(e && e.message || e); }
  }
}
