// Mapa: Leaflet + teselas raster. Capas base intercambiables, marcadores por categoría,
// línea de ruta y ubicación del usuario.
import { db, place, existsIn } from './data.js';
import { L as Lx, t } from './i18n.js';
import { store } from './store.js';

const CENTER = [10.4236, -75.5480];
const CAT_COLOR = {
  castillo: 'var(--c-castillo)', muralla: 'var(--c-muralla)', iglesia: 'var(--c-iglesia)', museo: 'var(--c-museo)',
  plaza: 'var(--c-plaza)', monumento: 'var(--c-monumento)', cultura: 'var(--c-cultura)', barrio: 'var(--c-barrio)'
};
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
export function showWalls(on) {
  if (!walls) return;
  if (on && !map.hasLayer(walls)) walls.addTo(map);
  if (!on && map.hasLayer(walls)) map.removeLayer(walls);
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
  markers.set(p.id, { m, p, state: {} });
}

/** Redibuja todos los marcadores según el estado de la vista. */
export function renderMarkers({ visibleCats, year = null, route = null, activeId = null } = {}) {
  const routeIdx = route ? new Map(route.stops.map((id, i) => [id, i + 1])) : null;
  for (const [id, rec] of markers) {
    const { m, p } = rec;
    let show = true, cls = '', num = null;
    if (routeIdx) {
      show = routeIdx.has(id);
      num = routeIdx.get(id);
    } else {
      if (visibleCats && !visibleCats.has(p.category)) show = false;
      if (year != null) {
        const ex = existsIn(p, year);
        if (ex === 'no') show = false;
        if (ex === 'ruin') cls = 'ruin dim';
      }
    }
    if (id === activeId) cls += ' active';
    const key = `${show}|${cls}|${num}|${store.has('visited', id)}`;
    if (rec.key !== key) {
      rec.key = key;
      if (show) {
        m.setIcon(makeIcon(p, { num, cls }));
        if (!map.hasLayer(m)) m.addTo(map);
        m.setZIndexOffset(id === activeId ? 1000 : 0);
      } else if (map.hasLayer(m)) {
        map.removeLayer(m);
      }
    }
  }
}

export function refreshTooltips() {
  for (const { m, p } of markers.values()) { m.setTooltipContent(Lx(p.name)); m.options.title = Lx(p.name); }
}

export function flyToPlace(id, { zoom } = {}) {
  const p = place(id);
  if (!p) return;
  const z = zoom ?? Math.max(map.getZoom(), p.loc?.accuracy === 'zone' ? 15 : 17);
  map.flyTo(offsetForPanel(p.coords, z), z, { duration: 0.7 });
}

/** Desplaza el centro para que el punto no quede tapado por el panel. */
function offsetForPanel(latlng, zoom) {
  const mobile = window.matchMedia('(max-width: 820px)').matches;
  const pt = map.project(latlng, zoom);
  if (mobile) pt.y += Math.min(332, window.innerHeight * 0.5) / 2;
  else pt.x -= 210;
  return map.unproject(pt, zoom);
}

export function fitPlaces(ids) {
  const pts = ids.map(id => place(id).coords);
  if (!pts.length) return;
  const mobile = window.matchMedia('(max-width: 820px)').matches;
  const tb = document.getElementById('timebar');
  const top = tb && !tb.hidden ? tb.getBoundingClientRect().bottom - 50 : 40;  // no tapar con la línea de tiempo
  map.flyToBounds(window.L.latLngBounds(pts), {
    paddingTopLeft: mobile ? [30, Math.max(30, top)] : [470, Math.max(40, top)],
    paddingBottomRight: mobile ? [30, window.innerHeight * 0.48] : [70, 140],
    duration: 0.7, maxZoom: 17
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
