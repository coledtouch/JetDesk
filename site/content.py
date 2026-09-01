# Field notes: short, useful articles built as static pages at /notes/<slug>/ by assemble_pwa.py.
# They share the legal page template (brand tokens, self-hosted fonts, no scripts).
from legal import legal_page

ARTICLES = [
  {
    'slug': 'fuel-stop-math',
    'title': 'What a fuel stop actually saves',
    'description': 'The arithmetic behind the fuel stop decision: price gap times gallons, minus the cost of the extra cycle and detour, and the break-even gap that makes it worth it.',
    'date': 'September 2026',
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
    'date': 'September 2026',
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
    'date': 'September 2026',
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
]

def index_body():
  items = ''.join('<div class="callout" style="border-left-color:var(--acc)"><h2 style="margin:0 0 4px"><a href="/notes/%s/" style="text-decoration:none">%s</a></h2><p style="margin:0">%s</p><div class="effdate" style="margin:6px 0 0">%s</div></div>' % (a['slug'], a['title'], a['description'], a['date'].upper()) for a in ARTICLES)
  return '<h1>Field notes</h1><div class="effdate">FROM THE JETDESK DESK</div><p class="lead">Short, useful notes on the arithmetic behind managing an airplane: fuel stops, runway margins, trip cost. Written for pilots who have stood on the ramp.</p>' + items

def build_pages():
  out = {}
  for a in ARTICLES:
    body = '<h1>%s</h1><div class="effdate">FIELD NOTES · %s</div>%s<p style="margin-top:26px"><a href="/notes/">All field notes</a> · <a href="/">Open JetDesk</a></p>' % (a['title'], a['date'].upper(), a['body'])
    out['notes/' + a['slug']] = legal_page('notes/' + a['slug'], a['title'], a['description'], body)
  out['notes'] = legal_page('notes', 'Field notes', 'Short, useful notes on fuel stops, runway margins and trip cost from JetDesk.AI.', index_body())
  return out
