// Vistas del panel: devuelven HTML a partir de los datos. Sin lógica de estado.
import { db, place, event, period, source, routeStats, existsIn, pexels, photoFor, photosFor } from './data.js';
import { t, L, getLang, formatDate } from './i18n.js';
import { store } from './store.js';
import { catColor } from './map.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const CATS = ['castillo', 'muralla', 'iglesia', 'museo', 'plaza', 'monumento', 'cultura', 'barrio'];

const ico = (name, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const certPill = c => `<span class="pill cert-${esc(c)}" title="${esc(t(`cert.${c}.d`))}">${esc(t(`cert.${c}`))}</span>`;

/* ---------- Fotos ---------- */
export function img(ph, w, cls = '', sizes = '') {
  if (!ph) return '';
  const srcset = [Math.round(w / 2), w, w * 2].map(x => `${pexels(ph.pexels, x)} ${x}w`).join(', ');
  return `<img class="${cls}" src="${pexels(ph.pexels, w)}" srcset="${srcset}" ${sizes ? `sizes="${sizes}"` : ''} alt="${esc(L(ph.alt))}" loading="lazy" decoding="async">`;
}
export function credit(ph) {
  if (!ph) return '';
  const angle = ph.angle ? `<strong>${esc(L(ph.angle))}</strong> · ` : '';
  return `${angle}${ph.specific === false ? esc(t('photo.illustrative')) + ' · ' : ''}${esc(t('photo.by'))}: ${esc(ph.author)} / Pexels`;
}
const FEATURED = ['castillo-san-felipe', 'puerta-del-reloj', 'las-bovedas', 'getsemani', 'catedral', 'san-pedro-claver', 'baluarte-santo-domingo', 'convento-popa', 'fuerte-san-fernando'];

export function card(p, { size = 'md' } = {}) {
  const ph = photoFor(p);
  const visited = store.has('visited', p.id) ? `<span class="card-vis" title="${esc(t('place.visited'))}">✓</span>` : '';
  return `<button class="card card-${size}" type="button" data-place="${esc(p.id)}">
    ${img(ph, size === 'lg' ? 480 : 360, 'card-img', size === 'lg' ? '240px' : '180px')}
    <span class="card-shade"></span>
    <span class="card-cat" style="--cc:${catColor(p.category)}">${ico(p.category)}${esc(t(`cat.${p.category}`))}</span>
    ${visited}
    ${(p.photos?.length || 0) > 1 ? `<span class="card-views">${ico('layers')}${esc(t('gallery.views', { n: p.photos.length }))}</span>` : ''}
    <span class="card-body"><strong>${esc(L(p.name).split(' · ')[0])}</strong><small>${esc(L(p.dates))}</small></span>
  </button>`;
}

export function heroCards() {
  return FEATURED.map(place).filter(Boolean).slice(0, 8).map(p => card(p, { size: 'lg' })).join('');
}

function placeItem(p, extra = '') {
  const visited = store.has('visited', p.id) ? `<span class="vis" title="${esc(t('place.visited'))}">●</span>` : '';
  return `<li><button class="pitem" type="button" data-place="${esc(p.id)}">
    <span class="pico" style="background:${catColor(p.category)}">${ico(p.category)}</span>
    <span><strong>${esc(L(p.name))}</strong><small>${esc(t(`cat.${p.category}`))}${extra ? ' · ' + extra : ''}</small></span>${visited}
  </button></li>`;
}

/* ---------- Explorar ---------- */
export function exploreView({ visibleCats }) {
  const all = visibleCats.size === CATS.length;
  const chips = CATS.filter(c => db.places.some(p => p.category === c)).map(c => `
    <button type="button" class="chip" data-cat="${c}" aria-pressed="${!all && visibleCats.has(c)}">
      <span class="dot" style="background:${catColor(c)}"></span>${esc(t(`cat.${c}`))}</button>`).join('');
  const places = db.places
    .filter(p => visibleCats.has(p.category))
    .sort((a, b) => CATS.indexOf(a.category) - CATS.indexOf(b.category) || L(a.name).localeCompare(L(b.name)));
  const featured = FEATURED.map(place).filter(p => p && visibleCats.has(p.category));
  return `<div class="anim">
    ${featured.length ? `<h3 class="st st-top">${esc(t('explore.featured'))}</h3>
    <div class="carousel" role="list">${featured.map(p => `<div role="listitem">${card(p)}</div>`).join('')}</div>` : ''}
    <h2 class="pt">${esc(t('hero.explore'))}</h2>
    <p class="lead">${esc(t('explore.intro'))}</p>
    <div class="chips">
      <button type="button" class="chip" data-cat="__all" aria-pressed="${all}">${esc(t('filters.all'))}</button>
      ${chips}
    </div>
    <h3 class="st">${esc(t('explore.count', { n: places.length }))}</h3>
    <div class="grid">${places.map(p => card(p, { size: 'sm' })).join('')}</div>
  </div>`;
}

/* ---------- Ficha de lugar ---------- */
export function placeView(p, { route, stopIndex, speaking }) {
  const lang = getLang();
  const acc = p.loc?.accuracy || 'approx';
  const ph = photoFor(p);
  const phs = photosFor(p);
  const hist = (L(p.history) || []).map(par => `<p>${esc(par)}</p>`).join('');
  const people = (p.people || []).length ? `<div><h4>${esc(t('place.people'))}</h4><p>${esc(p.people.join(' · '))}</p></div>` : '';
  const periods = (p.periods || []).map(id => period(id)).filter(Boolean)
    .map(pe => `<button type="button" class="chip" data-period="${esc(pe.id)}">${esc(L(pe.name))}</button>`).join('');
  const events = (p.events || []).map(event).filter(Boolean).sort((a, b) => a.year - b.year).map(e => `
    <li><span class="ev-date">${esc(L(e.date))}</span><div class="ev-title">${esc(L(e.title))}</div><p>${esc(L(e.text))}</p></li>`).join('');
  const sources = (p.sources || []).map(source).filter(Boolean).map(s => `
    <li><span class="src-type">${esc(t(`about.type.${s.type}`))}</span><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> — ${esc(s.org)}</li>`).join('');
  const visit = p.visit ? `
    <h3 class="st">${esc(t('place.visit'))}</h3>
    <div class="visit"><p style="margin:0">${esc(L(p.visit))}</p>
      <small>${esc(t('place.visitWarn', { date: formatDate(p.visit.checked) }))} · <a href="${esc(source(p.visit.source)?.url)}" target="_blank" rel="noopener">${esc(source(p.visit.source)?.org || '')}</a></small></div>` : '';
  const note = p.note ? `<div class="note"><strong>${esc(t('place.note'))}</strong>${esc(L(p.note))}</div>` : '';
  const commons = `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(L(p.name).split('·')[0].trim() + ' Cartagena')}&title=Special:MediaSearch&type=image`;

  let stepper = '';
  if (route) {
    const n = route.stops.length, i = stopIndex + 1;
    stepper = `<div class="stepper">
      <button class="btn small ghost" type="button" data-step="-1" ${i === 1 ? 'disabled' : ''}>${esc(t('routes.prev'))}</button>
      <div class="grow"><div>${esc(L(route.name))} · ${esc(t('routes.stop', { i, n }))}</div><div class="progress"><i style="width:${(i / n) * 100}%"></i></div></div>
      ${i < n
        ? `<button class="btn small primary" type="button" data-step="1">${esc(t('routes.next'))}</button>`
        : `<button class="btn small primary" type="button" data-finish>${esc(t('routes.finish'))}</button>`}
    </div>`;
  }

  return `<article class="anim" lang="${lang}">
    <figure class="cover ${ph ? 'has-photo' : ''}" style="--cc:${catColor(p.category)}" data-gallery>
      <div class="gal-track">${phs.map((x, i) => `<div class="gal-slide" data-i="${i}">${img(x, 900, 'cover-img', '(max-width: 820px) 100vw, 420px')}</div>`).join('')}</div>
      <span class="cover-shade"></span>
      <button class="cover-back" type="button" data-back>${ico('back')}${esc(route ? t('routes.exit') : t('place.back'))}</button>
      <span class="cover-cat">${ico(p.category)}${esc(t(`cat.${p.category}`))}</span>
      ${phs.length > 1 ? `
        <button class="gal-arrow prev" type="button" data-gal="-1" aria-label="${esc(t('gallery.prev'))}">${ico('back')}</button>
        <button class="gal-arrow next" type="button" data-gal="1" aria-label="${esc(t('gallery.next'))}">${ico('back')}</button>
        <div class="gal-dots" aria-hidden="true">${phs.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}
      ${ph ? `<button class="gal-open" type="button" data-viewer="0">${ico('layers')}${esc(phs.length > 1 ? t('gallery.views', { n: phs.length }) : t('gallery.open'))}</button>` : ''}
      ${ph ? `<figcaption class="cover-credit" data-gal-cap>${credit(phs[0])}</figcaption>` : ''}
    </figure>
    <h2 class="pt">${esc(L(p.name))}</h2>
    <p class="dates">${esc(L(p.dates))}</p>
    <div class="meta-row">${certPill(p.certainty)}<span class="pill">${esc(t(`place.acc.${acc}`))}</span></div>

    <div class="guide">
      <div class="guide-avatar" aria-hidden="true">C</div>
      <div class="guide-bubble">
        <div class="guide-name">${esc(t('place.guide'))} <span>· ${esc(t('place.guideRole'))}</span></div>
        <p>${esc(L(p.guide))}</p>
        <button class="btn small" type="button" data-listen aria-pressed="${!!speaking}">${ico(speaking ? 'pause' : 'sound')}<span>${esc(speaking ? t('place.stop') : t('place.listen'))}</span></button>
      </div>
    </div>
    ${note}

    <h3 class="st">${esc(t('place.more'))}</h3>
    <div class="story">${hist}</div>

    <div class="kv">
      <div><h4>${esc(t('place.significance'))}</h4><p>${esc(L(p.significance))}</p></div>
      <div><h4>${esc(t('place.status'))}</h4><p>${esc(L(p.status))}</p></div>
      ${people}
    </div>
    ${periods ? `<h3 class="st">${esc(t('place.periods'))}</h3><div class="chips">${periods}</div>` : ''}
    ${visit}
    ${events ? `<h3 class="st">${esc(t('place.events'))}</h3><ul class="ev-list">${events}</ul>` : ''}

    <h3 class="st">${esc(t('place.location'))}</h3>
    <p class="loc-line">${esc(t(`place.acc.${acc}`))} — ${esc(p.loc?.method || '')}</p>

    <h3 class="st">${esc(t('place.sources'))}</h3>
    <ol class="src-list">${sources}</ol>

    <div class="actions">
      <button class="btn small" type="button" data-zoom>${ico('map')}${esc(t('place.zoom'))}</button>
      <button class="btn small" type="button" data-share>${ico('share')}${esc(t('place.share'))}</button>
      <a class="btn small" href="${esc(commons)}" target="_blank" rel="noopener">${esc(t('place.photos'))}</a>
    </div>
    ${stepper}
  </article>`;
}

/* ---------- Historia ---------- */
export function historyView({ year, periodId }) {
  const pe = period(periodId);
  const nav = db.periods.map(x => `<button type="button" class="chip" data-period="${esc(x.id)}" aria-pressed="${x.id === periodId}">${esc(L(x.label))}</button>`).join('');
  const evs = db.events.filter(e => e.period === periodId).sort((a, b) => a.year - b.year).map(e => {
    const places = (e.places || []).map(place).filter(Boolean)
      .map(p => `<button type="button" class="chip" data-place="${esc(p.id)}">${esc(L(p.name))}</button>`).join(' ');
    return `<li><span class="ev-date">${esc(L(e.date))}</span><div class="ev-title">${esc(L(e.title))}</div><p>${esc(L(e.text))}</p>${places ? `<div class="chips" style="margin-top:6px">${places}</div>` : ''}</li>`;
  }).join('');
  const inPeriod = db.places.filter(p => (p.periods || []).includes(periodId) && existsIn(p, Math.min(year, pe.to)) !== 'no');
  const srcs = (pe.sources || []).map(source).filter(Boolean)
    .map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join(' · ');
  return `<div class="anim">
    <h2 class="pt">${esc(t('history.title'))}</h2>
    <p class="lead">${esc(t('history.intro'))}</p>
    <div class="period-nav" role="group">${nav}</div>
    <div class="period-card">
      <div class="range">${esc(L(pe.label))}</div>
      <h3>${esc(L(pe.name))}</h3>
      <div class="meta-row">${certPill(pe.certainty)}</div>
      <p>${esc(L(pe.context))}</p>
      <p class="fine" style="margin-top:10px">${esc(t('place.sources'))}: ${srcs}</p>
    </div>
    ${evs ? `<h3 class="st">${esc(t('history.events'))}</h3><ul class="ev-list">${evs}</ul>` : ''}
    <h3 class="st">${esc(t('history.inPeriod'))}</h3>
    ${inPeriod.length ? `<ul class="plist">${inPeriod.map(p => placeItem(p, existsIn(p, year) === 'ruin' ? esc(t('history.ruins')) : esc(L(p.dates)))).join('')}</ul>` : `<p class="muted">${esc(t('history.none'))}</p>`}
  </div>`;
}

/* ---------- Rutas ---------- */
export function routesView() {
  const cards = db.routes.map(r => {
    const s = routeStats(r);
    const mode = r.mode === 'boat'
      ? `<span class="pill">${esc(t('routes.boat'))}</span>`
      : `<span class="pill">${esc(t('routes.walk'))}</span><span class="pill">${esc(t('routes.distance', { d: s.km.toFixed(1).replace('.', getLang() === 'es' ? ',' : '.') }))}</span><span class="pill">${esc(t('routes.time', { t: s.minutes }))}</span>`;
    const done = store.has('routes', r.id) ? ' ✓' : '';
    const firstStop = place(r.stops[0]);
    const rid = db.media.route?.[r.id];
    const rph = rid ? { pexels: rid, author: db.media.routeAuthor?.[rid] || '', alt: r.name, specific: false } : null;
    return `<div class="rcard">
      ${rph ? `<div class="rcard-img">${img(rph, 600, '', '(max-width: 820px) 100vw, 380px')}<span class="rcard-credit">${esc(t('photo.by'))}: ${esc(rph.author)} / Pexels</span></div>` : ''}
      <h4>${esc(L(r.name))}${done}</h4>
      <p>${esc(L(r.intro))}</p>
      <div class="rmeta"><span class="pill">${esc(t('routes.stops', { n: r.stops.length }))}</span>${mode}</div>
      <p class="fine">▸ ${esc(L(firstStop.name))} → … → ${esc(L(place(r.stops[r.stops.length - 1]).name))}</p>
      <button class="btn small primary" type="button" data-route="${esc(r.id)}">${ico('route')}${esc(t('routes.start'))}</button>
    </div>`;
  }).join('');
  return `<div class="anim">
    <h2 class="pt">${esc(t('routes.title'))}</h2>
    <p class="lead">${esc(t('routes.intro'))}</p>
    ${cards}
    <p class="fine">${esc(t('routes.calc'))} ${esc(t('routes.lineNote'))}</p>
  </div>`;
}

/* ---------- Fuentes ---------- */
export function aboutView() {
  const order = ['oficial', 'académica', 'medio', 'secundaria'];
  const groups = order.map(type => {
    const items = db.sources.filter(s => s.type === type)
      .map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> — ${esc(s.org)}</li>`).join('');
    return items ? `<h3 class="st">${esc(t(`about.type.${type}`))}</h3><ol class="src-list">${items}</ol>` : '';
  }).join('');
  const legend = ['documentado', 'consenso', 'debatido', 'tradicion', 'pendiente']
    .map(c => `<li style="margin-bottom:8px">${certPill(c)} <span class="fine">${esc(t(`cert.${c}.d`))}</span></li>`).join('');
  return `<div class="anim">
    <h2 class="pt">${esc(t('about.title'))}</h2>
    <p>${esc(t('about.method'))}</p>
    <div class="note"><strong>${esc(t('place.location'))}</strong>${esc(t('about.coords'))}</div>
    <p class="fine" style="margin-top:12px">${esc(t('about.tourism'))}</p>
    <h3 class="st">${esc(t('cert.help'))}</h3>
    <ul style="list-style:none;padding:0;margin:0">${legend}</ul>
    ${groups}
    <p class="fine">${esc(t('about.accessed'))}</p>
    <p class="fine">${esc(t('about.credits'))}</p>
  </div>`;
}

/* ---------- Insignias ---------- */
export function badgeProgress(b) {
  const s = store.get();
  const r = b.rule;
  let have = 0;
  if (r.type === 'category') have = s.visited.filter(id => place(id)?.category === r.category).length;
  if (r.type === 'set') have = s.visited.filter(id => r.ids.includes(id)).length;
  if (r.type === 'periods') have = s.periods.length;
  if (r.type === 'routes') have = s.routes.length;
  return { have: Math.min(have, r.count), need: r.count, done: have >= r.count };
}

export function badgesView() {
  return db.badges.map(b => {
    const pr = badgeProgress(b);
    return `<div class="bdg ${pr.done ? 'on' : ''}">
      <span class="bi">${ico(b.icon)}</span>
      <span><strong>${esc(L(b.name))}</strong><small>${esc(L(b.desc))} · ${esc(t('badges.progress', { a: pr.have, b: pr.need }))}</small></span>
    </div>`;
  }).join('');
}

/* ---------- Búsqueda ---------- */
export const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function searchAll(q) {
  const nq = norm(q).trim();
  if (nq.length < 2) return null;
  const terms = nq.split(/\s+/);
  const match = hay => terms.every(tk => hay.includes(tk));
  const places = db.places.filter(p => match(norm([p.name.es, p.name.en, ...(p.aka || []), t(`cat.${p.category}`), p.category, p.dates?.es, p.dates?.en, ...(p.people || [])].join(' '))));
  const events = db.events.filter(e => match(norm([e.title.es, e.title.en, e.text.es, e.text.en, e.date.es, e.date.en, String(e.year)].join(' '))));
  const periods = db.periods.filter(pe => match(norm([pe.name.es, pe.name.en, pe.label.es].join(' '))));
  return { places: places.slice(0, 8), events: events.slice(0, 6), periods: periods.slice(0, 3) };
}

export function searchResultsView(res) {
  if (!res) return '';
  const { places, events, periods } = res;
  if (!places.length && !events.length && !periods.length) return `<div class="sr-empty">${esc(t('search.none'))}</div>`;
  let h = '';
  if (places.length) h += `<div class="sr-group">${esc(t('search.places'))}</div>` + places.map(p => `
    <button class="sr-item" role="option" type="button" data-place="${esc(p.id)}"><span class="pico" style="background:${catColor(p.category)};width:30px;height:30px">${ico(p.category)}</span>
    <span>${esc(L(p.name))}<small>${esc(t(`cat.${p.category}`))}</small></span></button>`).join('');
  if (events.length) h += `<div class="sr-group">${esc(t('search.events'))}</div>` + events.map(e => `
    <button class="sr-item" role="option" type="button" data-event="${esc(e.id)}"><span>${esc(L(e.title))}<small>${esc(L(e.date))}</small></span></button>`).join('');
  if (periods.length) h += `<div class="sr-group">${esc(t('search.periods'))}</div>` + periods.map(pe => `
    <button class="sr-item" role="option" type="button" data-period="${esc(pe.id)}"><span>${esc(L(pe.name))}<small>${esc(L(pe.label))}</small></span></button>`).join('');
  return h;
}
