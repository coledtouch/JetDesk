import { json, err } from '../../../lib/util.js';
import { stripe, verifyStripeSignature, applySubscription } from '../../../lib/stripe.js';
import { bump } from '../../../lib/metrics.js';

/* Stripe webhook: checkout.session.completed, customer.subscription.updated|deleted, invoice.paid */
export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) return err('billing not configured', 503);
  const raw = await request.text();
  const ok = await verifyStripeSignature(env, raw, request.headers.get('stripe-signature'));
  if (!ok) return err('bad signature', 400);
  let evt;
  try { evt = JSON.parse(raw); } catch (e) { return err('bad json'); }
  const type = evt.type || '';
  const obj = (evt.data && evt.data.object) || {};

  try {
    if (type === 'checkout.session.completed') {
      const userId = obj.client_reference_id || (obj.metadata && obj.metadata.user_id);
      if (userId && obj.customer) {
        await env.DB.prepare('UPDATE users SET stripe_customer = ? WHERE id = ?').bind(obj.customer, userId).run();
      }
      if (userId && obj.subscription) {
        const sub = await stripe(env, 'GET', '/subscriptions/' + obj.subscription);
        await applySubscription(env, userId, sub);
        await bump(env, 'subscribed');
        await rewardReferrer(env, userId);
        /* a referrer's own checkout consumed a waiting credit */
        await env.DB.prepare('UPDATE users SET referral_credits = MAX(0, referral_credits - 1) WHERE id = ? AND referral_credits > 0').bind(userId).run();
      }
    } else if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted' || type === 'customer.subscription.created') {
      const userId = (obj.metadata && obj.metadata.user_id) || await findUser(env, obj);
      if (userId) await applySubscription(env, userId, obj);
    } else if (type === 'invoice.paid' && obj.subscription) {
      const sub = await stripe(env, 'GET', '/subscriptions/' + obj.subscription);
      const userId = (sub.metadata && sub.metadata.user_id) || await findUser(env, sub);
      if (userId) await applySubscription(env, userId, sub);
    }
  } catch (e) {
    return err('handler failed: ' + e.message, 500);
  }
  return json({ received: true });
}

async function findUser(env, sub) {
  const bySub = await env.DB.prepare('SELECT id FROM users WHERE stripe_sub = ?').bind(sub.id || '').first();
  if (bySub) return bySub.id;
  const cust = typeof sub.customer === 'string' ? sub.customer : (sub.customer && sub.customer.id);
  if (!cust) return null;
  const byCust = await env.DB.prepare('SELECT id FROM users WHERE stripe_customer = ?').bind(cust).first();
  return byCust ? byCust.id : null;
}

/* First paid subscription of a referred pilot: one month free for whoever referred them.
   Applied to the referrer's live subscription now, or banked as a credit for their next checkout. */
async function rewardReferrer(env, userId) {
  try {
    const u = await env.DB.prepare('SELECT referred_by FROM users WHERE id = ?').bind(userId).first();
    if (!u || !u.referred_by) return;
    const key = 'referral:paid:' + userId;
    if (await env.PRICES.get(key)) return;
    await env.PRICES.put(key, '1');
    const ref = await env.DB.prepare('SELECT id, plan, stripe_sub FROM users WHERE id = ?').bind(u.referred_by).first();
    if (!ref) return;
    const coupon = env.STRIPE_REFERRAL_COUPON || 'REFERRAL1M';
    if (ref.stripe_sub && ref.plan === 'pro') {
      try { await stripe(env, 'POST', '/subscriptions/' + ref.stripe_sub, { 'discounts[0][coupon]': coupon }); await bump(env, 'referral_reward'); return; } catch (e) { /* fall through to a credit */ }
    }
    await env.DB.prepare('UPDATE users SET referral_credits = referral_credits + 1 WHERE id = ?').bind(ref.id).run();
    await bump(env, 'referral_credit');
  } catch (e) { /* never fail the webhook over a reward */ }
}
