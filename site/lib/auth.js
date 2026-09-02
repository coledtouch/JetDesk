/* Sessions, entitlements, user shaping */
import { sha256hex } from './crypto.js';
import { DAY, now } from './util.js';

export const SESSION_DAYS = 60;
export const TRIAL_DAYS = 14;

export function adminEmails(env) {
  return String(env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
}
export function isAdmin(user, env) {
  return !!user && adminEmails(env).indexOf(String(user.email).toLowerCase()) !== -1;
}
export function billingReady(env) {
  return !!(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_MONTHLY && env.STRIPE_PRICE_ANNUAL);
}
export function emailReady(env) {
  return !!(env.EMAIL_FROM && ((env.EMAIL_API_TOKEN && env.CF_ACCOUNT_ID) || env.EMAIL || env.RESEND_API_KEY));
}
/* When REQUIRE_VERIFY=1 and email works, unverified accounts can read but not sync, share or subscribe. */
export function verifyRequired(env) {
  return env.REQUIRE_VERIFY === '1' && emailReady(env);
}
export function needsVerify(user, env) {
  return verifyRequired(env) && !!user && !user.verified;
}
export function isPro(user, env) {
  if (!user) return false;
  const t = now();
  if (user.plan === 'comp') return true;
  if (user.plan === 'pro' && (!user.plan_until || user.plan_until > t)) return true;
  if (user.trial_until && user.trial_until > t) return true;
  return false;
}
export function trialDaysLeft(user) {
  if (!user || !user.trial_until) return 0;
  return Math.max(0, Math.ceil((user.trial_until - now()) / DAY));
}

/* Until billing is connected nobody should get locked out: roll the trial forward. */
export async function extendTrialIfNoBilling(user, env) {
  if (billingReady(env)) return user;
  if (user.plan !== 'free') return user;
  if (user.trial_until && user.trial_until > now()) return user;
  const until = now() + TRIAL_DAYS * DAY;
  await env.DB.prepare('UPDATE users SET trial_until = ? WHERE id = ?').bind(until, user.id).run();
  user.trial_until = until;
  return user;
}

export function bearer(request) {
  const h = request.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+([A-Za-z0-9_-]{20,})$/);
  return m ? m[1] : null;
}

export async function getUser(request, env) {
  const tok = bearer(request);
  if (!tok || !env.DB) return null;
  const th = await sha256hex(tok);
  const row = await env.DB.prepare(
    'SELECT u.*, s.expires AS s_expires FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?'
  ).bind(th).first();
  if (!row) return null;
  if (row.s_expires < now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(th).run();
    return null;
  }
  return row;
}

export async function createSession(env, userId, ua) {
  const { randHex } = await import('./crypto.js');
  const tok = randHex(32);
  const th = await sha256hex(tok);
  const t = now();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created, expires, ua) VALUES (?, ?, ?, ?, ?)')
    .bind(th, userId, t, t + SESSION_DAYS * DAY, String(ua || '').slice(0, 200)).run();
  return tok;
}

export async function opsForUser(env, user) {
  const own = await env.DB.prepare('SELECT id, name, owner_id, share_prices FROM ops WHERE owner_id = ?').bind(user.id).all();
  const mem = await env.DB.prepare(
    'SELECT o.id, o.name, o.owner_id, o.share_prices FROM op_members m JOIN ops o ON o.id = m.op_id WHERE m.email = ?'
  ).bind(String(user.email).toLowerCase()).all();
  const seen = {}, out = [];
  [].concat(own.results || [], mem.results || []).forEach((o) => {
    if (!seen[o.id]) { seen[o.id] = 1; out.push(o); }
  });
  return out;
}

export async function activeOp(env, user) {
  const ops = await opsForUser(env, user);
  if (!ops.length) return null;
  let op = ops.find((o) => o.id === user.op_id) || ops[0];
  const members = await env.DB.prepare('SELECT email, role, added FROM op_members WHERE op_id = ? ORDER BY added').bind(op.id).all();
  const rows = members.results || [];
  const mine = rows.find((m) => String(m.email).toLowerCase() === String(user.email).toLowerCase());
  const role = op.owner_id === user.id ? 'owner' : ((mine && mine.role) || 'member');
  return { id: op.id, name: op.name, owner_id: op.owner_id, is_owner: op.owner_id === user.id, role,
           can_edit: role !== 'viewer', share_prices: !!op.share_prices, members: rows, all: ops.map((o) => ({ id: o.id, name: o.name })) };
}

export function publicUser(user, env) {
  return {
    id: user.id, email: user.email, name: user.name || '', verified: !!user.verified,
    plan: user.plan, plan_until: user.plan_until || null, trial_until: user.trial_until || null,
    sub_interval: user.sub_interval || null, tail: user.tail || '', home_base: user.home_base || '',
    is_admin: isAdmin(user, env), has_billing: !!user.stripe_customer,
    push_prefs: (() => { try { return JSON.parse(user.push_prefs || '{}'); } catch (e) { return {}; } })(),
    ref_code: String(user.id).slice(0, 8), referred: !!user.referred_by, referral_credits: user.referral_credits || 0,
  };
}

export async function meShape(env, user) {
  user = await extendTrialIfNoBilling(user, env);
  const op = await activeOp(env, user);
  return {
    user: publicUser(user, env),
    op,
    pro: isPro(user, env),
    trial_days_left: trialDaysLeft(user),
    billing_ready: billingReady(env),
    email_ready: emailReady(env),
    push_ready: !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
    verify_required: verifyRequired(env),
    prices: { monthly: 9.99, annual: 79 },
  };
}
