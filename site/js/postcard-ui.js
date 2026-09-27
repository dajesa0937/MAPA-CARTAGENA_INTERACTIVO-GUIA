// Ventana «Envía una postal»: elegir tipo, lugares, destinatario y mensaje; vista previa en vivo;
// compartir la imagen (WhatsApp, correo…) o descargarla.
import { photoUrl } from './data.js';
import { t, L, getLang } from './i18n.js';
import { store } from './store.js';
import { candidates, defaultSelection, loadPhotos, draw, shareUrl, photoOf } from './postcard.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ico = n => `<svg aria-hidden="true"><use href="#i-${n}"/></svg>`;
const MAX = 4;
let dlg = null, st = null, toastFn = () => {};

function shortName(p) { return L(p.name).split(' · ')[0].split(' (')[0]; }
function defaultMsg(kind) { return t(kind === 'was' ? 'pc.msgWas' : 'pc.msgInvite'); }
function today() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return getLang() === 'es' ? `${p(d.getDate())}·${p(d.getMonth() + 1)}·${d.getFullYear()}` : `${p(d.getMonth() + 1)}·${p(d.getDate())}·${d.getFullYear()}`;
}

function ensure() {
  if (dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.className = 'modal pc-modal';
  dlg.setAttribute('aria-labelledby', 'pcTitle');
  document.body.appendChild(dlg);
  dlg.addEventListener('click', onClick);
  dlg.addEventListener('input', onInput);
  dlg.addEventListener('close', () => { st = null; });
  return dlg;
}

function shell() {
  const cands = candidates(st.first, store.get().favs || []).slice(0, 18);
  dlg.innerHTML = `
    <div class="modal-head"><h2 id="pcTitle">${esc(t('pc.title'))}</h2>
      <button class="icon-btn" type="button" data-pc="close" aria-label="${esc(t('ui.close'))}">${ico('close')}</button></div>
    <div class="pc-wrap">
      <div class="pc-preview"><canvas id="pcCanvas" width="1080" height="1350" role="img" aria-label="${esc(t('pc.previewAlt'))}"></canvas>
        <p class="pc-status" aria-live="polite"></p></div>
      <div class="pc-form">
        <div class="seg" role="radiogroup" aria-label="${esc(t('pc.kind'))}">
          <button type="button" role="radio" data-kind="invite" aria-checked="${st.kind === 'invite'}">${ico('plane')}${esc(t('pc.kindInvite'))}</button>
          <button type="button" role="radio" data-kind="was" aria-checked="${st.kind === 'was'}">${ico('heart')}${esc(t('pc.kindWas'))}</button>
        </div>
        <p class="pc-label">${esc(t('pc.places'))} <small>${esc(t('pc.placesHint', { n: MAX }))}</small></p>
        <div class="pc-places">${cands.map(p => {
          const ph = photoOf(p);
          return `<button type="button" class="pc-place" data-pcplace="${esc(p.id)}" aria-pressed="${st.ids.includes(p.id)}">
            <span class="pc-thumb">${ph ? `<img src="${photoUrl(ph, 120)}" alt="" loading="lazy">` : ''}</span><span>${esc(shortName(p))}</span></button>`;
        }).join('')}</div>
        <label class="pc-field"><span>${esc(t('pc.to'))}</span><input id="pcTo" maxlength="32" autocomplete="off" placeholder="${esc(t('pc.toPh'))}" value="${esc(st.to)}"></label>
        <label class="pc-field"><span>${esc(t('pc.from'))}</span><input id="pcFrom" maxlength="32" autocomplete="off" placeholder="${esc(t('pc.fromPh'))}" value="${esc(st.from)}"></label>
        <label class="pc-field"><span>${esc(t('pc.message'))}</span><textarea id="pcMsg" maxlength="170" rows="3">${esc(st.message)}</textarea></label>
        <div class="pc-actions">
          <button class="btn pc-wa" type="button" data-pc="whatsapp">${ico('chat')}WhatsApp</button>
          <button class="btn primary" type="button" data-pc="share">${ico('share')}${esc(t(mobile() ? 'pc.share' : 'pc.shareOther'))}</button>
          <button class="btn" type="button" data-pc="copy">${ico('layers')}${esc(t('pc.copy'))}</button>
          <button class="btn" type="button" data-pc="download">${ico('download')}${esc(t('pc.download'))}</button>
        </div>
        <p class="pc-howto" hidden></p>
        <p class="fine">${esc(t('pc.privacy'))}</p>
      </div>
    </div>`;
}

let timer = null, drawSeq = 0, dirty = true;
function schedule(delay = 180) { dirty = true; clearTimeout(timer); timer = setTimeout(render, delay); }
/** Solo vuelve a dibujar si algo cambió (así el clic conserva el permiso del navegador para compartir). */
const ready = () => (dirty ? render() : Promise.resolve());
const mobile = () => window.matchMedia('(pointer: coarse)').matches && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
async function render() {
  if (!st) return;
  const seq = ++drawSeq;
  dirty = false;
  const status = dlg.querySelector('.pc-status');
  status.textContent = t('pc.loading');
  try { await Promise.all([document.fonts?.load('700 60px Fraunces'), document.fonts?.load('600 26px Inter')]); } catch { /* sin fuentes web */ }
  const items = await loadPhotos(st.ids);
  if (seq !== drawSeq || !st) return;
  st.items = items;
  draw(dlg.querySelector('#pcCanvas'), { kind: st.kind, items, to: st.to.trim(), from: st.from.trim(), message: st.message.trim(), date: today(), url: shareUrl(st.ids), lang: getLang() });
  const missing = items.filter(it => !it.img).length;
  status.textContent = missing ? t('pc.noPhoto') : '';
}

function toBlob() {
  const cv = dlg.querySelector('#pcCanvas');
  return new Promise((res, rej) => {
    try { cv.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/png'); } catch (e) { rej(e); }
  });
}
const fileName = () => `postal-cartagena-${st.kind === 'was' ? (getLang() === 'es' ? 'estuve-aqui' : 'i-was-here') : (getLang() === 'es' ? 'invitacion' : 'invitation')}.png`;
function download(blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fileName();
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const shareText = () => `${t(st.kind === 'was' ? 'pc.titleWas' : 'pc.titleInvite')}${st.message.trim() ? ' — ' + st.message.trim() : ''}\n${shareUrl(st.ids)}`;
async function nativeShare() {
  await ready();
  let blob;
  try { blob = await toBlob(); } catch { toastFn(t('pc.error')); return false; }
  const file = new File([blob], fileName(), { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: t('pc.title'), text: shareText() }); return true; }
  } catch (e) { if (e?.name === 'AbortError') return true; }
  download(blob);
  try { await navigator.clipboard.writeText(shareText()); toastFn(t('pc.downloadedCopied')); } catch { toastFn(t('pc.downloaded')); }
  return true;
}
/** Copia la imagen al portapapeles (para pegarla con Ctrl+V en WhatsApp Web, correo, etc.). */
async function copyImage() {
  await ready();
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return false;
  try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': toBlob() })]); return true; } catch { return false; }
}
function howto(msg, link) {
  const p = dlg.querySelector('.pc-howto');
  p.hidden = false;
  p.innerHTML = `${esc(msg)}${link ? ` <a class="btn small" href="${esc(link)}" target="_blank" rel="noopener">${ico('chat')}${esc(t('pc.openWa'))}</a>` : ''}`;
}
async function whatsapp() {
  // En el teléfono, la hoja de compartir del sistema envía la IMAGEN directamente a WhatsApp.
  if (mobile() && navigator.canShare) { await nativeShare(); return; }
  // En el computador: la imagen va al portapapeles y se abre WhatsApp con el mensaje y el enlace listos.
  const wa = `https://wa.me/?text=${encodeURIComponent(shareText())}`;
  const copied = await copyImage();
  const win = window.open(wa, '_blank');
  if (win) { try { win.opener = null; } catch { /* ignorar */ } }
  if (copied) { toastFn(t('pc.copiedPaste')); howto(t('pc.waHowto'), win ? null : wa); }
  else {
    await ready(); toBlob().then(download).catch(() => {});
    howto(t('pc.waHowtoFile'), win ? null : wa);
  }
}

function onClick(e) {
  if (e.target === dlg) { dlg.close(); return; }
  const b = e.target.closest('button'); if (!b || !st) return;
  const d = b.dataset;
  if (d.pc === 'close') dlg.close();
  else if (d.pc === 'share') nativeShare();
  else if (d.pc === 'whatsapp') whatsapp();
  else if (d.pc === 'copy') copyImage().then(ok => { toastFn(t(ok ? 'pc.copied' : 'pc.copyFail')); if (!ok) ready().then(toBlob).then(download).catch(() => {}); });
  else if (d.pc === 'download') { ready().then(toBlob).then(download).then(() => toastFn(t('pc.downloaded'))).catch(() => toastFn(t('pc.error'))); }
  else if (d.kind && d.kind !== st.kind) {
    if (st.message.trim() === defaultMsg(st.kind)) { st.message = defaultMsg(d.kind); dlg.querySelector('#pcMsg').value = st.message; }
    st.kind = d.kind;
    dlg.querySelectorAll('[data-kind]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.kind === st.kind)));
    schedule(0);
  } else if (d.pcplace) {
    const id = d.pcplace;
    if (st.ids.includes(id)) st.ids = st.ids.filter(x => x !== id);
    else if (st.ids.length >= MAX) { toastFn(t('pc.max', { n: MAX })); return; }
    else st.ids.push(id);
    dlg.querySelectorAll('[data-pcplace]').forEach(x => x.setAttribute('aria-pressed', String(st.ids.includes(x.dataset.pcplace))));
    schedule();
  }
}
function onInput(e) {
  if (!st) return;
  if (e.target.id === 'pcTo') st.to = e.target.value;
  if (e.target.id === 'pcFrom') { st.from = e.target.value; store.set('pcFrom', st.from); }
  if (e.target.id === 'pcMsg') st.message = e.target.value;
  schedule(350);
}

/** Abre el editor. first: lugares que deben ir primero (p. ej. la ficha abierta). */
export function openPostcard({ kind = 'invite', first = [], onToast } = {}) {
  if (onToast) toastFn = onToast;
  ensure();
  const favs = store.get().favs || [];
  st = { kind, first, ids: defaultSelection(first, favs), to: '', from: store.get().pcFrom || '', message: defaultMsg(kind), items: [] };
  shell();
  dlg.showModal();
  render();
}
export const isOpen = () => !!dlg?.open;
