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
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; manifest-src 'self'; worker-src 'self'",
};

function secure(response) {
  const out = new Response(response.body, response);
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => out.headers.set(name, value));
  return out;
}

export async function onRequest({ request, env, next }) {
  const canon = (env.CANONICAL_HOST || '').toLowerCase();
  if (canon) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const isPreview = /^[0-9a-f]{8}\.[a-z0-9-]+\.pages\.dev$/.test(host);
    if (host !== canon && !host.startsWith('localhost') && !url.pathname.startsWith('/api/') && !isPreview) {
      url.hostname = canon;
      url.protocol = 'https:';
      url.port = '';
      return secure(Response.redirect(url.toString(), 301));
    }
  }
  return secure(await next());
}
