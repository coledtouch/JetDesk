/* Per-request housekeeping on authenticated calls: last_seen, daily active counter,
   and trial lifecycle emails (sent lazily when the user shows up; the scheduled
   worker covers people who do not). */
import { bump, dayKey } from './metrics.js';
import { emailReady, isPro, trialDaysLeft } from './auth.js';
import { sendEmail, trialEndingHtml, trialEndedHtml } from './email.js';
import { now } from './util.js';

function notices(user) {
  try { return JSON.parse(user.notices || '{}') || {}; } catch (e) { return {}; }
}

export async function touch(env, user) {
  if (!env.DB || !user) return;
  const t = now();
  const today = dayKey(t);
  const lastDay = user.last_seen ? dayKey(user.last_seen) : '';
  if (lastDay !== today) {
    await bump(env, 'active');
    await env.DB.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(t, user.id).run();
    user.last_seen = t;
  } else if (t - user.last_seen > 3600000) {
    await env.DB.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(t, user.id).run();
    user.last_seen = t;
  }
  await trialNotices(env, user);
}

/* Also used by the scheduled worker. Returns the notice sent, if any. */
export async function trialNotices(env, user) {
  if (!emailReady(env) || user.plan !== 'free' || !user.trial_until || user.stripe_sub) return null;
  const sent = notices(user);
  const brand = env.BRAND || 'JetDesk';
  const left = trialDaysLeft(user);
  let key = null, subject = null, html = null;
  if (left > 0 && left <= 2 && !sent.trial_ending) {
    key = 'trial_ending'; subject = 'Your ' + brand + ' Pro trial ends in ' + left + ' day' + (left === 1 ? '' : 's');
    html = trialEndingHtml(brand, user.name, left);
  } else if (left === 0 && user.trial_until < now() && !sent.trial_ended && !isPro(user, env)) {
    key = 'trial_ended'; subject = 'Your ' + brand + ' Pro trial has ended';
    html = trialEndedHtml(brand, user.name);
  }
  if (!key) return null;
  sent[key] = now();
  await env.DB.prepare('UPDATE users SET notices = ? WHERE id = ?').bind(JSON.stringify(sent), user.id).run();
  user.notices = JSON.stringify(sent);
  await sendEmail(env, user.email, subject, html);
  return key;
}
