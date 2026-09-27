// Postales: el visitante compone una postal (invitación o «estuve aquí») con fotos de los lugares,
// sello, matasellos, su mensaje y un código QR hacia la guía. Todo se dibuja en el navegador (canvas);
// no se envía nada a ningún servidor. Cada foto lleva su autor y licencia impresos en la postal.
import qrcode from '../vendor/qrcode/qrcode.js';
import { db, place, photosFor, pexels } from './data.js';
import { t, L, getLang } from './i18n.js';

export const W = 1080, H = 1350;
export const SITE = 'https://dajesa0937.github.io/MAPA-CARTAGENA_INTERACTIVO-GUIA/';
const MAX = 4;
const SKIP = new Set(['galeon-san-jose']);           // no es un lugar que se pueda visitar
const DEFAULTS = ['castillo-san-felipe', 'puerta-del-reloj', 'getsemani', 'catedral'];
const INK = '#1b2730', SOFT = '#5b6770', PAPER = '#f7f0e3', ACCENT = '#c2553a', SEA = '#1f5f7a', STAMP_INK = 'rgba(31,63,110,.78)';

/* ---------- Qué lugares pueden ir en una postal ---------- */
const usable = p => p && !SKIP.has(p.id) && photosFor(p).some(ph => ph.specific !== false);
export function candidates(first = [], favs = []) {
  const order = [...first, ...favs, ...DEFAULTS, 'las-bovedas', 'convento-popa', 'gran-malecon', 'claustro-merced', 'santa-clara', 'ermita-cabrero', 'palacio-inquisicion', 'playa-blanca', 'islas-rosario', ...db.places.map(p => p.id)];
  return [...new Set(order)].map(place).filter(usable);
}
export function defaultSelection(first = [], favs = []) {
  const pool = [...first, ...favs].map(place).filter(usable).map(p => p.id);
  const ids = [...new Set(pool)];
  for (const id of DEFAULTS) { if (ids.length >= 3) break; if (!ids.includes(id) && usable(place(id))) ids.push(id); }
  return ids.slice(0, MAX);
}
export const photoOf = p => photosFor(p).find(ph => ph.specific !== false) || null;

/* ---------- Fotos aptas para canvas (CORS) ---------- */
// Pexels sirve CORS directamente; en Commons hay que pedir la miniatura real por la API (origin=*).
const thumbCache = new Map(), imgCache = new Map();
async function commonsThumbs(files, w) {
  const need = files.filter(f => !thumbCache.has(`${f}|${w}`));
  if (need.length) {
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url&iiurlwidth=${w}&titles=${encodeURIComponent(need.map(f => 'File:' + f).join('|'))}`;
      const j = await (await fetch(url)).json();
      const norm = new Map((j.query?.normalized || []).map(n => [n.to, n.from]));
      Object.values(j.query?.pages || {}).forEach(pg => {
        const from = (norm.get(pg.title) || pg.title).replace(/^File:/, '');
        const u = pg.imageinfo?.[0]?.thumburl;
        if (u) { thumbCache.set(`${from}|${w}`, u); thumbCache.set(`${pg.title.replace(/^File:/, '')}|${w}`, u); }
      });
    } catch { /* sin red: se dibuja un fondo de color */ }
  }
  return files.map(f => thumbCache.get(`${f}|${w}`) || null);
}
function loadImg(url) {
  if (!url) return Promise.resolve(null);
  if (imgCache.has(url)) return imgCache.get(url);
  const pr = new Promise(res => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    const timer = setTimeout(() => res(null), 12000);
    im.onload = () => { clearTimeout(timer); res(im); };
    im.onerror = () => { clearTimeout(timer); res(null); };
    im.src = url;
  });
  imgCache.set(url, pr);
  return pr;
}
export async function loadPhotos(ids, w = 900) {
  const ps = ids.map(place).filter(Boolean);
  const phs = ps.map(photoOf);
  const commons = phs.filter(ph => ph?.commons).map(ph => ph.commons);
  const urls = await commonsThumbs(commons, w);
  const byFile = new Map(commons.map((f, i) => [f, urls[i]]));
  return Promise.all(ps.map(async (p, i) => {
    const ph = phs[i];
    const url = !ph ? null : ph.commons ? byFile.get(ph.commons) : pexels(ph.pexels, w);
    return { place: p, photo: ph, img: await loadImg(url) };
  }));
}

/* ---------- Dibujo ---------- */
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
function cover(c, im, x, y, w, h) {
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const sw = w / s, sh = h / s;
  c.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) * 0.4, sw, sh, x, y, w, h);
}
function wrap(c, text, maxW, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean), lines = [];
  let line = '';
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (c.measureText(test).width > maxW && line) { lines.push(line); line = wd; } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
  return lines;
}
const shortName = p => L(p.name).split(' · ')[0].split(' (')[0];

function tile(c, it, x, y, w, h, n) {
  c.save(); rr(c, x, y, w, h, 18); c.clip();
  if (it.img) cover(c, it.img, x, y, w, h);
  else {
    const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, SEA); g.addColorStop(1, ACCENT);
    c.fillStyle = g; c.fillRect(x, y, w, h);
  }
  const sh = c.createLinearGradient(0, y + h * 0.55, 0, y + h); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.55)');
  c.fillStyle = sh; c.fillRect(x, y, w, h);
  c.restore();
  // etiqueta con número y nombre
  const label = shortName(it.place);
  c.font = `600 ${w < 400 ? 22 : 26}px Inter, system-ui, sans-serif`;
  const tw = Math.min(c.measureText(label).width, w - 90);
  c.fillStyle = 'rgba(10,24,34,.72)'; rr(c, x + 16, y + h - 58, tw + 62, 42, 21); c.fill();
  c.fillStyle = ACCENT; c.beginPath(); c.arc(x + 37, y + h - 37, 14, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff'; c.font = '700 17px Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(String(n), x + 37, y + h - 36);
  c.textAlign = 'left'; c.font = `600 ${w < 400 ? 22 : 26}px Inter, system-ui, sans-serif`;
  let s = label; while (c.measureText(s).width > w - 90 && s.length > 4) s = s.slice(0, -2);
  c.fillText(s === label ? s : s + '…', x + 58, y + h - 36);
  c.textBaseline = 'alphabetic';
}
function collage(c, items, x, y, w, h) {
  const g = 12, n = items.length;
  if (!n) return;
  if (n === 1) tile(c, items[0], x, y, w, h, 1);
  else if (n === 2) { const cw = (w - g) / 2; tile(c, items[0], x, y, cw, h, 1); tile(c, items[1], x + cw + g, y, cw, h, 2); }
  else if (n === 3) { const bw = (w - g) * 0.62, sw = w - g - bw, sh = (h - g) / 2; tile(c, items[0], x, y, bw, h, 1); tile(c, items[1], x + bw + g, y, sw, sh, 2); tile(c, items[2], x + bw + g, y + sh + g, sw, sh, 3); }
  else { const cw = (w - g) / 2, ch = (h - g) / 2; items.slice(0, 4).forEach((it, i) => tile(c, it, x + (i % 2) * (cw + g), y + Math.floor(i / 2) * (ch + g), cw, ch, i + 1)); }
}
const CASTLE = new Path2D('M4 27V14l4-2V8h3v3h3V6h4v5h3V8h3v4l4 2v13z');
const GATE = new Path2D('M13 27v-6a3 3 0 0 1 6 0v6z');
function stamp(c, x, y, lang) {
  const w = 170, h = 206;
  c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(0.06); c.translate(-w / 2, -h / 2);
  c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 16; c.shadowOffsetY = 6;
  c.fillStyle = '#fffdf8'; c.fillRect(0, 0, w, h); c.shadowColor = 'transparent';
  // dientes del sello
  c.fillStyle = PAPER;
  for (let i = 8; i < w; i += 16) { c.beginPath(); c.arc(i, 0, 5, 0, Math.PI * 2); c.arc(i, h, 5, 0, Math.PI * 2); c.fill(); }
  for (let i = 8; i < h; i += 16) { c.beginPath(); c.arc(0, i, 5, 0, Math.PI * 2); c.arc(w, i, 5, 0, Math.PI * 2); c.fill(); }
  const g = c.createLinearGradient(0, 14, 0, h - 14); g.addColorStop(0, '#e0894f'); g.addColorStop(0.55, ACCENT); g.addColorStop(1, '#0e2a3b');
  c.fillStyle = g; c.fillRect(14, 14, w - 28, h - 28);
  c.fillStyle = '#f6cf72'; c.beginPath(); c.arc(w / 2, 78, 26, 0, Math.PI * 2); c.fill();       // sol
  c.save(); c.translate(w / 2 - 48, 70); c.scale(3, 3); c.fillStyle = '#0e2a3b'; c.fill(CASTLE); c.fillStyle = '#e0894f'; c.fill(GATE); c.restore();
  c.fillStyle = '#fff'; c.textAlign = 'center';
  c.font = '700 19px Inter, system-ui, sans-serif'; c.fillText('CARTAGENA', w / 2, 172);
  c.font = '600 11px Inter, system-ui, sans-serif'; c.fillText('DE INDIAS · COLOMBIA', w / 2, 190);
  c.textAlign = 'left'; c.restore();
}
function postmark(c, cx, cy, date, lang) {
  c.save(); c.strokeStyle = STAMP_INK; c.fillStyle = STAMP_INK; c.lineWidth = 3;
  c.shadowColor = 'rgba(255,255,255,.55)'; c.shadowBlur = 3;
  c.beginPath(); c.arc(cx, cy, 78, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(cx, cy, 56, 0, Math.PI * 2); c.stroke();
  const txt = (lang === 'es' ? 'CARTAGENA DE INDIAS · COLOMBIA · ' : 'CARTAGENA DE INDIAS · COLOMBIA · ');
  c.font = '700 14px Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const chars = [...txt], step = (Math.PI * 2) / chars.length;
  chars.forEach((ch, i) => { const a = -Math.PI / 2 + i * step; c.save(); c.translate(cx + Math.cos(a) * 67, cy + Math.sin(a) * 67); c.rotate(a + Math.PI / 2); c.fillText(ch, 0, 0); c.restore(); });
  c.font = '700 20px Inter, system-ui, sans-serif'; c.fillText(date, cx, cy);
  // ondas del matasellos
  c.lineWidth = 3;
  for (let k = 0; k < 4; k++) {
    c.beginPath(); const yy = cy - 30 + k * 20;
    for (let xx = cx - 90; xx > cx - 320; xx -= 4) { const yv = yy + Math.sin((xx - cx) / 14) * 6; xx === cx - 90 ? c.moveTo(xx, yv) : c.lineTo(xx, yv); }
    c.stroke();
  }
  c.restore(); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
}
function qr(c, text, x, y, size) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), quiet = 2, cell = size / (n + quiet * 2);
  c.fillStyle = '#fff'; rr(c, x - 8, y - 8, size + 16, size + 16, 14); c.fill();
  c.fillStyle = INK;
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) c.fillRect(Math.floor(x + (k + quiet) * cell), Math.floor(y + (r + quiet) * cell), Math.ceil(cell), Math.ceil(cell));
}
export function credits(items) {
  return [...new Set(items.filter(it => it.photo).map(it => `${it.photo.author}${it.photo.commons ? ` (${it.photo.license || 'Wikimedia Commons'})` : ' / Pexels'}`))].join(' · ');
}

/** Dibuja la postal. opts: { kind:'invite'|'was', items, to, from, message, date, url, lang } */
export function draw(canvas, o) {
  const c = canvas.getContext('2d'), lang = o.lang || getLang();
  canvas.width = W; canvas.height = H;
  // papel
  c.fillStyle = PAPER; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(27,39,48,.12)'; c.lineWidth = 2; c.strokeRect(18, 18, W - 36, H - 36);
  // medir el bloque de texto para dar a las fotos todo el alto que sobre
  c.font = '700 56px Fraunces, Georgia, serif';
  const titleN = wrap(c, t(o.kind === 'was' ? 'pc.titleWas' : 'pc.titleInvite'), W - 120, 2).length;
  c.font = 'italic 400 31px Fraunces, Georgia, serif';
  const msgN = wrap(c, o.message, W - 60 - 176 - 60 - 36, 4).length;
  const whoN = (o.to ? 1 : 0) + (o.from ? 1 : 0);
  const textH = 72 + 62 * titleN + 24 + Math.max(msgN * 42 + 22 + whoN * 40, 176 + 14 + 32 + 42) + 24;
  // fotos
  const top = 40, ph = Math.max(560, Math.min(760, H - top - 120 - textH));
  if (o.items.length) collage(c, o.items, 40, top, W - 80, ph);
  else { c.fillStyle = '#e8dcc6'; rr(c, 40, top, W - 80, ph, 18); c.fill(); c.fillStyle = SOFT; c.font = '500 30px Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(t('pc.pickHint'), W / 2, top + ph / 2); c.textAlign = 'left'; }
  const sx = W - 40 - 170 - 18;
  stamp(c, sx, top + 18, lang);
  postmark(c, sx - 58, top + 150, o.date, lang);
  // título
  let y = top + ph + 62;
  c.fillStyle = ACCENT; c.font = '700 20px Inter, system-ui, sans-serif';
  c.fillText(t(o.kind === 'was' ? 'pc.kickerWas' : 'pc.kickerInvite').toUpperCase().split('').join(String.fromCharCode(8202)), 60, y);
  y += 10;
  c.fillStyle = INK; c.font = '700 56px Fraunces, Georgia, serif';
  wrap(c, t(o.kind === 'was' ? 'pc.titleWas' : 'pc.titleInvite'), W - 120, 2).forEach(l => { y += 62; c.fillText(l, 60, y); });
  // fila: mensaje + para/de (izquierda) y QR (derecha)
  const rowY = y + 24, qs = 176, qx = W - 60 - qs, leftW = qx - 60 - 36;
  y = rowY;
  c.fillStyle = '#2c3a44'; c.font = 'italic 400 31px Fraunces, Georgia, serif';
  wrap(c, o.message, leftW, 4).forEach(l => { y += 42; c.fillText(l, 60, y); });
  y += 22;
  const who = (label, name) => {
    if (!name) return;
    y += 40;
    c.font = '600 24px Inter, system-ui, sans-serif'; c.fillStyle = SOFT; c.fillText(`${label}: `, 60, y);
    const w0 = c.measureText(`${label}: `).width;
    c.fillStyle = INK; c.font = '600 30px Fraunces, Georgia, serif';
    let s = name; while (c.measureText(s).width > leftW - w0 && s.length > 2) s = s.slice(0, -1);
    c.fillText(s, 60 + w0, y);
  };
  who(t('pc.to'), o.to); who(t('pc.from'), o.from);
  qr(c, o.url, qx, rowY + 14, qs);
  c.fillStyle = SOFT; c.font = '600 17px Inter, system-ui, sans-serif'; c.textAlign = 'center';
  wrap(c, t('pc.scan'), qs + 24, 2).forEach((l, i) => c.fillText(l, qx + qs / 2, rowY + 14 + qs + 32 + i * 21));
  c.textAlign = 'left';
  // pie: enlace y créditos de las fotos (licencias CC exigen atribución)
  c.fillStyle = 'rgba(27,39,48,.12)'; c.fillRect(60, H - 104, W - 120, 2);
  c.fillStyle = INK; c.font = '600 19px Inter, system-ui, sans-serif';
  c.fillText(t('pc.footer'), 60, H - 72);
  c.fillStyle = SOFT; c.font = '400 15px Inter, system-ui, sans-serif';
  const cr = credits(o.items);
  if (cr) wrap(c, `${t('pc.photos')}: ${cr}`, W - 120, 2).forEach((l, i) => c.fillText(l, 60, H - 46 + i * 19));
}

export function shareUrl(ids, lang = getLang()) {
  const base = location.protocol === 'https:' ? location.origin + location.pathname : SITE;
  return `${base}?lang=${lang}#/viaje/mi/${ids.join(',')}`;
}
