// Progreso del visitante (solo en este navegador). Todo va envuelto en try/catch:
// en modo privado o con almacenamiento bloqueado la app funciona igual, sin guardar.
const KEY = 'ctg-progress-v1';
let state = { visited: [], periods: [], routes: [], favs: [], lang: null, heroSeen: false };

try {
  const raw = localStorage.getItem(KEY);
  if (raw) state = { ...state, ...JSON.parse(raw) };
} catch { /* sin almacenamiento */ }

function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignorar */ } }

export const store = {
  get: () => state,
  addTo(list, id) {
    if (!state[list].includes(id)) { state[list].push(id); save(); return true; }
    return false;
  },
  has: (list, id) => (state[list] || []).includes(id),
  remove(list, id) { state[list] = (state[list] || []).filter(x => x !== id); save(); },
  /** Alterna un elemento; devuelve true si quedó añadido. */
  toggle(list, id) {
    if (!state[list]) state[list] = [];
    if (state[list].includes(id)) { this.remove(list, id); return false; }
    state[list].push(id); save(); return true;
  },
  set(k, v) { state[k] = v; save(); }
};
