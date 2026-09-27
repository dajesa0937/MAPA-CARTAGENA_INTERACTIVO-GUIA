// Orquestación: estado de la vista, enrutado por hash (enlaces compartibles) y eventos.
import { loadData, db, pexels, photosFor, place, event as getEvent, period, route as getRoute, story as getStory, storyPlaces, periodForYear, eraFocus, eraYear } from './data.js';
import { loadLanguages, setLang, getLang, t, L, applyDom, onLangChange } from './i18n.js';
import { store } from './store.js';
import * as M from './map.js';
import * as V from './views.js';
import * as tts from './tts.js';
import { openCinema } from './cinema.js';

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
  speaking: false,
  eventId: null,
  storyId: null,     // historia temática abierta (Explorar)
  chapter: null,
  preview: null      // ruta mostrada en el mapa sin iniciarla
};

/* ---------------- Render ---------------- */
function render() {
  document.querySelectorAll('[role="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === S.tab)));
  const p = S.placeId && place(S.placeId);
  if (p) body.innerHTML = V.placeView(p, { route: S.route, stopIndex: S.stop, speaking: S.speaking });
  else if (S.storyId && getStory(S.storyId)) body.innerHTML = V.storyView(getStory(S.storyId), { chapter: S.chapter, speaking: S.speaking });
  else if (S.tab === 'history') body.innerHTML = V.historyView({ periodId: S.periodId, eventId: S.eventId, speaking: S.speaking });
  else if (S.tab === 'routes') body.innerHTML = V.routesView();
  else if (S.tab === 'about') body.innerHTML = V.aboutView();
  else body.innerHTML = V.exploreView({ visibleCats: S.visibleCats });
  $('#timebar').hidden = !S.history;
  wireGallery();
  enhanceRails(body);
  renderMap();
  updateBadgeCount();
}

function renderMap() {
  let focus = null, pulse = null;
  if (S.history) {
    const ev = S.eventId && getEvent(S.eventId);
    pulse = ev ? new Set(ev.places || []) : null;
    focus = new Set(ev && ev.places?.length ? ev.places : eraFocus(S.periodId));
  } else if (S.storyId && getStory(S.storyId)) {
    const st = getStory(S.storyId);
    const ids = storyPlaces(st);
    if (ids.length) focus = new Set(ids);
    const c = S.chapter != null ? st.chapters[S.chapter] : null;
    const cp = c ? (c.event ? getEvent(c.event)?.places : c.places) || [] : [];
    if (cp.length) { pulse = new Set(cp); focus = new Set([...(focus || []), ...cp]); }
  }
  const preStory = S.storyId && getStory(S.storyId)?.period === 'prehispanica';
  M.showWalls(preStory ? false : !S.history ? true : S.year >= 1640 ? true : S.year >= 1614 ? 'building' : false);
  M.renderMarkers({
    focus, pulse,
    visibleCats: S.history ? new Set(V.CATS) : S.visibleCats,
    year: S.history ? S.year : null,
    route: S.route || S.preview,
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
  if (S.preview) { S.preview = null; M.clearRoute(); }
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
  setHash(S.storyId ? `relato/${S.storyId}` : S.tab === 'history' ? `historia/${S.periodId}` : tabHash(S.tab));
  if (S.storyId) fitStory();
}

const tabHash = tab => ({ explore: 'explorar', history: `historia/${S.periodId}`, routes: 'rutas', about: 'fuentes' }[tab]);

function openTab(tab) {
  tts.stop(); S.speaking = false;
  if (S.route && tab !== 'routes') exitRoute(false);
  S.tab = tab;
  S.placeId = null; S.storyId = null; S.chapter = null;
  if (S.preview) { S.preview = null; M.clearRoute(); }
  if (tab === 'history') enterHistory(); else if (S.history) leaveHistory(false);
  render(); scrollTop();
  setHash(tabHash(tab));
  setSheet(tab === 'explore' ? 'peek' : 'half');
}

/* ---- Historia: relato por capítulos ---- */
function enterHistory(periodId) {
  if (S.preview) { S.preview = null; M.clearRoute(); }
  S.storyId = null; S.chapter = null;
  S.history = true;
  document.body.classList.add('history-on');
  $('#timebar').hidden = false;
  $('#eraStamp').hidden = false;
  setPeriod(periodId || S.periodId, false);
}
function leaveHistory(rerender = true) {
  S.history = false; S.eventId = null; stopPlay();
  document.body.classList.remove('history-on');
  if (S.speaking) { tts.stop(); S.speaking = false; }
  $('#eraStamp').hidden = true; $('#mapNote').hidden = true;
  if (rerender) { S.tab = 'explore'; render(); setHash('explorar'); }
}
function setYear(y, rerender = true) {
  S.year = y;
  $('#yearLabel').textContent = y <= 1532 ? '< 1533' : y;
  $('#periodLabel').textContent = L(period(S.periodId)?.name);
  if (rerender) renderMap();
}
function setPeriod(id, rerender = true, fit = true) {
  const pe = period(id);
  if (!pe) return;
  if (S.speaking) { tts.stop(); S.speaking = false; }
  S.periodId = id; S.eventId = null;
  setYear(eraYear(pe), false);
  updateSteps();
  if (store.addTo('periods', id)) checkBadges();
  const focus = eraFocus(id);
  $('#mapNote').textContent = t('story.noCity');
  $('#mapNote').hidden = focus.length > 0;
  if (rerender) { render(); scrollTop(); setHash(`historia/${id}`); } else renderMap();
  if (fit) { if (focus.length) M.fitPlaces(focus); else M.home(); }
}
function selectEvent(id) {
  const ev = getEvent(id);
  if (!ev) return;
  stopPlay();
  if (ev.period !== S.periodId) { setPeriod(ev.period, true, false); }
  S.eventId = S.eventId === id ? null : id;           // segundo toque: vuelve a la vista de la época
  const e2 = S.eventId && getEvent(S.eventId);
  setYear(e2 ? Math.max(1500, e2.year) : eraYear(period(S.periodId)), false);
  body.querySelectorAll('.moment').forEach(b => b.classList.toggle('on', b.dataset.event === S.eventId));
  renderMap();
  const ids = e2?.places?.length ? e2.places : eraFocus(S.periodId);
  if (ids.length) M.fitPlaces(ids, { maxZoom: e2 ? 16 : 17 });
  if (e2 && window.matchMedia('(max-width: 820px)').matches) { setSheet('peek'); toast(`${L(e2.date)} · ${L(e2.title)}`); }
}
function stepPeriod(d) {
  const i = db.periods.findIndex(p => p.id === S.periodId);
  const next = db.periods[i + d];
  if (next) setPeriod(next.id);
}
function buildSteps() {
  $('#tlSteps').innerHTML = db.periods.map(p => `<li><button type="button" class="step" data-band="${p.id}" title="${V.esc(L(p.name))} · ${V.esc(L(p.label))}">
      <span class="s-dot"></span><span class="s-year">${p.id === 'prehispanica' ? V.esc(t('story.before')) : p.id === 'hoy' ? 2026 : p.from}</span><span class="s-name">${V.esc(L(p.short))}</span>
    </button></li>`).join('');
  updateSteps();
}
function updateSteps() {
  const idx = db.periods.findIndex(p => p.id === S.periodId);
  document.querySelectorAll('#tlSteps .step').forEach((b, i) => {
    b.classList.toggle('on', i === idx); b.classList.toggle('past', i < idx);
    if (i === idx) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  const on = document.querySelector('#tlSteps .step.on');
  const ol = $('#tlSteps');
  if (on && ol) ol.scrollTo({ left: on.parentElement.offsetLeft - ol.clientWidth / 2 + on.parentElement.clientWidth / 2, behavior: 'smooth' });
}

let playTimer = null;
function togglePlay() {
  if (playTimer) return stopPlay();
  const btn = $('#playBtn');
  btn.classList.add('playing');
  btn.innerHTML = '<svg aria-hidden="true"><use href="#i-pause"/></svg>';
  btn.setAttribute('aria-label', t('story.pause'));
  const last = db.periods[db.periods.length - 1].id;
  if (S.periodId === last) setPeriod(db.periods[0].id);
  playTimer = setInterval(() => {
    const i = db.periods.findIndex(p => p.id === S.periodId);
    if (i >= db.periods.length - 1) return stopPlay();
    setPeriod(db.periods[i + 1].id);
  }, 9000);
}
function stopPlay() {
  if (!playTimer) return;
  clearInterval(playTimer); playTimer = null;
  const btn = $('#playBtn');
  btn.classList.remove('playing');
  btn.innerHTML = '<svg aria-hidden="true"><use href="#i-play"/></svg>';
  btn.setAttribute('aria-label', t('story.play'));
}
function listenEra() {
  const pe = period(S.periodId);
  if (S.speaking) { tts.stop(); S.speaking = false; render(); return; }
  stopPlay();
  const ok = tts.speak(`${L(pe.name)}. ${L(pe.label)}. ${L(pe.summary)}`, getLang(), { onend: () => { S.speaking = false; if (S.tab === 'history' && !S.placeId) render(); } });
  if (!ok) return toast(t('tts.unsupported'));
  S.speaking = true;
  const b = body.querySelector('[data-listen-era]');
  if (b) { b.setAttribute('aria-pressed', 'true'); b.innerHTML = `<svg aria-hidden="true"><use href="#i-pause"/></svg><span>${t('place.stop')}</span>`; }
}

/* ---- Historias temáticas (Explorar) ---- */
function fitStory() {
  const st = getStory(S.storyId); if (!st) return;
  const ids = storyPlaces(st);
  if (ids.length) M.fitPlaces(ids, { maxZoom: 16 }); else M.home();
}
function openStory(id) {
  const st = getStory(id); if (!st) return;
  tts.stop(); S.speaking = false;
  if (S.route) exitRoute(false);
  if (S.history) leaveHistory(false);
  if (S.preview) { S.preview = null; M.clearRoute(); }
  S.tab = 'explore'; S.placeId = null; S.storyId = id; S.chapter = null;
  render(); scrollTop();
  setHash(`relato/${id}`);
  setSheet('half');
  fitStory();
}
function closeStory() {
  tts.stop(); S.speaking = false;
  S.storyId = null; S.chapter = null;
  render(); scrollTop(); setHash('explorar');
}
function selectChapter(k) {
  const st = getStory(S.storyId); if (!st) return;
  S.chapter = S.chapter === k ? null : k;
  body.querySelectorAll('[data-schapter]').forEach(b => b.classList.toggle('on', Number(b.dataset.schapter) === S.chapter));
  renderMap();
  const c = S.chapter != null ? st.chapters[S.chapter] : null;
  const ids = c ? (c.event ? getEvent(c.event)?.places : c.places) || [] : [];
  if (ids.length) {
    M.fitPlaces(ids, { maxZoom: 16 });
    if (window.matchMedia('(max-width: 820px)').matches) { setSheet('peek'); const e = c.event && getEvent(c.event); toast(e ? `${L(e.date)} · ${L(e.title)}` : L(c.title)); }
  } else if (S.chapter == null) fitStory();
}
function listenStory() {
  const st = getStory(S.storyId); if (!st) return;
  if (S.speaking) { tts.stop(); S.speaking = false; render(); return; }
  const parts = st.chapters.map(c => { const e = c.event && getEvent(c.event); return e ? `${e.year}. ${L(e.title)}. ${L(e.text)}` : `${L(c.label)}. ${L(c.title)}. ${L(c.text)}`; });
  const ok = tts.speak(`${L(st.title)}. ${L(st.intro)} ${parts.join(' ')}`, getLang(), { onend: () => { S.speaking = false; if (S.storyId && !S.placeId) render(); } });
  if (!ok) return toast(t('tts.unsupported'));
  S.speaking = true;
  const b = body.querySelector('[data-listen-story]');
  if (b) { b.setAttribute('aria-pressed', 'true'); b.innerHTML = `<svg aria-hidden="true"><use href="#i-pause"/></svg><span>${t('place.stop')}</span>`; }
}
function previewRoute(id) {
  const r = getRoute(id); if (!r) return;
  S.preview = r;
  M.drawRoute(r); renderMap();
  M.fitPlaces(r.stops, { maxZoom: 16 });
  setSheet('peek');
}
function toggleScene(btn) {
  const sc = btn.closest('[data-scene]'); if (!sc) return;
  const paused = sc.classList.toggle('paused');
  btn.innerHTML = `<svg aria-hidden="true"><use href="#i-${paused ? 'play' : 'pause'}"/></svg>`;
  btn.setAttribute('aria-label', t(paused ? 'scene.play' : 'scene.pause'));
}

function startCinema(id) {
  tts.stop(); S.speaking = false;
  stopPlay?.();
  openCinema(id, { onClose: storyId => {
    // al salir, el visitante queda en la última historia que estaba viendo, con su mapa
    if (storyId && storyId !== S.storyId && !S.route) openStory(storyId);
  } });
}

/* ---- Rutas ---- */
function startRoute(id, stopNum = 1) {
  const r = getRoute(id);
  if (!r) return;
  if (S.history) leaveHistory(false);
  S.tab = 'routes'; S.storyId = null; S.chapter = null; S.preview = null;
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
    if (b.dataset.story) openStory(b.dataset.story);
    else if (b.dataset.place) { S.tab = S.tab === 'history' ? 'history' : 'explore'; openPlace(b.dataset.place); }
    else if (b.dataset.event) {
      const ev = getEvent(b.dataset.event);
      S.tab = 'history'; S.placeId = null; S.storyId = null; enterHistory(ev.period); render(); scrollTop(); setHash(`historia/${ev.period}`);
      selectEvent(ev.id);
    } else if (b.dataset.period) { S.tab = 'history'; S.placeId = null; S.storyId = null; enterHistory(b.dataset.period); render(); scrollTop(); setHash(`historia/${b.dataset.period}`); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.search')) close(); });
}

/* ---------------- Enrutado por hash ---------------- */
function routeFromHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [a, b, c] = parts;
  if (a === 'relato' && getStory(b)) { openStory(b); return true; }
  if (a === 'lugar' && place(b)) { if (S.history) leaveHistory(false); S.tab = 'explore'; openPlace(b); return true; }
  if (a === 'historia') { if (S.route) exitRoute(false); S.tab = 'history'; S.placeId = null; enterHistory(period(b) ? b : S.periodId); render(); scrollTop(); return true; }
  if (a === 'ruta' && getRoute(b)) { if (S.history) leaveHistory(false); startRoute(b, Number(c) || 1); return true; }
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
  onLangChange(() => { tts.stop(); S.speaking = false; M.refreshTooltips(); buildSteps(); if (S.history) setYear(S.year, false); render(); });

  document.querySelectorAll('[role="tab"]').forEach(b => b.addEventListener('click', () => openTab(b.dataset.tab)));

  body.addEventListener('click', e => {
    const el = e.target.closest('button, a');
    if (!el) return;
    const d = el.dataset;
    if (d.cinema) startCinema(d.cinema);
    else if ('sceneToggle' in d) toggleScene(el);
    else if (d.story) openStory(d.story);
    else if ('backExplore' in d) closeStory();
    else if (d.schapter != null) selectChapter(Number(d.schapter));
    else if ('listenStory' in d) listenStory();
    else if (d.preview) previewRoute(d.preview);
    else if (d.place) openPlace(d.place, { fromRoute: !!(S.route && S.route.stops.includes(d.place)) });
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
    else if (d.period) { tts.stop(); S.speaking = false; S.tab = 'history'; S.placeId = null; S.storyId = null; enterHistory(d.period); render(); scrollTop(); setHash(`historia/${d.period}`); }
    else if (d.route) startRoute(d.route, Number(d.stopn) || 1);
    else if ('back' in d) closePlace();
    else if ('listen' in d) listen();
    else if ('zoom' in d) M.flyToPlace(S.placeId, { zoom: 18 });
    else if ('share' in d) share();
    else if (d.step) step(Number(d.step));
    else if ('finish' in d) finishRoute();
    else if (d.event) selectEvent(d.event);
    else if (d.eraStep) { stopPlay(); stepPeriod(Number(d.eraStep)); }
    else if ('listenEra' in d) listenEra();
    else if (d.gal) galStep(Number(d.gal));
    else if (d.viewer != null) openViewer(Number(d.viewer));
  });

  $('#playBtn').addEventListener('click', togglePlay);
  $('#tlSteps').addEventListener('click', e => {
    const b = e.target.closest('[data-band]');
    if (b) { stopPlay(); setPeriod(b.dataset.band); }
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
    if (go === 'cinema') { openTab('explore'); startCinema(db.stories[0].id); }
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

/* ---------------- Carruseles: flechas + arrastre con el ratón ---------------- */
function enhanceRails(root) {
  root.querySelectorAll('.carousel, .hero-cards').forEach(track => {
    if (track.parentElement.classList.contains('rail')) return;
    const rail = document.createElement('div');
    rail.className = 'rail';
    track.replaceWith(rail); rail.appendChild(track);
    const mk = dir => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = `rail-btn ${dir < 0 ? 'prev' : 'next'}`;
      b.setAttribute('aria-label', t(dir < 0 ? 'gallery.prev' : 'gallery.next'));
      b.innerHTML = '<svg aria-hidden="true"><use href="#i-back"/></svg>';
      b.addEventListener('click', e => { e.stopPropagation(); track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' }); });
      rail.appendChild(b); return b;
    };
    const prev = mk(-1), next = mk(1);
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 4;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= max;
      rail.classList.toggle('at-end', track.scrollLeft >= max);
    };
    track.addEventListener('scroll', update, { passive: true });
    requestAnimationFrame(update);
    // Arrastrar con el ratón (en táctil ya funciona el deslizamiento nativo)
    let x0 = null, s0 = 0, moved = false;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      x0 = e.clientX; s0 = track.scrollLeft; moved = false;
    });
    track.addEventListener('pointermove', e => {
      if (x0 == null) return;
      const dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('dragging'); track.setPointerCapture(e.pointerId); }
      if (moved) track.scrollLeft = s0 - dx;
    });
    const end = () => {
      if (x0 == null) return;
      x0 = null;
      if (!moved) return;
      track.classList.remove('dragging');
      // el clic que sigue a un arrastre no debe abrir la tarjeta
      const block = ev => { ev.stopPropagation(); ev.preventDefault(); };
      track.addEventListener('click', block, { capture: true, once: true });
      setTimeout(() => track.removeEventListener('click', block, { capture: true }), 80);
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
  });
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
  const hc = $('#heroCards');
  hc.innerHTML = V.heroCards();
  enhanceRails(hc.parentElement);
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
  buildSteps();
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
