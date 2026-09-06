import csv, json, re, collections

PAVED = re.compile(r'ASP|CON|PEM|BIT|TAR|PAVED|MAC', re.I)

runways = collections.defaultdict(list)
with open('runways.csv', newline='', encoding='utf-8') as f:
    for r in csv.DictReader(f):
        if r['closed'] == '1':
            continue
        try:
            L = int(float(r['length_ft'] or 0))
            W = int(float(r['width_ft'] or 0))
        except ValueError:
            continue
        if L < 1500:
            continue
        ident = f"{r['le_ident']}/{r['he_ident']}".strip('/')
        try:
            hdg = round(float(r['le_heading_degT'])) % 360
        except (ValueError, TypeError):
            hdg = None
        rw = {
            'id': ident,
            'l': L,
            'w': W,
            's': (r['surface'] or '').upper()[:12],
            'lit': 1 if r['lighted'] == '1' else 0,
        }
        if hdg is not None:
            rw['h'] = hdg
        runways[r['airport_ident']].append(rw)

# FAA NASR services (fuel, repair, landing fee) keyed by ICAO then FAA id
svc = {}
try:
    with open('/tmp/APT_BASE.csv', newline='', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            rec = {
                'fu': (r.get('FUEL_TYPES') or '').strip(),
                'ma': (r.get('AIRFRAME_REPAIR_SER_CODE') or '').strip(),
                'mp': (r.get('PWR_PLANT_REPAIR_SER') or '').strip(),
                'fee': 1 if (r.get('LNDG_FEE_FLAG') or '').strip() == 'Y' else 0,
            }
            if r.get('ICAO_ID'):
                svc[r['ICAO_ID'].strip()] = rec
            if r.get('ARPT_ID'):
                svc.setdefault('#' + r['ARPT_ID'].strip(), rec)
except FileNotFoundError:
    print('WARNING: NASR APT_BASE.csv not found; services omitted')

MX = {'MAJOR': 'M', 'MINOR': 'm'}

out = []
with open('airports.csv', newline='', encoding='utf-8') as f:
    for a in csv.DictReader(f):
        if a['iso_country'] != 'US':
            continue
        if a['type'] not in ('small_airport', 'medium_airport', 'large_airport'):
            continue
        rws = runways.get(a['ident'], [])
        paved = [r for r in rws if PAVED.search(r['s']) and r['l'] >= 2500]
        if not paved:
            continue
        code = a['icao_code'] or a['gps_code'] or a['ident']
        state = a['iso_region'].replace('US-', '')
        try:
            lat = round(float(a['latitude_deg']), 4)
            lon = round(float(a['longitude_deg']), 4)
        except ValueError:
            continue
        elev = int(float(a['elevation_ft'])) if a['elevation_ft'] else None
        keep = sorted(rws, key=lambda r: -r['l'])[:6]
        rec = {
            'c': code,                       # code (ICAO/GPS)
            'f': a['local_code'] or '',      # FAA local code
            'n': a['name'],
            'm': a['municipality'],
            'st': state,
            'la': lat, 'lo': lon,
            'e': elev,
            't': {'small_airport': 'S', 'medium_airport': 'M', 'large_airport': 'L'}[a['type']],
            'sch': 1 if a['scheduled_service'] == 'yes' else 0,
            'r': keep,
        }
        s = svc.get(code) or svc.get('#' + (a['local_code'] or '').strip())
        if s:
            if s['fu']:
                rec['fu'] = s['fu']
            mx = MX.get(s['ma'], '') + MX.get(s['mp'], '')
            if s['ma'] or s['mp']:
                rec['mx'] = (MX.get(s['ma']) or '-') + (MX.get(s['mp']) or '-')
            if s['fee']:
                rec['fee'] = 1
        out.append(rec)

out.sort(key=lambda x: x['c'])
blob = json.dumps(out, separators=(',', ':'))
with open('airports_us.json', 'w', encoding='utf-8') as f:
    f.write(blob)
print('airports kept:', len(out))
print('json bytes:', len(blob))
# sanity: the airports Dale mentioned
want = ['KPVD', 'KMVY', 'KHPN', 'KBDR', 'KLNS', 'KBOS']
have = {o['c']: o for o in out}
for w in want:
    o = have.get(w)
    print(w, 'OK' if o else 'MISSING', o['n'] if o else '', [(r['id'], r['l'], r['w']) for r in o['r'][:3]] if o else '')
