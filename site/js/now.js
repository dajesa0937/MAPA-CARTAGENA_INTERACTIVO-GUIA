// «Cartagena ahora»: hora local, diferencia con el visitante, puesta de sol (calculada en el
// navegador, sin red) y el tiempo actual (Open-Meteo, sin clave; si falla, simplemente no se muestra).
const LAT = 10.4236, LON = -75.5478, TZ = 'America/Bogota', CTG_OFFSET = -300; // UTC−5 todo el año
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;

/** Puesta y salida del sol (ecuación del amanecer; error típico ±1–2 min). */
export function sunTimes(date = new Date()) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = Math.round(jd - 2451545.0 + 0.0008 - LON / 360) ;            // día juliano local
  const Js = n - LON / 360;
  const M = (357.5291 + 0.98560028 * Js) % 360;
  const C = 1.9148 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 0.0003 * Math.sin(rad(3 * M));
  const lam = (M + C + 180 + 102.9372) % 360;
  const Jt = 2451545 + Js + 0.0053 * Math.sin(rad(M)) - 0.0069 * Math.sin(rad(2 * lam));
  const dec = Math.asin(Math.sin(rad(lam)) * Math.sin(rad(23.4397)));
  const cosW = (Math.sin(rad(-0.833)) - Math.sin(rad(LAT)) * Math.sin(dec)) / (Math.cos(rad(LAT)) * Math.cos(dec));
  const w = deg(Math.acos(cosW));
  const toDate = J => new Date((J - 2440587.5) * 86400000);
  return { rise: toDate(Jt - w / 360), set: toDate(Jt + w / 360) };
}

export function clock(lang, date = new Date()) {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-CO' : 'en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(date);
}

/** Horas de diferencia entre Cartagena y el visitante (positivo: Cartagena va por delante). */
export function hourDiff(date = new Date()) {
  const visitor = -date.getTimezoneOffset();
  return (CTG_OFFSET - visitor) / 60;
}

/** Próxima puesta de sol (hoy, o mañana si ya pasó). */
export function nextSunset(now = new Date()) {
  let { set } = sunTimes(now);
  if (set <= now) set = sunTimes(new Date(now.getTime() + 86400000)).set;
  return set;
}

/** Tiempo actual (caché de 15 min en sessionStorage). Devuelve null si no hay red o falla. */
export async function weather() {
  const KEY = 'ctg-wx';
  try {
    const c = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (c && Date.now() - c.at < 15 * 60000) return c.data;
  } catch { /* sin almacenamiento */ }
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 5000);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code,is_day&timezone=${encodeURIComponent(TZ)}`;
    const r = await fetch(url, { signal: ctl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const j = await r.json();
    const data = { temp: j.current?.temperature_2m, code: j.current?.weather_code, day: j.current?.is_day === 1 };
    if (typeof data.temp !== 'number') return null;
    try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data })); } catch { /* ignorar */ }
    return data;
  } catch { return null; }
}

/** Código WMO → clave de texto. */
export function wxKey(code) {
  if (code == null) return null;
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 95) return 'storm';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  return 'cloudy';
}
