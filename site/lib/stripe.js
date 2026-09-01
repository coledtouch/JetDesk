/* Minimal Stripe REST client for Workers (form-encoded, Basic auth) */
import { hmacHex, safeEqual } from './crypto.js';

function form(params) {
  const p = new URLSearchParams();
  Object.keys(params).forEach((k) => { if (params[k] !== undefined && params[k] !== null) p.append(k, String(params[k])); });
  return p;
}

export async function stripe(env, method, path, params) {
  const r = await fetch('https://api.stripe.com/v1' + path, {
    method,
    headers: {
      authorization: 'Basic ' + btoa(env.STRIPE_SECRET_KEY + ':'),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: method === 'GET' ? undefined : form(params || {}),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || ('stripe ' + r.status));
  return j;
}

/* Stripe-Signature: t=...,v1=...  signed payload = `${t}.${rawBody}` */
export async function verifyStripeSignature(env, rawBody, header) {
  if (!header || !env.STRIPE_WEBHOOK_SECRET) return false;
  const parts = {};
  header.split(',').forEach((kv) => {
    const i = kv.indexOf('=');
    if (i > 0) {
      const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim();
      (parts[k] = parts[k] || []).push(v);
    }
  });
  const t = parts.t && parts.t[0];
  const sigs = parts.v1 || [];
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - parseInt(t, 10)) > 300) return false;
  const expected = await hmacHex(env.STRIPE_WEBHOOK_SECRET, t + '.' + rawBody);
  return sigs.some((s) => safeEqual(s, expected));
}

/* Apply a Stripe subscription object to a user row */
export async function applySubscription(env, userId, sub) {
  const status = sub.status;
  const active = status === 'active' || status === 'trialing' || status === 'past_due';
  const end = sub.current_period_end ? sub.current_period_end * 1000 + 3 * 86400000 : null;
  const interval = sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price &&
                   sub.items.data[0].price.recurring ? sub.items.data[0].price.recurring.interval : null;
  if (active) {
    await env.DB.prepare('UPDATE users SET plan = ?, plan_until = ?, stripe_sub = ?, sub_interval = ?, stripe_customer = COALESCE(stripe_customer, ?) WHERE id = ?')
      .bind('pro', end, sub.id, interval, typeof sub.customer === 'string' ? sub.customer : null, userId).run();
  } else {
    await env.DB.prepare("UPDATE users SET plan = CASE WHEN plan = 'comp' THEN 'comp' ELSE 'free' END, plan_until = NULL, sub_interval = NULL WHERE id = ?")
      .bind(userId).run();
  }
}
