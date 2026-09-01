import { json, err, readJson } from '../../../lib/util.js';
import { getUser, billingReady, needsVerify } from '../../../lib/auth.js';
import { bump } from '../../../lib/metrics.js';
import { stripe } from '../../../lib/stripe.js';

/* POST {plan:'monthly'|'annual'} -> {url} Stripe Checkout */
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  if (needsVerify(user, env)) return err('Verify your email before subscribing.', 403, 'verify');
  if (!billingReady(env)) return err('Billing is not connected yet. Your trial keeps running until it is.', 503, 'billing_not_ready');
  const b = (await readJson(request)) || {};
  const price = b.plan === 'annual' ? env.STRIPE_PRICE_ANNUAL : env.STRIPE_PRICE_MONTHLY;
  const origin = new URL(request.url).origin;
  const params = {
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': 1,
    success_url: origin + '/?billing=success',
    cancel_url: origin + '/?billing=cancel',
    client_reference_id: user.id,
    'metadata[user_id]': user.id,
    'subscription_data[metadata][user_id]': user.id,
    allow_promotion_codes: 'true',
  };
  if (user.stripe_customer) params.customer = user.stripe_customer;
  else params.customer_email = user.email;
  try {
    const s = await stripe(env, 'POST', '/checkout/sessions', params);
    await bump(env, 'checkout');
    return json({ url: s.url });
  } catch (e) {
    return err('Could not start checkout: ' + e.message, 502);
  }
}
