import { json } from '../../../lib/util.js';
import { bearer } from '../../../lib/auth.js';
import { sha256hex } from '../../../lib/crypto.js';

export async function onRequestPost({ request, env }) {
  const tok = bearer(request);
  if (tok && env.DB) {
    const th = await sha256hex(tok);
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(th).run();
  }
  return json({ ok: true });
}
