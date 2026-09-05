import hashlib, json, os, re
import legal
import content
import airports
open('lib/shell.gen.js', 'w').write(legal.shell_js())

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
.swbar{position:fixed;left:50%;bottom:calc(76px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line2);border-radius:14px;padding:10px 12px 10px 14px;box-shadow:var(--shadow);font-size:13.5px;font-weight:600;max-width:calc(100% - 24px)}
.swbar .mono{font-family:var(--mono);font-size:11px;color:var(--ink3);margin-left:6px}
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
ICON_STEMS = ('icon-192', 'icon-512', 'icon-maskable-192', 'icon-maskable-512', 'apple-touch-icon', 'badge-96')
ICONS = {}
os.makedirs('dist/icons', exist_ok=True)
for old in os.listdir('dist/icons'):
  os.remove(os.path.join('dist/icons', old))
for stem in ICON_STEMS:
  src = os.path.join('assets/icons', stem + '.png')
  if not os.path.isfile(src):
    continue
  with open(src, 'rb') as icon_file:
    icon_bytes = icon_file.read()
  hashed = stem + '.' + hashlib.md5(icon_bytes).hexdigest()[:8] + '.png'
  with open(os.path.join('dist/icons', hashed), 'wb') as icon_out:
    icon_out.write(icon_bytes)
  ICONS[stem] = '/icons/' + hashed
icon_192 = ICONS.get('icon-192', '/icons/icon-192.png')
icon_512 = ICONS.get('icon-512', '/icons/icon-512.png')
icon_m192 = ICONS.get('icon-maskable-192', '/icons/icon-maskable-192.png')
icon_m512 = ICONS.get('icon-maskable-512', '/icons/icon-maskable-512.png')
icon_apple = ICONS.get('apple-touch-icon', '/icons/apple-touch-icon.png')
icon_badge = ICONS.get('badge-96', icon_192)

# Images: sources live in assets/img; every file served from /img/ gets a content hash in its name so the
# one-year immutable cache rule never applies to an unversioned path.
IMG = {}
os.makedirs('dist/img', exist_ok=True)
for old in os.listdir('dist/img'):
  os.remove(os.path.join('dist/img', old))
for name in sorted(os.listdir('assets/img')):
  stem, ext = os.path.splitext(name)
  with open(os.path.join('assets/img', name), 'rb') as img_file:
    img_bytes = img_file.read()
  hashed = stem + '.' + hashlib.md5(img_bytes).hexdigest()[:8] + ext
  with open(os.path.join('dist/img', hashed), 'wb') as img_out:
    img_out.write(img_bytes)
  IMG[stem] = '/img/' + hashed
og_image = 'https://www.jetdesk.ai' + IMG['og-jetdesk']
def _hero_paths(text):
  return text.replace('__IMG_HERO_DAY__', IMG['hero-day-theme']).replace('__IMG_HERO_DAY_800__', IMG['hero-day-theme-800']) \
             .replace('__IMG_HERO_NIGHT__', IMG['hero-night']).replace('__IMG_HERO_NIGHT_800__', IMG['hero-night-800'])
app_js = _hero_paths(app_js)
markup = _hero_paths(markup)
import legal as _legal_mod
_legal_mod.OG_IMAGE = og_image
_legal_mod.LOGO_URL = 'https://www.jetdesk.ai' + icon_512

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

# service worker source (filled in below); it takes part in the version hash so that any change to caching
# behaviour, the PWA layer or the offline page produces a new cache name and a new worker
SW_TEMPLATE = """'use strict';
const V = 'jetdesk-%s';
const CORE = %s;
const SHELL = '/';            /* cache key for the application shell (index.html served at /) */
const OFFLINE = '/offline';   /* dist/offline.html; Pages serves it at /offline */
const GEN = 'jetdesk-sw-gen2'; /* marker cache: set once a worker with the wait-and-offer flow has activated */
/* Application routes get the shell: / with any query (deep links such as /?apt=KTEB) and /index.html.
   Everything else that navigates (airport pages, field notes, terms, privacy, briefs, reports) is a public
   document and is cached under its own URL only. */
const isAppRoute = (p) => p === '/' || p === '/index.html';
self.addEventListener('install', (e) => {
  /* precache, then wait: the page decides when the new worker takes over (see pwa.js).
     One-time exception: upgrading from a pre-gen2 worker, whose page cannot send SKIP_WAITING,
     takes over immediately (that page reloads itself exactly once on controllerchange). */
  e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => caches.has(GEN)).then((gen2) => {
    if (self.registration.active && !gen2) return self.skipWaiting();
  }));
});
self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data.type === 'GET_VERSION') {
    /* the page listens on the MessageChannel port it transferred; e.source is the fallback for callers without one */
    const reply = { type: 'VERSION', v: V };
    if (e.ports && e.ports[0]) e.ports[0].postMessage(reply);
    else if (e.source) e.source.postMessage(reply);
  }
});
self.addEventListener('activate', (e) => {
  /* Every earlier cache goes, including the pre-veae7ebbd-fix caches whose shell entry could hold an airport or
     legal document. Trips, notes, prices and settings live in localStorage and are never touched here. */
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== V && k !== GEN).map((k) => caches.delete(k))))
      .then(() => caches.open(GEN))
      .then(() => self.clients.claim())
  );
});
function cacheable(res) {
  return !!(res && res.ok && res.type === 'basic' && !res.redirected);
}
function offlinePage() {
  return caches.match(OFFLINE).then((r) => r
    ? r.text().then((body) => new Response(body, { status: 503, statusText: 'Offline', headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }))
    : Response.error());
}
/* App shell: the network within 2.5 s, otherwise the precached shell. Only a fresh copy of the shell itself is ever
   stored under SHELL, so the shell can no longer be replaced by another document. */
function shellFirst(req) {
  return new Promise((resolve) => {
    let done = false;
    const fromCache = () => caches.match(SHELL).then((r) => r || offlinePage()).then(resolve);
    const timer = setTimeout(() => { if (!done) { done = true; fromCache(); } }, 2500);
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (done) return;
      done = true;
      if (cacheable(res)) { const copy = res.clone(); caches.open(V).then((c) => c.put(SHELL, copy)); }
      resolve(res);
    }).catch(() => { clearTimeout(timer); if (!done) { done = true; fromCache(); } });
  });
}
/* Public documents: network first and cached under their own URL for offline reading. A cached copy is served
   after 2.5 s on a slow connection; with no copy the request waits for the network, and if the network fails the
   honest offline page is returned instead of any other document. */
function documentFirst(req) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    const timer = setTimeout(() => { caches.match(req, { ignoreSearch: true }).then((hit) => { if (hit) finish(hit); }); }, 2500);
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (cacheable(res)) { const copy = res.clone(); caches.open(V).then((c) => c.put(req, copy)); }
      finish(res);
    }).catch(() => {
      clearTimeout(timer);
      caches.match(req, { ignoreSearch: true }).then((hit) => hit ? finish(hit) : offlinePage().then(finish));
    });
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
    e.respondWith(isAppRoute(url.pathname) ? shellFirst(req) : documentFirst(req));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (cacheable(res)) {
          const copy = res.clone();
          caches.open(V).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
"""
_offline_html = legal.offline_page()
app_v = 'v' + hashlib.md5((css + markup + app_js + data + asset_hash.hexdigest() + pwa_js + SW_TEMPLATE + _offline_html).encode()).hexdigest()[:8]
pwa_js = pwa_js.replace('__APP_V__', app_v).replace('__ICON_192__', icon_192)
# dataset as its own precached file; the app boots once it has loaded (offline: from the service worker cache)
data_hash = hashlib.md5(data.encode()).hexdigest()[:8]
os.makedirs('dist/data', exist_ok=True)
for old in os.listdir('dist/data'):
  os.remove(os.path.join('dist/data', old))
data_path = '/data/airports.' + data_hash + '.json'
open('dist' + data_path, 'w').write(open('airports_us.json').read())
app_js_safe = app_js.replace('</script', '<\\/script')
# The app runs at once (the landing page is real HTML); the dataset arrives afterwards through window.__jdSetAirports,
# from the network, else from the service worker cache, else as a visible failure state. A slow or failed dataset can
# no longer leave the page blank.
boot_js = (app_js_safe + '\n' +
  "(function(){var u='" + data_path + "';var set=function(d,ok){try{window.__jdSetAirports(d,ok)}catch(e){console.error(e)}};" +
  "var fromCache=function(){return (self.caches&&caches.match)?caches.match(u).then(function(r){if(!r)throw new Error('no cache');return r.json()}):Promise.reject(new Error('no caches'))};" +
  "fetch(u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(d){set(d,true)}).catch(function(){" +
  "fromCache().then(function(d){set(d,true)}).catch(function(){set([],false)})})})();")
pwa_js_safe = pwa_js.replace('</script', '<\\/script')

structured_data = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization", "@id": "https://www.jetdesk.ai/#org", "name": "JetDesk.AI", "url": "https://www.jetdesk.ai/",
      "logo": {"@type": "ImageObject", "url": "https://www.jetdesk.ai" + icon_512, "width": 512, "height": 512},
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
      "image": og_image,
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

# the four self-hosted faces used above the fold; preloading them means one layout instead of a swap per face
font_preload = ''.join('<link rel="preload" as="font" type="font/woff2" href="/fonts/%s" crossorigin>' % f for f in sorted(os.listdir('dist/fonts')) if f.endswith('.woff2'))
hero_preload = "<script>(function(){var t='auto';try{t=(JSON.parse(localStorage.getItem('mfd1')||'{}').settings||{}).theme||'auto'}catch(e){}var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);try{var app=localStorage.getItem('jd_tok')||(JSON.parse(localStorage.getItem('mfd1')||'{}').browse);if(app)document.documentElement.setAttribute('data-app','1')}catch(e){}var N=['__IMG_HERO_NIGHT__','__IMG_HERO_NIGHT_800__'],D=['__IMG_HERO_DAY__','__IMG_HERO_DAY_800__'];var f=d?N:D;var l=document.createElement('link');l.rel='preload';l.as='image';l.href=f[0];l.setAttribute('imagesrcset',f[1]+' 800w, '+f[0]+' 1600w');l.setAttribute('imagesizes','(max-width: 640px) 800px, 1600px');l.setAttribute('fetchpriority','high');document.head.appendChild(l);document.documentElement.setAttribute('data-hero',d?'night':'day')})();</script>"
hero_preload = hero_preload.replace('__IMG_HERO_DAY__', IMG['hero-day-theme']).replace('__IMG_HERO_DAY_800__', IMG['hero-day-theme-800']).replace('__IMG_HERO_NIGHT__', IMG['hero-night']).replace('__IMG_HERO_NIGHT_800__', IMG['hero-night-800'])
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
{font_preload}
{hero_preload}
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
<meta property="og:image" content="{og_image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="JetDesk.AI trip planning on a blue-hour airport ramp">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="JetDesk.AI | Know What the Trip Costs Before You File">
<meta name="twitter:description" content="Fuel-stop math, runway verdicts, live FAA weather and winds for pilots who manage the airplane.">
<meta name="twitter:image" content="{og_image}">
<meta name="twitter:image:alt" content="JetDesk.AI trip planning on a blue-hour airport ramp">
<script type="application/ld+json">{structured_json}</script>
<style>
{fonts_css}
{css}
{pwa_css}
</style>
</head>
<body class="is-welcome">
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
open('dist/offline.html', 'w').write(_offline_html)
open('dist/404.html', 'w').write(legal.not_found_page())
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
core = ['/', '/offline', '/manifest.webmanifest', '/favicon.ico', data_path]
core += sorted(ICONS.values())
core += ['/fonts/' + f for f in sorted(os.listdir('dist/fonts')) if f.endswith('.woff2')]
if os.path.isdir('dist/img'):
  core += ['/img/' + f for f in sorted(os.listdir('dist/img')) if f.lower().endswith('.webp')]
sw = SW_TEMPLATE % (app_v, json.dumps(core), icon_192, icon_badge)
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
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; manifest-src 'self'; worker-src 'self'

/fonts/fonts.css
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

/fonts/*.woff2
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
  Cache-Control: no-cache, max-age=0, must-revalidate

/offline
  Cache-Control: no-cache

/404
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache
""")

open('dist/robots.txt', 'w').write("""User-agent: *
Allow: /
Sitemap: https://www.jetdesk.ai/sitemap.xml
""")

_lm = airports.sitemap_lastmod()  # airport pages: NASR dataset cycle
import datetime as _dt
_today = _dt.date.today().isoformat()  # home: this build
_eff = _dt.datetime.strptime(legal.EFFECTIVE, '%B %d, %Y').date().isoformat()  # terms/privacy: effective date
_notes_latest = max(a['iso'] for a in content.ARTICLES)
open('dist/sitemap.xml', 'w').write("""<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://www.jetdesk.ai/sitemap-pages.xml</loc><lastmod>%s</lastmod></sitemap>
  <sitemap><loc>https://www.jetdesk.ai/sitemap-airports.xml</loc><lastmod>%s</lastmod></sitemap>
</sitemapindex>
""" % (_today, _lm))
open('dist/sitemap-pages.xml', 'w').write("""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.jetdesk.ai/</loc><lastmod>%s</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://www.jetdesk.ai/airports/</loc><lastmod>%s</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://www.jetdesk.ai/terms/</loc><lastmod>%s</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://www.jetdesk.ai/privacy/</loc><lastmod>%s</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://www.jetdesk.ai/notes/</loc><lastmod>%s</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>
""" % (_today, _lm, _eff, _eff, _notes_latest) + ''.join('  <url><loc>https://www.jetdesk.ai/notes/%s/</loc><lastmod>%s</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n' % (a['slug'], a['iso']) for a in content.ARTICLES) + """</urlset>
""")

print('app version:', app_v)
print('index bytes:', len(index))
print('precache entries:', len(core))
