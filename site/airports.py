# Airport directory: static, indexable pages at /airports/<code>/ for fields a turboprop or light jet
# would actually use, plus a state index. Built by assemble_pwa.py from airports_us.json (FAA NASR via OurAirports).
# Every number on the page is computed from the dataset, and the planning figures use the same rules of thumb
# as the app (see notes/density-altitude-turboprops), so the pages say something a pilot can use.
import json, re, math
from legal import legal_page, breadcrumb_ld

STATES = {'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California','CO':'Colorado','CT':'Connecticut','DE':'Delaware','FL':'Florida','GA':'Georgia','HI':'Hawaii','ID':'Idaho','IL':'Illinois','IN':'Indiana','IA':'Iowa','KS':'Kansas','KY':'Kentucky','LA':'Louisiana','ME':'Maine','MD':'Maryland','MA':'Massachusetts','MI':'Michigan','MN':'Minnesota','MS':'Mississippi','MO':'Missouri','MT':'Montana','NE':'Nebraska','NV':'Nevada','NH':'New Hampshire','NJ':'New Jersey','NM':'New Mexico','NY':'New York','NC':'North Carolina','ND':'North Dakota','OH':'Ohio','OK':'Oklahoma','OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina','SD':'South Dakota','TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont','VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming','DC':'District of Columbia','PR':'Puerto Rico','VI':'U.S. Virgin Islands','GU':'Guam','AS':'American Samoa','MP':'Northern Mariana Islands'}
SIZE = {'L': 'large airport', 'M': 'medium airport', 'S': 'small airport'}
def surface(code):
  c = str(code or '').upper()
  cond = {'-G': ' (good)', '-F': ' (fair)', '-P': ' (poor)', '-E': ' (excellent)'}
  suffix = next((v for k, v in cond.items() if c.endswith(k)), '')
  base = c.split('-')[0]
  names = {'ASP': 'asphalt', 'ASPH': 'asphalt', 'CON': 'concrete', 'CONC': 'concrete', 'GRS': 'turf', 'TURF': 'turf', 'GRE': 'graded earth', 'GRVL': 'gravel', 'GRAVEL': 'gravel', 'PEM': 'asphalt (PEM)', 'DIRT': 'dirt', 'WATER': 'water', 'MATS': 'mats', 'TREATED': 'treated'}
  name = names.get(base, base.lower() or 'unknown')
  if 'TURF' in c and base in ('ASP', 'ASPH', 'CON', 'CONC'): name += ' and turf'
  return name + suffix

def esc(v):
  return str(v if v is not None else '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

def hav(a, b):
  R = 3440.065; r = math.pi / 180
  dla = (b['la'] - a['la']) * r; dlo = (b['lo'] - a['lo']) * r
  x = math.sin(dla / 2); y = math.sin(dlo / 2)
  h = x * x + math.cos(a['la'] * r) * math.cos(b['la'] * r) * y * y
  return 2 * R * math.asin(min(1, math.sqrt(h)))

def bearing(a, b):
  r = math.pi / 180
  y = math.sin((b['lo'] - a['lo']) * r) * math.cos(b['la'] * r)
  x = math.cos(a['la'] * r) * math.sin(b['la'] * r) - math.sin(a['la'] * r) * math.cos(b['la'] * r) * math.cos((b['lo'] - a['lo']) * r)
  return (math.degrees(math.atan2(y, x)) + 360) % 360

def compass(deg):
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][int((deg + 22.5) // 45) % 8]

def longest(a):
  rws = [r for r in (a.get('r') or []) if r.get('l')]
  return max(rws, key=lambda r: r['l']) if rws else None

def paved(r):
  return str(r.get('s') or '').upper().startswith(('ASP', 'CON', 'PEM'))

def eligible(a):
  """Fields worth a page: anything medium or large, or a lit runway of 4,000 ft or more."""
  if a.get('t') in ('L', 'M'):
    return True
  lr = longest(a)
  return bool(lr and lr['l'] >= 4000 and any(r.get('lit') for r in a['r']))

def density_altitude(elev_ft, oat_c):
  isa = 15 - 2 * (elev_ft / 1000.0)
  return round(elev_ft + 120 * (oat_c - isa))

def fmt(n):
  return '{:,}'.format(int(round(n)))

def cycle_label():
  import datetime
  try:
    return datetime.date.fromisoformat(sitemap_lastmod()).strftime('%b %Y')
  except Exception:
    return 'Aug 2026'

def sitemap_lastmod():
  try:
    return json.load(open('dataset_cycle.json')).get('cycle', '2026-09-01')
  except Exception:
    return '2026-09-01'

def build(ap):
  by = {}
  for a in ap:
    by[a['c']] = a
  pages = {}
  sel = [a for a in ap if eligible(a)]
  big = [a for a in ap if longest(a) and longest(a)['l'] >= 5000]
  lastmod = sitemap_lastmod()
  urls = []
  for a in sel:
    slug = 'airports/' + a['c'].lower()
    pages[slug] = airport_page(a, big, by)
    urls.append('https://www.jetdesk.ai/' + slug + '/')
  # state pages
  states = {}
  for a in sel:
    states.setdefault(a.get('st') or 'XX', []).append(a)
  for st, lst in states.items():
    slug = 'airports/' + st.lower()
    if slug in pages:
      slug = 'airports/state-' + st.lower()
    pages[slug] = state_page(st, sorted(lst, key=lambda x: (-(longest(x)['l'] if longest(x) else 0), x['c'])))
    urls.append('https://www.jetdesk.ai/' + slug + '/')
  pages['airports'] = index_page(states)
  # /airports/ itself is listed in sitemap-pages.xml
  sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
    '  <url><loc>%s</loc><lastmod>%s</lastmod><changefreq>monthly</changefreq><priority>%s</priority></url>\n' % (u, lastmod, '0.7' if u.endswith('/airports/') else '0.5') for u in urls) + '</urlset>\n'
  return pages, sitemap, len(sel)

def state_slug(st):
  return '/airports/' + st.lower() + '/'

def page_title(code, name, place):
  """~50-65 characters: 'KHPN Runways, Elevation & Pilot Planning | JetDesk' with the airport name when it fits."""
  base = '%s Runways, Elevation & Pilot Planning | JetDesk' % code
  short = re.sub(r'\b(Regional|International|Municipal|County|Executive|Memorial)\b', lambda m: {'Regional': 'Rgnl', 'International': 'Intl', 'Municipal': 'Muni', 'County': 'Co', 'Executive': 'Exec', 'Memorial': 'Mem'}[m.group(1)], name)
  short = re.sub(r'\s*(Airport|Field|Airpark)$', '', short).strip()
  with_name = '%s %s Runways & Pilot Planning | JetDesk' % (code, short)
  return with_name if 45 <= len(with_name) <= 65 else base

def page_description(code, name, loc, rws, lr, elev):
  """140-165 characters."""
  where = (' in ' + loc) if loc else ''
  n = '%d runway%s' % (len(rws), '' if len(rws) == 1 else 's')
  rw = ('%s, longest %s ft' % (n, fmt(lr['l']))) if lr else n
  tail_long = 'Density altitude, turboprop runway margins, nearby alternates and fuel-stop planning.'
  tail_mid = 'Density altitude, turboprop runway margins, alternates and fuel-stop planning.'
  tail_short = 'Density altitude, runway margins, alternates and fuel stops.'
  cands = ['%s %s%s: %s, elevation %s ft. %s' % (code, name, where, rw, fmt(elev), t) for t in (tail_long, tail_mid, tail_short)]
  cands += ['%s%s: %s, elevation %s ft. %s' % (code, where, rw, fmt(elev), t) for t in (tail_long, tail_mid, tail_short)]
  cands += ['%s: %s, elevation %s ft. %s' % (code, rw, fmt(elev), t) for t in (tail_long, tail_mid, tail_short)]
  d = next((c for c in cands if len(c) <= 165), cands[-1])
  for extra in (' Free pilot planning from JetDesk.AI.', ' From JetDesk.AI.'):
    if len(d) < 140 and len(d + extra) <= 165:
      d += extra
      break
  return d

def airport_page(a, big, by):
  code = a['c']; name = a.get('n') or code; city = a.get('m') or ''; st = a.get('st') or ''
  stname = STATES.get(st, st)
  lr = longest(a)
  rws = sorted([r for r in (a.get('r') or []) if r.get('l')], key=lambda r: -r['l'])
  elev = int(a.get('e') or 0)
  loc = ', '.join([x for x in [city, stname] if x])
  # nearby long-runway fields
  near = sorted([(hav(a, b), b) for b in big if b['c'] != code], key=lambda x: x[0])[:6]
  # planning: Meridian-class book numbers (matches the app preset), DA at ISA, ISA+10, ISA+20 and a 35 C day
  to_sl, ldg_sl = 2438, 2110
  isa = 15 - 2 * elev / 1000.0
  rows = []
  for label, oat in (('Standard day (ISA, %d°C)' % round(isa), isa), ('Warm day (ISA +10)', isa + 10), ('Hot day (ISA +20)', isa + 20), ('35°C afternoon', 35)):
    da = max(0, density_altitude(elev, oat))
    to = to_sl * (1 + 0.08 * da / 1000); ldg = ldg_sl * (1 + 0.05 * da / 1000)
    rows.append((label, da, to, ldg, ldg * 1.5))
  worst = rows[-1]
  margin_txt = ''
  if lr:
    ratio = lr['l'] / worst[4]
    if ratio >= 1.0:
      margin_txt = 'Even on a 35°C afternoon the longest runway (%s, %s ft) covers a Meridian-class turboprop\'s landing distance with a 50 percent margin (%s ft needed).' % (lr['id'], fmt(lr['l']), fmt(worst[4]))
    elif ratio >= 0.8:
      margin_txt = 'On a 35°C afternoon the longest runway (%s, %s ft) is within 20 percent of the 1.5x landing figure for a Meridian-class turboprop (%s ft). Plan hot-day departures for the morning and check the POH.' % (lr['id'], fmt(lr['l']), fmt(worst[4]))
    else:
      margin_txt = 'On a 35°C afternoon the longest runway (%s, %s ft) is short of the 1.5x landing figure for a Meridian-class turboprop (%s ft). Treat this as a cool-morning field for heavier turboprops and run the POH numbers.' % (lr['id'], fmt(lr['l']), fmt(worst[4]))
  title = '%s %s' % (code, name)
  desc = page_description(code, name, loc, rws, lr, elev)
  rw_rows = ''.join('<tr><td><b class="mono">%s</b></td><td class="mono">%s &times; %s ft</td><td>%s</td><td>%s</td></tr>' % (
    esc(r['id']), fmt(r['l']), fmt(r.get('w') or 0), esc(surface(r.get('s'))), 'lit' if r.get('lit') else 'unlit') for r in rws)
  da_rows = ''.join('<tr><td>%s</td><td class="mono">%s ft</td><td class="mono">%s ft</td><td class="mono">%s ft</td><td class="mono"><b>%s ft</b></td></tr>' % (
    esc(l), fmt(da), fmt(to), fmt(ldg), fmt(ldg15)) for (l, da, to, ldg, ldg15) in rows)
  near_rows = ''.join('<tr><td><a href="/airports/%s/"><b class="mono">%s</b></a><div class="tiny">%s</div></td><td class="mono">%s nm %s</td><td class="mono">%s ft</td></tr>' % (
    b['c'].lower(), esc(b['c']), esc(b.get('n') or ''), fmt(d), compass(bearing(a, b)), fmt(longest(b)['l'])) for d, b in near if eligible(b))
  ld = {"@context": "https://schema.org", "@type": "Airport", "name": name, "icaoCode": code if len(code) == 4 else None, "iataCode": None,
        "url": "https://www.jetdesk.ai/airports/%s/" % code.lower(),
        "geo": {"@type": "GeoCoordinates", "latitude": a['la'], "longitude": a['lo'], "elevation": "%d ft" % elev},
        "address": {"@type": "PostalAddress", "addressLocality": city, "addressRegion": st, "addressCountry": "US"}}
  ld = {k: v for k, v in ld.items() if v is not None}
  extra = '<script type="application/ld+json">%s</script><script type="application/ld+json">%s</script>' % (
    json.dumps(ld, separators=(',', ':')).replace('</', '<\\/'),
    breadcrumb_ld([('JetDesk.AI', 'https://www.jetdesk.ai/'), ('Airports', 'https://www.jetdesk.ai/airports/'), (stname, 'https://www.jetdesk.ai' + state_slug(st)), (code, 'https://www.jetdesk.ai/airports/%s/' % code.lower())]))
  body = f"""
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">JetDesk</a> &rsaquo; <a href="/airports/">Airports</a> &rsaquo; <a href="{state_slug(st)}">{esc(stname)}</a></nav>
<h1><span class="mono">{esc(code)}</span> · {esc(name)}</h1>
<div class="effdate">{esc(loc.upper())} · {esc(SIZE.get(a.get('t'), 'AIRPORT').upper())}{' · SCHEDULED SERVICE' if a.get('sch') else ''}</div>
<div class="stats">
  <div class="c"><div class="n">{fmt(elev)}</div><div class="l">Elevation ft</div></div>
  <div class="c"><div class="n">{len(rws)}</div><div class="l">Runway{'' if len(rws) == 1 else 's'}</div></div>
  <div class="c"><div class="n">{fmt(lr['l']) if lr else '–'}</div><div class="l">Longest ft{(' · ' + esc(lr['id'])) if lr else ''}</div></div>
  <div class="c"><div class="n">{'%.2f' % abs(a['la'])}{'N' if a['la'] >= 0 else 'S'}</div><div class="l">{'%.2f' % abs(a['lo'])}{'W' if a['lo'] < 0 else 'E'}</div></div>
</div>
<p class="lead">{esc(name)}{' serves ' + esc(city) + ', ' + esc(stname) if city else ''} at {fmt(elev)} ft elevation{(' with its longest runway, ' + esc(lr['id']) + ', at ' + fmt(lr['l']) + ' by ' + fmt(lr.get('w') or 0) + ' ft') if lr else ''}. The figures below are computed from FAA NASR runway data (via OurAirports) and the same rules of thumb JetDesk uses on the airport page in the app; the POH and current NOTAMs are the authority.</p>
<p><a class="cta" href="/?apt={esc(code)}">Open {esc(code)} in JetDesk: live METAR, TAF, winds and runway verdict &#8594;</a></p>

<h2><span class="num">01</span>Runways</h2>
<div class="tablewrap"><table><thead><tr><th>Runway</th><th>Length &times; width</th><th>Surface</th><th>Lighting</th></tr></thead><tbody>{rw_rows or '<tr><td colspan="4">No runway data on file.</td></tr>'}</tbody></table></div>

<h2><span class="num">02</span>Density altitude and turboprop runway margins</h2>
<p>Standard temperature at {fmt(elev)} ft is about {round(isa)}°C. Every 1,000 ft of density altitude adds roughly 8 percent to a turboprop's takeoff distance and 5 percent to its landing distance. The table uses Piper Meridian book numbers (2,438 ft takeoff and 2,110 ft landing over a 50 ft obstacle at sea level, ISA, max weight) as a reference airplane; heavier turboprops and light jets scale the same way from their own POH figures.</p>
<div class="tablewrap"><table><thead><tr><th>Conditions</th><th>Density altitude</th><th>Takeoff est.</th><th>Landing est.</th><th>Landing &times; 1.5</th></tr></thead><tbody>{da_rows}</tbody></table></div>
<div class="callout safety"><b>Planning aid only.</b> {esc(margin_txt) if margin_txt else 'Verify takeoff and landing performance with your aircraft flight manual before every flight.'} The percentages are a generic rule of thumb applied to one reference airplane, not certified performance data for any specific aircraft, and the runway size categories describe the runway, not your airplane's suitability. Verify with the approved flight manual before every flight.</div>

<h2><span class="num">03</span>Nearby fields with 5,000 ft or more</h2>
<p>Useful as alternates, as fuel stops when the price at {esc(code)} is high, or as the longer runway on a hot afternoon.</p>
<div class="tablewrap"><table><thead><tr><th>Airport</th><th>Distance</th><th>Longest runway</th></tr></thead><tbody>{near_rows or '<tr><td colspan="3">None within the dataset.</td></tr>'}</tbody></table></div>

<h2><span class="num">04</span>Jet A prices and FBOs at {esc(code)}</h2>
<p>No public API publishes FBO fuel prices, so JetDesk does not guess. Pilots and crews log the price they actually paid at {esc(code)}, the app flags a price stale after two weeks, and the route finder ranks every field within a corridor of your route by net savings after the cost of the extra cycle. <a href="/?apt={esc(code)}">Log a price at {esc(code)}</a> or read <a href="/notes/fuel-stop-math/">what a fuel stop actually saves</a>.</p>
<p style="margin-top:26px"><a href="{state_slug(st)}">All {esc(stname)} airports</a> · <a href="/airports/">Airport directory</a> · <a href="/">Open JetDesk</a></p>
"""
  return legal_page('airports/' + code.lower(), title, desc, body, extra_head=extra, full_title=page_title(code, name, city or stname))

def state_page(st, lst):
  stname = STATES.get(st, st)
  items = ''.join('<a href="/airports/%s/"><b>%s</b> %s%s · %s ft</a>' % (a['c'].lower(), esc(a['c']), esc(a.get('n') or ''), (' (' + esc(a['m']) + ')') if a.get('m') else '', fmt(longest(a)['l']) if longest(a) else '–') for a in lst)
  body = '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">JetDesk</a> &rsaquo; <a href="/airports/">Airports</a></nav><h1>%s airports for turboprops and light jets</h1><div class="effdate">%d FIELDS · LONGEST RUNWAY FIRST</div><p class="lead">Every %s airport with a lit runway of 4,000 ft or more, or medium and large status in the FAA file, with runways, elevation, density altitude margins and nearby alternates on each page.</p><div class="cols">%s</div><p style="margin-top:26px"><a href="/airports/">All states</a> · <a href="/">Open JetDesk</a></p>' % (esc(stname), len(lst), esc(stname), items)
  extra = '<script type="application/ld+json">%s</script>' % breadcrumb_ld([('JetDesk.AI', 'https://www.jetdesk.ai/'), ('Airports', 'https://www.jetdesk.ai/airports/'), (stname, 'https://www.jetdesk.ai' + state_slug(st))])
  return legal_page('airports/' + st.lower(), '%s airports' % stname, '%s airports for turboprop and light jet pilots: runways, elevation, density altitude margins and nearby alternates for %d fields, from JetDesk.AI.' % (stname, len(lst)), body, extra_head=extra)

def index_page(states):
  order = sorted(states.keys(), key=lambda s: STATES.get(s, s))
  items = ''.join('<a href="%s"><b>%s</b> %s · %d</a>' % (state_slug(st), esc(st), esc(STATES.get(st, st)), len(states[st])) for st in order)
  total = sum(len(v) for v in states.values())
  body = '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">JetDesk</a></nav><h1>U.S. airport directory for pilots who manage the airplane</h1><div class="effdate">%s FIELDS · FAA NASR VIA OURAIRPORTS, %s CYCLE</div><p class="lead">Runways, elevation, density altitude margins for turboprops, and nearby alternates for every U.S. airport a Meridian, PC-12, TBM, King Air or light jet would use. Pick a state, or open the app for live weather, winds aloft and fuel-stop math.</p><p><a class="cta" href="/">Open JetDesk &#8594;</a></p><div class="cols">%s</div><p style="margin-top:26px"><a href="/notes/">Field notes</a> · <a href="/">Open JetDesk</a></p>' % (fmt(total), cycle_label().upper(), items)
  extra = '<script type="application/ld+json">%s</script>' % breadcrumb_ld([('JetDesk.AI', 'https://www.jetdesk.ai/'), ('Airports', 'https://www.jetdesk.ai/airports/')])
  return legal_page('airports', 'U.S. airport directory', 'Runways, elevation, density altitude margins and nearby alternates for %s U.S. airports used by turboprops and light jets, from JetDesk.AI.' % fmt(total), body, extra_head=extra)
