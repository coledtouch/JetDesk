import hashlib, json, os, re
import legal
import content
import airports

head = open('app_head.html').read()
app_js = open('app.js').read()
pwa_js = open('pwa.js').read()
data = open('airports_us.json').read().replace('</', '<\\/')

# strip the Google Fonts link (fonts are self-hosted for offline use)
head = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>\s*', '', head)

# title
m = re.search(r'<title>(.*?)</title>', head)
title = m.group(1)
head = head.replace(m.group(0), '').strip()

# local fonts css -> absolute /fonts/ paths, inlined
fonts_css = open('dist/fonts/fonts.css').read()
fonts_css = re.sub(r'url\(([0-9a-f]{10}\.woff2)\)', r'url(/fonts/\1)', fonts_css)

pwa_css = """
/* ---- PWA additions ---- */
.pwabanner{border-color:color-mix(in srgb,var(--acc) 40%,transparent)}
@media (prefers-reduced-motion: no-preference){
  .btn:active,.tchip:active,.result:active,.hbtn:active,.iconbtn:active{transform:scale(.97)}
  .btn,.tchip,.result,.hbtn,.iconbtn{transition:transform .06s ease}
}
a.lbtn::after{content:"\\2197";font-size:11px;opacity:.7}
a.lbtn[href^="foreflightmobile"]::after{content:""}
@media (display-mode: standalone){ header.app{padding-top:calc(14px + env(safe-area-inset-top))} }
"""

# split head into <style> block and markup
sm = re.search(r'<style>([\s\S]*?)</style>', head)
css = sm.group(1)
markup = head[sm.end():].strip()

# Icons are referenced by content-hashed filenames. /icons/* is served immutable for a year,
# and Cloudflare's edge cache on the custom domain kept the previous icons under the plain
# names after a deploy; a new hash is a new URL, so a changed icon always reaches the phone.
# The plain-named files in dist/icons stay as the editable source and are not referenced.
ICON_STEMS = ('icon-192', 'icon-512', 'icon-maskable-192', 'icon-maskable-512', 'apple-touch-icon')
ICONS = {}
for stem in ICON_STEMS:
  src = os.path.join('dist/icons', stem + '.png')
  if not os.path.isfile(src):
    continue
  with open(src, 'rb') as icon_file:
    icon_bytes = icon_file.read()
  hashed = stem + '.' + hashlib.md5(icon_bytes).hexdigest()[:8] + '.png'
  for old in os.listdir('dist/icons'):
    if old != hashed and re.fullmatch(re.escape(stem) + r'\.[0-9a-f]{8}\.png', old):
      os.remove(os.path.join('dist/icons', old))
  if not os.path.isfile(os.path.join('dist/icons', hashed)):
    with open(os.path.join('dist/icons', hashed), 'wb') as icon_out:
      icon_out.write(icon_bytes)
  ICONS[stem] = '/icons/' + hashed
icon_192 = ICONS.get('icon-192', '/icons/icon-192.png')
icon_512 = ICONS.get('icon-512', '/icons/icon-512.png')
icon_m192 = ICONS.get('icon-maskable-192', '/icons/icon-maskable-192.png')
icon_m512 = ICONS.get('icon-maskable-512', '/icons/icon-maskable-512.png')
icon_apple = ICONS.get('apple-touch-icon', '/icons/apple-touch-icon.png')

asset_hash = hashlib.md5()
for asset_dir in ('dist/fonts', 'dist/icons', 'dist/img'):
  if not os.path.isdir(asset_dir):
    continue
  for asset_name in sorted(os.listdir(asset_dir)):
    asset_path = os.path.join(asset_dir, asset_name)
    if os.path.isfile(asset_path):
      asset_hash.update(asset_path.replace('\\', '/').encode())
      with open(asset_path, 'rb') as asset_file:
        asset_hash.update(asset_file.read())
for asset_path in ('dist/favicon.ico',):
  if os.path.isfile(asset_path):
    asset_hash.update(asset_path.encode())
    with open(asset_path, 'rb') as asset_file:
      asset_hash.update(asset_file.read())

app_v = 'v' + hashlib.md5((css + markup + app_js + data + asset_hash.hexdigest()).encode()).hexdigest()[:8]
pwa_js = pwa_js.replace('__APP_V__', app_v).replace('__ICON_192__', icon_192)
# dataset as its own precached file; the app boots once it has loaded (offline: from the service worker cache)
data_hash = hashlib.md5(data.encode()).hexdigest()[:8]
os.makedirs('dist/data', exist_ok=True)
for old in os.listdir('dist/data'):
  os.remove(os.path.join('dist/data', old))
data_path = '/data/airports.' + data_hash + '.json'
open('dist' + data_path, 'w').write(open('airports_us.json').read())
app_js_safe = app_js.replace('</script', '<\\/script')
boot_js = ('function __jdBoot(d){window.__AP=d;\n' + app_js_safe + '\n}\n' +
  "(function(){var u='" + data_path + "';var go=function(d){try{__jdBoot(d)}catch(e){console.error(e)}};" +
  "fetch(u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(go).catch(function(){" +
  "caches&&caches.match?caches.match(u).then(function(r){return r?r.json():[]}).then(go).catch(function(){go([])}):go([])})})();")
pwa_js_safe = pwa_js.replace('</script', '<\\/script')

structured_data = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization", "@id": "https://www.jetdesk.ai/#org", "name": "JetDesk.AI", "url": "https://www.jetdesk.ai/",
      "logo": {"@type": "ImageObject", "url": "https://www.jetdesk.ai/icons/icon-512.png", "width": 512, "height": 512},
      "email": "hello@jetdesk.ai"
    },
    {
      "@type": "WebSite", "@id": "https://www.jetdesk.ai/#site", "name": "JetDesk.AI", "url": "https://www.jetdesk.ai/",
      "publisher": {"@id": "https://www.jetdesk.ai/#org"}, "inLanguage": "en-US"
    },
    {
      "@type": "SoftwareApplication",
      "name": "JetDesk.AI",
      "url": "https://www.jetdesk.ai/",
      "applicationCategory": "TravelApplication",
      "publisher": {"@id": "https://www.jetdesk.ai/#org"},
      "image": "https://www.jetdesk.ai/img/og-jetdesk.a3a1bd3d.jpg",
      "operatingSystem": "Web, iOS, Android",
      "description": "Trip cost, fuel-stop math, runway verdicts and live FAA weather for pilots who manage the airplane.",
      "featureList": [
        "Trip cost and fuel burn estimates",
        "Fuel-stop savings calculator",
        "Runway verdicts and live crosswind",
        "FAA METAR, TAF and winds aloft",
        "Offline airport and runway data",
        "Shared FBO and crew intel"
      ],
      "offers": [
        {"@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD"},
        {"@type": "Offer", "name": "Pro monthly", "price": "9.99", "priceCurrency": "USD"},
        {"@type": "Offer", "name": "Pro annual", "price": "79", "priceCurrency": "USD"}
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {"@type": "Question", "name": "Does JetDesk replace ForeFlight?", "acceptedAnswer": {"@type": "Answer", "text": "No. JetDesk is the planning desk beside ForeFlight for cost, runway and FBO homework. Every trip can open in ForeFlight with one tap."}},
        {"@type": "Question", "name": "Does JetDesk work with no signal?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Airport and runway data, trips, prices, notes and calculators live on the phone. Live weather, winds and market data return when coverage does."}},
        {"@type": "Question", "name": "Where do fuel prices come from?", "acceptedAnswer": {"@type": "Answer", "text": "Fuel prices come from you and your crew. Prices flag themselves stale after two weeks, and the market reference shows when the broader market is moving."}},
        {"@type": "Question", "name": "Can I try JetDesk without an account?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. You can explore airport and runway data first. A free account adds saved trips, your price log and a 14-day Pro trial with no credit card."}}
      ]
    }
  ]
}
structured_json = json.dumps(structured_data, separators=(',', ':')).replace('</', '<\\/')

index = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="Plan trip cost, fuel stops and runway decisions with live FAA weather, winds aloft and crew FBO intel. Built for pilots who manage the airplane.">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="application-name" content="JetDesk.AI">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#F4F6FA">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#070B14">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="{icon_192}" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="{icon_apple}">
<link rel="preload" as="image" href="/img/hero-blue-hour.a3a1bd3d.webp" imagesrcset="/img/hero-blue-hour.a3a1bd3d-800.webp 800w, /img/hero-blue-hour.a3a1bd3d.webp 1600w" imagesizes="(max-width: 640px) 800px, 1600px" fetchpriority="high">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="JetDesk">
<link rel="canonical" href="https://www.jetdesk.ai/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="JetDesk.AI">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="JetDesk.AI | Know What the Trip Costs Before You File">
<meta property="og:description" content="Know what the trip costs before you file. Fuel-stop math, runway verdicts, live weather and winds for pilots who manage the airplane.">
<meta property="og:url" content="https://www.jetdesk.ai/">
<meta property="og:image" content="https://www.jetdesk.ai/img/og-jetdesk.a3a1bd3d.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="JetDesk.AI trip planning on a blue-hour airport ramp">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="JetDesk.AI | Know What the Trip Costs Before You File">
<meta name="twitter:description" content="Fuel-stop math, runway verdicts, live FAA weather and winds for pilots who manage the airplane.">
<meta name="twitter:image" content="https://www.jetdesk.ai/img/og-jetdesk.a3a1bd3d.jpg">
<meta name="twitter:image:alt" content="JetDesk.AI trip planning on a blue-hour airport ramp">
<script type="application/ld+json">{structured_json}</script>
<style>
{fonts_css}
{css}
{pwa_css}
</style>
</head>
<body>
{markup}
<script>
{boot_js}
</script>
<script>
{pwa_js_safe}
</script>
</body>
</html>
"""
open('dist/index.html', 'w').write(index)

# ---- legal pages (standalone /terms/ and /privacy/) ----
_pages = dict(legal.build_pages())
_pages.update(content.build_pages())
_ap_pages, _ap_sitemap, _ap_count = airports.build(json.loads(open('airports_us.json').read()))
_pages.update(_ap_pages)
os.makedirs('dist/notes', exist_ok=True)
open('dist/notes/feed.xml', 'w').write(content.rss())
open('dist/sitemap-airports.xml', 'w').write(_ap_sitemap)
print('airport pages:', _ap_count)
for _slug, _html in _pages.items():
  os.makedirs('dist/' + _slug, exist_ok=True)
  open('dist/' + _slug + '/index.html', 'w').write(_html)

# ---- manifest ----
manifest = {
  "name": "JetDesk.AI: Trip Cost, Fuel and Runways",
  "short_name": "JetDesk",
  "description": "Trip cost, fuel and runway desk for pilots who manage the airplane.",
  "id": "/",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#070B14",
  "theme_color": "#070B14",
  "categories": ["travel", "productivity", "utilities"],
  "display_override": ["standalone", "minimal-ui"],
  "icons": [
    {"src": icon_192, "sizes": "192x192", "type": "image/png", "purpose": "any"},
    {"src": icon_512, "sizes": "512x512", "type": "image/png", "purpose": "any"},
    {"src": icon_m192, "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
    {"src": icon_m512, "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ]
}
open('dist/manifest.webmanifest', 'w').write(json.dumps(manifest, indent=2))

# ---- service worker ----
core = ['/', '/index.html', '/manifest.webmanifest', '/favicon.ico', data_path]
core += sorted(ICONS.values())
core += ['/fonts/' + f for f in sorted(os.listdir('dist/fonts')) if f.endswith('.woff2')]
if os.path.isdir('dist/img'):
  core += ['/img/' + f for f in sorted(os.listdir('dist/img')) if f.lower().endswith('.webp')]
sw = """'use strict';
const V = 'jetdesk-%s';
const CORE = %s;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
function networkFirst(req, fallbackURL) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; fromCache(); } }, 2500);
    const fromCache = () =>
      caches.match(req).then((r) => r || caches.match(fallbackURL)).then((r) => resolve(r || Response.error()));
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (done) return;
      done = true;
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(V).then((c) => c.put(fallbackURL, copy));
      }
      resolve(res);
    }).catch(() => { clearTimeout(timer); if (!done) { done = true; fromCache(); } });
  });
}
/* ---- push notifications ---- */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'JetDesk', body: e.data ? e.data.text() : '' }; }
  const opts = { body: d.body || '', icon: '%s', badge: '%s', tag: d.tag || 'jetdesk', renotify: !!d.tag, data: { url: d.url || '/' } };
  e.waitUntil(self.registration.showNotification(d.title || 'JetDesk', opts));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/', location.origin).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus(); } }
    return clients.openWindow(url);
  }));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return; /* live data: network only */
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, '/index.html'));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(V).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
""" % (app_v, json.dumps(core), icon_192, icon_192)
open('dist/sw.js', 'w').write(sw)

# ---- headers ----
open('dist/_headers', 'w').write("""/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; manifest-src 'self'; worker-src 'self'

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/icons/*
  Cache-Control: public, max-age=31536000, immutable

/favicon.ico
  Cache-Control: public, max-age=86400

/img/*
  Cache-Control: public, max-age=31536000, immutable

/data/*
  Cache-Control: public, max-age=31536000, immutable

/airports/*
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

/notes/*
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

/sw.js
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache
""")

open('dist/robots.txt', 'w').write("""User-agent: *
Allow: /
Sitemap: https://www.jetdesk.ai/sitemap.xml
""")

_lm = airports.sitemap_lastmod()
open('dist/sitemap.xml', 'w').write("""<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://www.jetdesk.ai/sitemap-pages.xml</loc><lastmod>%s</lastmod></sitemap>
  <sitemap><loc>https://www.jetdesk.ai/sitemap-airports.xml</loc><lastmod>%s</lastmod></sitemap>
</sitemapindex>
""" % (_lm, _lm))
open('dist/sitemap-pages.xml', 'w').write("""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.jetdesk.ai/</loc><lastmod>%s</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://www.jetdesk.ai/terms/</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
  <url><loc>https://www.jetdesk.ai/privacy/</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
  <url><loc>https://www.jetdesk.ai/notes/</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://www.jetdesk.ai/notes/fuel-stop-math/</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n  <url><loc>https://www.jetdesk.ai/notes/density-altitude-turboprops/</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n  <url><loc>https://www.jetdesk.ai/notes/how-jetdesk-computes-trip-cost/</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
</urlset>
""" % _lm)

print('app version:', app_v)
print('index bytes:', len(index))
print('precache entries:', len(core))
