// Progreso del visitante (solo en este navegador). Todo va envuelto en try/catch:
// en modo privado o con almacenamiento bloqueado la app funciona igual, sin guardar.
const KEY = 'ctg-progress-v1';
let state = { visited: [], periods: [], routes: [], lang: null, heroSeen: false };

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
  has: (list, id) => state[list].includes(id),
  set(k, v) { state[k] = v; save(); }
};
