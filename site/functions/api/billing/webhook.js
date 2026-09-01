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
