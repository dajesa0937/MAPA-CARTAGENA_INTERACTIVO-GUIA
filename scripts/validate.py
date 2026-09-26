"""Control de calidad histórica y de datos. Falla (exit 1) si algo no cumple las reglas:
toda ficha con fuente existente, ambos idiomas, certeza válida, coordenadas dentro de Cartagena,
referencias cruzadas válidas y claves de interfaz iguales en ES y EN."""
import json, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[1] / 'site'
J = lambda p: json.loads((root / p).read_text(encoding='utf-8'))
places, events, periods, routes, sources, badges = (J(f'data/{n}.json') for n in ['places','events','periods','routes','sources','badges'])
es, en = J('i18n/es.json'), J('i18n/en.json')
errs = []
S = {s['id'] for s in sources}; P = {p['id'] for p in places}; E = {e['id'] for e in events}; PE = {p['id'] for p in periods}
CERT = {'documentado','consenso','debatido','tradicion','pendiente'}
CATS = {'castillo','muralla','iglesia','museo','plaza','monumento','cultura','barrio'}
BBOX = (10.30, 10.45, -75.60, -75.50)

def bil(obj, where):
    if not isinstance(obj, dict) or not obj.get('es') or not obj.get('en'):
        errs.append(f'{where}: falta español o inglés')

for s in sources:
    if not s.get('url','').startswith('https://'): errs.append(f"fuente {s['id']}: url inválida")
for p in places:
    w = f"lugar {p['id']}"
    for k in ['name','guide','history','significance','status','dates']: bil(p.get(k), f'{w}.{k}')
    if p.get('note'): bil(p['note'], f'{w}.note')
    if p.get('visit'):
        bil(p['visit'], f'{w}.visit')
        if p['visit'].get('source') not in S: errs.append(f'{w}: fuente de visita inexistente')
        if not p['visit'].get('checked'): errs.append(f'{w}: visita sin fecha de verificación')
    for ph in p.get('photos', []):
        if not isinstance(ph.get('pexels'), int) or not ph.get('author'): errs.append(f'{w}: foto sin id o autor')
        bil(ph.get('alt'), f'{w}.photo.alt'); bil(ph.get('angle'), f'{w}.photo.angle')
    if len(p['history']['es']) != len(p['history']['en']): errs.append(f'{w}: párrafos ES/EN no coinciden')
    if not p.get('sources'): errs.append(f'{w}: sin fuentes')
    for s in p.get('sources', []):
        if s not in S: errs.append(f'{w}: fuente inexistente {s}')
    if p.get('certainty') not in CERT: errs.append(f'{w}: certeza inválida')
    if p.get('category') not in CATS: errs.append(f'{w}: categoría inválida')
    lat, lon = p['coords']
    if not (BBOX[0] <= lat <= BBOX[1] and BBOX[2] <= lon <= BBOX[3]): errs.append(f'{w}: coordenadas fuera de Cartagena')
    if p.get('loc', {}).get('accuracy') not in {'exact','approx','zone'}: errs.append(f'{w}: precisión de ubicación no declarada')
    for e in p.get('events', []):
        if e not in E: errs.append(f'{w}: evento inexistente {e}')
    for pe in p.get('periods', []):
        if pe not in PE: errs.append(f'{w}: época inexistente {pe}')
for e in events:
    w = f"evento {e['id']}"
    for k in ['title','text','date']: bil(e.get(k), f'{w}.{k}')
    if e.get('certainty') not in CERT: errs.append(f'{w}: certeza inválida')
    if e.get('period') not in PE: errs.append(f'{w}: época inexistente')
    if not e.get('sources'): errs.append(f'{w}: sin fuentes')
    for s in e.get('sources', []):
        if s not in S: errs.append(f'{w}: fuente inexistente {s}')
    for pl in e.get('places', []):
        if pl not in P: errs.append(f'{w}: lugar inexistente {pl}')
for pe in periods:
    for k in ['name','context','label']: bil(pe.get(k), f"época {pe['id']}.{k}")
    for s in pe.get('sources', []):
        if s not in S: errs.append(f"época {pe['id']}: fuente inexistente {s}")
for r in routes:
    bil(r.get('name'), f"ruta {r['id']}"); bil(r.get('intro'), f"ruta {r['id']}.intro")
    for st in r['stops']:
        if st not in P: errs.append(f"ruta {r['id']}: parada inexistente {st}")
if set(es) != set(en): errs.append(f'i18n: claves distintas {set(es) ^ set(en)}')
used = set()
for f in [*places, *events, *periods]: used.update(f.get('sources', []))
for p in places:
    if p.get('visit'): used.add(p['visit']['source'])
unused = S - used
print(f'{len(places)} lugares · {len(events)} eventos · {len(periods)} épocas · {len(routes)} rutas · {len(sources)} fuentes')
if unused: print('Aviso — fuentes sin usar:', ', '.join(sorted(unused)))
if errs:
    print('\n'.join('✗ ' + e for e in errs)); sys.exit(1)
print('✓ Datos válidos')
