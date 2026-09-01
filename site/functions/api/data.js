import { json, err, readJson } from '../../lib/util.js';
import { getUser, activeOp, isPro, needsVerify } from '../../lib/auth.js';
import { readOp, writeOp, applyOp } from '../../lib/data.js';

/* GET: the active operation's data blob. POST: one mutation op (see lib/data.js). */
export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  const op = await activeOp(env, user);
  if (!op) return err('No operation.', 404);
  const blob = await readOp(env, op.id);
  return json(Object.assign({ op_id: op.id }, blob));
}

export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  if (needsVerify(user, env)) return err('Verify your email to sync across devices.', 403, 'verify');
  const op = await activeOp(env, user);
  if (!op) return err('No operation.', 404);
  if (op.role === 'viewer') return err('This workspace is view only for your account.', 403, 'viewer');
  const b = await readJson(request);
  if (!b || !b.op) return err('bad request');
  const blob = await readOp(env, op.id);
  const r = applyOp(blob, b, isPro(user, env));
  if (r.error) return err(r.error, r.status || 400, r.status === 402 ? 'pro' : undefined);
  await writeOp(env, op.id, r.blob);
  return json(Object.assign({ op_id: op.id }, r.blob));
}
