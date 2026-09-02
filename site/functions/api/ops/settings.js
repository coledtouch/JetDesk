import { json, err, readJson } from '../../../lib/util.js';
import { getUser, activeOp, meShape } from '../../../lib/auth.js';

/* POST {share_prices: bool}: operation settings (owner only). */
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  const op = await activeOp(env, user);
  if (!op) return err('No operation.', 404);
  if (!op.is_owner) return err('Only the operation owner can change this.', 403);
  const b = (await readJson(request)) || {};
  if (b.share_prices !== undefined) {
    await env.DB.prepare('UPDATE ops SET share_prices = ? WHERE id = ?').bind(b.share_prices ? 1 : 0, op.id).run();
  }
  return json(await meShape(env, user));
}
