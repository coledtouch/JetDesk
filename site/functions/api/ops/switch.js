import { json, err, readJson } from '../../../lib/util.js';
import { getUser, opsForUser, meShape } from '../../../lib/auth.js';

/* POST {op_id} makes one of the user's operations active */
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  const b = (await readJson(request)) || {};
  const ops = await opsForUser(env, user);
  const target = ops.find((o) => o.id === String(b.op_id || ''));
  if (!target) return err('Not a member of that operation.', 403);
  await env.DB.prepare('UPDATE users SET op_id = ? WHERE id = ?').bind(target.id, user.id).run();
  user.op_id = target.id;
  return json(await meShape(env, user));
}
