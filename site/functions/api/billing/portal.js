import { json, err } from '../../../lib/util.js';
import { getUser, billingReady } from '../../../lib/auth.js';
import { stripe } from '../../../lib/stripe.js';

/* POST -> {url} Stripe customer portal (manage card, cancel, invoices) */
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  if (!billingReady(env)) return err('Billing is not connected yet.', 503, 'billing_not_ready');
  if (!user.stripe_customer) return err('No billing profile yet. Subscribe first.', 404);
  const origin = new URL(request.url).origin;
  try {
    const s = await stripe(env, 'POST', '/billing_portal/sessions', { customer: user.stripe_customer, return_url: origin + '/?billing=portal' });
    return json({ url: s.url });
  } catch (e) {
    return err('Could not open billing portal: ' + e.message, 502);
  }
}
