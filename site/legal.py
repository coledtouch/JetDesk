# Standalone legal pages (privacy, terms) built by assemble_pwa.py.
# Each page is a small static HTML document sharing the app's brand tokens and
# self-hosted fonts. No scripts, no external hosts, works with the site CSP.

EFFECTIVE = 'September 1, 2026'

PAGE_CSS = """
:root{
  --bg:#F4F6FA; --card:#FFFFFF; --card2:#EEF2F7; --line:#DCE3EC; --line2:#C5CFDB;
  --ink:#0F172A; --ink2:#475569; --ink3:#5B6779;
  --acc:#0E7CFF; --acc2:#0B5FCC;
  --disp:'Manrope',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --mono:'B612 Mono',ui-monospace,Menlo,Consolas,monospace;
  --wordmark:'Michroma','Arial Black',sans-serif;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#070B14; --card:#0B1220; --card2:#121C2E; --line:#1E2A40; --line2:#2A3A55;
    --ink:#E6EAF2; --ink2:#A7B2C3; --ink3:#8492A6;
    --acc:#4CC9FF; --acc2:#7CC4FF;
  }
}
:root[data-theme="dark"]{
  --bg:#070B14; --card:#0B1220; --card2:#121C2E; --line:#1E2A40; --line2:#2A3A55;
  --ink:#E6EAF2; --ink2:#A7B2C3; --ink3:#8492A6;
  --acc:#4CC9FF; --acc2:#7CC4FF;
}
*{box-sizing:border-box}
html{height:100%}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--disp);font-size:15.5px;line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:var(--acc2);text-decoration:underline;text-underline-offset:2px}
a:hover{color:var(--acc)}
header.legal{position:sticky;top:0;z-index:10;background:color-mix(in srgb,var(--bg) 94%,transparent);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid var(--line);padding:calc(10px + env(safe-area-inset-top)) 16px 10px}
header.legal .inner{max-width:760px;margin:0 auto;display:flex;align-items:center;gap:10px}
header.legal a.home{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none}
header.legal .mark{width:30px;height:30px;flex:none}
header.legal .wordmark{font-family:var(--wordmark);font-weight:400;font-size:14px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
header.legal .wordmark .tld{color:var(--acc2);font-size:.62em;letter-spacing:.18em;margin-left:3px}
header.legal .back{font-size:13px;font-weight:700;text-decoration:none;border:1px solid var(--line2);background:var(--card);border-radius:8px;padding:8px 12px;color:var(--ink2)}
header.legal .right{margin-left:auto;display:flex;gap:8px;align-items:center}
.skip-link{position:fixed;left:12px;top:8px;z-index:100;transform:translateY(-160%);background:var(--acc);color:#fff;border-radius:8px;padding:10px 14px;font-weight:800;text-decoration:none}
.skip-link:focus{transform:translateY(0)}
main:focus{outline:none}
header.legal .theme{font-family:var(--mono);font-size:11px;letter-spacing:.12em;border:1px solid var(--line2);background:var(--card);color:var(--ink2);border-radius:8px;padding:9px 10px;cursor:pointer}
header.legal .theme:hover{color:var(--acc)}
@media (max-width:420px){header.legal .back{display:none}}
.notegrid{display:grid;grid-template-columns:1fr;gap:12px;margin:18px 0}@media(min-width:640px){.notegrid{grid-template-columns:1fr 1fr}}
.note{display:block;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;text-decoration:none;color:inherit;transition:border-color .15s}
.note:hover{border-color:var(--acc)}
.note .k{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3)}
.note h2{margin:6px 0 6px;font-size:18px}
.note p{margin:0;font-size:14px}
.note .m{margin-top:10px;font-size:12px;color:var(--ink3)}
main{max-width:760px;margin:0 auto;padding:28px 18px 40px}
h1{font-family:var(--disp);font-weight:800;font-size:clamp(28px,6vw,38px);letter-spacing:-.02em;line-height:1.08;margin:0 0 6px;text-wrap:balance}
.effdate{font-family:var(--mono);font-size:12.5px;color:var(--ink3);margin-bottom:22px}
h2{font-family:var(--disp);font-weight:800;font-size:19px;letter-spacing:-.01em;margin:30px 0 8px}
h2 .num{font-family:var(--mono);font-weight:700;color:var(--acc);font-size:13px;margin-right:8px}
p{margin:0 0 12px;color:var(--ink2)}
p b,li b{color:var(--ink)}
ul{margin:0 0 12px;padding-left:22px;color:var(--ink2)}
li{margin-bottom:6px}
.lead{font-size:16.5px;color:var(--ink2)}
.crumbs{font-size:12.5px;color:var(--ink3);margin:0 0 10px}.crumbs a{color:var(--ink3);text-decoration:none}.crumbs a:hover{color:var(--acc)}
.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:14px 0}@media(min-width:560px){.stats{grid-template-columns:repeat(4,1fr)}}.stats .c{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px}.stats .n{font-family:var(--mono);font-size:22px;font-weight:700;color:var(--ink)}.stats .l{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);font-weight:700;margin-top:2px}
.cta{display:inline-block;background:var(--acc);color:#06131F;font-weight:800;padding:11px 18px;border-radius:10px;text-decoration:none;margin:6px 0}
.cols{columns:2;column-gap:24px}@media(min-width:640px){.cols{columns:3}}.cols a{display:block;padding:3px 0;text-decoration:none;color:var(--ink2);break-inside:avoid}.cols a b{font-family:var(--mono);color:var(--ink)}
.callout{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--acc);border-radius:12px;padding:14px 16px;margin:16px 0;color:var(--ink2)}
.callout.safety{border-left-color:#FFB020}
.callout b{color:var(--ink)}
.toc{background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:14px 18px;margin:18px 0 6px}
.toc .t{font-family:var(--wordmark);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink3);margin-bottom:8px}
.toc ol{margin:0;padding-left:20px;columns:2;column-gap:28px;font-size:13.5px}
@media (max-width:560px){.toc ol{columns:1}}
.toc a{text-decoration:none;color:var(--acc2)}
.toc li{margin-bottom:4px;break-inside:avoid}
table{border-collapse:collapse;width:100%;margin:0 0 12px;font-size:13.5px}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top;color:var(--ink2)}
th{background:var(--card2);color:var(--ink);font-weight:700}
.tablewrap{overflow-x:auto}
footer.legal{border-top:1px solid var(--line);margin-top:36px;padding:18px 4px 6px;font-size:12.5px;color:var(--ink3)}
footer.legal a{color:var(--ink3)}
"""

MARK_SVG = '<svg class="mark" viewBox="0 0 72 72" fill="none" aria-hidden="true"><rect x="2" y="2" width="68" height="68" rx="18" fill="var(--card)" stroke="var(--line2)" stroke-width="2"/><path d="M14 46 L36 14 L58 46 L48 46 L36 28 L24 46 Z" fill="var(--acc)"/><path d="M22 54 H50" stroke="var(--acc)" stroke-width="4" stroke-linecap="round" opacity="0.55"/></svg>'


OG_IMAGE = 'https://www.jetdesk.ai/img/og-jetdesk.jpg'  # replaced with the hashed path by assemble_pwa.py
LOGO_URL = 'https://www.jetdesk.ai/icons/icon-512.png'  # same

# Theme: the same setting the app keeps (localStorage mfd1.settings.theme = auto | light | dark), applied before
# first paint and cycled by the header button. Kept tiny and inline so the pages stay a single request.
THEME_SCRIPT = """<script>(function(){function g(){try{return (JSON.parse(localStorage.getItem('mfd1')||'{}').settings||{}).theme||'auto'}catch(e){return 'auto'}}
function a(t){var r=document.documentElement;if(t==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',t);r.style.colorScheme=t==='auto'?'light dark':t;var b=document.getElementById('themeBtn');if(b){b.textContent=t==='auto'?'AUTO':(t==='light'?'DAY':'NIGHT');b.title='Theme: '+t}}
a(g());window.__jdTheme=function(){var o=['auto','light','dark'],t=o[(o.indexOf(g())+1)%3];try{var S=JSON.parse(localStorage.getItem('mfd1')||'{}');S.settings=S.settings||{};S.settings.theme=t;localStorage.setItem('mfd1',JSON.stringify(S))}catch(e){}a(t)};
document.addEventListener('DOMContentLoaded',function(){a(g())})})()</script>"""
THEME_BUTTON = '<button class="theme" id="themeBtn" type="button" onclick="__jdTheme()" aria-label="Change color theme">AUTO</button>'

def breadcrumb_ld(items):
  """items: list of (name, url)"""
  import json as _json
  return _json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
    {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}, separators=(',', ':')).replace('</', '<\\/')

def legal_page(slug, title, description, body_html, extra_head='', og_type='website', full_title=None, robots='index,follow,max-image-preview:large,max-snippet:-1', canonical=None):
  page_title = full_title or (title + ' | JetDesk.AI')
  canonical_tag = ('<link rel="canonical" href="%s">' % canonical) if canonical is not None else ('<link rel="canonical" href="https://www.jetdesk.ai/%s/">' % slug)
  return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{page_title}</title>
<meta name="description" content="{description}">
<meta name="robots" content="{robots}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#F4F6FA">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#070B14">
{canonical_tag}
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="stylesheet" href="/fonts/fonts.css">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="JetDesk.AI">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="{page_title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="https://www.jetdesk.ai/{slug}/">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{page_title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{OG_IMAGE}">
{extra_head}
<style>{PAGE_CSS}</style>
{THEME_SCRIPT}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="legal"><div class="inner">
  <a class="home" href="/" aria-label="JetDesk.AI home">{MARK_SVG}<span class="wordmark">Jet<span>Desk</span><span class="tld">.AI</span></span></a>
  <div class="right">{THEME_BUTTON}<a class="back" href="/">Open the app &#8594;</a></div>
</div></header>
<main id="main" tabindex="-1">
{body_html}
<footer class="legal">
  JetDesk.AI · <a href="/airports/">Airport directory</a> · <a href="/notes/">Field notes</a> · <a href="/terms/">Terms of Service</a> · <a href="/privacy/">Privacy Policy</a> · <a href="mailto:hello@jetdesk.ai">hello@jetdesk.ai</a><br>
  Planning aid only, not for navigation.
</footer>
</main>
</body>
</html>
"""


TERMS_BODY = f"""
<h1>Terms of Service</h1>
<div class="effdate">EFFECTIVE {EFFECTIVE.upper()}</div>
<p class="lead">These Terms of Service (the "Terms") are an agreement between you and JetDesk.AI ("JetDesk", "we", "us"), the operator of the JetDesk application and website at www.jetdesk.ai (together, the "Service"). By creating an account or using the Service you agree to these Terms and to the <a href="/privacy/">Privacy Policy</a>. If you do not agree, do not use the Service.</p>

<div class="callout safety"><b>Read this first: JetDesk is a planning aid only.</b> It is not a source of official weather briefings, NOTAMs, aircraft performance data, fuel quantities or navigation, and it is not certified for operational use in flight. Nothing in the Service replaces the preflight information required by 14 CFR 91.103 or your aircraft's approved documentation. You remain pilot in command and solely responsible for every operational decision.</div>

<div class="toc"><div class="t">Contents</div><ol>
<li><a href="#service">What the Service is</a></li>
<li><a href="#eligibility">Eligibility and accounts</a></li>
<li><a href="#safety">Aviation safety disclaimer</a></li>
<li><a href="#plans">Plans, trials and billing</a></li>
<li><a href="#content">Your content and crew sharing</a></li>
<li><a href="#acceptable">Acceptable use</a></li>
<li><a href="#data">Data sources and accuracy</a></li>
<li><a href="#ip">Our intellectual property</a></li>
<li><a href="#termination">Suspension and termination</a></li>
<li><a href="#disclaimers">Disclaimers of warranty</a></li>
<li><a href="#liability">Limitation of liability</a></li>
<li><a href="#indemnity">Indemnification</a></li>
<li><a href="#changes">Changes to the Service or Terms</a></li>
<li><a href="#law">Governing law and disputes</a></li>
<li><a href="#misc">General terms</a></li>
<li><a href="#contact">Contact</a></li>
</ol></div>

<h2 id="service"><span class="num">01</span>What the Service is</h2>
<p>JetDesk is a trip cost, fuel and runway planning desk for pilots. It combines public aviation data (airports, runways, weather, winds aloft, market fuel prices) with information you and your crew enter (fuel prices, FBO notes, trips, aircraft settings) and runs calculations on top: trip cost estimates, fuel stop comparisons, runway suitability, crosswind components and density altitude. The Service is delivered as a web application that can be installed on your device and that stores a copy of its core data locally so parts of it work offline.</p>

<h2 id="eligibility"><span class="num">02</span>Eligibility and accounts</h2>
<p>You must be at least 13 years old to use the Service and at least 18 years old (or the age of majority where you live) to purchase a subscription. Some features work without an account; a free account is required for saved trips, synced data and trials, and a Pro subscription for the full feature set.</p>
<p>When you create an account you must provide a valid email address and choose a password. Keep your credentials to yourself: you are responsible for activity that happens under your account. Tell us promptly at <a href="mailto:hello@jetdesk.ai">hello@jetdesk.ai</a> if you believe your account has been compromised. We may require email verification before some features are available.</p>

<h2 id="safety"><span class="num">03</span>Aviation safety disclaimer</h2>
<p><b>The Service is not certified for operational use.</b> Data shown in JetDesk can be wrong, incomplete or stale: fuel prices are entered by people, weather and winds are forecasts or observations that change, runway data comes from periodically updated public files, and calculations rest on the settings you entered for your aircraft. Before every flight you must independently verify weather, NOTAMs, runway information, fuel availability and pricing, and aircraft performance using official briefing sources, current charts and your aircraft's approved flight manual or POH.</p>
<p>You agree that you will not rely on the Service for navigation, terrain or obstacle avoidance, weight and balance, takeoff or landing performance calculations, or any decision where inaccurate information could endanger safety. JetDesk's runway "verdicts" are rough comfort labels based on the runway length preferences you configured, not performance calculations.</p>

<h2 id="plans"><span class="num">04</span>Plans, trials and billing</h2>
<p><b>Free and Pro.</b> The free tier includes airport lookup, weather, the calculators and one saved trip. Pro adds unlimited trips, winds aloft applied to legs, live crosswind and best runway, the market fuel reference, shared FBO and crew intel, and crew sharing for up to 10 people. Current pricing is shown on the site and at checkout: as of the effective date, $9.99 per month or $79 per year.</p>
<p><b>Trials.</b> New accounts start with a 14 day Pro trial, no card required. When a trial ends the account drops to the free tier unless you subscribe.</p>
<p><b>Billing.</b> Payments are processed by Stripe. We never see or store your card number. Depending on how your purchase is processed, Stripe may act as merchant of record for the transaction, collect applicable sales tax, and appear together with JETDESK.AI on your card statement. Subscriptions renew automatically at the end of each billing period until cancelled.</p>
<p><b>Cancelling.</b> You can cancel any time from the billing portal in your Account tab. Cancelling stops future charges; your Pro access continues to the end of the period you already paid for. Except where the law requires otherwise, payments already made are not refunded. If a charge looks wrong, write to <a href="mailto:hello@jetdesk.ai">hello@jetdesk.ai</a> and a human will sort it out.</p>
<p><b>Price changes.</b> We may change prices for renewal periods with at least 30 days notice by email or in the app. If you do not agree with a new price, cancel before it takes effect.</p>

<h2 id="content"><span class="num">05</span>Your content and crew sharing</h2>
<p>You keep ownership of the content you put into the Service: fuel prices, FBO notes, trips, notes and settings ("Your Content"). You grant us the limited license needed to host, store, back up, display and share Your Content as the Service is designed to do, and no more.</p>
<p><b>Crew workspaces.</b> If you invite crew members (up to 10 people on Pro), the prices, FBOs, trips and notes in your shared workspace are visible to and editable by every member. Invite only people you trust with that information. If you leave or delete your account, content you contributed to a shared workspace may remain available to the rest of the crew.</p>
<p>You are responsible for Your Content. Do not enter content that is unlawful, that infringes someone else's rights, or that you have no right to share.</p>

<h2 id="acceptable"><span class="num">06</span>Acceptable use</h2>
<p>You agree not to:</p>
<ul>
<li>probe, scan, overload or interfere with the Service or its security, or attempt to access data or accounts that are not yours;</li>
<li>scrape, harvest or bulk export data from the Service, or use automated tools to create accounts or requests beyond normal personal use;</li>
<li>resell, sublicense or provide the Service to third parties as your own offering, or share one account across people who are not your crew;</li>
<li>reverse engineer the Service except where the law permits it despite this clause;</li>
<li>enter deliberately false fuel prices or airport information intended to mislead other pilots;</li>
<li>use the Service where or in a way that violates applicable law or regulation.</li>
</ul>

<h2 id="data"><span class="num">07</span>Data sources and accuracy</h2>
<p>The Service displays data derived from public sources, including FAA aeronautical data (airports, runways, facility information, via the FAA NASR file and the OurAirports project), FAA Aviation Weather Center METARs, TAFs and winds aloft, the U.S. Energy Information Administration and OilPriceAPI for market fuel reference, and content entered by users. These sources are not operated by us, can lag reality, and are provided as is. Runway and airport data carries a dataset date shown in the app. We do not guarantee the accuracy, completeness or timeliness of any data in the Service.</p>

<h2 id="ip"><span class="num">08</span>Our intellectual property</h2>
<p>The Service, including its software, design, brand, name, logo and content we created, belongs to us or our licensors and is protected by law. We grant you a personal, limited, non exclusive, non transferable, revocable license to use the Service as intended. We do not grant you any right to use the JetDesk name or marks. Feedback you send us may be used to improve the Service without obligation to you.</p>

<h2 id="termination"><span class="num">09</span>Suspension and termination</h2>
<p>You can stop using the Service at any time and can delete your account from the Account tab, which removes your profile and personal data as described in the <a href="/privacy/">Privacy Policy</a>. We may suspend or terminate accounts that violate these Terms, create risk for us or other users, or have unpaid amounts due, and we may discontinue the Service or features of it. If we terminate the Service or your paid account without cause, we will refund the unused portion of any prepaid period. Sections of these Terms that by their nature should survive termination (including 03, 05 through 08, and 10 through 15) survive.</p>

<h2 id="disclaimers"><span class="num">10</span>Disclaimers of warranty</h2>
<p>THE SERVICE AND ALL DATA IN IT ARE PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY AND NON INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR FREE OR SECURE, OR THAT ANY DATA IN IT IS CORRECT OR CURRENT. SOME JURISDICTIONS DO NOT ALLOW CERTAIN WARRANTY EXCLUSIONS, SO PARTS OF THIS SECTION MAY NOT APPLY TO YOU.</p>

<h2 id="liability"><span class="num">11</span>Limitation of liability</h2>
<p>TO THE MAXIMUM EXTENT PERMITTED BY LAW: (A) WE WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA OR GOODWILL; (B) WE WILL NOT BE LIABLE FOR ANY DAMAGE, LOSS, INJURY OR DEATH ARISING FROM OPERATIONAL OR FLIGHT DECISIONS MADE IN RELIANCE ON THE SERVICE OR ITS DATA; AND (C) OUR TOTAL LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE IN ANY 12 MONTH PERIOD WILL NOT EXCEED THE GREATER OF $50 OR THE AMOUNTS YOU PAID US FOR THE SERVICE IN THOSE 12 MONTHS. THESE LIMITS APPLY REGARDLESS OF THE THEORY OF LIABILITY AND EVEN IF A REMEDY FAILS OF ITS ESSENTIAL PURPOSE. SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS, SO PARTS OF THIS SECTION MAY NOT APPLY TO YOU.</p>

<h2 id="indemnity"><span class="num">12</span>Indemnification</h2>
<p>You will defend and indemnify us against third party claims, and the resulting damages and reasonable costs, to the extent arising from Your Content, your violation of these Terms, your violation of law, or operational decisions made by you or others in reliance on information you obtained through the Service.</p>

<h2 id="changes"><span class="num">13</span>Changes to the Service or Terms</h2>
<p>We improve the Service continuously and may add, change or remove features. We may update these Terms from time to time; the current version always lives at <a href="https://www.jetdesk.ai/terms/">www.jetdesk.ai/terms</a> with its effective date at the top. For material changes we will give notice in the app or by email before they take effect. Using the Service after a change takes effect means you accept the updated Terms.</p>

<h2 id="law"><span class="num">14</span>Governing law and disputes</h2>
<p>These Terms are governed by the laws of the Commonwealth of Massachusetts, United States, without regard to conflict of law rules. Courts located in Massachusetts have exclusive jurisdiction over disputes arising out of these Terms or the Service, and each party consents to personal jurisdiction there. Either party may seek injunctive relief in any competent court. To the extent permitted by law, each party waives trial by jury, and claims may only be brought individually and not as part of a class action.</p>

<h2 id="misc"><span class="num">15</span>General terms</h2>
<p>These Terms plus the Privacy Policy are the entire agreement between you and us about the Service. If a provision is found unenforceable, the rest remains in effect. Our not enforcing a provision is not a waiver. You may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition or sale of assets. We are not liable for delays or failures caused by events beyond our reasonable control. Notices to you may be given in the app or to your account email; notices to us go to <a href="mailto:hello@jetdesk.ai">hello@jetdesk.ai</a>.</p>

<h2 id="contact"><span class="num">16</span>Contact</h2>
<p>JetDesk.AI · Massachusetts, United States · <a href="mailto:hello@jetdesk.ai">hello@jetdesk.ai</a>. Questions land with a human.</p>
"""


PRIVACY_BODY = f"""
<h1>Privacy Policy</h1>
<div class="effdate">EFFECTIVE {EFFECTIVE.upper()}</div>
<p class="lead">This policy explains what JetDesk.AI ("JetDesk", "we", "us") collects when you use the JetDesk application and website at www.jetdesk.ai (the "Service"), what we do with it, and the choices you have. The short version: we collect what the product needs to work, we do not run ads, we do not sell personal data, your location never leaves your device, and you can delete your account and its data yourself at any time.</p>

<div class="toc"><div class="t">Contents</div><ol>
<li><a href="#collect">What we collect</a></li>
<li><a href="#use">How we use it</a></li>
<li><a href="#location">Location stays on your device</a></li>
<li><a href="#local">Data stored on your device</a></li>
<li><a href="#crew">Crew sharing</a></li>
<li><a href="#processors">Service providers</a></li>
<li><a href="#cookies">Cookies and tracking</a></li>
<li><a href="#retention">Retention and deletion</a></li>
<li><a href="#security">Security</a></li>
<li><a href="#rights">Your rights and choices</a></li>
<li><a href="#children">Children</a></li>
<li><a href="#intl">International visitors</a></li>
<li><a href="#changes">Changes to this policy</a></li>
<li><a href="#contact">Contact</a></li>
</ol></div>

<h2 id="collect"><span class="num">01</span>What we collect</h2>
<p><b>Account information.</b> When you create an account: your email address, the name you choose to give, and a password we store only as a salted, iterated hash, never in plain text. Optionally, the aircraft and operation details you add to your profile: tail number, home base and operation name.</p>
<p><b>Content you enter.</b> Trips and their legs, fuel prices and the FBO they belong to, FBO details (crew cars, fees, notes), airport notes, and app settings such as your aircraft's speeds and burn rates.</p>
<p><b>Subscription status.</b> Whether your account is free, trialing or Pro, the renewal interval, and identifiers our payment processor Stripe assigns (a customer id and subscription id). <b>We never receive or store your card number.</b> Payment details go directly to Stripe; its handling of them is described in Stripe's own privacy policy.</p>
<p><b>Technical basics.</b> Like almost every web service, our infrastructure sees IP addresses and standard request metadata when your device talks to our servers, and we keep short lived counters based on IP address and account id for rate limiting and abuse prevention. We do not build profiles from this and we run no advertising or third party analytics trackers.</p>
<p><b>Email you send us.</b> If you write to hello@jetdesk.ai we keep the correspondence so we can help you.</p>

<h2 id="use"><span class="num">02</span>How we use it</h2>
<ul>
<li>To run the Service: authenticate you, sync your trips, prices and notes across devices, share crew data with your workspace, and compute the results the app shows you.</li>
<li>To bill Pro subscriptions through Stripe and reflect your plan in the app.</li>
<li>To send transactional email: verification codes, a welcome note, and important account or service notices. We do not send marketing email without your consent.</li>
<li>To keep the Service safe: rate limiting, abuse prevention and debugging.</li>
<li>To answer you when you contact us.</li>
</ul>
<p>We do not sell personal data, we do not share it for advertising, and we do not use your data to train AI models.</p>

<h2 id="location"><span class="num">03</span>Location stays on your device</h2>
<p>The Near Me feature asks your device for its position so it can sort nearby airports. That lookup runs entirely on your device against the airport database the app already carries. <b>Your coordinates are never sent to our servers and are never stored by us.</b> If you deny the location permission, everything else keeps working.</p>

<h2 id="local"><span class="num">04</span>Data stored on your device</h2>
<p>JetDesk is an offline capable app. Your device keeps a local copy of the airport and runway database, your settings, trips, prices and notes, plus your session token, in browser storage, so the app works without coverage. Signing out or deleting the app's site data from your browser clears this local copy. On a shared device, sign out when you are done.</p>

<h2 id="crew"><span class="num">05</span>Crew sharing</h2>
<p>If you join or create a crew workspace, the fuel prices, FBO information, trips and notes in that workspace are shared with its members (up to 10 people). Members see the content itself; they do not see your password, email verification state or billing details. Content you contributed may remain with the workspace if you leave it or delete your account, the same way an email you sent stays with its recipients.</p>

<h2 id="processors"><span class="num">06</span>Service providers</h2>
<p>We use a small number of providers to run the Service, each receiving only what its job requires:</p>
<div class="tablewrap"><table>
<tr><th>Provider</th><th>Job</th><th>What it processes</th></tr>
<tr><td>Cloudflare</td><td>Hosting, storage, networking and email delivery for the Service (Pages, Workers, D1, KV, Email Routing and Email Service)</td><td>All Service data and traffic, stored primarily in the United States</td></tr>
<tr><td>Stripe</td><td>Payments, subscriptions, tax and receipts</td><td>Your email, payment details you give Stripe directly, and subscription state</td></tr>
<tr><td>FAA / NOAA Aviation Weather Center</td><td>Public weather and winds data</td><td>Nothing about you. Our server requests weather by airport code, not by your identity or location</td></tr>
<tr><td>U.S. EIA and OilPriceAPI</td><td>Public market fuel reference data</td><td>Nothing about you</td></tr>
</table></div>
<p>We disclose personal data beyond this only if required by law or legal process, to protect the rights, safety or property of users or the public, or as part of a merger, acquisition or sale of assets (in which case this policy continues to apply to data collected under it).</p>

<h2 id="cookies"><span class="num">07</span>Cookies and tracking</h2>
<p>We set no advertising or analytics cookies and load no third party trackers, fonts, scripts or beacons: every asset the app loads comes from our own domain. The app keeps your session token and app data in browser storage as described above. Our infrastructure provider, Cloudflare, may set strictly operational cookies for security and bot mitigation on our domain.</p>

<h2 id="retention"><span class="num">08</span>Retention and deletion</h2>
<p>We keep account data for as long as your account exists. <b>You can delete your account yourself</b> in the app under Account, which permanently removes your profile, credentials, sessions and personal data from our production database; content you contributed to a shared crew workspace may remain with that workspace. Rate limit counters expire automatically within hours. Operational logs and backups roll off on short cycles. Email correspondence is kept as long as useful for support. If you cannot access the app, email <a href="mailto:hello@jetdesk.ai">hello@jetdesk.ai</a> from your account address and we will delete the account for you.</p>

<h2 id="security"><span class="num">09</span>Security</h2>
<p>All traffic to the Service is encrypted with TLS, with HSTS enforced. Passwords are stored only as salted, iterated hashes with a server side secret. Sessions are bearer tokens stored hashed on the server and expiring automatically. Sign in, sign up and verification attempts are rate limited. Payment card data never touches our servers. No system is perfectly secure, so if we learn of a breach affecting your personal data we will notify you as the law requires. Security reports are welcome at <a href="mailto:hello@jetdesk.ai">hello@jetdesk.ai</a>.</p>

<h2 id="rights"><span class="num">10</span>Your rights and choices</h2>
<ul>
<li><b>Access and portability.</b> Your trips, prices and notes are visible in the app, and the backup tool in Settings exports your data as text you can keep.</li>
<li><b>Correction.</b> Profile fields are editable in the app; anything else, ask us.</li>
<li><b>Deletion.</b> Delete your account in the app, or ask us by email.</li>
<li><b>Marketing.</b> We send none without consent, so there is nothing to opt out of today.</li>
<li><b>Do Not Track and similar signals.</b> We do not track you across other sites, so these signals change nothing here.</li>
</ul>
<p>Residents of California and other U.S. states with privacy laws: we do not sell or share personal information as those laws define it, and we honor the rights those laws give you (access, deletion, correction, non discrimination) through the tools above. We will not treat you differently for exercising them.</p>

<h2 id="children"><span class="num">11</span>Children</h2>
<p>The Service is not directed to children under 13, and we do not knowingly collect personal data from them. If you believe a child under 13 has an account, tell us and we will delete it.</p>

<h2 id="intl"><span class="num">12</span>International visitors</h2>
<p>The Service is operated from the United States and data is stored primarily on infrastructure there. If you use the Service from outside the U.S., you understand your data is processed in the U.S. For visitors from the EEA, UK or Switzerland: we process personal data to perform our contract with you (running the Service), for our legitimate interests in securing and improving it, and with your consent where required; the rights described above (access, correction, deletion, portability, objection) are available to you, and you may also complain to your local supervisory authority.</p>

<h2 id="changes"><span class="num">13</span>Changes to this policy</h2>
<p>When we change this policy we update the effective date at the top, and for material changes we will give notice in the app or by email before they take effect. The current version always lives at <a href="https://www.jetdesk.ai/privacy/">www.jetdesk.ai/privacy</a>.</p>

<h2 id="contact"><span class="num">14</span>Contact</h2>
<p>JetDesk.AI · Massachusetts, United States · <a href="mailto:hello@jetdesk.ai">hello@jetdesk.ai</a>. Privacy questions land with a human, not a queue.</p>
"""


# Status pages. The service worker precaches /offline.html and returns it (status 503) for a public page that is not
# cached on the device, so an unavailable page never shows a different document. Pages serves 404.html with a real
# 404 for any path that does not exist; its presence also turns off the single-page fallback that made unknown
# URLs answer with the homepage. Both are noindex and self-contained (inline CSS, no font stylesheet needed).
STATUS_CSS = """
.status{max-width:560px;margin:8vh auto 0}
.status .k{font-family:var(--mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--acc);margin-bottom:12px}
.status h1{font-size:clamp(26px,5.5vw,34px)}
.status .path{font-family:var(--mono);font-size:13.5px;color:var(--ink2);background:var(--card2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:14px 0 18px;word-break:break-all}
.status .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:16px 0 8px}
.status .row a,.status .row button{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:10px;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}
.status .row .cta{background:var(--acc);color:#06131F;border:1px solid var(--acc);margin:0}
.status .row .alt{background:var(--card);color:var(--ink);border:1px solid var(--line2)}
.status .links{font-size:14px;color:var(--ink2)}
"""

def status_page(slug, title, description, body_html, extra_script=''):
  return legal_page(slug, title, description, body_html, extra_head='<style>' + STATUS_CSS + '</style>' + extra_script,
                    robots='noindex,nofollow', canonical='')

def offline_page():
  body = ('<div class="status"><div class="k">Offline</div><h1>This page is not saved on this device</h1>'
          '<p class="lead">You are offline and JetDesk has no copy of this page. Nothing else has been shown in its place.</p>'
          '<div class="path" id="offlinePath">Requested page</div>'
          '<div class="row"><button class="cta" type="button" onclick="location.reload()">Try again</button><a class="alt" href="/">Open the app</a></div>'
          '<p class="links">The app itself works offline: airport and runway data, your trips, prices, notes and both calculators are stored on this device. Live weather, winds and this page return when you have coverage.</p></div>')
  script = ('<script>document.addEventListener("DOMContentLoaded",function(){var p=document.getElementById("offlinePath");'
            'if(p)p.textContent=location.pathname+location.search;window.addEventListener("online",function(){location.reload()})})</script>')
  return status_page('offline.html', 'Offline', 'This page is not available offline.', body, script).replace('<link rel="canonical" href="">\n', '')

def not_found_page():
  body = ('<div class="status"><div class="k">404</div><h1>There is no page here</h1>'
          '<p class="lead">The address may be mistyped, or the page has moved. Airport pages use the four-letter ICAO code in lowercase, for example <a href="/airports/khpn/">/airports/khpn/</a>.</p>'
          '<div class="path" id="nfPath">Requested page</div>'
          '<div class="row"><a class="cta" href="/">Open the app</a><a class="alt" href="/airports/">Airport directory</a><a class="alt" href="/notes/">Field notes</a></div>'
          '<p class="links">Looking for an airport? <a href="/airports/">Browse by state</a>, or open the app and type the code, name or city.</p></div>')
  script = '<script>document.addEventListener("DOMContentLoaded",function(){var p=document.getElementById("nfPath");if(p)p.textContent=location.pathname})</script>'
  return status_page('404.html', 'Page not found', 'That page does not exist on JetDesk.AI.', body, script).replace('<link rel="canonical" href="">\n', '')


def build_pages():
  return {
    'terms': legal_page(
      'terms', 'Terms of Service',
      'The terms that govern JetDesk.AI: plans and billing, crew sharing, acceptable use, the aviation safety disclaimer, and your rights.',
      TERMS_BODY),
    'privacy': legal_page(
      'privacy', 'Privacy Policy',
      'What JetDesk.AI collects, what it never collects, where your location data goes (nowhere), and how to delete your data.',
      PRIVACY_BODY),
  }


# Shared shell for the server-rendered pages (brief, report): tokens, header and the theme script, exported as JS by
# assemble_pwa.py into lib/shell.gen.js so those pages cannot drift from the static ones.
def shell_js():
  import json
  header = ('<header class="legal"><div class="inner"><a class="home" href="/" aria-label="JetDesk.AI home">' + MARK_SVG +
            '<span class="wordmark">Jet<span>Desk</span><span class="tld">.AI</span></span></a><div class="right">' + THEME_BUTTON +
            '<a class="print" href="javascript:window.print()" onclick="window.print();return false;">Print / PDF</a><a class="back" href="/">Open the app &#8594;</a></div></div></header>')
  css = PAGE_CSS.split('main{')[0] + 'header.legal .print{font-size:13px;font-weight:700;text-decoration:none;border:1px solid var(--line2);background:var(--card);border-radius:8px;padding:8px 12px;color:var(--ink2)}\n@media print{header.legal{display:none}}\n'
  return ('/* generated by assemble_pwa.py from legal.py; do not edit */\n' +
          'export const SHELL_CSS = ' + json.dumps(css) + ';\n' +
          'export const THEME_SCRIPT = ' + json.dumps(THEME_SCRIPT) + ';\n' +
          'export const SHELL_HEADER = ' + json.dumps(header) + ';\n')
