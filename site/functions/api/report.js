import { json, err, readJson, rateLimit } from '../../lib/util.js';
import { getUser, isPro, needsVerify, activeOp } from '../../lib/auth.js';
import { readOp } from '../../lib/data.js';
import { buildReport, storeReport } from '../../lib/report.js';
import { bump } from '../../lib/metrics.js';

/* POST {month: 'YYYY-MM', tail, aircraft, price}: builds the owner report for the active operation
   from the synced flight log and returns a share URL (Pro). */
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  if (needsVerify(user, env)) return err('Verify your email to build reports.', 403, 'verify');
  if (!isPro(user, env)) return err('Owner reports are a Pro feature.', 402, 'pro');
  if (!env.PRICES) return err('Reports are not configured.', 503);
  if (!(await rateLimit(env, 'report:' + user.id, 30, 3600))) return err('Too many reports. Try again later.', 429);
  const op = await activeOp(env, user);
  if (!op) return err('No operation.', 404);
  const b = (await readJson(request)) || {};
  const month = String(b.month || '').slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return err('bad month');
  const blob = await readOp(env, op.id);
  const r = buildReport(blob, month, { tail: b.tail || user.tail, aircraft: b.aircraft, price: b.price, by: user.name || user.email, opName: op.name });
  if (!r.legs.length) return err('No flights logged in ' + r.label + '. Log actuals on the legs you flew first.');
  await storeReport(env, r);
  await bump(env, 'report');
  const origin = new URL(request.url).origin;
  return json({ ok: true, id: r.id, url: origin + '/report/' + r.id, legs: r.legs.length });
}
