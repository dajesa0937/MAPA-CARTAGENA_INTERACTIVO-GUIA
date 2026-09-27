// Service worker: guarda la aplicación y los datos para uso sin conexión.
// No guarda teselas de mapas (respeto a las políticas de los proveedores).
const CACHE = 'ctg-v18';
const SHELL = [
  './', 'index.html', 'css/styles.css',
  'js/app.js', 'js/data.js', 'js/i18n.js', 'js/map.js', 'js/views.js', 'js/store.js', 'js/tts.js', 'js/scenes.js', 'js/cinema.js',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'data/places.json', 'data/events.json', 'data/periods.json', 'data/routes.json', 'data/sources.json', 'data/badges.json', 'data/media.json', 'data/stories.json',
  'i18n/es.json', 'i18n/en.json', 'img/icon.svg', 'manifest.webmanifest'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Red primero (contenido siempre actualizado), caché como respaldo sin conexión.
  e.respondWith(
    // 'no-cache': siempre pregunta al servidor si hay versión nueva (evita ver diseños viejos tras publicar)
    fetch(e.request, { cache: 'no-cache' }).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
