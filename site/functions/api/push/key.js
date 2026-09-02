import { json } from '../../../lib/util.js';
import { pushConfigured } from '../../../lib/push.js';
/* GET: the VAPID public key the browser needs to subscribe. */
export async function onRequestGet({ env }) {
  return json({ configured: pushConfigured(env), key: env.VAPID_PUBLIC_KEY || null });
}
