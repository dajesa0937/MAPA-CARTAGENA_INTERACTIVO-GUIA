// Mapa: Leaflet + teselas raster. Capas base intercambiables, marcadores por categoría,
// línea de ruta y ubicación del usuario.
import { db, place, existsIn } from './data.js';
import { L as Lx, t } from './i18n.js';
import { store } from './store.js';

const CENTER = [10.4236, -75.5480];
const CAT_COLOR = {
  castillo: 'var(--c-castillo)', muralla: 'var(--c-muralla)', iglesia: 'var(--c-iglesia)', museo: 'var(--c-museo)',
  plaza: 'var(--c-plaza)', monumento: 'var(--c-monumento)', cultura: 'var(--c-cultura)', barrio: 'var(--c-barrio)',
  mar: 'var(--c-mar)', hoy: 'var(--c-hoy)'
};
// Colores reales (Leaflet dibuja en SVG y no resuelve variables CSS)
const HEX = { mar: '#1f5f7a', hoy: '#e07a3a' };
export const catColor = c => CAT_COLOR[c] || 'var(--c-barrio)';

let map, layers = {}, currentLayer, markers = new Map(), routeLine = null, youMarker = null, walls = null;
let onSelect = () => {};

export function initMap(el, { onPlaceSelect }) {
  onSelect = onPlaceSelect;
  map = window.L.map(el, { zoomControl: false, minZoom: 11, maxZoom: 19, attributionControl: true })
    .setView(CENTER, window.matchMedia('(max-width: 820px)').matches ? 15 : 16);
  window.L.control.zoom({ position: 'bottomright' }).addTo(map);

  const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  const esriAttr = 'Imágenes &copy; Esri, Maxar, Earthstar Geographics';
  layers.sat = window.L.layerGroup([
    window.L.tileLayer(esri + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: esriAttr }),
    window.L.tileLayer(esri + 'Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, opacity: 0.55 }),
    window.L.tileLayer(esri + 'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 })
  ]);
  layers.street = window.L.tileLayer(esri + 'World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: 'Mapa &copy; Esri, HERE, Garmin, &copy; OpenStreetMap'
  });
  layers.osm = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });
  setBaseLayer('sat');
  drawWalls();
  // En el celular el panel inferior tapa parte del mapa: subir la ciudad al área visible.
  if (window.matchMedia('(max-width: 820px)').matches) map.panBy([0, Math.round(Math.min(332, window.innerHeight * 0.5) / 2)], { animate: false });

  for (const p of db.places) addMarker(p);
  map.on('click', () => el.dispatchEvent(new CustomEvent('mapblankclick')));
  map.on('zoomend moveend', scheduleDeclutter);
  return map;
}

function drawWalls() {
  const w = db.media?.walls;
  if (!w) return;
  walls = window.L.layerGroup([
    window.L.polyline(w.points, { color: '#1b120a', weight: 9, opacity: 0.35, lineJoin: 'round', interactive: false }),
    window.L.polyline(w.points, { color: '#f0c05a', weight: 4, opacity: 0.95, lineJoin: 'round', dashArray: '1 0' })
      .bindTooltip(() => `<strong>${t('walls.label')}</strong><br>${Lx(w.note)}`, { className: 'mk-tip', sticky: true })
  ]).addTo(map);
}
/** Murallas: true = completas, 'building' = en construcción (línea discontinua), false = ocultas. */
export function showWalls(mode) {
  if (!walls) return;
  if (mode && !map.hasLayer(walls)) walls.addTo(map);
  if (!mode && map.hasLayer(walls)) map.removeLayer(walls);
  if (mode) walls.getLayers()[1].setStyle({ dashArray: mode === 'building' ? '6 9' : null, opacity: mode === 'building' ? 0.8 : 0.95 });
}

export function setBaseLayer(name) {
  if (currentLayer) map.removeLayer(currentLayer);
  currentLayer = layers[name];
  currentLayer.addTo(map);
  document.querySelectorAll('[data-layer]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.layer === name)));
}

function iconHtml(p, { num, cls = '' } = {}) {
  const inner = num != null ? `<span class="mk-num">${num}</span>` : `<svg aria-hidden="true"><use href="#i-${p.category}"/></svg>`;
  const visited = store.has('visited', p.id) ? ' visited' : '';
  return `<div class="mk ${cls}${visited}" style="background:${catColor(p.category)}">${inner}</div>`;
}

function makeIcon(p, opts) {
  return window.L.divIcon({ className: 'mk-wrap', html: iconHtml(p, opts), iconSize: [34, 34], iconAnchor: [17, 34], tooltipAnchor: [0, -30] });
}

function addMarker(p) {
  const m = window.L.marker(p.coords, { icon: makeIcon(p), keyboard: true, title: Lx(p.name), riseOnHover: true, alt: Lx(p.name) });
  m.bindTooltip(Lx(p.name), { className: 'mk-tip', direction: 'top' });
  m.on('click', () => onSelect(p.id));
  m.on('keypress', e => { if (e.originalEvent.key === 'Enter') onSelect(p.id); });
  m.addTo(map);
  // Zonas aproximadas (p. ej. el combate del galeón) y trazados (malecón): se ven junto con su marcador.
  const extras = [];
  if (p.loc?.radius) extras.push(window.L.circle(p.coords, { radius: p.loc.radius, color: HEX[p.category] || '#1f5f7a', weight: 2, dashArray: '6 8', fillOpacity: 0.08, interactive: false }));
  if (p.path) extras.push(window.L.polyline(p.path, { color: HEX[p.category] || '#e07a3a', weight: 6, opacity: 0.85, dashArray: '2 10', lineCap: 'round', interactive: false }));
  extras.forEach(x => x.addTo(map));
  markers.set(p.id, { m, p, state: {}, extras });
}

/** Redibuja todos los marcadores según el estado de la vista. */
export function renderMarkers({ visibleCats, year = null, route = null, activeId = null, focus = null, pulse = null } = {}) {
  const routeIdx = route ? new Map(route.stops.map((id, i) => [id, i + 1])) : null;
  for (const [id, rec] of markers) {
    const { m, p } = rec;
    let show = true, cls = '', num = null, label = false;
    if (routeIdx) {
      show = routeIdx.has(id);
      num = routeIdx.get(id);
    } else {
      if (visibleCats && !visibleCats.has(p.category)) show = false;
      if (year != null) {
        if (p.category === 'hoy' && year < 1984) show = false;   // lo actual solo en la época contemporánea
        const ex = existsIn(p, year);
        if (ex === 'no') show = false;
        if (ex === 'ruin') cls = 'ruin';
      }
      if (focus && show) {
        const maxLabels = window.matchMedia('(max-width: 820px)').matches ? 3 : 6;
        if (focus.has(id)) { cls += ' focus'; label = focus.size <= maxLabels; }
        else cls += ' dim small';
      }
      if (pulse && pulse.has(id) && show) cls += ' pulse';
    }
    if (id === activeId) cls += ' active';
    const key = `${show}|${cls}|${num}|${label}|${store.has('visited', id)}`;
    if (rec.key !== key) {
      rec.key = key;
      if (show) {
        m.setIcon(makeIcon(p, { num, cls }));
        if (!map.hasLayer(m)) m.addTo(map);
        m.setZIndexOffset(id === activeId || label ? 1000 : cls.includes('dim') ? -500 : 0);
        setLabel(rec, label);
        rec.extras.forEach(x => { if (!map.hasLayer(x)) x.addTo(map); });
      } else if (map.hasLayer(m)) {
        map.removeLayer(m);
        rec.extras.forEach(x => map.removeLayer(x));
      }
    }
  }
  scheduleDeclutter();
}

/** Oculta etiquetas que se montan unas sobre otras (el marcador sigue visible). */
function declutter() {
  const els = [...document.querySelectorAll('.leaflet-tooltip.mk-label')];
  const placed = [];
  for (const el of els) {
    el.style.visibility = '';
    const r = el.getBoundingClientRect();
    const hit = placed.some(q => !(r.right < q.left || r.left > q.right || r.bottom < q.top || r.top > q.bottom));
    if (hit) el.style.visibility = 'hidden'; else placed.push(r);
  }
}
let declutterTimer;
const scheduleDeclutter = () => { clearTimeout(declutterTimer); declutterTimer = setTimeout(declutter, 60); };

/** Etiqueta con el nombre siempre visible (para los protagonistas de una época). */
function setLabel(rec, on) {
  const { m, p } = rec;
  if (rec.labeled === on) return;
  rec.labeled = on;
  const name = Lx(p.name).split(' · ')[0];
  m.unbindTooltip();
  if (on) {
    m.bindTooltip(name, { permanent: true, direction: 'right', offset: [16, -18], className: 'mk-label' });
    if (map.hasLayer(m)) m.openTooltip();
  } else {
    m.bindTooltip(name, { className: 'mk-tip', direction: 'top' });
  }
}

export function refreshTooltips() {
  for (const { m, p } of markers.values()) { m.setTooltipContent(Lx(p.name).split(' · ')[0]); m.options.title = Lx(p.name); }
}

export function flyToPlace(id, { zoom } = {}) {
  const p = place(id);
  if (!p) return;
  const z = zoom ?? (p.loc?.radius ? 11 : p.path ? 14 : Math.max(map.getZoom(), p.loc?.accuracy === 'zone' ? 15 : 17));
  map.flyTo(offsetForPanel(p.coords, z), z, { duration: 0.7 });
}

/** Alto que ocupa el panel inferior en el celular, según su estado (medio, abierto o asomado). */
function sheetH() {
  const p = document.getElementById('panel'), h = window.innerHeight;
  if (!p) return h * 0.5;
  if (p.classList.contains('peek')) return Math.min(332, h * 0.5);
  if (p.classList.contains('full')) return h * 0.6;   // abierto del todo: se centra como en «medio»
  return h * 0.6;
}
/** Desplaza el centro para que el punto no quede tapado por el panel. */
function offsetForPanel(latlng, zoom) {
  const mobile = window.matchMedia('(max-width: 820px)').matches;
  const pt = map.project(latlng, zoom);
  if (mobile) pt.y += sheetH() / 2;
  else pt.x -= 210;
  return map.unproject(pt, zoom);
}

export function fitPlaces(ids, { maxZoom = 17 } = {}) {
  const pts = ids.map(id => place(id).coords);
  if (!pts.length) return;
  const mobile = window.matchMedia('(max-width: 820px)').matches;
  const tb = document.getElementById('timebar');
  const top = tb && !tb.hidden ? tb.getBoundingClientRect().bottom - 40 : 40;  // no tapar con la línea de tiempo
  map.flyToBounds(window.L.latLngBounds(pts), {
    paddingTopLeft: mobile ? [40, Math.max(30, top + 20)] : [480, Math.max(40, top + 30)],
    paddingBottomRight: mobile ? [30, sheetH() + 24] : [70, 140],
    duration: 0.8, maxZoom
  });
}

export function drawRoute(r) {
  clearRoute();
  if (!r) return;
  routeLine = window.L.polyline(r.stops.map(id => place(id).coords), {
    color: '#c2553a', weight: 4, opacity: 0.85, dashArray: r.mode === 'boat' ? '2 10' : '8 8', lineCap: 'round'
  }).addTo(map);
}
export function clearRoute() { if (routeLine) { map.removeLayer(routeLine); routeLine = null; } }

export function home() {
  const mobile = window.matchMedia('(max-width: 820px)').matches;
  const z = mobile ? 15 : 16;
  map.flyTo(mobile ? offsetForPanel(CENTER, z) : CENTER, z, { duration: 0.6 });
}

export function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geo'));
    navigator.geolocation.getCurrentPosition(pos => {
      const ll = [pos.coords.latitude, pos.coords.longitude];
      if (youMarker) map.removeLayer(youMarker);
      youMarker = window.L.marker(ll, { icon: window.L.divIcon({ className: '', html: '<div class="you-dot"></div>', iconSize: [16, 16] }), title: t('map.youAreHere') })
        .addTo(map).bindTooltip(t('map.youAreHere'), { className: 'mk-tip' });
      map.flyTo(ll, 17);
      resolve(ll);
    }, reject, { enableHighAccuracy: true, timeout: 10000 });
  });
}

export function invalidate() { map && map.invalidateSize(); }
