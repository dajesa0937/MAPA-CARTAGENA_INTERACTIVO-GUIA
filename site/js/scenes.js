// Escenas ilustradas y animadas (SVG + CSS, sin archivos de video: pesan poco y funcionan sin conexión).
// Son INTERPRETACIONES ARTÍSTICAS para ayudar a imaginar; se rotulan siempre como tales.
import { t } from './i18n.js';
import { pexels } from './data.js';
import { L } from './i18n.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Envoltorio común: SVG + subtítulos por actos + barra de progreso + botón pausa. */
function frame(name, svg, caps, label, aria, thumb) {
  // Miniatura (dentro de un botón): solo el dibujo animado, sin controles ni subtítulos.
  if (thumb) return `<span class="scene scene-${name}" aria-hidden="true"><svg class="scene-svg" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice">${svg}</svg></span>`;
  return `<div class="scene scene-${name}" style="--acts:${caps.length}" data-scene>
    <svg class="scene-svg" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(aria)}">${svg}</svg>
    <div class="scene-caps" aria-live="off">${caps.map((c, i) => `<p class="act act-${i + 1}" style="--i:${i}"><b>${esc(c[0])}</b>${esc(c[1])}</p>`).join('')}</div>
    <div class="scene-bar" aria-hidden="true">${caps.map((_, i) => `<i style="--i:${i}"><b></b></i>`).join('')}</div>
    <span class="scene-label">${esc(label)}</span>
    <button class="scene-toggle" type="button" data-scene-toggle aria-label="${esc(t('scene.pause'))}"><svg aria-hidden="true"><use href="#i-pause"/></svg></button>
  </div>`;
}

/* ---------------- Antes de Cartagena ---------------- */
function prehispanica(thumb) {
  const svg = `
  <defs>
    <linearGradient id="skyA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#23415c"/><stop offset=".55" stop-color="#e79a6b"/><stop offset="1" stop-color="#f6d6a0"/></linearGradient>
    <linearGradient id="skyB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb3d6"/><stop offset="1" stop-color="#d9eef2"/></linearGradient>
    <linearGradient id="seaA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f8fa3"/><stop offset="1" stop-color="#1c4f63"/></linearGradient>
    <radialGradient id="sunG"><stop offset="0" stop-color="#fff6d8"/><stop offset=".5" stop-color="#ffd27a"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="400" height="260" fill="url(#skyA)"/>
  <rect class="sky-day" width="400" height="260" fill="url(#skyB)"/>
  <circle class="sun" cx="92" cy="120" r="46" fill="url(#sunG)"/>
  <!-- cerro de La Popa: silueta alargada al fondo -->
  <path d="M190 128 C215 110 238 98 262 96 L330 94 C352 95 372 108 400 122 L400 140 L190 140 Z" fill="#5f7d6a" opacity=".85"/>
  <path d="M0 132 C40 124 90 126 140 131 C170 134 190 131 215 134 L215 142 L0 142 Z" fill="#6d8b73" opacity=".7"/>
  <rect y="136" width="400" height="124" fill="url(#seaA)"/>
  <g class="waves" stroke="#bfe6ee" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".55">
    <path d="M10 160h30M70 172h40M150 158h26M230 176h36M300 163h30M350 182h30M40 196h34M120 206h40M260 200h30M330 214h40"/>
  </g>
  <g class="birds" fill="none" stroke="#2b2b2b" stroke-width="1.3" stroke-linecap="round">
    <path d="M0 60 q5 -5 10 0 q5 -5 10 0"/><path d="M26 48 q4 -4 8 0 q4 -4 8 0"/><path d="M14 74 q3 -3 6 0 q3 -3 6 0"/>
  </g>
  <!-- manglares (primer plano) -->
  <g fill="#1f3d2c">
    <path d="M-10 150 C10 118 44 116 62 132 C78 116 108 122 116 146 L116 166 L-10 166 Z"/>
    <path d="M300 156 C318 128 350 124 368 138 C382 126 404 130 410 150 L410 172 L300 172 Z"/>
  </g>
  <g stroke="#1f3d2c" stroke-width="2" fill="none" stroke-linecap="round">
    <path d="M8 164 q-4 10 -10 14M24 164 q2 12 -4 18M42 166 q6 10 2 16M62 164 q-2 12 6 16M84 166 q4 10 0 16M104 164 q-6 10 -2 16"/>
    <path d="M312 170 q-4 10 -10 14M330 170 q2 12 -4 18M350 172 q6 10 2 16M372 170 q-2 12 6 16M394 170 q4 10 0 16"/>
  </g>
  <!-- Acto 2: cerámica temprana -->
  <g class="act act-2 pottery" style="--i:1">
    <ellipse cx="200" cy="236" rx="120" ry="16" fill="#c9a36c"/>
    <g fill="#9a5b34" stroke="#5a2f17" stroke-width="1.4">
      <path d="M150 234 C136 222 138 200 152 192 L168 192 C182 200 184 222 170 234 Z"/>
      <path d="M190 236 C172 226 170 204 186 196 C184 190 186 186 190 186 L214 186 C218 186 220 190 218 196 C234 204 232 226 214 236 Z"/>
      <path d="M238 234 C230 226 232 214 240 210 L262 210 C270 214 272 226 264 234 Z"/>
    </g>
    <g stroke="#f1d9b5" stroke-width="1.2" fill="none" opacity=".9">
      <path d="M144 206 l6 6 6 -6 6 6 6 -6 6 6"/><path d="M180 208 l8 8 8 -8 8 8 8 -8 8 8"/><path d="M234 220 l5 5 5 -5 5 5 5 -5 5 5"/>
    </g>
  </g>
  <!-- Actos 3-4: aldea y canoas -->
  <g class="act act-3 village" style="--i:2">
    <g transform="translate(118 118)">
      <path d="M0 34 L18 6 L36 34 Z" fill="#b48a4a"/><rect x="5" y="34" width="26" height="14" fill="#8a6333"/>
      <path d="M40 38 L56 12 L72 38 Z" fill="#a67c3f"/><rect x="45" y="38" width="22" height="12" fill="#7d5a2e"/>
      <path d="M78 36 L92 14 L106 36 Z" fill="#b48a4a"/><rect x="82" y="36" width="20" height="12" fill="#8a6333"/>
      <g class="smoke" fill="#e9e3d6" opacity=".7"><circle cx="58" cy="4" r="4"/><circle cx="62" cy="-6" r="5"/><circle cx="57" cy="-18" r="6"/></g>
    </g>
    <g class="canoe c1"><path d="M0 0 h54 l-6 7 h-42 z" fill="#5a3a1e"/><path d="M14 0 v-12 M34 0 v-11" stroke="#2c1c0f" stroke-width="3" stroke-linecap="round"/><circle cx="14" cy="-15" r="3.4" fill="#2c1c0f"/><circle cx="34" cy="-14" r="3.4" fill="#2c1c0f"/><path d="M40 -8 l14 16" stroke="#2c1c0f" stroke-width="1.6"/></g>
    <g class="canoe c2"><path d="M0 0 h40 l-5 6 h-30 z" fill="#6b4524"/><path d="M18 0 v-11" stroke="#2c1c0f" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="-14" r="3.2" fill="#2c1c0f"/><path d="M8 -6 l-10 14" stroke="#2c1c0f" stroke-width="1.6"/></g>
  </g>
  <!-- Acto 4: llegan los barcos (1533) -->
  <g class="act act-4 ships" style="--i:3">
    <g class="ship s1" fill="#2a2320"><path d="M0 0 h30 l-5 7 h-22 z"/><path d="M10 0 v-24 M20 0 v-20" stroke="#2a2320" stroke-width="1.4"/><path d="M11 -22 h8 v12 h-8z M21 -18 h7 v10 h-7z" fill="#efe6d2"/></g>
    <g class="ship s2" fill="#2a2320"><path d="M0 0 h22 l-4 5 h-15 z"/><path d="M11 0 v-17" stroke="#2a2320" stroke-width="1.2"/><path d="M12 -15 h7 v9 h-7z" fill="#efe6d2"/></g>
  </g>`;
  const caps = [
    [t('scene.pre.1a'), t('scene.pre.1b')], [t('scene.pre.2a'), t('scene.pre.2b')],
    [t('scene.pre.3a'), t('scene.pre.3b')], [t('scene.pre.4a'), t('scene.pre.4b')]
  ];
  return frame('pre', svg, caps, t('scene.artistic'), t('scene.pre.aria'), thumb);
}

/* ---------------- El galeón San José ---------------- */
function galeon(thumb) {
  const svg = `
  <defs>
    <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2540"/><stop offset="1" stop-color="#d9825b"/></linearGradient>
    <linearGradient id="gSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e5a70"/><stop offset=".45" stop-color="#0d2c3d"/><stop offset="1" stop-color="#040f16"/></linearGradient>
    <radialGradient id="gBoom"><stop offset="0" stop-color="#fff3c4"/><stop offset=".35" stop-color="#ffb04a"/><stop offset=".7" stop-color="#e2502a" stop-opacity=".6"/><stop offset="1" stop-color="#e2502a" stop-opacity="0"/></radialGradient>
    <linearGradient id="gBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bff3ff" stop-opacity=".55"/><stop offset="1" stop-color="#bff3ff" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="400" height="90" fill="url(#gSky)"/>
  <rect y="88" width="400" height="172" fill="url(#gSea)"/>
  <path d="M0 90 h400" stroke="#8fc3d1" stroke-width="1.5" opacity=".7"/>
  <g class="waves" stroke="#8fc3d1" stroke-width="1.2" fill="none" opacity=".45"><path d="M20 98h24M90 104h30M170 97h20M250 106h28M330 99h26"/></g>
  <!-- fondo marino -->
  <path d="M0 238 C60 228 110 244 170 236 C230 228 300 244 400 232 L400 260 L0 260 Z" fill="#1d2a2c"/>
  <g class="bubbles" fill="#9fd5e3" opacity=".5"><circle cx="210" cy="200" r="2"/><circle cx="218" cy="170" r="1.6"/><circle cx="206" cy="140" r="1.3"/></g>
  <!-- Acto 1-2: el galeón navega; buque británico -->
  <g class="act act-1 gl" style="--i:0">
    <g class="enemy" fill="#141414" transform="translate(40 90)"><path d="M0 0 h40 l-6 8 h-28 z"/><path d="M12 0 v-30 M26 0 v-26" stroke="#141414" stroke-width="1.5"/><path d="M13 -28 h10 v16 h-10z M27 -24 h9 v14 h-9z" fill="#cfc6b3"/></g>
  </g>
  <g class="act act-12 galleon-afloat" style="--i:0">
    <g transform="translate(220 90)" fill="#20150d">
      <path d="M-4 -6 h80 l-4 -8 h8 l-6 22 h-70 z"/>
      <path d="M16 -6 v-44 M38 -6 v-52 M58 -6 v-40" stroke="#20150d" stroke-width="2"/>
      <path d="M17 -46 h16 v24 h-16z M39 -54 h18 v30 h-18z M59 -38 h14 v20 h-14z" fill="#e9dfc9"/>
      <path d="M36 -60 l10 3 -10 3z" fill="#b8322a"/>
    </g>
  </g>
  <g class="act act-2 boom" style="--i:1"><circle cx="258" cy="66" r="60" fill="url(#gBoom)"/><g fill="#6c6a68" opacity=".7"><circle cx="240" cy="40" r="12"/><circle cx="262" cy="28" r="16"/><circle cx="284" cy="42" r="11"/></g></g>
  <!-- Acto 3: se hunde -->
  <g class="act act-3" style="--i:2"><g class="sinking" fill="#20150d"><path d="M0 0 h72 l-6 20 h-62 z"/><path d="M18 0 v-30 M40 0 v-36" stroke="#20150d" stroke-width="2"/></g></g>
  <!-- Acto 4: el pecio en el fondo y la exploración científica -->
  <g class="act act-4" style="--i:3">
    <g fill="#3a2f26" transform="translate(150 222) rotate(-8)"><path d="M0 8 C10 -6 70 -8 96 2 L90 14 L6 16 Z"/><path d="M30 2 l-8 -26 M60 0 l6 -22" stroke="#3a2f26" stroke-width="2.4"/></g>
    <g fill="#6e6252"><rect x="262" y="230" width="18" height="4" rx="2" transform="rotate(12 270 232)"/><rect x="128" y="236" width="15" height="4" rx="2"/></g>
    <g class="rov"><path d="M0 0 L-30 70 L30 70 Z" fill="url(#gBeam)"/><rect x="-10" y="-8" width="20" height="10" rx="3" fill="#f2c14a"/><circle cx="0" cy="3" r="2.5" fill="#fff"/></g>
  </g>`;
  const caps = [
    [t('scene.gal.1a'), t('scene.gal.1b')], [t('scene.gal.2a'), t('scene.gal.2b')],
    [t('scene.gal.3a'), t('scene.gal.3b')], [t('scene.gal.4a'), t('scene.gal.4b')]
  ];
  return frame('gal', svg, caps, t('scene.illustration'), t('scene.gal.aria'), thumb);
}

export function sceneHtml(name, { thumb = false } = {}) {
  if (name === 'prehispanica') return prehispanica(thumb);
  if (name === 'galeon') return galeon(thumb);
  return '';
}

/** Presentación de fotos con fundido y efecto Ken Burns (para «Cartagena hoy»). */
export function slidesHtml(slides) {
  const n = slides.length;
  return `<div class="slides" style="--n:${n}" data-scene>
    ${slides.map((s, i) => `<figure class="slide" style="--i:${i}"><img src="${pexels(s.pexels, 900)}" srcset="${pexels(s.pexels, 600)} 600w, ${pexels(s.pexels, 900)} 900w, ${pexels(s.pexels, 1400)} 1400w" sizes="(max-width: 820px) 100vw, 420px" alt="${esc(L(s.alt))}" loading="lazy" decoding="async">
      <figcaption>${esc(L(s.alt))} · ${esc(t('photo.by'))}: ${esc(s.author)} / Pexels</figcaption></figure>`).join('')}
    <div class="scene-bar" aria-hidden="true">${slides.map((_, i) => `<i style="--i:${i}"><b></b></i>`).join('')}</div>
    <button class="scene-toggle" type="button" data-scene-toggle aria-label="${esc(t('scene.pause'))}"><svg aria-hidden="true"><use href="#i-pause"/></svg></button>
  </div>`;
}
