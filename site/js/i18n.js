// Traducciones: la interfaz vive en /i18n/*.json; el contenido histórico trae sus campos {es, en}.
const dicts = {};
let lang = 'es';
const listeners = new Set();

export async function loadLanguages() {
  const B = window.__CTG_BUNDLE__;
  if (B) { dicts.es = B.i18n.es; dicts.en = B.i18n.en; return; }
  const [es, en] = await Promise.all(['es', 'en'].map(l => fetch(`i18n/${l}.json`).then(r => {
    if (!r.ok) throw new Error(`i18n ${l}`);
    return r.json();
  })));
  dicts.es = es; dicts.en = en;
}

export function getLang() { return lang; }

export function setLang(next) {
  if (!dicts[next] || next === lang) return;
  lang = next;
  document.documentElement.lang = next;
  applyDom();
  listeners.forEach(fn => fn(lang));
}

export function onLangChange(fn) { listeners.add(fn); }

/** Texto de interfaz con variables {n}. */
export function t(key, vars) {
  let s = (dicts[lang] && dicts[lang][key]) ?? (dicts.es && dicts.es[key]) ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/** Campo bilingüe de los datos. */
export function L(obj) {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] ?? obj.es ?? '';
}

export function applyDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.title = t('app.title');
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
}

export function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat(lang === 'es' ? 'es-CO' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(iso + 'T12:00:00'));
  } catch { return iso; }
}
