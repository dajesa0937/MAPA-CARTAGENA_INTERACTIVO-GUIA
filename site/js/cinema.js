// Modo cine: las historias a pantalla completa, con fotos en movimiento lento (Ken Burns),
// subtítulos, narración opcional y la siguiente historia en cuenta regresiva.
// El contenido sale de los mismos datos verificados (stories.json → events.json / places.json).
import { db, event, place, period, pexels, photoUrl, photoKey, photoSite, photosFor } from './data.js';
import { t, L, getLang } from './i18n.js';
import { sceneHtml } from './scenes.js';
import * as tts from './tts.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ico = n => `<svg aria-hidden="true"><use href="#i-${n}"/></svg>`;
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COUNTDOWN = 6;

let el = null;            // contenedor
let st = null;            // estado de la sesión
let onCloseCb = null;

/* ---------- Guion: de una historia a una lista de escenas ---------- */
function specificPhotos(ids) {
  const out = [];
  ids.map(place).filter(Boolean).forEach(p => (p.photos || []).forEach(ph => out.push({ ...ph, specific: ph.specific !== false, place: p })));
  return out;
}
function buildSlides(story) {
  const used = new Set();
  const cover = story.cover ? { ...story.cover, specific: false } : null;
  const periodSlides = story.slides ? (period('hoy')?.slides || []) : [];
  const pick = ids => {
    const all = specificPhotos(ids);
    return all.find(ph => !used.has(photoKey(ph)) && ph.specific) || all.find(ph => !used.has(photoKey(ph))) || null;
  };
  const slides = [];
  // 1. Portada
  const first = story.scene ? null : (periodSlides[0] || cover);
  if (first) used.add(photoKey(first));
  slides.push({ kind: 'title', scene: story.scene || null, photo: first,
    kicker: L(story.kicker), title: L(story.title), text: L(story.teaser), speak: `${L(story.title)}. ${L(story.intro)}` });
  // 2. Capítulos
  story.chapters.forEach((c, i) => {
    const e = c.event ? event(c.event) : null;
    const ids = e ? (e.places || []) : (c.places || []);
    let photo = pick(ids);
    if (!photo && periodSlides.length) photo = periodSlides.find(s => !used.has(photoKey(s))) || null;
    if (!photo && !story.scene && cover) photo = cover;
    if (photo) used.add(photoKey(photo));
    const kicker = e ? L(e.date) : L(c.label);
    const title = e ? L(e.title) : L(c.title);
    const text = e ? L(e.text) : L(c.text);
    slides.push({ kind: 'chapter', scene: photo ? null : story.scene, photo, kicker, title, text, speak: `${title}. ${text}`,
      placeName: photo?.place ? L(photo.place.name).split(' · ')[0] : '' });
  });
  // 3. Lugares de hoy (solo «Cartagena hoy»): cada playa u obra con su foto
  if (story.tourism) {
    (story.places || []).map(place).filter(Boolean).forEach(p => {
      const ph = photosFor(p).find(x => !used.has(photoKey(x))) || photosFor(p)[0];
      if (!ph) return;
      used.add(photoKey(ph));
      slides.push({ kind: 'place', photo: ph, kicker: t('cat.hoy'), title: L(p.name), text: L(p.guide), speak: `${L(p.name)}. ${L(p.guide)}`, placeName: '' });
    });
  }
  return slides;
}
const durationOf = s => s.kind === 'sky' ? 8000 : s.kind === 'title' ? 6500 : Math.max(7000, Math.min(13000, 3800 + s.text.length * 42));

/* ---------- Interfaz ---------- */
function ensureEl() {
  if (el) return el;
  el = document.createElement('div');
  el.className = 'cinema';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.hidden = true;
  el.innerHTML = `
    <div class="cn-stage"><div class="cn-layer" data-l="0"></div><div class="cn-layer" data-l="1"></div></div>
    <div class="cn-shade"></div>
    <header class="cn-top">
      <div class="cn-bars"></div>
      <div class="cn-row">
        <div class="cn-name"><small></small><strong></strong></div>
        <div class="cn-ctrls">
          <button type="button" class="cn-btn" data-cn="voice" aria-pressed="false">${ico('sound')}<span></span></button>
          <button type="button" class="cn-btn icon" data-cn="pause"></button>
          <button type="button" class="cn-btn icon" data-cn="close">${ico('close')}</button>
        </div>
      </div>
    </header>
    <button type="button" class="cn-tap prev" data-cn="prev"></button>
    <button type="button" class="cn-tap next" data-cn="next"></button>
    <div class="cn-cap" aria-live="polite"></div>
    <div class="cn-credit"></div>
    <div class="cn-next" hidden></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', onClick);
  let x0 = null;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) { e.preventDefault(); go(dx < 0 ? 1 : -1); }
  });
  document.addEventListener('keydown', e => {
    if (!st || el.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === ' ') { e.preventDefault(); togglePause(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && st && !st.paused) togglePause(); });
  return el;
}

function labels() {
  el.setAttribute('aria-label', t('cinema.title'));
  el.querySelector('[data-cn="close"]').setAttribute('aria-label', t('ui.close'));
  el.querySelector('[data-cn="prev"]').setAttribute('aria-label', t('cinema.prev'));
  el.querySelector('[data-cn="next"]').setAttribute('aria-label', t('cinema.next'));
  el.querySelector('[data-cn="voice"] span').textContent = t('cinema.voice');
  el.querySelector('[data-cn="voice"]').setAttribute('aria-pressed', String(st.voice));
  paintPause();
}
function paintPause() {
  const b = el.querySelector('[data-cn="pause"]');
  b.innerHTML = ico(st.paused ? 'play' : 'pause');
  b.setAttribute('aria-label', t(st.paused ? 'cinema.play' : 'cinema.pause'));
  el.classList.toggle('paused', st.paused);
}

function onClick(e) {
  const b = e.target.closest('[data-cn]');
  if (!b) return;
  const a = b.dataset.cn;
  if (a === 'close') close();
  else if (a === 'pause') togglePause();
  else if (a === 'prev') go(-1);
  else if (a === 'next') go(1);
  else if (a === 'voice') toggleVoice();
  else if (a === 'now') startStory(st.storyIdx + 1);
  else if (a === 'again') startStory(0);
  else if (a === 'map') close();
}

/* ---------- Reproducción ---------- */
export function openCinema(storyId, { onClose } = {}) {
  ensureEl();
  onCloseCb = onClose || null;
  tts.stop();
  const idx = Math.max(0, db.stories.findIndex(s => s.id === storyId));
  st = { intro: true, storyIdx: idx, slides: [], i: 0, timer: null, t0: 0, left: 0, paused: false, voice: st?.voice || false, token: 0, cd: null };
  el.hidden = false;
  document.body.classList.add('cinema-on');
  labels();
  startStory(idx);
  el.querySelector('[data-cn="pause"]').focus({ preventScroll: true });
}

function startStory(idx) {
  clearTimers();
  if (idx >= db.stories.length) return finale();
  st.storyIdx = idx;
  const story = db.stories[idx];
  st.story = story;
  st.slides = buildSlides(story);
  // Apertura de la sesión: Cartagena desde el cielo (vista aérea con paneo lento)
  if (st.intro) {
    st.intro = false;
    (db.media.sky || []).slice(0, 2).forEach((ph, k) => st.slides.unshift({ kind: 'sky', photo: { ...ph, specific: true },
      kicker: t('cinema.sky'), title: k === 0 ? t('hero.title') : L(ph.alt), text: k === 0 ? t('cinema.skyText') : '', speak: k === 0 ? `${t('cinema.sky')}. ${t('cinema.skyText')}` : L(ph.alt), placeName: '' }));
    if ((db.media.sky || []).length > 1) st.slides.splice(0, 2, st.slides[1], st.slides[0]);
  }
  st.i = 0;
  el.querySelector('.cn-next').hidden = true;
  el.querySelector('.cn-name small').textContent = t('cinema.storyOf', { i: idx + 1, n: db.stories.length });
  el.querySelector('.cn-name strong').textContent = L(story.title);
  el.querySelector('.cn-bars').innerHTML = st.slides.map(() => '<i><b></b></i>').join('');
  el.style.setProperty('--accent-story', story.accent || '#c2553a');
  show(0);
}

let layer = 0;
function show(i) {
  clearTimers();
  st.i = i;
  const s = st.slides[i];
  const dur = durationOf(s);
  st.left = dur;
  // imagen / escena en la capa alterna, con fundido
  layer = 1 - layer;
  const L0 = el.querySelector(`.cn-layer[data-l="${layer}"]`), L1 = el.querySelector(`.cn-layer[data-l="${1 - layer}"]`);
  const kb = s.kind === 'sky' ? 'kb-pan' : ['kb-a', 'kb-b', 'kb-c', 'kb-d'][(st.storyIdx + i) % 4];
  if (s.photo) {
    const w = window.innerWidth > 900 ? 1920 : 1100;
    L0.innerHTML = `<img class="${reduce() ? '' : kb}" style="--dur:${dur + 1500}ms" src="${photoUrl(s.photo, w)}" alt="${esc(L(s.photo.alt))}">`;
  } else if (s.scene) {
    L0.innerHTML = sceneHtml(s.scene);
  } else L0.innerHTML = '';
  L0.classList.add('on'); L1.classList.remove('on');
  // precarga de la siguiente foto
  const nx = st.slides[i + 1];
  if (nx?.photo) new Image().src = photoUrl(nx.photo, window.innerWidth > 900 ? 1920 : 1100);
  // subtítulo
  const cap = el.querySelector('.cn-cap');
  cap.classList.toggle('is-title', s.kind === 'title' || (s.kind === 'sky' && !!s.text));
  cap.innerHTML = `<span class="cn-kicker">${esc(s.kicker)}</span>
    <h2>${esc(s.title)}</h2>
    <p>${esc(s.text)}</p>
    ${s.placeName ? `<span class="cn-place">${ico('map')}${esc(s.placeName)}</span>` : ''}`;
  cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
  // crédito honesto de la imagen
  const cr = el.querySelector('.cn-credit');
  if (s.photo) cr.textContent = `${s.photo.specific === false ? t('photo.illustrative') + ' · ' : ''}${t('photo.by')}: ${s.photo.author} / ${photoSite(s.photo)}${s.photo.license ? ' · ' + s.photo.license : ''}`;
  else if (s.scene) cr.textContent = t(s.scene === 'prehispanica' ? 'scene.artistic' : 'scene.illustration');
  else cr.textContent = '';
  // barras de progreso
  el.querySelectorAll('.cn-bars i').forEach((bar, k) => {
    bar.className = k < i ? 'done' : k === i ? 'now' : '';
    bar.firstChild.style.animationDuration = `${dur}ms`;
  });
  const now = el.querySelector('.cn-bars i.now b');
  if (now) { now.style.animation = 'none'; void now.offsetWidth; now.style.animation = ''; }
  st.paused = false; paintPause();
  run();
}

function run() {
  const s = st.slides[st.i];
  const token = ++st.token;
  st.t0 = performance.now();
  let timeUp = false, spoken = !st.voice;
  const tryNext = () => { if (token === st.token && timeUp && spoken) go(1); };
  st.timer = setTimeout(() => { timeUp = true; tryNext(); }, st.left);
  if (st.voice) {
    const ok = tts.speak(s.speak, getLang(), { onend: () => { if (token !== st.token) return; spoken = true; setTimeout(tryNext, 900); } });
    if (!ok) spoken = true;
  }
}

function clearTimers() {
  if (!st) return;
  st.token++;
  clearTimeout(st.timer); st.timer = null;
  clearInterval(st.cd); st.cd = null;
  tts.stop();
}

function go(d) {
  if (!st) return;
  if (!el.querySelector('.cn-next').hidden) { if (d > 0) startStory(st.storyIdx + 1); else startStory(st.storyIdx); return; }
  const j = st.i + d;
  if (j < 0) { if (st.storyIdx > 0) startStory(st.storyIdx - 1); else show(0); return; }
  if (j >= st.slides.length) return upNext();
  show(j);
}

function togglePause() {
  if (!st || !el.querySelector('.cn-next').hidden) return;
  st.paused = !st.paused;
  if (st.paused) {
    st.left = Math.max(1200, st.left - (performance.now() - st.t0));
    st.token++; clearTimeout(st.timer); tts.stop();
  } else run();
  paintPause();
}

function toggleVoice() {
  st.voice = !st.voice;
  if (!tts.ttsSupported() && st.voice) { st.voice = false; }
  el.querySelector('[data-cn="voice"]').setAttribute('aria-pressed', String(st.voice));
  if (!st.paused && el.querySelector('.cn-next').hidden) { st.left = Math.max(2500, st.left - (performance.now() - st.t0)); st.token++; clearTimeout(st.timer); tts.stop(); run(); }
}

/* ---------- Siguiente historia (cuenta regresiva) y final ---------- */
function upNext() {
  clearTimers();
  const next = db.stories[st.storyIdx + 1];
  if (!next) return finale();
  const box = el.querySelector('.cn-next');
  const cov = next.cover ? `<img src="${pexels(next.cover.pexels, 700)}" alt="">` : next.scene ? sceneHtml(next.scene, { thumb: true }) : '';
  box.innerHTML = `<div class="cn-card">
      <span class="cn-kicker">${esc(t('cinema.upNext'))}</span>
      <div class="cn-thumb">${cov}<span class="cn-ring"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/></svg><b>${COUNTDOWN}</b></span></div>
      <small>${esc(L(next.kicker))}</small>
      <h3>${esc(L(next.title))}</h3>
      <p>${esc(L(next.teaser))}</p>
      <div class="cn-actions">
        <button type="button" class="btn primary" data-cn="now">${ico('play')}${esc(t('cinema.watchNow'))}</button>
        <button type="button" class="btn glass" data-cn="map">${esc(t('cinema.toMap'))}</button>
      </div>
    </div>`;
  box.hidden = false;
  el.querySelectorAll('.cn-bars i').forEach(b => { b.className = 'done'; });
  let n = COUNTDOWN;
  const ring = box.querySelector('.cn-ring');
  ring.style.setProperty('--cd', `${COUNTDOWN}s`);
  ring.classList.add('go');
  st.cd = setInterval(() => {
    n -= 1;
    const b = box.querySelector('.cn-ring b'); if (b) b.textContent = Math.max(0, n);
    if (n <= 0) { clearInterval(st.cd); st.cd = null; startStory(st.storyIdx + 1); }
  }, 1000);
  box.querySelector('[data-cn="now"]').focus({ preventScroll: true });
}

function finale() {
  clearTimers();
  const box = el.querySelector('.cn-next');
  box.innerHTML = `<div class="cn-card end">
      <span class="cn-kicker">${esc(t('cinema.endKicker'))}</span>
      <h3>${esc(t('cinema.endTitle'))}</h3>
      <p>${esc(t('cinema.endText'))}</p>
      <div class="cn-actions">
        <button type="button" class="btn primary" data-cn="map">${ico('map')}${esc(t('cinema.toMap'))}</button>
        <button type="button" class="btn glass" data-cn="again">${ico('play')}${esc(t('cinema.again'))}</button>
      </div>
    </div>`;
  box.hidden = false;
}

export function close() {
  if (!st) return;
  clearTimers();
  el.hidden = true;
  document.body.classList.remove('cinema-on');
  el.querySelectorAll('.cn-layer').forEach(l => { l.innerHTML = ''; l.classList.remove('on'); });
  const storyId = st.story?.id;
  st.storyIdx = 0;
  const cb = onCloseCb; onCloseCb = null;
  cb?.(storyId);
}

export function cinemaMinutes() {
  let ms = 0;
  db.stories.forEach(s => buildSlides(s).forEach(x => { ms += durationOf(x); }));
  return Math.round(ms / 60000);
}
