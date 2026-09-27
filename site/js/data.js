// Capa de servicios de datos. Hoy lee archivos JSON estáticos; mañana puede leer una API
// sin que la interfaz cambie (misma forma de objetos).
const FILES = ['places', 'events', 'periods', 'routes', 'sources', 'badges', 'media', 'stories'];

export const db = {
  places: [], events: [], periods: [], routes: [], sources: [], badges: [], media: {}, stories: [],
  byId: { places: new Map(), events: new Map(), periods: new Map(), routes: new Map(), sources: new Map(), stories: new Map() }
};

export async function loadData() {
  // Versión de un solo archivo: los datos vienen incrustados en la página.
  const B = window.__CTG_BUNDLE__;
  const results = B ? FILES.map(f => B.data[f]) : await Promise.all(FILES.map(f => fetch(`data/${f}.json`).then(r => {
    if (!r.ok) throw new Error(`data/${f}.json → ${r.status}`);
    return r.json();
  })));
  FILES.forEach((f, i) => { db[f] = results[i]; });
  for (const k of Object.keys(db.byId)) db.byId[k] = new Map(db[k].map(x => [x.id, x]));
  return db;
}

export const place = id => db.byId.places.get(id);
export const event = id => db.byId.events.get(id);
export const period = id => db.byId.periods.get(id);
export const route = id => db.byId.routes.get(id);
export const source = id => db.byId.sources.get(id);
export const story = id => db.byId.stories.get(id);

export function periodForYear(y) {
  return db.periods.find(p => y >= p.from && y <= p.to) || db.periods[db.periods.length - 1];
}

/** ¿Existía el lugar en ese año? 'yes' | 'ruin' | 'no' */
export function existsIn(p, year) {
  const from = p.built?.from ?? -Infinity;
  const to = p.built?.to ?? Infinity;
  if (year < from) return 'no';
  if (year > to) return 'ruin';
  return 'yes';
}

/** Distancia haversine en km. */
export function distKm(a, b) {
  const R = 6371, rad = d => d * Math.PI / 180;
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Estimación transparente: línea recta × 1,25 y 4 km/h + minutos por parada. */
export function routeStats(r) {
  const pts = r.stops.map(id => place(id).coords);
  let km = 0;
  for (let i = 1; i < pts.length; i++) km += distKm(pts[i - 1], pts[i]);
  km *= 1.25;
  const walkMin = km / 4 * 60;
  return { km, minutes: Math.round((walkMin + r.stops.length * (r.stopMinutes || 5)) / 5) * 5 };
}

/** Fotografías: Pexels o Wikimedia Commons (licencias libres, con autor y licencia a la vista). */
export const pexels = (id, w = 800) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
export const photoUrl = (ph, w = 800) => ph.commons
  ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(ph.commons)}?width=${w}`
  : pexels(ph.pexels, w);
export const photoKey = ph => ph.pexels || ph.commons;
export const photoPage = ph => ph.commons ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(ph.commons.replace(/ /g, '_'))}` : `https://www.pexels.com/photo/${ph.pexels}/`;
export const photoSite = ph => ph.commons ? 'Wikimedia Commons' : 'Pexels';

/** Fotos verificadas de un lugar. Si no hay ninguna, NO se sustituye por la foto de otro sitio. */
export function photosFor(p) {
  return (p.photos || []).map(x => ({ specific: true, ...x }));
}
export function photoFor(p) {
  return photosFor(p)[0] || null;
}

/** Lugares protagonistas de una época: los ligados a sus acontecimientos y los construidos en ella. */
export function eraFocus(periodId) {
  const pe = period(periodId);
  if (!pe) return [];
  const ids = new Set();
  db.events.filter(e => e.period === periodId).forEach(e => (e.places || []).forEach(id => ids.add(id)));
  db.places.forEach(p => { const f = p.built?.from; if (f != null && f >= pe.from && f <= pe.to) ids.add(p.id); });
  if (periodId === 'hoy') db.places.filter(p => p.category === 'hoy').forEach(p => ids.add(p.id));
  return [...ids].filter(id => place(id));
}
/** Año que representa el final de una época (para ver cómo quedó la ciudad). */
export const eraYear = pe => pe.id === 'hoy' ? 2026 : Math.max(1500, pe.to);

/** Lugares y fuentes de una historia temática (derivados de sus capítulos: un solo origen de datos). */
export function storyPlaces(s) {
  const ids = new Set(s.places || []);
  s.chapters.forEach(c => (c.event ? event(c.event)?.places || [] : c.places || []).forEach(id => ids.add(id)));
  return [...ids].filter(id => place(id));
}
export function storySources(s) {
  const ids = new Set();
  s.chapters.forEach(c => (c.event ? event(c.event)?.sources || [] : c.sources || []).forEach(id => ids.add(id)));
  (s.places || []).forEach(id => (place(id)?.sources || []).forEach(x => ids.add(x)));
  return [...ids].map(source).filter(Boolean);
}
