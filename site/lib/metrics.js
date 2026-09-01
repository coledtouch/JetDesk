/* Daily event counters in D1 (no third-party analytics, no cookies). */
export function dayKey(ms) {
  return new Date(ms || Date.now()).toISOString().slice(0, 10);
}
export async function bump(env, kind, n) {
  if (!env.DB) return;
  try {
    await env.DB.prepare('INSERT INTO events (day, kind, n) VALUES (?, ?, ?) ON CONFLICT(day, kind) DO UPDATE SET n = n + excluded.n')
      .bind(dayKey(), kind, n || 1).run();
  } catch (e) { /* metrics are never load-bearing */ }
}
export async function stats(env, days) {
  const since = dayKey(Date.now() - (days || 30) * 86400000);
  const rows = await env.DB.prepare('SELECT day, kind, n FROM events WHERE day >= ? ORDER BY day').bind(since).all();
  return rows.results || [];
}
