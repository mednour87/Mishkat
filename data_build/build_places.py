# -*- coding: utf-8 -*-
"""Countries and their main cities for the place picker of the practical tools (prayer, qibla, mosques).

Source: GeoNames «cities15000» (every city of more than 15,000 inhabitants), licence CC BY 4.0
(https://www.geonames.org, download.geonames.org/export/dump/). For each country: the capital first, then the
regional capitals and the most populous cities (at least 60 when available), with the Arabic name when GeoNames has one, coordinates rounded to 4
decimals, and the time zone. Country names are not stored: the browser gives them (Intl.DisplayNames ar/en).

usage: python data_build/build_places.py   (expects data_build/cache/geonames/cities15000.txt)
       → public/data/places.json
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data_build', 'cache', 'geonames', 'cities15000.txt')
OUT = os.path.join(ROOT, 'public', 'data', 'places.json')
AR = re.compile('[ء-ي]')
MAX = 60

by = {}
for line in open(SRC, encoding='utf-8'):
    f = line.rstrip('\n').split('\t')
    if len(f) < 19:
        continue
    gid, name, ascii_, alts, lat, lon, fclass, fcode, cc = f[0], f[1], f[2], f[3], f[4], f[5], f[6], f[7], f[8]
    pop, tz = int(f[14] or 0), f[17]
    ar = next((a for a in alts.split(',') if AR.search(a) and not re.search('[A-Za-z]', a)), '')
    by.setdefault(cc, []).append({'en': name, 'ar': ar, 'lat': round(float(lat), 4), 'lon': round(float(lon), 4), 'tz': tz,
                                  'pop': pop, 'cap': fcode == 'PPLC', 'adm': fcode == 'PPLA'})

out = {}
for cc, lst in by.items():
    # the capital, then every regional capital (wilaya / governorate / region seat), then the most populous
    lst.sort(key=lambda c: (not c['cap'], not c['adm'], -c['pop']))
    seen, keep = set(), []
    for c in lst:
        k = c['en'].lower()
        if k in seen:
            continue
        seen.add(k)
        keep.append([c['en'], c['ar'], c['lat'], c['lon'], c['tz']])
        if len(keep) >= MAX and not c['adm']:
            break
    out[cc] = keep
json.dump({'source': 'GeoNames cities15000 (CC BY 4.0) — geonames.org', 'fields': ['en', 'ar', 'lat', 'lon', 'tz'], 'countries': out},
          open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'countries', sum(len(v) for v in out.values()), 'cities', os.path.getsize(OUT) // 1024, 'KB')
