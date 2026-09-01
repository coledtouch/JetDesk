import { json, err, readJson, normEmail, validEmail, now } from '../../../lib/util.js';
import { getUser, activeOp, isPro, meShape, needsVerify } from '../../../lib/auth.js';

/* POST {email} adds a crew member to the active operation (owner only, Pro).
   POST {email, remove:true} removes one. */
export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return err('Sign in first.', 401);
  const op = await activeOp(env, user);
  if (!op || !op.is_owner) return err('Only the operation owner can manage crew.', 403);
  const b = (await readJson(request)) || {};
  const email = normEmail(b.email);
  if (!validEmail(email)) return err('Enter a valid email.');
  if (b.remove) {
    if (email === normEmail(user.email)) return err('You cannot remove yourself.');
    await env.DB.prepare('DELETE FROM op_members WHERE op_id = ? AND email = ?').bind(op.id, email).run();
    return json(await meShape(env, user));
  }
  if (needsVerify(user, env)) return err('Verify your email before inviting crew.', 403, 'verify');
  if (!isPro(user, env)) return err('Crew sharing is a Pro feature.', 402, 'pro');
  if ((op.members || []).length >= 10) return err('Crew is full (10).');
  const role = b.role === 'viewer' ? 'viewer' : 'member';
  const existing = (op.members || []).find((m) => String(m.email).toLowerCase() === email);
  if (existing && existing.role !== 'owner') {
    await env.DB.prepare('UPDATE op_members SET role = ? WHERE op_id = ? AND email = ?').bind(role, op.id, email).run();
  } else if (!existing) {
    await env.DB.prepare('INSERT OR IGNORE INTO op_members (op_id, email, role, added) VALUES (?, ?, ?, ?)')
      .bind(op.id, email, role, now()).run();
  }
  return json(await meShape(env, user));
}
