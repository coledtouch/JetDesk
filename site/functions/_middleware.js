/* Canonical host: send pages.dev and the bare apex to CANONICAL_HOST (www.jetdesk.ai).
   API calls (including the Stripe webhook) and hashed preview deployments are left alone. */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; manifest-src 'self'; worker-src 'self'",
};

function secure(response) {
  const out = new Response(response.body, response);
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => out.headers.set(name, value));
  return out;
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const canon = (env.CANONICAL_HOST || '').toLowerCase();
  if (canon) {
    const host = url.hostname.toLowerCase();
    /* preview deployments keep their own hostname: <hash>.<project>.pages.dev and branch aliases
       <branch>.<project>.pages.dev; the bare <project>.pages.dev still goes to the canonical host */
    const isPreview = /^[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev$/.test(host);
    if (host !== canon && !host.startsWith('localhost') && !url.pathname.startsWith('/api/') && !isPreview) {
      url.hostname = canon;
      url.protocol = 'https:';
      url.port = '';
      return secure(Response.redirect(url.toString(), 301));
    }
  }
  /* airport and state pages are lowercase: /airports/KHPN/ (or /airports/KHPN, /airports/MA/) is the same page,
     so send it to the canonical path instead of letting it fall through to the 404 */
  const apt = /^\/airports\/([A-Za-z0-9]{2,4})\/?$/.exec(url.pathname);
  if (apt && apt[1] !== apt[1].toLowerCase()) {
    url.pathname = '/airports/' + apt[1].toLowerCase() + '/';
    return secure(Response.redirect(url.toString(), 301));
  }
  return secure(await next());
}
