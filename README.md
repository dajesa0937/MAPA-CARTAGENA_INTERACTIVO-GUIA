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
  js/scenes.js          escenas animadas (SVG) y presentaciones de fotos
  js/cinema.js          modo cine (historias a pantalla completa)
  data/places.json      lugares (39)
  data/events.json      acontecimientos (42)
  data/periods.json     épocas (10)
  data/routes.json      rutas (8)
  data/stories.json     historias temáticas de Explorar (6)
  data/sources.json     fuentes (71)
  data/badges.json      insignias
  i18n/es.json, en.json textos de interfaz
scripts/validate.py     control de calidad histórica y de datos
```

## Probar en tu computador

La forma más fácil: abre `dist/cartagena-de-indias.html` con doble clic. Es la app completa en un solo
archivo (se regenera con `python scripts/build_single.py`, que necesita Node). Solo el mapa base requiere Internet.

Para trabajar con el código fuente de `site/`, los módulos y los JSON necesitan un servidor local (abrir el archivo con doble clic no funciona):

```
cd site
python -m http.server 8080
```

Luego abre http://localhost:8080. También sirve la extensión "Live Server" de VS Code.

## Publicar en Netlify

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
- Catedral: fechas tomadas de fuentes secundarias coincidentes; contrastar con un estudio académico.
- Iglesias de la Trinidad, Santo Toribio y Santo Domingo: conseguir fotos propias (hoy usan imagen ilustrativa).
- Gran Malecón del Mar y playas: información de actualidad verificada el 26/09/2026; revisar cada mes mientras dure la obra (apertura de los primeros 2 km programada para el 15/10/2026).
- Galeón San José: actualizar cuando el ICANH publique nuevos resultados.
- Capa "Cartagena histórica vs. actual" con un plano antiguo georreferenciado.

## Novedades v4 (septiembre de 2026)

- **Explorar** abre con «Historias para descubrir»: seis relatos cortos con mapa, capítulos y fuentes.
  - El galeón San José.
  - La ciudad de los templos (las iglesias).
  - Cómo se defendió Cartagena.
  - La ciudad heroica (la independencia).
  - Antes de Cartagena.
  - Cartagena hoy · 2026.
- **Capítulos que reutilizan los acontecimientos verificados.** Cada capítulo toma sus datos de `events.json`, así no se duplican fechas ni textos.
- **Escenas animadas en SVG** (sin video, funcionan sin conexión). Tienen subtítulos, barra de progreso y botón de pausa, y respetan «reducir movimiento».
  - La escena prehispánica se rotula como *interpretación artística*.
  - La del galeón se rotula como *ilustración*.
- **Cartagena hoy.**
  - Presentación de fotos en la época contemporánea.
  - Nueva categoría «Cartagena hoy» (Gran Malecón del Mar, Bocagrande, La Boquilla, Playa Blanca e Islas del Rosario), marcada siempre como información actual con fecha de verificación.
- **Rutas rediseñadas.**
  - Cada tarjeta muestra la foto, las cifras (paradas, km y minutos) y la tira de paradas con miniaturas; puedes empezar en cualquier parada.
  - El botón «Mapa» muestra el trazado sin iniciar la ruta.
  - Rutas nuevas: «Ruta de las iglesias» y «Cartagena hoy».
- **Mapa.**
  - Zonas aproximadas dibujadas como círculo discontinuo (combate del galeón, Islas del Rosario).
  - El trazado aproximado del malecón aparece como línea punteada.
  - La ubicación exacta del naufragio no se muestra: es reservada por el Estado.

## Novedades v5 — Modo cine

- **Entradas.** «▶ Ver como película» aparece en tres sitios:
  - En la portada.
  - En el banner panorámico de Explorar («Cartagena desde el cielo»).
  - Dentro de cada historia.
- **La película.**
  - Abre con dos vistas aéreas (centro amurallado con el mar, y Bocagrande con sus playas).
  - Después pasan las 6 historias a pantalla completa, con fotos en movimiento lento, subtítulos animados y barra de progreso.
  - Al final de cada historia aparece «A continuación», con cuenta regresiva de 6 s.
- **Controles.**
  - Tocar a la derecha o a la izquierda (o deslizar, o usar las flechas del teclado) para avanzar o retroceder.
  - Espacio para pausar; Esc para salir.
  - Botón «Narración» (voz del navegador, desactivada por defecto).
- **Contenido.** Sale de los mismos datos verificados (`stories.json` → `events.json` / `places.json`). Cada foto indica su autor y si es ilustrativa.
- **Al salir,** el visitante queda en la última historia que veía, con su mapa.

## Fotos: regla de correspondencia (v5.2)

- Cada foto debe mostrar el lugar de su ficha. Si un lugar no tiene una foto verificada, se muestra una portada con su icono y el aviso «Aún no tenemos una foto verificada de este lugar»; nunca la foto de otro sitio.
- Orígenes admitidos:
  - Pexels (`"pexels": id`).
  - Wikimedia Commons (`"commons": "Nombre del archivo.jpg"`, con `author` y `license` obligatorios). Cada foto muestra su autor, un enlace a su página de origen y su licencia.
- Pendientes de foto verificada: fuerte de San Juan de Manzanillo, fuerte de Santa Cruz (Castillogrande), escollera de Bocagrande (está bajo el agua), castillo de San Luis (ruinas) y baluarte de El Reducto.

## Novedades v6 — Para el viajero (27/09/2026)

Cambios basados en una investigación sobre qué lleva a un viajero internacional (en especial de EE. UU.) a decidirse por un destino: historias con vínculo personal, lo que ha visto en pantalla o leído (*set-jetting*, Expedia Unpack '26: 81 % de Gen Z y millennials), información práctica clara y fechada, y llamadas a la acción visibles (MMGY 2025, buenas prácticas de sitios de destino).

- **«¿Sabías que…?» en la portada**: tres ganchos rotativos (Washington/Mount Vernon, galeón San José, García Márquez) que abren su historia. En inglés empieza por Washington.
- **Nueva historia «El nombre de Mount Vernon»** (Cartagena y EE. UU.): Lawrence Washington, las tropas de las Trece Colonias (cifras marcadas como *debatidas*), las medallas de una victoria que no llegó, el nombre de Mount Vernon y los nuevos vuelos directos desde Washington-Dulles (dato turístico fechado). Fuentes: George Washington's Mount Vernon, United/PR Newswire.
- **Nueva historia «La Cartagena de García Márquez»** y dos lugares nuevos verificados en OpenStreetMap: claustro de La Merced (cenizas desde el 22/05/2016) y antiguo convento de Santa Clara. El episodio de las criptas se presenta como relato del autor.
- **Pestaña «Viaje / Plan»** (`#/viaje`): «Cartagena ahora» en vivo (hora local, diferencia con el visitante, puesta de sol calculada en el navegador y tiempo de Open-Meteo, °F primero en inglés); cómo llegar desde EE. UU., entrada, clima, seguridad y datos prácticos, todo con fuente y fecha (`data/trip.json`).
- **Mi Cartagena**: botón «Guardar» en cada lugar, lista en la pestaña Viaje, ver en el mapa y compartir por enlace (`#/viaje/mi/id1,id2`).
- **SEO y redes**: título y descripción bilingües, Open Graph con imagen, datos estructurados `TouristDestination`, `?lang=en` para compartir la guía directamente en inglés.
- Corrección: el teatro Adolfo Mejía se reubicó con OpenStreetMap (la posición anterior era aproximada).

Datos prácticos a revisar periódicamente: vuelos, requisitos de entrada y aviso de viaje de EE. UU. (fecha en `trip.json → checked`).

## Novedades v6.1 — Postales (27/09/2026)

- **Envía una postal** (`js/postcard.js` + `js/postcard-ui.js`): el visitante elige *Te invito* o *Estuve aquí*, hasta 4 lugares (solo con fotos del propio sitio), su nombre, el de su amigo y un mensaje. La postal se dibuja en el navegador (canvas 1080×1350) con collage de fotos, sello, matasellos con la fecha, código QR hacia la guía (con la lista de lugares) y los créditos de las fotos, como exigen sus licencias.
- Se comparte como imagen (WhatsApp, correo, redes) con el menú de compartir del teléfono o se descarga en PNG; en computador se descarga y se copia el enlace.
- Accesos: portada («Envía una postal»), pestaña Viaje, botón «Postal» en cada ficha, «Hacer una postal con mi lista» en Mi Cartagena, y enlaces `#/postal`, `#/postal/estuve`, `#/postal/estuve/<lugar>`.
- Fotos de Commons: se piden por la API (`origin=*`) para obtener miniaturas con CORS; Pexels ya lo permite. Si una foto no carga, se usa un fondo de color.
- QR: `vendor/qrcode/qrcode.js` (qrcode-generator 2.0.4, Kazuhiko Arase, licencia MIT).
- Privacidad: nada se envía a servidores; «Guardar» y el nombre del remitente viven solo en el navegador del visitante (localStorage).
- v6.2: botón **WhatsApp** en la postal. En el teléfono usa el menú de compartir del sistema (envía la imagen). En el computador copia la postal al portapapeles y abre WhatsApp (wa.me) con el mensaje y el enlace: se pega la imagen con Ctrl+V. Si el navegador no permite copiar imágenes, la descarga. Nuevos botones «Copiar imagen» y «Más opciones».
- v6.3: playas de Bocagrande y Castillogrande reubicadas sobre los polígonos de playa de OpenStreetMap (antes el punto caía en el centro del barrio). El mapa ahora admite varios trazados por lugar (`paths`) y dibuja las dos playas. La Boquilla también se movió a la playa.
