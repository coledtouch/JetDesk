/* Read-only trip brief page for the aircraft owner. No login, no scripts, prints clean. */
function esc(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function money(x) { return (x < 0 ? '-$' : '$') + Math.abs(Math.round(x)).toLocaleString('en-US'); }
function mins(m) { m = Math.round(m); const h = Math.floor(m / 60); return h ? h + 'h ' + (m % 60 < 10 ? '0' : '') + (m % 60) + 'm' : m + ' min'; }
function nm(x) { return x < 100 ? x.toFixed(1) : Math.round(x).toLocaleString('en-US'); }

const CSS = `
:root{--bg:#F4F6FA;--card:#FFFFFF;--card2:#EEF2F7;--line:#DCE3EC;--ink:#0F172A;--ink2:#475569;--ink3:#5B6779;--acc:#0E7CFF;--acc2:#0B5FCC;--good:#0E9F5B}
@media (prefers-color-scheme:dark){:root{--bg:#070B14;--card:#0B1220;--card2:#121C2E;--line:#1E2A40;--ink:#E6EAF2;--ink2:#A7B2C3;--ink3:#8492A6;--acc:#4CC9FF;--acc2:#7CC4FF;--good:#2FD27D}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:'Manrope',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.5}
.mono{font-family:'B612 Mono',ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
header{border-bottom:1px solid var(--line);padding:14px 18px;display:flex;align-items:center;gap:10px}
header .wm{font-family:'Michroma','Arial Black',sans-serif;font-size:13px;letter-spacing:.08em;text-transform:uppercase}
header .wm .tld{color:var(--acc2);font-size:.62em;letter-spacing:.18em;margin-left:3px}
header a{color:inherit;text-decoration:none;display:flex;align-items:center;gap:10px}
header svg{width:28px;height:28px}
main{max-width:760px;margin:0 auto;padding:22px 18px 40px}
h1{font-weight:800;font-size:clamp(24px,5vw,32px);letter-spacing:-.02em;margin:0 0 4px;line-height:1.1}
.sub{color:var(--ink3);font-size:13px;margin-bottom:18px}
.tot{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:18px}
@media(min-width:560px){.tot{grid-template-columns:repeat(4,1fr)}}
.tot .c{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px}
.tot .n{font-size:26px;font-weight:700;line-height:1.1}.tot .l{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);margin-top:4px;font-weight:700}
.tot .c.cost .n{color:var(--acc)}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:14px}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);background:var(--card2)}
td.r,th.r{text-align:right}tr:last-child td{border-bottom:none}.name{color:var(--ink3);font-size:12px}
.notes{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-top:16px;white-space:pre-wrap;color:var(--ink2)}
.basis{color:var(--ink3);font-size:12.5px;margin-top:14px}
footer{margin-top:28px;border-top:1px solid var(--line);padding-top:12px;font-size:12px;color:var(--ink3)}footer a{color:var(--ink3)}
.print{float:right;font-size:13px;border:1px solid var(--line);background:var(--card);border-radius:8px;padding:6px 10px;color:var(--ink2);text-decoration:none}
@media print{header,.print,footer .app{display:none}body{background:#fff;color:#000}.tot .c,table,.notes{border-color:#ccc}}
`;

export async function onRequestGet({ params, env }) {
  const id = String(params.id || '').replace(/[^a-f0-9]/g, '');
  const raw = id && env.PRICES ? await env.PRICES.get('brief:' + id) : null;
  if (!raw) {
    return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brief not found | JetDesk.AI</title><style>' + CSS + '</style></head><body><main><h1>This brief has expired or never existed.</h1><p class="sub">Ask the pilot for a fresh link from JetDesk.</p><p><a href="https://www.jetdesk.ai/">www.jetdesk.ai</a></p></main></body></html>',
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  }
  const b = JSON.parse(raw);
  const when = new Date(b.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const rows = b.legs.map((l) => `<tr>
    <td><b class="mono">${esc(l.from)} &#8594; ${esc(l.to)}</b><div class="name">${esc(l.fromName)}${l.fromName && l.toName ? ' to ' : ''}${esc(l.toName)}</div>${l.rw ? `<div class="name">Arrival runway: ${esc(l.rw)}</div>` : ''}${l.note ? `<div class="name">${esc(l.note)}</div>` : ''}</td>
    <td class="r mono">${nm(l.nm)}</td>
    <td class="r mono">${mins(l.block)}${l.wind ? `<div class="name">${esc(l.wind)}</div>` : ''}</td>
    <td class="r mono">${Math.round(l.burn)}</td>
    <td class="r mono"><b>${money(l.cost)}</b></td>
  </tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(b.name)} | Trip brief | JetDesk.AI</title><meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="light dark">
<link rel="stylesheet" href="/fonts/fonts.css"><link rel="icon" href="/favicon.ico"><style>${CSS}</style></head><body>
<header><a href="https://www.jetdesk.ai/" aria-label="JetDesk.AI"><svg viewBox="0 0 72 72" fill="none" aria-hidden="true"><rect x="2" y="2" width="68" height="68" rx="18" fill="var(--card)" stroke="var(--line)" stroke-width="2"/><path d="M14 46 L36 14 L58 46 L48 46 L36 28 L24 46 Z" fill="var(--acc)"/><path d="M22 54 H50" stroke="var(--acc)" stroke-width="4" stroke-linecap="round" opacity="0.55"/></svg><span class="wm">JetDesk<span class="tld">.AI</span></span></a><a class="print" href="javascript:window.print()" onclick="window.print();return false;">Print / PDF</a></header>
<main>
<h1>${esc(b.name)}</h1>
<div class="sub">Trip brief prepared ${esc(when)} by ${esc(b.by)}${b.tail ? ' · ' + esc(b.tail) : ''}${b.aircraft ? ' · ' + esc(b.aircraft) : ''}</div>
<div class="tot">
  <div class="c cost"><div class="n mono">${money(b.totals.cost)}</div><div class="l">Fuel cost</div></div>
  <div class="c"><div class="n mono">${Math.round(b.totals.burn)}</div><div class="l">Gallons</div></div>
  <div class="c"><div class="n mono">${mins(b.totals.block)}</div><div class="l">Block time</div></div>
  <div class="c"><div class="n mono">${nm(b.totals.nm)}</div><div class="l">Nautical miles</div></div>
</div>
<table><thead><tr><th>Leg</th><th class="r">NM</th><th class="r">Block</th><th class="r">Gal</th><th class="r">Fuel $</th></tr></thead><tbody>${rows}</tbody></table>
${b.notes ? `<div class="notes">${esc(b.notes)}</div>` : ''}
<div class="basis">Fuel cost uses a planning price of $${b.price.toFixed(2)} per gallon and the pilot's aircraft numbers; landing, ramp and handling fees are not included unless noted. Winds, where shown, are forecast winds aloft at the time the brief was made.</div>
<footer>Planning aid only, not for navigation. Generated by <a class="app" href="https://www.jetdesk.ai/">JetDesk.AI</a>, the trip cost, fuel and runway desk for pilots who manage the airplane.</footer>
</main></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, max-age=300', 'x-robots-tag': 'noindex' } });
}
