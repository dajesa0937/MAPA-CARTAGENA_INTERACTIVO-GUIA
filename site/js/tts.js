// Audioguía v1: síntesis de voz del navegador. Si una ficha trae audio grabado
// (audio.es / audio.en), se reproduce ese archivo en lugar de la voz sintética.
let current = null;
let audioEl = null;

export const ttsSupported = () => 'speechSynthesis' in window;

export function stop() {
  if (audioEl) { audioEl.pause(); audioEl = null; }
  if (ttsSupported()) window.speechSynthesis.cancel();
  if (current?.onend) current.onend();
  current = null;
}

export function speak(text, lang, { audioUrl, onend } = {}) {
  stop();
  if (audioUrl) {
    audioEl = new Audio(audioUrl);
    audioEl.onended = () => { current = null; onend?.(); };
    current = { onend };
    audioEl.play().catch(() => onend?.());
    return true;
  }
  if (!ttsSupported()) return false;
  const u = new SpeechSynthesisUtterance(text);
  const want = lang === 'es' ? ['es-CO', 'es-419', 'es-MX', 'es-US', 'es-ES', 'es'] : ['en-US', 'en-GB', 'en'];
  const voices = window.speechSynthesis.getVoices();
  const voice = want.map(w => voices.find(v => v.lang?.toLowerCase().startsWith(w.toLowerCase()))).find(Boolean);
  if (voice) u.voice = voice;
  u.lang = voice?.lang || want[0];
  u.rate = 0.97;
  current = { onend };
  u.onend = u.onerror = () => { if (current) { current = null; onend?.(); } };
  window.speechSynthesis.speak(u);
  return true;
}
