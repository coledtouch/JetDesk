/* Monthly owner report: built from the operation's trip blob (leg actuals), stored in KV as report:<id>,
   rendered as a read-only page at /report/<id> and summarized in a branded email.
   Shared by /api/report (on demand from the app) and the cron Worker (first of the month). */
import { randHex } from './crypto.js';

function n(v) { const x = parseFloat(v); return isFinite(x) ? x : 0; }
function s(v, max) { return String(v == null ? '' : v).slice(0, max || 80); }

export function monthLabel(ym) {
  const d = new Date(ym + '-15T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
export function prevMonth(date) {
  const d = date || new Date();
  const y = d.getUTCFullYear(), m = d.getUTCMonth(); // 0-based current month
  const py = m === 0 ? y - 1 : y, pm = m === 0 ? 12 : m;
  return py + '-' + (pm < 10 ? '0' : '') + pm;
}

/* meta: { tail, aircraft, price, by, opName } */
export function buildReport(blob, ym, meta) {
  meta = meta || {};
  const legs = [];
  (blob.trips || []).forEach((t) => {
    (t.legs || []).forEach((l) => {
      const a = l.act;
      if (!a || String(a.date || '').slice(0, 7) !== ym) return;
      const spend = n(a.bought) > 0 && n(a.ppg) > 0 ? n(a.bought) * n(a.ppg) : 0;
      legs.push({
        date: a.date, trip: s(t.name, 60), from: l.from, to: l.to,
        blk: n(a.blk), used: n(a.used), bought: n(a.bought), ppg: n(a.ppg), spend,
        estBlk: a.est ? n(a.est.blk) : 0, estBurn: a.est ? n(a.est.burn) : 0, estCost: a.est ? n(a.est.cost) : 0,
      });
    });
  });
  legs.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
  const tot = legs.reduce((o, l) => {
    o.legs++; o.blk += l.blk; o.used += l.used; o.bought += l.bought; o.spend += l.spend;
    o.estBlk += l.estBlk; o.estBurn += l.estBurn; o.estCost += l.estCost;
    if (l.spend) { o.paidGal += l.bought; o.paidUsd += l.spend; }
    return o;
  }, { legs: 0, blk: 0, used: 0, bought: 0, spend: 0, estBlk: 0, estBurn: 0, estCost: 0, paidGal: 0, paidUsd: 0 });
  tot.avgPpg = tot.paidGal ? tot.paidUsd / tot.paidGal : 0;
  /* the fair comparison to the plan: what the fuel actually burned cost at the prices actually paid */
  tot.burnCost = tot.avgPpg ? tot.used * tot.avgPpg : 0;
  /* purchases by airport, for the "where the fuel came from" table */
  const byApt = {};
  legs.forEach((l) => {
    if (!(l.bought > 0)) return;
    const b = byApt[l.to] || (byApt[l.to] = { code: l.to, gal: 0, usd: 0, n: 0, lo: 99, hi: 0 });
    b.gal += l.bought; b.usd += l.spend; b.n++;
    if (l.ppg > 0) { b.lo = Math.min(b.lo, l.ppg); b.hi = Math.max(b.hi, l.ppg); }
  });
  const purchases = Object.values(byApt).sort((a, b) => b.gal - a.gal).map((b) => ({ ...b, avg: b.gal ? b.usd / b.gal : 0, lo: b.lo === 99 ? 0 : b.lo }));
  const trips = {};
  legs.forEach((l) => { trips[l.trip] = 1; });
  return {
    id: randHex(8), created: Date.now(), month: ym, label: monthLabel(ym),
    tail: s(meta.tail, 12), aircraft: s(meta.aircraft, 40), by: s(meta.by, 60), op: s(meta.opName, 60),
    price: n(meta.price), tripCount: Object.keys(trips).length,
    legs, totals: tot, purchases,
  };
}

function esc(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
export function money(x) { return (x < 0 ? '-$' : '$') + Math.abs(Math.round(x)).toLocaleString('en-US'); }
export function hhmm(m) { m = Math.round(m); return Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60); }
function num(x) { return Math.round(x).toLocaleString('en-US'); }
function pct(a, b) { return b ? Math.round((a / b - 1) * 100) : 0; }
function signed(x, unit) { return (x > 0 ? '+' : '') + x + (unit || ''); }

export const REPORT_CSS = `
:root{--bg:#F4F6FA;--card:#FFFFFF;--card2:#EEF2F7;--line:#DCE3EC;--ink:#0F172A;--ink2:#475569;--ink3:#5B6779;--acc:#0E7CFF;--acc2:#0B5FCC;--good:#0E9F5B;--bad:#D6453D}
@media (prefers-color-scheme:dark){:root{--bg:#070B14;--card:#0B1220;--card2:#121C2E;--line:#1E2A40;--ink:#E6EAF2;--ink2:#A7B2C3;--ink3:#8492A6;--acc:#4CC9FF;--acc2:#7CC4FF;--good:#2FD27D;--bad:#FF6B61}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:'Manrope',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.5}
.mono{font-family:'B612 Mono',ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
header{border-bottom:1px solid var(--line);padding:14px 18px;display:flex;align-items:center;gap:10px}
header .wm{font-family:'Michroma','Arial Black',sans-serif;font-size:13px;letter-spacing:.08em;text-transform:uppercase}
header .wm .tld{color:var(--acc2);font-size:.62em;letter-spacing:.18em;margin-left:3px}
header a{color:inherit;text-decoration:none;display:flex;align-items:center;gap:10px}
header svg{width:28px;height:28px}
main{max-width:760px;margin:0 auto;padding:22px 18px 40px}
h1{font-weight:800;font-size:clamp(24px,5vw,32px);letter-spacing:-.02em;margin:0 0 4px;line-height:1.1}
h2{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin:22px 0 8px;font-weight:700}
.sub{color:var(--ink3);font-size:13px;margin-bottom:18px}
.tot{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:6px}
@media(min-width:560px){.tot{grid-template-columns:repeat(4,1fr)}}
.tot .c{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px}
.tot .n{font-size:26px;font-weight:700;line-height:1.1}.tot .l{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);margin-top:4px;font-weight:700}
.tot .d{font-size:12px;color:var(--ink3);margin-top:3px}
.tot .c.cost .n{color:var(--acc)}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:14px}
th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);background:var(--card2)}
td.r,th.r{text-align:right}tr:last-child td{border-bottom:none}.name{color:var(--ink3);font-size:12px}
.good{color:var(--good)}.bad{color:var(--bad)}
td:first-child,td b.mono{white-space:nowrap}
.basis{color:var(--ink3);font-size:12.5px;margin-top:14px}
footer{margin-top:28px;border-top:1px solid var(--line);padding-top:12px;font-size:12px;color:var(--ink3)}footer a{color:var(--ink3)}
.print{float:right;font-size:13px;border:1px solid var(--line);background:var(--card);border-radius:8px;padding:6px 10px;color:var(--ink2);text-decoration:none}
.wrap{overflow-x:auto}
@media print{header,.print,footer .app{display:none}body{background:#fff;color:#000}.tot .c,table{border-color:#ccc}}
`;

const HEAD_SVG = '<svg viewBox="0 0 72 72" fill="none" aria-hidden="true"><rect x="2" y="2" width="68" height="68" rx="18" fill="var(--card)" stroke="var(--line)" stroke-width="2"/><path d="M14 46 L36 14 L58 46 L48 46 L36 28 L24 46 Z" fill="var(--acc)"/><path d="M22 54 H50" stroke="var(--acc)" stroke-width="4" stroke-linecap="round" opacity="0.55"/></svg>';

export function renderReportHTML(r) {
  const t = r.totals;
  const when = new Date(r.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const who = [r.tail, r.aircraft, r.op].filter(Boolean).map(esc).join(' · ');
  const rows = r.legs.map((l) => `<tr>
    <td class="mono">${esc(l.date.slice(5))}</td>
    <td><b class="mono">${esc(l.from)} &#8594; ${esc(l.to)}</b><div class="name">${esc(l.trip)}</div></td>
    <td class="r mono">${l.blk ? hhmm(l.blk) : '<span class="name">n/a</span>'}${l.blk && l.estBlk ? `<div class="name">plan ${hhmm(l.estBlk)}</div>` : ''}</td>
    <td class="r mono">${l.used ? num(l.used) : '<span class="name">n/a</span>'}${l.used && l.estBurn ? `<div class="name">plan ${num(l.estBurn)}</div>` : ''}</td>
    <td class="r mono">${l.bought ? num(l.bought) + (l.ppg ? `<div class="name">@ $${l.ppg.toFixed(2)}</div>` : '') : '<span class="name">none</span>'}</td>
    <td class="r mono"><b>${l.spend ? money(l.spend) : '<span class="name">n/a</span>'}</b></td>
  </tr>`).join('');
  const buys = r.purchases.map((b) => `<tr><td class="mono"><b>${esc(b.code)}</b><div class="name">${b.n} purchase${b.n === 1 ? '' : 's'}</div></td><td class="r mono">${num(b.gal)}</td><td class="r mono">$${b.avg.toFixed(2)}${b.lo && b.hi && b.hi - b.lo > 0.005 ? `<div class="name">$${b.lo.toFixed(2)} to $${b.hi.toFixed(2)}</div>` : ''}</td><td class="r mono"><b>${money(b.usd)}</b></td></tr>`).join('');
  const burnPct = t.used && t.estBurn ? pct(t.used, t.estBurn) : null;
  const blkDiff = t.blk && t.estBlk ? Math.round(t.blk - t.estBlk) : null;
  const costDiff = t.burnCost && t.estCost ? t.burnCost - t.estCost : null;
  const vsPlan = r.price && t.avgPpg ? t.avgPpg - r.price : null;
  const empty = !r.legs.length;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(r.label)} owner report | JetDesk.AI</title><meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="light dark">
<link rel="stylesheet" href="/fonts/fonts.css"><link rel="icon" href="/favicon.ico"><style>${REPORT_CSS}</style></head><body>
<header><a href="https://www.jetdesk.ai/" aria-label="JetDesk.AI">${HEAD_SVG}<span class="wm">JetDesk<span class="tld">.AI</span></span></a><a class="print" href="javascript:window.print()" onclick="window.print();return false;">Print / PDF</a></header>
<main>
<h1>${esc(r.label)}</h1>
<div class="sub">Owner report${who ? ' · ' + who : ''} · prepared ${esc(when)}${r.by ? ' by ' + esc(r.by) : ''}</div>
${empty ? '<p>No flights were logged for this month.</p>' : `
<div class="tot">
  <div class="c cost"><div class="n mono">${money(t.spend)}</div><div class="l">Fuel purchased</div>${costDiff != null ? `<div class="d">burned ${money(t.burnCost)}, ${costDiff <= 0 ? '<span class="good">' : '<span class="bad">'}${signed(Math.round(costDiff / Math.max(1, t.estCost) * 100), '%')}</span> vs ${money(t.estCost)} planned</div>` : ''}</div>
  <div class="c"><div class="n mono">${hhmm(t.blk)}</div><div class="l">Block hours</div>${blkDiff != null ? `<div class="d">${signed(blkDiff, ' min')} vs plan</div>` : ''}</div>
  <div class="c"><div class="n mono">${num(t.used)}</div><div class="l">Gallons burned</div>${burnPct != null ? `<div class="d">${signed(burnPct, '%')} vs plan</div>` : ''}</div>
  <div class="c"><div class="n mono">${t.avgPpg ? '$' + t.avgPpg.toFixed(2) : '–'}</div><div class="l">Avg $/gal paid</div>${vsPlan != null ? `<div class="d">${vsPlan <= 0 ? '<span class="good">' : '<span class="bad">'}${(vsPlan >= 0 ? '+$' : '-$') + Math.abs(vsPlan).toFixed(2)}</span> vs $${r.price.toFixed(2)} plan</div>` : ''}</div>
</div>
<div class="basis">${t.legs} leg${t.legs === 1 ? '' : 's'} across ${r.tripCount} trip${r.tripCount === 1 ? '' : 's'} · ${num(t.bought)} gallons purchased${t.avgPpg && r.price && Math.abs(vsPlan) * t.paidGal >= 5 ? (vsPlan <= 0 ? ` · buying below the plan price saved ${money(Math.abs(vsPlan) * t.paidGal)}` : ` · paying above the plan price cost ${money(vsPlan * t.paidGal)} extra`) : ''}.</div>
<h2>Flights</h2>
<div class="wrap"><table><thead><tr><th>Date</th><th>Leg</th><th class="r">Block</th><th class="r">Gal used</th><th class="r">Bought</th><th class="r">Fuel $</th></tr></thead><tbody>${rows}</tbody></table></div>
${r.purchases.length ? `<h2>Where the fuel came from</h2><div class="wrap"><table><thead><tr><th>Airport</th><th class="r">Gal</th><th class="r">Avg $/gal</th><th class="r">Total</th></tr></thead><tbody>${buys}</tbody></table></div>` : ''}
`}
<div class="basis">Figures come from the pilot's flight log in JetDesk (block time, fuel used and fuel purchased per leg). Plan figures are the estimates JetDesk made before each flight${r.price ? ` at a planning price of $${r.price.toFixed(2)} per gallon` : ''}. Landing, ramp, handling, hangar and crew costs are not included.</div>
<footer>Generated by <a class="app" href="https://www.jetdesk.ai/">JetDesk.AI</a>, the trip cost, fuel and runway desk for pilots who manage the airplane.</footer>
</main></body></html>`;
  return html;
}

export async function storeReport(env, r) {
  await env.PRICES.put('report:' + r.id, JSON.stringify(r), { expirationTtl: 400 * 86400 });
  return r.id;
}
