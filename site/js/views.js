// Vistas del panel: devuelven HTML a partir de los datos. Sin lógica de estado.
import { db, place, event, period, source, story as getStory, routeStats, existsIn, pexels, photoUrl, photoPage, photoSite, photoFor, photosFor, eraFocus, storyPlaces, storySources } from './data.js';
import { sceneHtml, slidesHtml } from './scenes.js';
import { cinemaMinutes } from './cinema.js';
import { t, L, getLang, formatDate } from './i18n.js';
import { store } from './store.js';
import { catColor } from './map.js';
import { clock, hourDiff, nextSunset, wxKey } from './now.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const CATS = ['castillo', 'muralla', 'iglesia', 'museo', 'plaza', 'monumento', 'cultura', 'barrio', 'mar', 'hoy'];

const ico = (name, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const certPill = c => `<span class="pill cert-${esc(c)}" title="${esc(t(`cert.${c}.d`))}">${esc(t(`cert.${c}`))}</span>`;

/* ---------- Fotos ---------- */
export function img(ph, w, cls = '', sizes = '') {
  if (!ph) return '';
  const srcset = [Math.round(w / 2), w, w * 2].map(x => `${photoUrl(ph, x)} ${x}w`).join(', ');
  return `<img class="${cls}" src="${photoUrl(ph, w)}" srcset="${srcset}" ${sizes ? `sizes="${sizes}"` : ''} alt="${esc(L(ph.alt))}" loading="lazy" decoding="async">`;
}
export function credit(ph) {
  if (!ph) return '';
  const angle = ph.angle ? `<strong>${esc(L(ph.angle))}</strong> · ` : '';
  const lic = ph.license ? ` · ${esc(ph.license)}` : '';
  return `${angle}${ph.specific === false ? esc(t('photo.illustrative')) + ' · ' : ''}${esc(t('photo.by'))}: ${esc(ph.author)} / <a href="${esc(photoPage(ph))}" target="_blank" rel="noopener">${esc(photoSite(ph))}</a>${lic}`;
}
const FEATURED = ['castillo-san-felipe', 'puerta-del-reloj', 'las-bovedas', 'getsemani', 'catedral', 'san-pedro-claver', 'baluarte-santo-domingo', 'convento-popa', 'fuerte-san-fernando'];

export function card(p, { size = 'md' } = {}) {
  const ph = photoFor(p);
  const visited = store.has('visited', p.id) ? `<span class="card-vis" title="${esc(t('place.visited'))}">✓</span>` : '';
  return `<button class="card card-${size}" type="button" data-place="${esc(p.id)}">
    ${ph ? img(ph, size === 'lg' ? 480 : 360, 'card-img', size === 'lg' ? '240px' : '180px') : `<span class="card-noimg" style="--cc:${catColor(p.category)}">${ico(p.category)}</span>`}
    <span class="card-shade"></span>
    <span class="card-cat" style="--cc:${catColor(p.category)}">${ico(p.category)}${esc(t(`cat.${p.category}`))}</span>
    ${visited}
    ${(p.photos?.length || 0) > 1 ? `<span class="card-views" title="${esc(t('gallery.views', { n: p.photos.length }))}">${ico('layers')}${p.photos.length}</span>` : ''}
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
export function storyCard(st) {
  const chapters = st.chapters.length;
  const media = st.scene ? sceneHtml(st.scene, { thumb: true })
    : st.cover ? img({ ...st.cover }, 520, '', '(max-width: 820px) 72vw, 250px') : '';
  return `<button class="scard" type="button" data-story="${esc(st.id)}" style="--sc:${esc(st.accent || '#0e2a3b')}">
    ${media}
    <span class="sk">${esc(L(st.kicker))}</span>
    <span class="sb"><strong>${esc(L(st.title))}</strong><small>${esc(L(st.teaser))}</small>
      <span class="sm">${ico('book')}${esc(t('story.chapters', { n: chapters }))}</span></span>
  </button>`;
}

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
    ${db.media.sky?.length ? `<button class="sky-banner" type="button" data-cinema="${esc(db.stories[0].id)}">
      ${img({ ...db.media.sky[0], specific: true }, 900, 'sky-img', '(max-width: 820px) 100vw, 420px')}
      <span class="sky-shade"></span>
      <span class="sky-play">${ico('play')}</span>
      <span class="sky-txt"><small>${esc(t('cinema.sky'))}</small><strong>${esc(t('cinema.watchAll'))}</strong><em>${esc(t('cinema.watchAllSub', { n: db.stories.length, m: cinemaMinutes() }))}</em></span>
      <span class="sky-credit">${esc(t('photo.by'))}: ${esc(db.media.sky[0].author)} / Pexels</span>
    </button>` : ''}
    <div class="sec-head"><h3 class="st">${esc(t('explore.stories'))}</h3></div>
    <p class="hint">${esc(t('explore.storiesHint'))}</p>
    <div class="stories" role="list">${db.stories.map(st => `<div role="listitem">${storyCard(st)}</div>`).join('')}</div>
    ${featured.length ? `<h3 class="st">${esc(t('explore.featured'))}</h3>
    <div class="carousel" role="list">${featured.map(p => `<div role="listitem">${card(p)}</div>`).join('')}</div>` : ''}
    <h2 class="pt">${esc(t('explore.allPlaces'))}</h2>
    <p class="lead">${esc(t('explore.intro'))}</p>
    <div class="chips">
      <button type="button" class="chip" data-cat="__all" aria-pressed="${all}">${esc(t('filters.all'))}</button>
      ${chips}
    </div>
    <h3 class="st">${esc(t('explore.count', { n: places.length }))}</h3>
    <div class="grid">${places.map(p => card(p, { size: 'sm' })).join('')}</div>
  </div>`;
}

/* ---------- Historia temática ---------- */
export function storyView(st, { chapter = null, speaking = false } = {}) {
  const i = db.stories.indexOf(st), n = db.stories.length;
  const next = db.stories[(i + 1) % n];
  const slides = st.slides ? period('hoy')?.slides : null;
  const animated = st.scene || slides;
  const cover = st.scene ? sceneHtml(st.scene) : slides ? slidesHtml(slides) : st.cover ? img(st.cover, 900, 'era-img', '(max-width: 820px) 100vw, 420px') : '';
  const head = `<span class="era-years">${esc(L(st.kicker))}</span><h2>${esc(L(st.title))}</h2>`;
  const chapters = st.chapters.map((c, k) => {
    const e = c.event ? event(c.event) : null;
    const year = e ? String(e.year) : L(c.label);
    const title = e ? L(e.title) : L(c.title);
    const text = e ? L(e.text) : L(c.text);
    const cert = e ? e.certainty : c.certainty;
    const thumb = c.photo ? `<span class="m-thumb"><img src="${photoUrl(c.photo, 200)}" alt="${esc(L(c.photo.alt))}" loading="lazy"><small>${esc(c.photo.author)} · ${esc(c.photo.license)}</small></span>` : '';
    return `<li><button type="button" class="moment ${chapter === k ? 'on' : ''}" data-schapter="${k}">
      <span class="m-year ${e ? '' : 'txt'}">${esc(year)}</span>
      <span class="m-body">${thumb}<strong>${esc(title)}</strong><small>${esc(text)}</small>${cert && cert !== 'documentado' ? `<span class="m-cert">${certPill(cert)}</span>` : ''}${c.tourism ? `<span class="m-cert"><span class="pill tour-pill">${esc(t('tourism.short'))}</span></span>` : ''}</span>
    </button></li>`;
  }).join('');
  const places = storyPlaces(st).map(place);
  const srcs = storySources(st).map(s => `<li><span class="src-type">${esc(t(`about.type.${s.type}`))}</span><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> — ${esc(s.org)}</li>`).join('');
  const route = st.route && db.routes.find(r => r.id === st.route);
  return `<article class="story anim">
    <figure class="era-cover ${animated ? 'has-scene' : ''}">
      ${cover}
      ${animated ? '' : `<span class="era-shade"></span>`}
      <button class="cover-back" type="button" data-back-explore>${ico('back')}${esc(t('story.back'))}</button>
      ${animated ? '' : `<div class="era-head">${head}</div>`}
      ${!animated && st.cover ? `<figcaption>${esc(t('photo.by'))}: ${esc(st.cover.author)} / ${esc(photoSite(st.cover))}${st.cover.license ? ' · ' + esc(st.cover.license) : ''}</figcaption>` : ''}
    </figure>
    ${animated ? `<header class="story-head">${head}</header>` : ''}
    ${st.tourism ? `<p class="tourism-tag">${ico('hoy')}${esc(t('tourism.tag', { date: formatDate('2026-09-26') }))}</p>` : ''}
    <p class="era-summary">${esc(L(st.intro))}</p>
    <div class="story-cta">
      <button class="btn primary cinema-btn" type="button" data-cinema="${esc(st.id)}">${ico('play')}${esc(t('cinema.watch'))}</button>
      <button class="btn listen-btn" type="button" data-listen-story aria-pressed="${!!speaking}">${ico(speaking ? 'pause' : 'sound')}<span>${esc(speaking ? t('place.stop') : t('story.listenStory'))}</span></button>
      ${route ? `<button class="btn" type="button" data-route="${esc(route.id)}">${ico('route')}${esc(t('story.doRoute'))}</button>` : ''}
      ${st.period ? `<button class="btn" type="button" data-period="${esc(st.period)}">${ico('hourglass')}${esc(t('story.openChapter'))}</button>` : ''}
    </div>

    <section class="block">
      <h3 class="st">${esc(t('story.steps'))}</h3>
      ${places.length ? `<p class="hint">${esc(t('story.tapEvent'))}</p>` : ''}
      <ol class="moments">${chapters}</ol>
    </section>

    ${st.unknown ? `<div class="unknown"><strong>${ico('scroll')}${esc(t('story.unknown'))}</strong>${esc(L(st.unknown))}</div>` : ''}

    ${places.length ? `<section class="block">
      <h3 class="st">${esc(t('story.storyPlaces'))}</h3>
      <div class="carousel">${places.map(p => `<div>${card(p)}</div>`).join('')}</div>
    </section>` : ''}

    <details class="acc">
      <summary>${esc(t('story.sources'))}</summary>
      <div class="acc-body"><ol class="src-list">${srcs}</ol></div>
    </details>

    <nav class="story-nav">
      <button class="btn" type="button" data-back-explore>${ico('back')}<span>${esc(t('story.back'))}</span></button>
      <button class="btn primary" type="button" data-story="${esc(next.id)}"><span>${esc(t('story.nextStory'))}</span>${ico('back', 'flip')}</button>
    </nav>
  </article>`;
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
    <div class="visit"><h4>${ico('route')}${esc(t('place.visit'))}</h4><p style="margin:0">${esc(L(p.visit))}</p>
      <small>${esc(t('place.visitWarn', { date: formatDate(p.visit.checked) }))} · <a href="${esc(source(p.visit.source)?.url)}" target="_blank" rel="noopener">${esc(source(p.visit.source)?.org || '')}</a></small></div>` : '';
  const note = p.note ? `<div class="note"><strong>${esc(t('place.note'))}</strong>${esc(L(p.note))}</div>` : '';
  const commons = `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(L(p.name).split('·')[0].trim() + ' Cartagena')}&title=Special:MediaSearch&type=image`;

  let stepper = '';
  if (route) {
    const n = route.stops.length, i = stopIndex + 1;
    stepper = `<div class="stepper">
      <button class="btn small ghost" type="button" data-step="-1" ${i === 1 ? 'disabled' : ''}>${esc(t('routes.prev'))}</button>
      <div class="grow"><div><span class="st-route">${esc(L(route.name))} · </span><strong>${esc(t('routes.stop', { i, n }))}</strong></div><div class="progress"><i style="width:${(i / n) * 100}%"></i></div></div>
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
      ${ph ? `<figcaption class="cover-credit" data-gal-cap>${credit(phs[0])}</figcaption>` : `<div class="cover-nophoto">${ico(p.category, 'cover-bigico')}<span>${esc(t('photo.none'))}</span></div>`}
    </figure>
    <header class="place-head">
      ${p.tourism ? `<p class="tourism-tag">${ico('hoy')}${esc(t('tourism.tag', { date: formatDate(p.visit?.checked || '2026-09-26') }))}</p>` : ''}
      <h2 class="pt">${esc(L(p.name))}</h2>
      <p class="dates">${esc(L(p.dates))}</p>
    </header>

    <div class="guide">
      <div class="guide-avatar" aria-hidden="true">C</div>
      <div class="guide-bubble">
        <div class="guide-name">${esc(t('place.guide'))} <span>· ${esc(t('place.guideRole'))}</span></div>
        <p>${esc(L(p.guide))}</p>
        <button class="btn small listen-btn" type="button" data-listen aria-pressed="${!!speaking}">${ico(speaking ? 'pause' : 'sound')}<span>${esc(speaking ? t('place.stop') : t('place.listen'))}</span></button>
      </div>
    </div>

    <div class="quick">
      <div><span class="q-label">${esc(t('place.significance'))}</span><p>${esc(L(p.significance))}</p></div>
      <div><span class="q-label">${esc(t('place.status'))}</span><p>${esc(L(p.status))}</p></div>
    </div>
    ${visit}
    ${p.pressPhotos?.length ? `<div class="press">
      <h4>${ico('layers')}${esc(t('place.pressPhotos'))}</h4>
      <div class="press-links">${p.pressPhotos.map(source).filter(Boolean).map(s => `<a class="btn small" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.org.split(',')[0].replace(/\s*\(.*\)/, ''))} ↗</a>`).join('')}</div>
      <small>${esc(t('place.pressNote'))}</small>
    </div>` : ''}

    ${p.photoLinks?.length ? `<div class="press">
      <h4>${ico('layers')}${esc(t('place.photoLinks'))}</h4>
      <div class="press-links">${p.photoLinks.map(source).filter(Boolean).map(s => `<a class="btn small" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.org.split(',')[0].replace(/\s*\(.*\)/, '').split(' – ')[0])} ↗</a>`).join('')}</div>
      <small>${esc(t('place.photoLinksNote'))}</small>
    </div>` : ''}

    <div class="accs">
      <details class="acc">
        <summary>${esc(t('place.more'))}</summary>
        <div class="acc-body story-text">${hist}${note}</div>
      </details>
      ${events ? `<details class="acc">
        <summary>${esc(t('place.events'))}</summary>
        <div class="acc-body"><ul class="ev-list">${events}</ul></div>
      </details>` : ''}
      ${(people || periods) ? `<details class="acc">
        <summary>${esc(t('place.facts'))}</summary>
        <div class="acc-body kv">${people}${periods ? `<div><h4>${esc(t('place.periods'))}</h4><div class="chips">${periods}</div></div>` : ''}</div>
      </details>` : ''}
      <details class="acc">
        <summary>${esc(t('place.rigor'))}</summary>
        <div class="acc-body">
          <div class="meta-row">${certPill(p.certainty)}<span class="pill">${esc(t(`place.acc.${acc}`))}</span></div>
          <p class="loc-line">${esc(p.loc?.method || '')}</p>
          <ol class="src-list">${sources}</ol>
        </div>
      </details>
    </div>

    <div class="actions">
      <button class="btn small" type="button" data-zoom>${ico('map')}${esc(t('place.zoom'))}</button>
      <button class="btn small fav-btn" type="button" data-fav="${esc(p.id)}" aria-pressed="${store.has('favs', p.id)}">${ico(store.has('favs', p.id) ? 'heart-on' : 'heart')}<span>${esc(t(store.has('favs', p.id) ? 'fav.saved' : 'fav.save'))}</span></button>
      <button class="btn small" type="button" data-share>${ico('share')}${esc(t('place.share'))}</button>
      ${photoFor(p) && p.id !== 'galeon-san-jose' ? `<button class="btn small" type="button" data-postcard="invite" data-pcfirst="${esc(p.id)}">${ico('stamp')}${esc(t('pc.button'))}</button>` : ''}
      <a class="btn small" href="${esc(commons)}" target="_blank" rel="noopener">${esc(t('place.photos'))}</a>
    </div>
    ${stepper}
  </article>`;
}

/* ---------- Historia ---------- */
export function historyView({ periodId, eventId, speaking }) {
  const pe = period(periodId);
  const i = db.periods.indexOf(pe), n = db.periods.length;
  const ph = pe.photo ? { ...pe.photo, specific: true } : null;
  const evs = db.events.filter(e => e.period === periodId).sort((a, b) => a.year - b.year);
  const focus = eraFocus(periodId).map(place);
  const evList = evs.map(e => `
    <li><button type="button" class="moment ${e.id === eventId ? 'on' : ''}" data-event="${esc(e.id)}">
      <span class="m-year">${esc(String(e.year))}</span>
      <span class="m-body"><strong>${esc(L(e.title))}</strong><small>${esc(L(e.text))}</small></span>
    </button></li>`).join('');
  const srcs = (pe.sources || []).map(source).filter(Boolean)
    .map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> — ${esc(s.org)}</li>`).join('');
  return `<article class="story anim">
    ${pe.scene || pe.slides ? `<figure class="era-cover has-scene">${pe.scene ? sceneHtml(pe.scene) : slidesHtml(pe.slides)}</figure>
    <header class="story-head"><span class="era-years">${esc(t('story.chapter', { i: i + 1, n }))} · ${esc(L(pe.label))}</span><h2>${esc(L(pe.name))}</h2></header>` : `
    <figure class="era-cover ${ph ? '' : 'no-photo'}">
      ${ph ? img(ph, 900, 'era-img', '(max-width: 820px) 100vw, 420px') : `<svg class="era-ico" aria-hidden="true"><use href="#i-compass"/></svg>`}
      <span class="era-shade"></span>
      <span class="era-kicker">${esc(t('story.chapter', { i: i + 1, n }))}</span>
      <div class="era-head">
        <span class="era-years">${esc(L(pe.label))}</span>
        <h2>${esc(L(pe.name))}</h2>
      </div>
      ${ph ? `<figcaption>${esc(L(ph.alt))} · ${esc(t('photo.by'))}: ${esc(ph.author)} / Pexels</figcaption>` : ''}
    </figure>`}

    <p class="era-summary">${esc(L(pe.summary))}</p>
    <button class="btn listen-btn" type="button" data-listen-era aria-pressed="${!!speaking}">${ico(speaking ? 'pause' : 'sound')}<span>${esc(speaking ? t('place.stop') : t('story.listen'))}</span></button>

    ${evList ? `<section class="block">
      <h3 class="st">${esc(t('story.whatHappened'))}</h3>
      <p class="hint">${esc(t('story.tapEvent'))}</p>
      <ol class="moments">${evList}</ol>
    </section>` : ''}

    ${focus.length ? `<section class="block">
      <h3 class="st">${esc(t('story.places'))}</h3>
      <div class="carousel">${focus.map(p => `<div>${card(p)}</div>`).join('')}</div>
    </section>` : `<div class="note soft">${esc(t('story.noCity'))}</div>`}

    <details class="acc">
      <summary>${esc(t('story.readMore'))}</summary>
      <div class="acc-body"><p>${esc(L(pe.context))}</p>
        <p class="fine">${certPill(pe.certainty)}</p>
        <ol class="src-list">${srcs}</ol></div>
    </details>

    <nav class="story-nav">
      <button class="btn" type="button" data-era-step="-1" ${i === 0 ? 'disabled' : ''}>${ico('back')}<span>${esc(t('story.prev'))}</span></button>
      <span class="story-count">${i + 1} / ${n}</span>
      <button class="btn primary" type="button" data-era-step="1" ${i === n - 1 ? 'disabled' : ''}><span>${esc(t('story.next'))}</span>${ico('back', 'flip')}</button>
    </nav>
  </article>`;
}

/* ---------- Rutas ---------- */
const num = x => x.toFixed(1).replace('.', getLang() === 'es' ? ',' : '.');
/** Nombre corto para las paradas: quita el tipo genérico («Iglesia de…», «Baluarte de…»). */
export const shortName = p => L(p.name).split(' · ')[0].split(' (')[0]
  .replace(/^(Iglesia y claustro de|Iglesia y convento de|Iglesia de la|Iglesia de|Church and cloister of|Church and convent of|Church of the|Church of|Catedral de|Cathedral of|Fuerte de|Fort of|Castillo de|Batería-fuerte de|Convento de)\s+/i, '')
  .replace(/^(Santa Catalina de Alejandría|St Catherine of Alexandria)$/, m => getLang() === 'es' ? 'Catedral' : 'Cathedral');
export function routesView() {
  const doneN = db.routes.filter(r => store.has('routes', r.id)).length;
  const cards = db.routes.map(r => {
    const s = routeStats(r);
    const boat = r.mode === 'boat';
    const done = store.has('routes', r.id);
    const rid = db.media.route?.[r.id];
    const rph = rid ? { pexels: rid, author: db.media.routeAuthor?.[rid] || '', alt: r.name, specific: false } : null;
    const stats = boat
      ? `<div><b>${r.stops.length}</b><span>${esc(t('routes.stopsLbl'))}</span></div><div style="grid-column: span 2"><b>${ico('boat')}</b><span>${esc(t('routes.byBoat'))}</span></div>`
      : `<div><b>${r.stops.length}</b><span>${esc(t('routes.stopsLbl'))}</span></div><div><b>${esc(num(s.km))}</b><span>${esc(t('routes.kmLbl'))}</span></div><div><b>${s.minutes}</b><span>${esc(t('routes.minLbl'))}</span></div>`;
    const stops = r.stops.map((id, k) => {
      const p = place(id); const ph = photoFor(p);
      return `<li><button type="button" class="rv-stop" data-route="${esc(r.id)}" data-stopn="${k + 1}" aria-label="${esc(t('routes.startHere', { name: L(p.name) }))}">
        <span class="rv-num">${k + 1}</span>
        <span class="rv-thumb" style="background:${catColor(p.category)}">${ph ? `<img src="${photoUrl(ph, 120)}" alt="" loading="lazy">` : ''}</span>
        <small>${esc(shortName(p))}</small>
      </button></li>`;
    }).join('');
    return `<article class="rv">
      <div class="rv-top">
        ${rph ? img(rph, 700, '', '(max-width: 820px) 100vw, 380px') : ''}
        <span class="rv-mode">${ico(boat ? 'boat' : 'walk')}${esc(t(boat ? 'routes.boat' : 'routes.walk'))}</span>
        ${done ? `<span class="rv-done">${esc(t('routes.doneTag'))}</span>` : ''}
        <h4>${esc(L(r.name))}</h4>
        ${rph ? `<span class="rcard-credit">${esc(t('photo.by'))}: ${esc(rph.author)} / Pexels</span>` : ''}
      </div>
      <div class="rv-body">
        <p>${esc(L(r.intro))}</p>
        <div class="rv-stats">${stats}</div>
        <ol class="rv-stops">${stops}</ol>
        <div class="rv-actions">
          <button class="btn primary" type="button" data-route="${esc(r.id)}">${ico('route')}${esc(t('routes.startTour'))}</button>
          <button class="btn" type="button" data-preview="${esc(r.id)}" aria-label="${esc(t('routes.preview'))}">${ico('map')}<span class="rv-maptxt">${esc(t('routes.mapShort'))}</span></button>
        </div>
      </div>
    </article>`;
  }).join('');
  return `<div class="anim">
    <h2 class="pt">${esc(t('routes.title'))}</h2>
    <p class="lead">${esc(t('routes.intro'))}</p>
    <div class="rprog"><span>${esc(t('routes.progress', { a: doneN, b: db.routes.length }))}</span><div class="progress"><i style="width:${(doneN / db.routes.length) * 100}%"></i></div></div>
    ${cards}
    <p class="fine">${esc(t('routes.calc'))} ${esc(t('routes.lineNote'))}</p>
  </div>`;
}

/* ---------- Cartagena ahora ---------- */
const dur = ms => { const m = Math.max(1, Math.round(ms / 60000)); const h = Math.floor(m / 60); return h ? `${h} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`; };
const toF = c => Math.round(c * 9 / 5 + 32);
export function nowParts(wx) {
  const lang = getLang(), now = new Date();
  const d = hourDiff(now);
  const diff = d === 0 ? t('now.same') : t(d > 0 ? 'now.ahead' : 'now.behind', { h: String(Math.abs(d)).replace('.', lang === 'es' ? ',' : '.') });
  const set = nextSunset(now);
  const sameDay = clock(lang, set) && new Date(set).toDateString() === now.toDateString();
  const sunTxt = `${clock(lang, set)}${sameDay ? '' : ' · ' + t('now.tomorrow')}`;
  const k = wx ? wxKey(wx.code) : null;
  // En inglés (visitantes de EE. UU.) primero °F; en español, °C
  const temp = wx ? (lang === 'en' ? `${toF(wx.temp)} °F` : `${Math.round(wx.temp)} °C`) : null;
  const temp2 = wx ? (lang === 'en' ? `${Math.round(wx.temp)} °C` : `${toF(wx.temp)} °F`) : null;
  return { time: clock(lang, now), diff, sun: sunTxt, sunIn: t('now.sunsetIn', { d: dur(set - now) }), temp, temp2, wx: k ? t(`now.wx.${k}`) : null };
}
/** Línea breve para la portada. */
export function nowCompact(wx) {
  const n = nowParts(wx);
  return `<span class="now-dot" aria-hidden="true"></span><strong>${esc(n.time)}</strong> ${esc(t('now.in'))}${n.temp ? ` · ${esc(n.temp)}` : ''} · ${ico('sun')}${esc(t('now.sunset'))} ${esc(n.sun)}`;
}
/** Tarjeta completa (pestaña Viaje). */
export function nowCard(wx) {
  const n = nowParts(wx);
  return `<div class="now-head"><h3 class="st">${esc(t('now.title'))}</h3><span class="now-live"><span class="now-dot" aria-hidden="true"></span>${esc(t('now.live'))}</span></div>
    <div class="now-grid">
      <div class="now-cell"><span class="now-big">${esc(n.time)}</span><small>${esc(t('now.in'))} · ${esc(n.diff)}</small></div>
      <div class="now-cell">${n.temp ? `<span class="now-big">${esc(n.temp)}</span><small>${esc(n.wx)} · ${esc(n.temp2)}</small>` : `<small>${esc(t('now.noWx'))}</small>`}</div>
      <div class="now-cell sun"><span class="now-big">${esc(n.sun)}</span><small>${ico('sun')}${esc(t('now.sunset'))} · ${esc(n.sunIn)}</small></div>
    </div>
    <p class="now-tip">${esc(t('now.sunsetTip'))}${n.temp ? ` <a href="https://open-meteo.com/" target="_blank" rel="noopener">${esc(t('now.wxBy'))}</a>` : ''}</p>`;
}

/* ---------- Planea tu viaje ---------- */
export function favList(ids, { removable = true } = {}) {
  return `<ul class="plist fav-list">${ids.map(place).filter(Boolean).map(p => {
    const ph = photoFor(p);
    return `<li class="fav-item"><button class="pitem" type="button" data-place="${esc(p.id)}">
      <span class="fav-thumb" style="background:${catColor(p.category)}">${ph ? `<img src="${photoUrl(ph, 160)}" alt="" loading="lazy">` : ico(p.category)}</span>
      <span><strong>${esc(L(p.name).split(' · ')[0])}</strong><small>${esc(t(`cat.${p.category}`))} · ${esc(L(p.dates))}</small></span>
    </button>${removable ? `<button class="icon-btn fav-x" type="button" data-fav-remove="${esc(p.id)}" aria-label="${esc(t('fav.remove', { name: L(p.name) }))}">${ico('close')}</button>` : ''}</li>`;
  }).join('')}</ul>`;
}
export function tripView({ wx = null, shared = null } = {}) {
  const trip = db.trip;
  const favs = (store.get().favs || []).filter(place);
  const srcLinks = ids => ids.map(source).filter(Boolean).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.org.split(' (')[0])} ↗</a>`).join(' · ');
  const sections = trip.sections.map((sec, k) => `
    <details class="acc trip-acc" ${k === 0 ? 'open' : ''}>
      <summary>${ico(sec.icon)}${esc(L(sec.title))}</summary>
      <div class="acc-body">
        <ul class="trip-items">${sec.items.map(it => `<li>${esc(L(it))}</li>`).join('')}</ul>
        <p class="trip-src">${esc(t('trip.sources'))}: ${srcLinks(sec.sources)}</p>
      </div>
    </details>`).join('');
  const quick = db.routes.find(r => r.id === '60-minutos');
  const hooks = ['washington', 'gabo', 'galeon'].map(id => db.stories.find(s => s.id === id)).filter(Boolean);
  const sharedIds = (shared || []).filter(place);
  return `<div class="anim trip">
    <h2 class="pt">${esc(t('trip.title'))}</h2>
    <p class="lead">${esc(t('trip.intro'))}</p>
    <section class="now-card" data-now="card">${nowCard(wx)}</section>
    ${sharedIds.length ? `<section class="block fav-box shared">
      <h3 class="st">${ico('share')}${esc(t('fav.shared'))} · ${esc(t('fav.n', { n: sharedIds.length }))}</h3>
      ${favList(sharedIds, { removable: false })}
      <div class="actions"><button class="btn small primary" type="button" data-fav-saveall="${esc(sharedIds.join(','))}">${ico('heart')}${esc(t('fav.saveAll'))}</button></div>
    </section>` : ''}
    <section class="block fav-box">
      <h3 class="st">${ico('heart-on', 'fav-ico')}${esc(t('fav.title'))}${favs.length ? ` · ${esc(t('fav.n', { n: favs.length }))}` : ''}</h3>
      ${favs.length ? favList(favs) + `<div class="actions">
        <button class="btn small" type="button" data-fav-map>${ico('map')}${esc(t('fav.map'))}</button>
        <button class="btn small primary" type="button" data-fav-share>${ico('share')}${esc(t('fav.share'))}</button>
        <button class="btn small" type="button" data-postcard="invite">${ico('stamp')}${esc(t('pc.fromList'))}</button>
      </div>` : `<p class="fav-empty">${ico('heart')}${esc(t('fav.empty'))}</p>`}
    </section>
    <section class="block pc-promo">
      <h3 class="st">${ico('stamp')}${esc(t('pc.section'))}</h3>
      <p class="hint">${esc(t('pc.sectionHint'))}</p>
      <div class="pc-promo-btns">
        <button class="btn primary" type="button" data-postcard="invite">${ico('plane')}${esc(t('pc.kindInvite'))}</button>
        <button class="btn" type="button" data-postcard="was">${ico('heart')}${esc(t('pc.kindWas'))}</button>
      </div>
    </section>
    ${quick ? `<section class="block"><h3 class="st">${esc(t('trip.short'))}</h3>
      <button class="btn primary" type="button" data-route="${esc(quick.id)}">${ico('walk')}${esc(L(quick.name))}</button></section>` : ''}
    <section class="block">${sections}</section>
    <p class="fine">${esc(t('trip.checked', { date: formatDate(trip.checked) }))}</p>
    ${hooks.length ? `<section class="block"><h3 class="st">${esc(t('trip.stories'))}</h3>
      <div class="stories" role="list">${hooks.map(st => `<div role="listitem">${storyCard(st)}</div>`).join('')}</div></section>` : ''}
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
  const stories = db.stories.filter(st => match(norm([st.title.es, st.title.en, st.kicker.es, st.kicker.en, st.teaser.es, st.teaser.en].join(' '))));
  return { places: places.slice(0, 8), events: events.slice(0, 6), periods: periods.slice(0, 3), stories: stories.slice(0, 3) };
}

export function searchResultsView(res) {
  if (!res) return '';
  const { places, events, periods, stories = [] } = res;
  if (!places.length && !events.length && !periods.length && !stories.length) return `<div class="sr-empty">${esc(t('search.none'))}</div>`;
  let h = '';
  if (stories.length) h += `<div class="sr-group">${esc(t('explore.stories'))}</div>` + stories.map(st => `
    <button class="sr-item" role="option" type="button" data-story="${esc(st.id)}"><span class="pico" style="background:${esc(st.accent)};width:30px;height:30px">${ico('book')}</span><span>${esc(L(st.title))}<small>${esc(L(st.kicker))}</small></span></button>`).join('');
  if (places.length) h += `<div class="sr-group">${esc(t('search.places'))}</div>` + places.map(p => `
    <button class="sr-item" role="option" type="button" data-place="${esc(p.id)}"><span class="pico" style="background:${catColor(p.category)};width:30px;height:30px">${ico(p.category)}</span>
    <span>${esc(L(p.name))}<small>${esc(t(`cat.${p.category}`))}</small></span></button>`).join('');
  if (events.length) h += `<div class="sr-group">${esc(t('search.events'))}</div>` + events.map(e => `
    <button class="sr-item" role="option" type="button" data-event="${esc(e.id)}"><span>${esc(L(e.title))}<small>${esc(L(e.date))}</small></span></button>`).join('');
  if (periods.length) h += `<div class="sr-group">${esc(t('search.periods'))}</div>` + periods.map(pe => `
    <button class="sr-item" role="option" type="button" data-period="${esc(pe.id)}"><span>${esc(L(pe.name))}<small>${esc(L(pe.label))}</small></span></button>`).join('');
  return h;
}
