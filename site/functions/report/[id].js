import { renderReportHTML, REPORT_CSS } from '../../lib/report.js';

/* Read-only monthly owner report. No login, no scripts, prints clean. */
export async function onRequestGet({ params, env }) {
  const id = String(params.id || '').replace(/[^a-f0-9]/g, '');
  const raw = id && env.PRICES ? await env.PRICES.get('report:' + id) : null;
  if (!raw) {
    return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Report not found | JetDesk.AI</title><style>' + REPORT_CSS + '</style></head><body><main><h1>This report has expired or never existed.</h1><p class="sub">Ask the pilot for a fresh link from JetDesk.</p><p><a href="https://www.jetdesk.ai/">www.jetdesk.ai</a></p></main></body></html>',
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  }
  return new Response(renderReportHTML(JSON.parse(raw)), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, max-age=300', 'x-robots-tag': 'noindex' } });
}
