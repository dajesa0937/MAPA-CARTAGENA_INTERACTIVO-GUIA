// Orquestación: estado de la vista, enrutado por hash (enlaces compartibles) y eventos.
import { loadData, db, pexels, photosFor, place, event as getEvent, period, route as getRoute, periodForYear } from './data.js';
import { loadLanguages, setLang, getLang, t, L, applyDom, onLangChange } from './i18n.js';
import { store } from './store.js';
import * as M from './map.js';
import * as V from './views.js';
import * as tts from './tts.js';

const $ = s => document.querySelector(s);
const panel = $('#panel'), body = $('#panelBody'), hero = $('#hero');

const S = {
  tab: 'explore',
  placeId: null,
  visibleCats: new Set(V.CATS),
  year: 1741,
  periodId: 'asedios',
  history: false,
  route: null,       // objeto ruta activa
  stop: 0,
  speaking: false
};

/* ---------------- Render ---------------- */
function render() {
  document.querySelectorAll('[role="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === S.tab)));
  const p = S.placeId && place(S.placeId);
  if (p) body.innerHTML = V.placeView(p, { route: S.route, stopIndex: S.stop, speaking: S.speaking });
  else if (S.tab === 'history') body.innerHTML = V.historyView({ year: S.year, periodId: S.periodId });
  else if (S.tab === 'routes') body.innerHTML = V.routesView();
  else if (S.tab === 'about') body.innerHTML = V.aboutView();
  else body.innerHTML = V.exploreView({ visibleCats: S.visibleCats });
  $('#timebar').hidden = !S.history;
  wireGallery();
  body.querySelector('.period-nav [aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  renderMap();
  updateBadgeCount();
}

function renderMap() {
  M.showWalls(!S.history);
  M.renderMarkers({
    visibleCats: S.history ? new Set(V.CATS) : S.visibleCats,
    year: S.history ? S.year : null,
    route: S.route,
    activeId: S.placeId
  });
}

function scrollTop() { body.scrollTop = 0; }

/* ---------------- Navegación ---------------- */
function setHash(h) {
  const target = '#/' + h;
  if (location.hash !== target) history.replaceState(null, '', target);
}

function openPlace(id, { fly = true, fromRoute = false } = {}) {
  const p = place(id);
  if (!p) return;
  tts.stop(); S.speaking = false;
  if (!fromRoute && S.route && !S.route.stops.includes(id)) exitRoute(false);
  S.placeId = id;
  const fresh = store.addTo('visited', id);
  render(); scrollTop();
  if (fly) M.flyToPlace(id);
  setSheet('half');
  if (S.route) setHash(`ruta/${S.route.id}/${S.stop + 1}`); else setHash(`lugar/${id}`);
  if (fresh) checkBadges();
  body.focus?.();
}

function closePlace() {
  tts.stop(); S.speaking = false;
  if (S.route) { exitRoute(true); return; }
  S.placeId = null;
  render(); scrollTop();
  setHash(S.tab === 'history' ? `historia/${S.periodId}` : tabHash(S.tab));
}

const tabHash = tab => ({ explore: 'explorar', history: `historia/${S.periodId}`, routes: 'rutas', about: 'fuentes' }[tab]);

function openTab(tab) {
  tts.stop(); S.speaking = false;
  if (S.route && tab !== 'routes') exitRoute(false);
  S.tab = tab;
  S.placeId = null;
  if (tab === 'history') enterHistory(); else if (S.history) leaveHistory(false);
  render(); scrollTop();
  setHash(tabHash(tab));
  setSheet(tab === 'explore' ? 'peek' : 'half');
}

/* ---- Historia ---- */
function enterHistory(periodId) {
  S.history = true;
  $('#timebar').hidden = false;
  if (periodId) setPeriod(periodId, false);
  else setYear(S.year, false);
  M.fitPlaces(db.places.filter(p => p.category !== 'castillo' || p.id === 'castillo-san-felipe').map(p => p.id));
}
function leaveHistory(rerender = true) {
  S.history = false; stopPlay();
  if (rerender) { S.tab = 'explore'; render(); setHash('explorar'); }
}
function setYear(y, rerender = true) {
  S.year = y;
  const pe = periodForYear(y);
  const changed = pe.id !== S.periodId;
  S.periodId = pe.id;
  $('#yearSlider').value = y;
  $('#yearLabel').textContent = y;
  $('#periodLabel').textContent = L(pe.name);
  updateBands();
  if (store.addTo('periods', pe.id)) checkBadges();
  if (rerender) {
    if (changed && S.tab === 'history' && !S.placeId) { render(); setHash(`historia/${pe.id}`); }
    else renderMap();
  }
}
function setPeriod(id, rerender = true) {
  const pe = period(id);
  if (!pe) return;
  const y = Math.max(1500, Math.min(2026, pe.id === 'prehispanica' ? 1500 : pe.from));
  S.periodId = id;
  setYear(y, false);
  S.periodId = id;
  updateBands();
  if (rerender) { render(); scrollTop(); setHash(`historia/${id}`); }
}

let playTimer = null;
function togglePlay() {
  if (playTimer) return stopPlay();
  const btn = $('#playBtn');
  btn.innerHTML = '<svg aria-hidden="true"><use href="#i-pause"/></svg>';
  btn.setAttribute('aria-label', t('history.pause'));
  if (S.year >= 2026) setYear(1500);
  playTimer = setInterval(() => {
    const next = Math.min(2026, S.year + (S.year < 1850 ? 4 : 8));
    setYear(next);
    if (next >= 2026) stopPlay();
  }, 120);
}
function stopPlay() {
  if (!playTimer) return;
  clearInterval(playTimer); playTimer = null;
  const btn = $('#playBtn');
  btn.innerHTML = '<svg aria-hidden="true"><use href="#i-play"/></svg>';
  btn.setAttribute('aria-label', t('history.play'));
}

/* ---- Rutas ---- */
function startRoute(id, stopNum = 1) {
  const r = getRoute(id);
  if (!r) return;
  if (S.history) leaveHistory(false);
  S.tab = 'routes';
  S.route = r;
  S.stop = Math.max(0, Math.min(r.stops.length - 1, stopNum - 1));
  M.drawRoute(r);
  M.fitPlaces(r.stops);
  setTimeout(() => openPlace(r.stops[S.stop], { fly: false, fromRoute: true }), 250);
}
function step(d) {
  if (!S.route) return;
  S.stop = Math.max(0, Math.min(S.route.stops.length - 1, S.stop + d));
  openPlace(S.route.stops[S.stop], { fromRoute: true });
}
function finishRoute() {
  const r = S.route;
  if (store.addTo('routes', r.id)) checkBadges();
  toast(t('routes.done'));
  exitRoute(true);
}
function exitRoute(rerender = true) {
  S.route = null; S.stop = 0;
  M.clearRoute();
  if (rerender) { S.placeId = null; S.tab = 'routes'; render(); scrollTop(); setHash('rutas'); }
}

/* ---------------- Insignias ---------------- */
function checkBadges() {
  const got = store.get().badges || [];
  let newly = null;
  for (const b of db.badges) {
    if (V.badgeProgress(b).done && !got.includes(b.id)) { got.push(b.id); newly = b; }
  }
  if (newly) { store.set('badges', got); toast(`${t('badges.unlocked')} ${L(newly.name)}`); }
  updateBadgeCount();
}
function updateBadgeCount() {
  const n = db.badges.filter(b => V.badgeProgress(b).done).length;
  const el = $('#badgeCount');
  el.hidden = n === 0; el.textContent = n;
}

/* ---------------- Utilidades UI ---------------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
}

function setSheet(state) {
  if (!window.matchMedia('(max-width: 820px)').matches) return;
  panel.classList.remove('peek', 'full');
  if (state !== 'half') panel.classList.add(state);
}
function cycleSheet() {
  if (panel.classList.contains('peek')) setSheet('half');
  else if (panel.classList.contains('full')) setSheet('peek');
  else setSheet('full');
}

async function share() {
  const url = location.href;
  const p = place(S.placeId);
  try {
    if (navigator.share) { await navigator.share({ title: p ? L(p.name) : t('app.title'), url }); return; }
    await navigator.clipboard.writeText(url);
    toast(t('place.copied'));
  } catch { /* cancelado */ }
}

function listen() {
  const p = place(S.placeId);
  if (!p) return;
  if (S.speaking) { tts.stop(); S.speaking = false; render(); return; }
  const text = `${L(p.name)}. ${L(p.guide)}`;
  const ok = tts.speak(text, getLang(), {
    audioUrl: p.audio?.[getLang()] || null,
    onend: () => { S.speaking = false; const b = body.querySelector('[data-listen]'); if (b) render(); }
  });
  if (!ok) { toast(t('tts.unsupported')); return; }
  S.speaking = true;
  const b = body.querySelector('[data-listen]');
  if (b) { b.setAttribute('aria-pressed', 'true'); b.innerHTML = `<svg aria-hidden="true"><use href="#i-pause"/></svg><span>${t('place.stop')}</span>`; }
}

/* ---------------- Búsqueda ---------------- */
function wireSearch() {
  const input = $('#searchInput'), box = $('#searchResults');
  let sel = -1;
  const close = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); sel = -1; };
  const run = () => {
    const res = V.searchAll(input.value);
    if (!res) return close();
    box.innerHTML = V.searchResultsView(res);
    box.hidden = false; input.setAttribute('aria-expanded', 'true'); sel = -1;
  };
  input.addEventListener('input', run);
  input.addEventListener('focus', run);
  input.addEventListener('keydown', e => {
    const items = [...box.querySelectorAll('.sr-item')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((it, i) => it.setAttribute('aria-selected', String(i === sel)));
      items[sel].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      (items[sel] || items[0])?.click();
    } else if (e.key === 'Escape') { close(); input.blur(); }
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('.sr-item');
    if (!b) return;
    close(); input.value = ''; input.blur();
    if (b.dataset.place) { S.tab = S.tab === 'history' ? 'history' : 'explore'; openPlace(b.dataset.place); }
    else if (b.dataset.event) {
      const ev = getEvent(b.dataset.event);
      S.tab = 'history'; S.placeId = null; enterHistory(ev.period);
      setYear(Math.max(1500, ev.year), false); render(); scrollTop(); setHash(`historia/${ev.period}`);
      if (ev.places?.length) M.fitPlaces(ev.places);
    } else if (b.dataset.period) { S.tab = 'history'; S.placeId = null; enterHistory(b.dataset.period); render(); scrollTop(); setHash(`historia/${b.dataset.period}`); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.search')) close(); });
}

/* ---------------- Enrutado por hash ---------------- */
function routeFromHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [a, b, c] = parts;
  if (a === 'lugar' && place(b)) { S.tab = 'explore'; openPlace(b); return true; }
  if (a === 'historia') { S.tab = 'history'; S.placeId = null; enterHistory(period(b) ? b : S.periodId); render(); return true; }
  if (a === 'ruta' && getRoute(b)) { startRoute(b, Number(c) || 1); return true; }
  if (a === 'rutas') { openTab('routes'); return true; }
  if (a === 'fuentes') { openTab('about'); return true; }
  if (a === 'fortificaciones') { goForts(); return true; }
  if (a === 'explorar') { openTab('explore'); return true; }
  return false;
}

function goForts() {
  S.visibleCats = new Set(['castillo', 'muralla']);
  openTab('explore');
  M.fitPlaces(db.places.filter(p => S.visibleCats.has(p.category)).map(p => p.id));
  setHash('fortificaciones');
}

/* ---------------- Eventos ---------------- */
function wire() {
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
    setLang(b.dataset.lang); store.set('lang', b.dataset.lang);
  }));
  onLangChange(() => { tts.stop(); S.speaking = false; M.refreshTooltips(); buildTicks(); if (S.history) setYear(S.year, false); render(); });

  document.querySelectorAll('[role="tab"]').forEach(b => b.addEventListener('click', () => openTab(b.dataset.tab)));

  body.addEventListener('click', e => {
    const el = e.target.closest('button, a');
    if (!el) return;
    const d = el.dataset;
    if (d.place) openPlace(d.place, { fromRoute: !!(S.route && S.route.stops.includes(d.place)) });
    else if (d.cat) {
      const all = S.visibleCats.size === V.CATS.length;
      if (d.cat === '__all') S.visibleCats = new Set(V.CATS);
      else if (all) S.visibleCats = new Set([d.cat]);                 // primer toque: solo esa categoría
      else if (S.visibleCats.has(d.cat)) { S.visibleCats.delete(d.cat); if (!S.visibleCats.size) S.visibleCats = new Set(V.CATS); }
      else S.visibleCats.add(d.cat);
      render();
      const ids = db.places.filter(p => S.visibleCats.has(p.category)).map(p => p.id);
      if (S.visibleCats.size < V.CATS.length && ids.length) M.fitPlaces(ids);
    }
    else if (d.period) { S.tab = 'history'; S.placeId = null; S.history = true; setPeriod(d.period); }
    else if (d.route) startRoute(d.route);
    else if ('back' in d) closePlace();
    else if ('listen' in d) listen();
    else if ('zoom' in d) M.flyToPlace(S.placeId, { zoom: 18 });
    else if ('share' in d) share();
    else if (d.step) step(Number(d.step));
    else if ('finish' in d) finishRoute();
    else if (d.gal) galStep(Number(d.gal));
    else if (d.viewer != null) openViewer(Number(d.viewer));
  });

  $('#yearSlider').addEventListener('input', e => { stopPlay(); setYear(Number(e.target.value)); });
  $('#playBtn').addEventListener('click', togglePlay);
  $('#prevPeriodBtn').addEventListener('click', () => stepPeriod(-1));
  $('#nextPeriodBtn').addEventListener('click', () => stepPeriod(1));
  $('#timebar').addEventListener('click', e => {
    const band = e.target.closest('[data-band]');
    if (band) { stopPlay(); setPeriod(band.dataset.band); return; }
    const dot = e.target.closest('[data-ev]');
    if (dot) {
      const ev = getEvent(dot.dataset.ev); stopPlay();
      if (ev.period !== S.periodId) setPeriod(ev.period);
      setYear(ev.year);
      if (ev.places?.length) M.fitPlaces(ev.places);
      toast(`${L(ev.date)} · ${L(ev.title)}`);
    }
  });
  $('#exitHistoryBtn').addEventListener('click', () => leaveHistory(true));

  $('#homeBtn').addEventListener('click', () => M.home());
  $('#locateBtn').addEventListener('click', () => M.locate().catch(() => toast(t('map.locateErr'))));
  const layerBtn = $('#layerBtn'), layerMenu = $('#layerMenu');
  layerBtn.addEventListener('click', () => { layerMenu.hidden = !layerMenu.hidden; layerBtn.setAttribute('aria-expanded', String(!layerMenu.hidden)); });
  layerMenu.addEventListener('click', e => { const b = e.target.closest('[data-layer]'); if (b) { M.setBaseLayer(b.dataset.layer); layerMenu.hidden = true; layerBtn.setAttribute('aria-expanded', 'false'); } });

  $('#sheetHandle').addEventListener('click', cycleSheet);
  let startY = null;
  $('#sheetHandle').addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  $('#sheetHandle').addEventListener('touchend', e => {
    if (startY == null) return;
    const dy = e.changedTouches[0].clientY - startY; startY = null;
    if (Math.abs(dy) < 20) return;
    if (dy < 0) setSheet(panel.classList.contains('peek') ? 'half' : 'full');
    else setSheet(panel.classList.contains('full') ? 'half' : 'peek');
  });
  $('#map').addEventListener('mapblankclick', () => { if (window.matchMedia('(max-width: 820px)').matches) setSheet('peek'); });

  $('#brandBtn').addEventListener('click', () => { hero.hidden = false; hero.querySelector('.btn.primary').focus(); });
  hero.addEventListener('click', e => {
    const card = e.target.closest('[data-place]');
    if (card) { hero.hidden = true; store.set('heroSeen', true); M.invalidate(); S.tab = 'explore'; openPlace(card.dataset.place); return; }
    const b = e.target.closest('[data-go]');
    if (!b) return;
    hero.hidden = true; store.set('heroSeen', true);
    const go = b.dataset.go;
    if (go === 'explore') openTab('explore');
    if (go === 'history') openTab('history');
    if (go === 'routes') openTab('routes');
    if (go === 'forts') goForts();
    M.invalidate();
  });

  const modal = $('#badgesModal');
  $('#badgesBtn').addEventListener('click', () => { $('#badgesList').innerHTML = V.badgesView(); applyDom(modal); modal.showModal(); });
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) modal.close(); });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('#viewer').open) return;
    if (!hero.hidden) { hero.hidden = true; return; }
    if (S.placeId) closePlace();
  });
  window.addEventListener('hashchange', routeFromHash);
  window.addEventListener('offline', () => toast(t('ui.offline')));
  window.addEventListener('resize', () => M.invalidate());
}

const TL_MIN = 1500, TL_MAX = 2026;
const pct = y => ((Math.max(TL_MIN, Math.min(TL_MAX, y)) - TL_MIN) / (TL_MAX - TL_MIN)) * 100;
/** Línea de tiempo: bandas por época (clicables) y puntos de acontecimientos. */
function buildTicks() {
  $('#tlBands').innerHTML = db.periods.map(p => {
    const a = pct(p.id === 'prehispanica' ? TL_MIN : p.from), b = pct(p.to + 1);
    return `<button type="button" class="tl-band" data-band="${p.id}" style="left:${a}%;width:${b - a}%" title="${V.esc(L(p.name))} · ${V.esc(L(p.label))}"><span>${V.esc(L(p.short))}</span></button>`;
  }).join('');
  $('#tlEvents').innerHTML = db.events.map(ev =>
    `<button type="button" class="tl-dot" data-ev="${ev.id}" style="left:${pct(ev.year)}%" title="${V.esc(L(ev.date))} · ${V.esc(L(ev.title))}" aria-label="${V.esc(L(ev.date))}: ${V.esc(L(ev.title))}"></button>`).join('');
  updateBands();
}
function updateBands() {
  document.querySelectorAll('.tl-band').forEach(b => b.classList.toggle('on', b.dataset.band === S.periodId));
  const pe = period(S.periodId);
  if (pe) $('#periodRange').textContent = L(pe.label);
  $('#yearSlider').style.setProperty('--p', pct(S.year) + '%');
}
function stepPeriod(d) {
  const i = db.periods.findIndex(p => p.id === S.periodId);
  const next = db.periods[Math.max(0, Math.min(db.periods.length - 1, i + d))];
  if (next) { stopPlay(); setPeriod(next.id); }
}

/* ---------------- Galería de vistas ---------------- */
let galIndex = 0;
function wireGallery() {
  galIndex = 0;
  const track = body.querySelector('.gal-track');
  if (!track) return;
  const p = place(S.placeId); if (!p) return;
  const phs = photosFor(p);
  let raf;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i === galIndex) return;
      galIndex = i;
      body.querySelectorAll('.gal-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
      const cap = body.querySelector('[data-gal-cap]');
      if (cap) cap.innerHTML = V.credit(phs[i]);
      const open = body.querySelector('[data-viewer]'); if (open) open.dataset.viewer = i;
    });
  }, { passive: true });
}
function galStep(d) {
  const track = body.querySelector('.gal-track');
  if (!track) return;
  const n = track.children.length;
  const i = (galIndex + d + n) % n;
  track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
}

const viewer = { i: 0, list: [], timer: null, name: '' };
function openViewer(i = 0) {
  const p = place(S.placeId); if (!p) return;
  viewer.list = photosFor(p); viewer.name = L(p.name).split(' · ')[0];
  $('#viewerThumbs').innerHTML = viewer.list.map((x, k) => `<button type="button" data-vt="${k}" aria-label="${V.esc(L(x.angle || x.alt))}"><img src="${pexels(x.pexels, 160)}" alt=""></button>`).join('');
  $('#viewerTitle').textContent = viewer.name;
  const multi = viewer.list.length > 1;
  document.querySelectorAll('.viewer-btn, #viewerPlay').forEach(b => { b.hidden = !multi; });
  showView(i);
  $('#viewer').showModal();
}
function showView(i) {
  const n = viewer.list.length;
  viewer.i = (i + n) % n;
  const x = viewer.list[viewer.i];
  const im = $('#viewerImg');
  im.classList.add('fade');
  const src = pexels(x.pexels, window.innerWidth > 900 ? 2000 : 1200);
  const pre = new Image();
  pre.onload = pre.onerror = () => {
    im.src = src; im.alt = L(x.alt);
    im.style.animation = 'none'; void im.offsetWidth; im.style.animation = '';
    im.classList.remove('fade');
  };
  pre.src = src;
  $('#viewerBg').style.backgroundImage = `url("${pexels(x.pexels, 400)}")`;
  $('#viewerCap').innerHTML = V.credit(x);
  $('#viewerCount').textContent = n > 1 ? t('gallery.of', { i: viewer.i + 1, n }) : '';
  document.querySelectorAll('#viewerThumbs [data-vt]').forEach(b => b.setAttribute('aria-current', String(+b.dataset.vt === viewer.i)));
  document.querySelector(`#viewerThumbs [data-vt="${viewer.i}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  // Precarga la siguiente vista
  if (n > 1) new Image().src = pexels(viewer.list[(viewer.i + 1) % n].pexels, window.innerWidth > 900 ? 2000 : 1200);
}
function toggleViewerPlay(force) {
  const dlg = $('#viewer');
  const on = force ?? !viewer.timer;
  clearInterval(viewer.timer); viewer.timer = null;
  dlg.classList.toggle('playing', on);
  $('#viewerPlay').innerHTML = `<svg aria-hidden="true"><use href="#i-${on ? 'pause' : 'play'}"/></svg>`;
  $('#viewerPlay').setAttribute('aria-label', t(on ? 'gallery.pause' : 'gallery.play'));
  if (on) viewer.timer = setInterval(() => showView(viewer.i + 1), 5500);
}
function wireViewer() {
  const dlg = $('#viewer');
  dlg.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.v) { toggleViewerPlay(false); showView(viewer.i + Number(b.dataset.v)); }
    else if (b.dataset.vt) { toggleViewerPlay(false); showView(Number(b.dataset.vt)); }
    else if (b.id === 'viewerPlay') toggleViewerPlay();
    else if ('vclose' in b.dataset) dlg.close();
  });
  dlg.addEventListener('close', () => toggleViewerPlay(false));
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { toggleViewerPlay(false); showView(viewer.i + 1); }
    if (e.key === 'ArrowLeft') { toggleViewerPlay(false); showView(viewer.i - 1); }
  });
  let x0 = null;
  const stage = dlg.querySelector('.viewer-stage');
  stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) { toggleViewerPlay(false); showView(viewer.i + (dx < 0 ? 1 : -1)); }
  });
}

/* ---------------- Portada ---------------- */
function setupHero() {
  const h = db.media.hero;
  const im = $('#heroImg');
  if (h && im && !im.src) {
    const small = window.innerWidth < 700;
    im.src = pexels(h.pexels, small ? 900 : 1920);
    im.srcset = [900, 1400, 1920, 2600].map(w => `${pexels(h.pexels, w)} ${w}w`).join(', ');
    im.sizes = '100vw';
    im.onload = () => im.classList.add('loaded');
  }
  if (h) { im.alt = L(h.alt); $('#heroCredit').textContent = `${t('photo.by')}: ${h.author} / Pexels`; }
  $('#heroCards').innerHTML = V.heroCards();
}

/* ---------------- Arranque ---------------- */
async function boot() {
  try {
    await Promise.all([loadLanguages(), loadData()]);
  } catch (err) {
    console.error(err);
    body.innerHTML = `<p>${V.esc(t('ui.error'))}</p><button class="btn" type="button" onclick="location.reload()">${V.esc(t('ui.retry'))}</button>`;
    return;
  }
  const saved = store.get().lang;
  const initial = saved || ((navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en');
  if (initial !== 'es') setLang(initial); else applyDom();

  M.initMap($('#map'), { onPlaceSelect: id => openPlace(id, { fromRoute: !!(S.route && S.route.stops.includes(id)) }) });
  buildTicks();
  setupHero();
  onLangChange(setupHero);
  wire();
  wireSearch();
  wireViewer();
  render();
  setSheet('peek');
  if (location.hash && routeFromHash()) hero.hidden = true;
  else { hero.hidden = false; hero.querySelector('.btn.primary')?.focus({ preventScroll: true }); }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
