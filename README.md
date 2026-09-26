# Cartagena de Indias — Mapa, Historia y Experiencia

Experiencia web bilingüe (ES/EN) para explorar Cartagena de Indias: mapa interactivo, murallas y
fortificaciones, fichas históricas con fuentes, línea de tiempo, rutas guiadas, guía narrador con voz
e insignias.

## Tecnología (elegida para equipos modestos)

- **Sin compilación ni instalación**: HTML + CSS + JavaScript moderno (módulos ES). Se edita con cualquier
  editor y se publica tal cual.
- **Leaflet 1.9.4** (incluido en `site/vendor/`, no depende de CDN) con mapa satelital de Esri (sin clave de API) y OpenStreetMap. Fotografías de Pexels (licencia libre), cargadas desde su servidor.
- **Datos separados de la interfaz** en `site/data/*.json`; **traducciones de interfaz** en `site/i18n/`.
- **PWA**: funciona sin conexión (menos el mapa base) e instalable en el celular.
- **Audioguía v1**: voz sintética del navegador. Si una ficha trae `audio.es` / `audio.en` (URL de un
  archivo), se reproduce ese audio en su lugar.
- **Enlaces compartibles**: `#/lugar/<id>`, `#/ruta/<id>/<parada>`, `#/historia/<época>`, `#/fortificaciones`.

## Estructura

```
site/
  index.html            pantalla y estructura
  css/styles.css        diseño (tokens de color, responsive, modo oscuro)
  js/app.js             orquestación, rutas por hash, eventos
  js/map.js             mapa, marcadores, capas, línea de ruta
  js/views.js           vistas del panel (explorar, ficha, historia, rutas, fuentes, búsqueda)
  js/data.js            capa de datos (hoy JSON; mañana una API)
  js/i18n.js            idioma
  js/store.js           progreso del visitante (solo en el navegador)
  js/tts.js             narración
  data/places.json      lugares (29)
  data/events.json      acontecimientos (27)
  data/periods.json     épocas (9)
  data/routes.json      rutas (6)
  data/sources.json     fuentes (47)
  data/badges.json      insignias
  i18n/es.json, en.json textos de interfaz
scripts/validate.py     control de calidad histórica y de datos
```

## Probar en tu computador

Los módulos y los JSON necesitan un servidor local (abrir el archivo con doble clic no funciona):

```
cd site
python -m http.server 8080
```

Luego abre http://localhost:8080. También sirve la extensión "Live Server" de VS Code.

## Publicar en GitHub Pages (recomendado: gratis y sin cupo mensual de publicaciones)

El proyecto incluye `.github/workflows/pages.yml`: cada vez que subes cambios a la rama `main`,
GitHub valida los datos (`scripts/validate.py`) y publica la carpeta `site` automáticamente.

1. En VS Code: Archivo → Abrir carpeta → MAPA-CARTAGENA_INTERACTIVO-GUIA.
2. Panel "Control de código fuente" → "Publicar en GitHub" → repositorio **público** `cartagena-mapa-historia`.
3. En GitHub: Settings → Pages → Source: **GitHub Actions**.
4. Sitio: https://TU-USUARIO.github.io/cartagena-mapa-historia/
5. Para actualizar: en VS Code escribe un mensaje, "Confirmar" y "Sincronizar cambios".

## Publicar en Netlify (alternativa)

Opción sencilla: entra a https://app.netlify.com/projects/cartagena-mapa-historia → **Deploys** →
arrastra la carpeta `site` a la zona "Drag and drop". Queda publicado en
https://cartagena-mapa-historia.netlify.app

Opción por consola (con Node instalado): `npx netlify-cli deploy --prod --dir site`

## Añadir o corregir un lugar

1. Edita `site/data/places.json` (copia una ficha existente como plantilla).
2. Toda afirmación necesita una fuente en `sources.json` y un nivel de certeza:
   `documentado`, `consenso`, `debatido`, `tradicion` o `pendiente`.
3. Declara la precisión de la ubicación en `loc.accuracy`: `exact`, `approx` o `zone`.
4. Ejecuta `python scripts/validate.py`. Si marca errores, no publiques.

## Reglas editoriales

- No se inventan fechas, personajes, citas ni coordenadas. Si las fuentes no coinciden, se muestran las
  versiones y se marca `debatido`.
- La información turística (horarios, tarifas) va aparte, con fecha de verificación y fuente oficial.
- Textos redactados de forma original; no se copian párrafos de las fuentes.

## Pendientes conocidos

- Verificar en campo el Teatro Adolfo Mejía y las zonas marcadas como aproximadas (el resto se verificó sobre OpenStreetMap).
- Sustituir el trazado esquemático de la muralla por uno exacto (GeoJSON de OpenStreetMap o levantamiento propio).
- Fotos propias de los lugares que hoy usan imagen ilustrativa.
- Fichas marcadas "pendiente" (catedral, Santo Domingo): contrastar con fuente académica.
- Capa "Cartagena histórica vs. actual" con un plano antiguo georreferenciado.
