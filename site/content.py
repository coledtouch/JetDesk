# Field notes: short, useful articles built as static pages at /notes/<slug>/ by assemble_pwa.py.
# They share the legal page template (brand tokens, self-hosted fonts, no scripts).
from legal import legal_page, breadcrumb_ld
import legal as _legal
import json

ARTICLES = [
  {
    'slug': 'fuel-stop-math',
    'title': 'What a fuel stop actually saves',
    'description': 'The arithmetic behind the fuel stop decision: price gap times gallons, minus the cost of the extra cycle and detour, and the break-even gap that makes it worth it.',
    'date': 'September 2026', 'iso': '2026-09-01',
    'body': """
<p class="lead">Every pilot who manages an airplane has done this math on a napkin: the FBO at the destination wants $9.40 for Jet A, the field twenty miles back wants $7.10, and the tanks need 150 gallons. Is the stop worth it? Here is the math JetDesk runs, and the two places where napkins usually go wrong.</p>

<h2><span class="num">01</span>The gap is not the savings</h2>
<p>The headline number is easy: a $2.30 gap on 150 gallons is $345. That is the gross. The stop itself costs fuel, and the fuel it costs is bought at the cheap field, so the real question is how many gallons the extra takeoff, climb, descent and detour burn, and what those gallons cost.</p>
<p>For a Meridian-class turboprop, a stop cycle (taxi, takeoff, climb back to a cruise you already had, and a second approach) runs about 15 gallons. A ten-minute detour at 40 gallons an hour is another 7. Twenty-two gallons at $7.10 is $156. So the stop nets about $189 before fees, not $345. Still worth it, but by half as much as the napkin says.</p>

<h2><span class="num">02</span>Fees turn good stops into bad ones</h2>
<p>A $75 ramp fee waived with a fuel purchase is fine. A $150 landing fee that is not waived is most of your margin. JetDesk counts the fee against the stop as a flat line item, and shows the break-even gap: the price difference at which the stop exactly pays for itself. For the numbers above the break-even is about $1.03 a gallon. Below that gap, tanker on.</p>

<div class="callout"><b>The formula.</b> Net = gallons × (destination price − stop price) − (stop cycle gallons + detour gallons) × stop price − fees. Break-even gap = (extra gallons × stop price + fees) ÷ gallons.</div>

<h2><span class="num">03</span>Time is the number nobody writes down</h2>
<p>A stop adds the detour plus ground time. Twenty five minutes on the ground is optimistic at a busy FBO; forty is normal. If the owner is on the airplane, a 35 minute stop to save $190 is a conversation, not a decision. JetDesk shows the time added next to the dollars so that conversation happens before the flight, not on the ramp.</p>

<h2><span class="num">04</span>Where the prices come from</h2>
<p>No public API publishes FBO fuel prices, and the sites that list them do not allow scraping. JetDesk uses the prices you and your crew log, flags them stale after two weeks, and shows the market reference (EIA jet fuel spot and crude) so you know when the whole board has moved since you last checked. Ten seconds per airport to log a price keeps the whole crew's math honest.</p>

<h2><span class="num">05</span>Try it on your own route</h2>
<p>The <a href="/">Fuel Stop tab</a> runs this calculation with your airplane's burn, and the route finder ranks every Jet A field within a corridor of your route by net savings. Free accounts get the calculator; the route finder is part of Pro.</p>
"""
  },
  {
    'slug': 'density-altitude-turboprops',
    'title': 'Density altitude for turboprop pilots',
    'description': 'What hot days and high fields do to takeoff and landing distance, the rules of thumb JetDesk uses on airport pages, and why a 50 percent margin is the number to plan around.',
    'date': 'September 2026', 'iso': '2026-09-01',
    'body': """
<p class="lead">Turboprops are forgiving airplanes right up until a summer afternoon at a 5,000 ft field, when the book number you remember from sea level turns out to be a thousand feet short. JetDesk puts a runway estimate on every airport page so the surprise happens on the screen, not on the roll.</p>

<h2><span class="num">01</span>What density altitude is doing</h2>
<p>Density altitude is the altitude the airplane thinks it is at. Heat and low pressure thin the air; thin air means less thrust from the propeller, less lift from the wing, and a higher true airspeed for the same indicated rotation speed, which means more runway. A 2,000 ft field on a 35°C day behaves like a 4,500 ft field on a standard day.</p>
<p>JetDesk computes density altitude from the live METAR (temperature and altimeter) and the field elevation, and shows it under the weather block. A DA more than 2,000 ft above the field turns the line amber.</p>

<h2><span class="num">02</span>The rules of thumb JetDesk uses</h2>
<ul>
<li><b>Takeoff distance</b> grows about 8 percent per 1,000 ft of density altitude for turboprops. Piston airplanes are worse, jets somewhat better.</li>
<li><b>Landing distance</b> grows about 5 percent per 1,000 ft. Landing is less sensitive because the engine matters less on the way down.</li>
<li><b>Headwind</b> shortens both by roughly 10 percent per 9 knots. <b>Tailwind</b> lengthens them by roughly 10 percent per 2 knots, which is why a 10 knot tailwind is a different airplane.</li>
</ul>
<p>These are FAA rule-of-thumb factors applied to the sea level, ISA, max weight, 50 ft obstacle numbers you enter in Settings for your airplane. They are estimates for planning. The POH performance charts for your serial number are the authority, and JetDesk says so next to every number.</p>

<h2><span class="num">03</span>Why 50 percent</h2>
<p>Book numbers come from a new airplane, a test pilot and a dry runway. Most operators plan with a factor of 1.5 on the landing distance (some regulations require 1.67 for turbojets on wet runways). JetDesk shows the raw estimate and the 50 percent figure, and grades each runway: green at 1.5 times or better, amber down to 1.2, red under that. Red is not a prohibition; it is a reason to open the POH and think.</p>

<div class="callout safety"><b>Not a performance calculation.</b> JetDesk's runway math is a planning estimate. Verify takeoff and landing performance with your aircraft's approved flight manual before every flight.</div>

<h2><span class="num">04</span>The practical habits</h2>
<p>Look at the DA line before the runway line. On a hot day, prefer the longer runway even with a small crosswind. If the estimate is amber, plan the departure for the morning. And enter your real book numbers once: presets load typical figures for a Meridian, M600, PC-12, TBM, King Air 350 and the light jets, but your airplane's POH is a few clicks away and worth the two minutes.</p>
"""
  },
  {
    'slug': 'how-jetdesk-computes-trip-cost',
    'title': 'How JetDesk computes trip cost',
    'description': 'The inputs behind the per-leg cost on the Trip tab: distance, winds aloft, block overhead, taxi fuel, cruise burn and a planning price, plus what is deliberately left out.',
    'date': 'September 2026', 'iso': '2026-09-01',
    'body': """
<p class="lead">The Trip tab turns a list of airport codes into a number with a dollar sign. Here is exactly how, so you can tune the inputs to your airplane and trust the result.</p>

<h2><span class="num">01</span>Distance</h2>
<p>Great-circle distance between airport reference points, in nautical miles, from the FAA airport file. No routing, no airways, no SIDs. For a light turboprop flying direct or near-direct in the Northeast, real tracks run 2 to 5 percent longer; add block overhead (below) to cover it.</p>

<h2><span class="num">02</span>Speed and winds</h2>
<p>Cruise true airspeed comes from Settings. With Pro, JetDesk pulls the FAA winds aloft forecast (FB) for the station nearest each leg at your cruise altitude, interpolates between forecast levels, solves the wind triangle, and uses the resulting groundspeed. Without winds, it uses your KTAS as is. The leg card shows the wind used and its source station.</p>

<h2><span class="num">03</span>Time</h2>
<p>Block time = distance ÷ groundspeed + block overhead. The overhead (12 minutes by default) covers taxi, climb below cruise speed, descent, vectors and the approach. Tune it to your operation; a Meridian into Westchester on a Friday deserves more than 12.</p>

<h2><span class="num">04</span>Fuel</h2>
<p>Burn = block time × cruise gallons per hour + taxi and takeoff gallons. Both come from Settings, and the presets load typical figures. Cruise burn is the number to get right: it is 80 percent of the answer.</p>

<h2><span class="num">05</span>Cost</h2>
<p>Cost = burn × the planning price per gallon. The planning price is a single number for the whole trip (edit it right on the Trip tab), because a trip cost estimate is for budgeting, not for a fuel receipt. The Fuel Stop tab is where airport-specific prices matter.</p>

<h2><span class="num">06</span>What is left out on purpose</h2>
<ul>
<li>Landing, ramp, handling and overnight fees. They vary by FBO and by whether you buy fuel; log them in the FBO notes.</li>
<li>Engine reserves, maintenance accruals and crew costs. Add them to the owner brief notes if the owner wants the fully loaded number.</li>
<li>Alternate fuel and reserves. The estimate is burn to destination; your dispatch fuel is a different conversation.</li>
</ul>

<h2><span class="num">07</span>Runway verdicts on the leg</h2>
<p>Each leg grades the arrival airport's best runway: wide open at 5,000 × 100 ft or better, workable at 4,000 × 75, tight below that. Those are comfort labels based on runway size. The airport page adds real distance estimates for your airplane corrected for density altitude and wind; read <a href="/notes/density-altitude-turboprops/">the density altitude note</a> for how those work.</p>

<h2><span class="num">08</span>The owner brief</h2>
<p>Pro accounts can share a trip as a clean one-page brief: legs, miles, block, gallons and cost, with the price basis stated. It is a link that prints, meant to be sent to the owner before the trip so the number is agreed before the fuel is bought.</p>
"""
  },
  {
    'slug': 'reserve-fuel-minutes-or-gallons',
    'title': 'Reserve fuel: minutes, gallons, and the alternate nobody plans',
    'description': 'How JetDesk decides whether a leg makes reserve: departure fuel, burn, alternate burn and a reserve you set in minutes or gallons, and why the alternate is where most fuel stops really come from.',
    'date': 'September 2026', 'iso': '2026-09-02',
    'body': """
<p class="lead">The regulation says 45 minutes at cruise for IFR. Most turboprop operators fly to a number that is bigger and personal. JetDesk lets you set that number once, then checks every leg against it before you file.</p>

<h2><span class="num">01</span>What a leg has to land with</h2>
<p>Every leg starts with departure fuel: full usable by default, or a figure you enter if you are tankering less. JetDesk subtracts the leg burn (block time at your cruise gallons per hour plus taxi and takeoff) and gets landing fuel. That landing fuel has to cover two things: the burn to an alternate, if you name one, and your reserve.</p>
<div class="callout"><b>The check.</b> Landing fuel = departure fuel &minus; leg burn. Required = alternate burn + reserve. Margin = landing fuel &minus; required. A negative margin is a NEEDS A STOP flag; a margin under ten percent of usable is a THIN warning.</div>

<h2><span class="num">02</span>Minutes or gallons</h2>
<p>Reserve in minutes scales with your cruise burn, which is the honest way to state it when you fly more than one airplane. Reserve in gallons is what most pilots actually carry in their head for one airplane: "I do not land with less than forty." Settings takes either. If you enter gallons, that wins; leave it at zero and the minutes figure applies.</p>

<h2><span class="num">03</span>The alternate is the whole story</h2>
<p>A Meridian burning 40 an hour at 260 knots carries about 170 usable. Nantucket to White Plains is 22 gallons of burn. Nobody worries about reserve on that leg until the destination goes below minimums and the alternate is Bradley, 70 miles back the other way. That is another 20 gallons, and if you left with 60 because the ramp fee at the stop was not worth a top-off, you are now 10 short with the weather deciding for you.</p>
<p>That is why the fuel line on a leg card names the alternate and its burn separately. Set it while you are still planning, and the app tells you what departure fuel it takes to make it work.</p>

<h2><span class="num">04</span>Departure fuel by weight</h2>
<p>Full usable is not always available. Five people and bags in a Meridian take the max fuel by weight to about 108 gallons, well under the tanks. When your profile has weights, JetDesk caps departure fuel at what max takeoff weight allows and the leg card says so, so the reserve check uses fuel you can actually load.</p>

<h2><span class="num">05</span>Habits that keep this honest</h2>
<p>Log fuel used after each flight. Three legs in, JetDesk tells you whether your book burn is optimistic and offers to fix it. Reserve planning on a burn figure that is ten percent low is reserve planning on a lie.</p>
"""
  },
  {
    'slug': 'winds-aloft-block-time',
    'title': 'Why block time swings twenty minutes: winds aloft, decoded',
    'description': 'What the FAA winds and temperatures aloft forecast is, how JetDesk turns it into a groundspeed for each leg, and why the return leg costs more than the outbound one.',
    'date': 'September 2026', 'iso': '2026-09-02',
    'body': """
<p class="lead">Providence to Nantucket in a Meridian is 25 minutes one way and 31 the other on the same afternoon. Nothing changed but the wind. Here is how JetDesk knows before you do.</p>

<h2><span class="num">01</span>The FB forecast</h2>
<p>The FAA publishes winds and temperatures aloft (the FB product, still called FD by most pilots) for about 170 stations, at 3,000, 6,000, 9,000, 12,000, 18,000, 24,000, 30,000, 34,000 and 39,000 feet, issued four times a day with a use period of a few hours. JetDesk fetches the current issue for your region and keeps it for half an hour.</p>

<h2><span class="num">02</span>From station to leg</h2>
<p>For each leg, JetDesk finds the nearest forecast station to the midpoint of the leg, interpolates the wind vector between the two forecast levels that bracket your cruise altitude, and solves the wind triangle against your true airspeed. The result is a groundspeed, and block time becomes distance over groundspeed plus your block overhead. The leg card shows the wind used and its station so you can sanity check it against the briefing.</p>
<div class="callout"><b>Pro only.</b> Winds aloft is a Pro feature. Free accounts plan on true airspeed, which is fine for budgeting and wrong for anything with a jet stream in it.</div>

<h2><span class="num">03</span>Why it matters for fuel more than time</h2>
<p>Six extra minutes is nothing on a schedule. Six extra minutes is four gallons, and four gallons is the difference between making reserve and not on a leg planned tight. The reserve check on every leg uses the wind-corrected burn, which is the point of the whole exercise.</p>

<h2><span class="num">04</span>When the number is missing</h2>
<p>Stations more than 300 nautical miles from the leg midpoint are ignored, and legs over the ocean or in the mountain west can fall outside coverage. When no station qualifies, the card quietly uses true airspeed and does not show a wind line. If you fly somewhere the FB does not reach, tune block overhead up a few minutes and treat the estimate as budget, not dispatch.</p>
"""
  },
  {
    'slug': 'weight-before-fuel',
    'title': 'Weight before fuel: why the Meridian runs out of payload first',
    'description': 'A weights-only walk through zero fuel weight, max fuel by weight and landing weight for a Piper Meridian with five aboard, and how JetDesk shows it on every leg.',
    'date': 'September 2026', 'iso': '2026-09-02',
    'body': """
<p class="lead">A Meridian holds 170 gallons. With a family of five and a weekend of bags it can carry about 108 of them. Most owner-pilots know this in their bones; the app now does the arithmetic on every trip so the crew does too.</p>

<h2><span class="num">01</span>The four numbers</h2>
<p>Basic empty weight, maximum takeoff weight, maximum landing weight and maximum zero fuel weight. Settings holds them per airplane and the presets load typical figures (a Meridian: about 3,420 empty, 5,092 takeoff, 4,850 landing and zero fuel). Replace them with the figures from your own weight and balance sheet; airplanes drift after avionics and interiors.</p>

<h2><span class="num">02</span>Payload, then fuel</h2>
<p>A trip takes a passenger count and a bag weight. Payload is people at your per-person weight (190 by default) plus bags. Zero fuel weight is empty plus payload, and it has to stay under max zero fuel weight. Whatever is left between zero fuel weight and max takeoff is available for fuel, at 6.7 pounds a gallon for Jet A. The trip header shows all of it in one line, and the leg cards cap departure fuel at the smaller of the tanks and that figure.</p>
<div class="callout"><b>The example.</b> Five people at 190 plus 200 pounds of bags is 1,150. Zero fuel weight 4,570, under the 4,850 limit. Fuel by weight: 5,092 &minus; 4,570 = 522 pounds, or 78 gallons. Not 170. That trip is a two-leg trip or a two-flight trip.</div>

<h2><span class="num">03</span>Landing weight</h2>
<p>Each leg also shows takeoff weight and landing weight. Landing weight is zero fuel weight plus the fuel you land with, and on a short hop with full tanks it is easy to land over the limit. The card turns that red so it gets noticed on the ground rather than in the flare.</p>

<h2><span class="num">04</span>What this is not</h2>
<p>There is no center of gravity here. Arms, moments and the envelope live in the POH and on your loading sheet, and JetDesk says so next to every weight. The purpose is to catch the trip that was never going to work with full tanks before anyone starts pumping.</p>
"""
  },
  {
    'slug': 'what-the-owner-report-should-say',
    'title': 'What the owner report should say',
    'description': 'The monthly numbers an aircraft owner actually wants from the pilot who manages the airplane, why estimate versus actual matters more than the total, and how JetDesk builds the report from the flight log.',
    'date': 'September 2026', 'iso': '2026-09-02',
    'body': """
<p class="lead">Owners do not want a spreadsheet. They want to know the airplane is being run well, and the fastest way to show that is a page with four numbers and a short table, every month, without being asked.</p>

<h2><span class="num">01</span>The four numbers</h2>
<ul>
<li><b>Fuel purchased</b>, because it is what hit the card.</li>
<li><b>Block hours</b>, because engine and maintenance reserves accrue on them.</li>
<li><b>Gallons burned</b>, because it is the honest measure of what the flying cost, separate from when the fuel was bought.</li>
<li><b>Average price paid per gallon</b>, against the planning price, because that is the number that shows judgment.</li>
</ul>

<h2><span class="num">02</span>Estimate versus actual</h2>
<p>The total is not the story; the total is whatever the owner's calendar demanded. The story is whether the plan was right. JetDesk stores the estimate at the moment you log each leg (block, burn and cost at your planning price) and the report shows the fuel burned at the prices actually paid against that estimate. A pilot who is consistently within five percent has earned trust. A pilot who is consistently under has found cheaper fuel.</p>

<h2><span class="num">03</span>Where the fuel came from</h2>
<p>A second table lists each airport where fuel was bought, gallons, average price and total. Owners are surprised by how much the spread between fields is worth over a month. This table is also the justification for the occasional stop that added 30 minutes.</p>

<h2><span class="num">04</span>How it gets built</h2>
<p>Every leg you fly gets three numbers after the flight: block time, fuel used, and fuel bought with the price paid. That takes about fifteen seconds on the leg card. On the first of the month JetDesk assembles last month's legs into the report and emails it to everyone on the operation, including anyone you invited with owner view-only access. You can also build it any time from the Trip tab, Flight log, for a link that prints to one clean page.</p>
<div class="callout"><b>What it leaves out.</b> Landing, ramp and hangar fees, crew costs and maintenance reserves. Those belong in your accounting; the report says so on the page so nobody mistakes it for the whole cost of ownership.</div>
"""
  },
  {
    'slug': 'the-two-week-rule-for-fuel-prices',
    'title': 'The two-week rule for fuel prices',
    'description': 'Why JetDesk marks a logged fuel price stale after fourteen days, how the market reference tells you when the whole board has moved, and how community prices fill the gaps without anyone scraping anything.',
    'date': 'September 2026', 'iso': '2026-09-02',
    'body': """
<p class="lead">A fuel price is a fact with a date on it. JetDesk treats a logged price as good for two weeks and says so plainly after that, because a stale $6.40 is worse than no number at all.</p>

<h2><span class="num">01</span>Why fourteen days</h2>
<p>FBOs reprice on deliveries, and deliveries at a busy field run weekly to biweekly. Retail Jet A also follows the wholesale market with a lag of about that long. Two weeks is the window in which a logged price is more likely right than wrong. After that, the log shows a STALE tag and the fuel stop math still uses it, with the tag visible, so the decision is yours.</p>

<h2><span class="num">02</span>The market reference</h2>
<p>The Fuel Stop tab shows the Gulf Coast Jet A wholesale spot (U.S. EIA) and live WTI crude (OilPriceAPI), each with its recent change. Neither is a ramp price; retail runs several dollars above wholesale. What they tell you is whether the whole board has moved since you last logged. If wholesale is up thirty cents, every stale price in your log is probably low.</p>

<h2><span class="num">03</span>Community prices</h2>
<p>No public API publishes FBO prices, and the sites that list them do not allow scraping, so JetDesk does not. Instead, operations that opt in share their logged prices anonymously (airport, price, date, nothing else) and see the community median, range and number of operations for any airport where at least two other operations have reported in the last 60 days. The route finder uses that median when your own crew has no price. It is give to get: you see it only if you share.</p>

<h2><span class="num">04</span>The receipt is the best data there is</h2>
<p>When you log a flight and enter fuel bought and the price paid, JetDesk drops that price into the crew's log for that airport automatically. It is dated, it is real, and it took no extra effort. Crews that log their receipts have price logs that are never stale.</p>
"""
  },
]

def read_min(a):
  import re as _re
  words = len(_re.sub(r'<[^>]+>', ' ', a['body']).split())
  return max(2, round(words / 220))

def index_body():
  arts = sorted(ARTICLES, key=lambda a: a['iso'], reverse=True)
  items = ''.join('<a class="note" href="/notes/%s/"><div class="k">%s · %d min read</div><h2>%s</h2><p>%s</p><div class="m">Read the note &#8594;</div></a>' % (a['slug'], a['date'].upper(), read_min(a), a['title'], a['description']) for a in arts)
  return '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">JetDesk</a></nav><h1>Field notes</h1><div class="effdate">FROM THE JETDESK DESK · %d NOTES</div><p class="lead">Short, useful notes on the arithmetic behind managing an airplane: fuel stops, reserves, winds, weights, runway margins and what the owner needs to see. Written for pilots who have stood on the ramp, with the same numbers the app uses.</p><div class="notegrid">%s</div><p style="margin-top:22px"><a class="cta" href="/">Open JetDesk &#8594;</a> <span style="color:var(--ink3);font-size:13px;margin-left:10px">Free to start. 14-day Pro trial, no card.</span></p>' % (len(arts), items)

def article_ld(a):
  url = 'https://www.jetdesk.ai/notes/%s/' % a['slug']
  d = {"@context": "https://schema.org", "@type": "Article", "headline": a['title'], "description": a['description'],
       "datePublished": a['iso'], "dateModified": a['iso'], "mainEntityOfPage": url, "image": _legal.OG_IMAGE,
       "author": {"@type": "Organization", "name": "JetDesk.AI", "url": "https://www.jetdesk.ai/"},
       "publisher": {"@type": "Organization", "name": "JetDesk.AI", "url": "https://www.jetdesk.ai/", "logo": {"@type": "ImageObject", "url": _legal.LOGO_URL}}}
  return json.dumps(d, separators=(',', ':')).replace('</', '<\\/')

def build_pages():
  out = {}
  for a in ARTICLES:
    others = [x for x in sorted(ARTICLES, key=lambda x: x['iso'], reverse=True) if x['slug'] != a['slug']][:3]
    more = '<h2 style="margin-top:34px">More field notes</h2><div class="notegrid">' + ''.join('<a class="note" href="/notes/%s/"><div class="k">%s · %d min read</div><h2>%s</h2><p>%s</p></a>' % (o['slug'], o['date'].upper(), read_min(o), o['title'], o['description']) for o in others) + '</div>'
    body = '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">JetDesk</a> &rsaquo; <a href="/notes/">Field notes</a></nav><h1>%s</h1><div class="effdate">FIELD NOTES · %s · %d MIN READ</div>%s<p style="margin-top:26px"><a class="cta" href="/">Open JetDesk &#8594;</a></p>%s<p style="margin-top:26px"><a href="/notes/">All field notes</a> · <a href="/airports/">Airport directory</a></p>' % (a['title'], a['date'].upper(), read_min(a), a['body'], more)
    extra = ('<meta property="article:published_time" content="%sT12:00:00Z"><meta property="article:section" content="Field notes">' % a['iso'] +
             '<script type="application/ld+json">%s</script><script type="application/ld+json">%s</script>' % (article_ld(a), breadcrumb_ld([('JetDesk.AI', 'https://www.jetdesk.ai/'), ('Field notes', 'https://www.jetdesk.ai/notes/'), (a['title'], 'https://www.jetdesk.ai/notes/%s/' % a['slug'])])))
    out['notes/' + a['slug']] = legal_page('notes/' + a['slug'], a['title'], a['description'], body, extra_head=extra, og_type='article')
  out['notes'] = legal_page('notes', 'Field notes', 'Short, useful notes on fuel stops, runway margins and trip cost from JetDesk.AI.', index_body(),
    extra_head='<link rel="alternate" type="application/rss+xml" title="JetDesk field notes" href="/notes/feed.xml">' +
      '<script type="application/ld+json">%s</script>' % breadcrumb_ld([('JetDesk.AI', 'https://www.jetdesk.ai/'), ('Field notes', 'https://www.jetdesk.ai/notes/')]))
  return out

def rss():
  from xml.sax.saxutils import escape
  items = ''.join('<item><title>%s</title><link>https://www.jetdesk.ai/notes/%s/</link><guid>https://www.jetdesk.ai/notes/%s/</guid><pubDate>%s</pubDate><description>%s</description></item>' % (
    escape(a['title']), a['slug'], a['slug'], __import__('email.utils', fromlist=['x']).format_datetime(__import__('datetime').datetime.fromisoformat(a['iso'] + 'T12:00:00+00:00')), escape(a['description'])) for a in ARTICLES)
  return '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>JetDesk.AI field notes</title><link>https://www.jetdesk.ai/notes/</link><description>Short, useful notes on fuel stops, runway margins and trip cost for pilots who manage the airplane.</description><language>en-us</language>%s</channel></rss>' % items
