#!/usr/bin/env python3
"""Refresh the airport dataset from OurAirports and the current FAA NASR 28-day cycle, then rebuild.

    python3 refresh_data.py            # download, rebuild airports_us.json, run assemble_pwa.py
    python3 refresh_data.py --check    # only report the current NASR cycle and whether it changed

Deploy afterwards with: npx --yes wrangler@4 pages deploy dist --project-name meridian-flight-desk
The GitHub Actions workflow in .github/workflows/refresh-data.yml runs all of this on a schedule.
"""
import datetime, io, json, os, re, subprocess, sys, urllib.request, zipfile

OA = 'https://davidmegginson.github.io/ourairports-data/'
NASR_INDEX = 'https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/'
STAMP = 'dataset_cycle.json'

def get(url, timeout=120):
  req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36', 'Accept': 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9'})
  with urllib.request.urlopen(req, timeout=timeout) as r:
    return r.read()

def current_cycle():
  html = get(NASR_INDEX).decode('utf-8', 'replace')
  dates = sorted(set(re.findall(r'NASR_Subscription/(\d{4}-\d{2}-\d{2})', html)))
  today = datetime.date.today().isoformat()
  past = [d for d in dates if d <= today]
  if not past:
    raise SystemExit('no NASR cycle found on ' + NASR_INDEX)
  return past[-1]

def csv_zip_url(cycle):
  d = datetime.date.fromisoformat(cycle)
  return 'https://nfdc.faa.gov/webContent/28DaySub/extra/%s_CSV.zip' % d.strftime('%d_%b_%Y')

def main():
  cycle = current_cycle()
  prev = {}
  if os.path.exists(STAMP):
    prev = json.load(open(STAMP))
  print('current NASR cycle:', cycle, '| built with:', prev.get('cycle', 'unknown'))
  if '--check' in sys.argv:
    print('changed' if prev.get('cycle') != cycle else 'unchanged')
    return
  if prev.get('cycle') == cycle and '--force' not in sys.argv:
    print('dataset already on this cycle; use --force to rebuild anyway')
    return
  print('downloading OurAirports airports.csv and runways.csv')
  open('airports.csv', 'wb').write(get(OA + 'airports.csv'))
  open('runways.csv', 'wb').write(get(OA + 'runways.csv'))
  url = csv_zip_url(cycle)
  print('downloading', url)
  z = zipfile.ZipFile(io.BytesIO(get(url, timeout=600)))
  name = [n for n in z.namelist() if n.upper().endswith('APT_BASE.CSV')][0]
  open('/tmp/APT_BASE.csv', 'wb').write(z.read(name))
  print('building airports_us.json')
  subprocess.check_call([sys.executable, 'build_dataset.py'])
  # stamp the cycle into the app footer text and the dataset stamp file
  label = datetime.date.fromisoformat(cycle).strftime('%b %Y')
  for fn in ('app_head.html', 'app.js', 'airports.py', 'legal.py'):
    s = open(fn).read()
    s2 = re.sub(r'FAA NASR via OurAirports, [A-Z][a-z]{2} \d{4} cycle', 'FAA NASR via OurAirports, ' + label + ' cycle', s)
    if s2 != s:
      open(fn, 'w').write(s2)
  json.dump({'cycle': cycle, 'built': datetime.datetime.utcnow().isoformat() + 'Z'}, open(STAMP, 'w'))
  print('assembling')
  subprocess.check_call([sys.executable, 'assemble_pwa.py'])
  print('done: dataset on NASR cycle', cycle)

if __name__ == '__main__':
  main()
