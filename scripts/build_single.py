"""Genera dist/cartagena-de-indias.html: un único archivo que funciona con doble clic
(sin servidor). Incrusta CSS, Leaflet, la app empaquetada, los datos y las traducciones.
Requiere Node (npx esbuild). El mapa base sigue necesitando Internet."""
import json, subprocess, pathlib, re
root = pathlib.Path(__file__).resolve().parents[1]
site = root / 'site'
dist = root / 'dist'; dist.mkdir(exist_ok=True)
js = subprocess.run(['npx', 'esbuild', str(site / 'js/app.js'), '--bundle', '--format=iife', '--minify', '--target=es2020'],
                    capture_output=True, text=True, check=True, cwd=root).stdout
data = {n: json.loads((site / f'data/{n}.json').read_text('utf-8')) for n in ['places', 'events', 'periods', 'routes', 'sources', 'badges', 'media']}
i18n = {l: json.loads((site / f'i18n/{l}.json').read_text('utf-8')) for l in ['es', 'en']}
bundle = json.dumps({'data': data, 'i18n': i18n}, ensure_ascii=False).replace('</', '<\\/')
html = (site / 'index.html').read_text('utf-8')
leaf_css = (site / 'vendor/leaflet/leaflet.css').read_text('utf-8')
css = (site / 'css/styles.css').read_text('utf-8')
leaf_js = (site / 'vendor/leaflet/leaflet.js').read_text('utf-8')
icon = (site / 'img/icon.svg').read_text('utf-8')
import base64
icon_uri = 'data:image/svg+xml;base64,' + base64.b64encode(icon.encode()).decode()
html = html.replace('<link rel="stylesheet" href="vendor/leaflet/leaflet.css">', f'<style>{leaf_css}</style>')
html = html.replace('<link rel="stylesheet" href="css/styles.css">', f'<style>{css}</style>')
html = re.sub(r'<link rel="manifest"[^>]*>\n\s*', '', html)
html = re.sub(r'<link rel="apple-touch-icon"[^>]*>\n\s*', '', html)
html = html.replace('href="img/icon.svg"', f'href="{icon_uri}"')
html = html.replace('<script src="vendor/leaflet/leaflet.js"></script>', f'<script>{leaf_js}</script>')
html = html.replace('<script type="module" src="js/app.js"></script>',
                    f'<script>window.__CTG_BUNDLE__={bundle};</script>\n<script>{js}</script>')
out = dist / 'cartagena-de-indias.html'
out.write_text(html, 'utf-8')
print(out, f'{out.stat().st_size/1024:.0f} KB')
