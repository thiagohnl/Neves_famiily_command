// "Hurray!" for tapping the birthday person's face: a party horn and a ta-da
// fanfare made with Web Audio (no audio file to ship), plus a spoken cheer where
// the device has speech synthesis. Only call it from a tap: browsers (and the
// kiosk WebView) block sound that isn't started by a user gesture.

const CHEERS: Record<string, { text: string; voice: string }> = {
  en: { text: 'Hip hip hooray!', voice: 'en-GB' },
  nl: { text: 'Hiep hiep hoera!', voice: 'nl-NL' },
  pt: { text: 'Viva! Parabéns!', voice: 'pt-PT' },
};

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

const audioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = ctx ?? new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

/** One note with a quick attack and a soft release. */
const note = (ac: AudioContext, freq: number, start: number, length: number, type: OscillatorType, volume: number, slideTo?: number) => {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + length);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + length + 0.05);
};

const fanfare = (ac: AudioContext) => {
  const t = ac.currentTime + 0.02;
  // Party horn: a buzzy upward slide
  note(ac, 220, t, 0.35, 'sawtooth', 0.12, 660);
  // Ta-da: G C E, then a held G-major chord
  [392, 523.25, 659.25].forEach((f, i) => note(ac, f, t + 0.4 + i * 0.12, 0.16, 'triangle', 0.25));
  [523.25, 659.25, 783.99, 1046.5].forEach(f => note(ac, f, t + 0.78, 0.9, 'triangle', 0.18));
};

const cheer = (lang: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
  const { text, voice } = CHEERS[lang] ?? CHEERS.en;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice;
  utterance.rate = 1.05;
  utterance.pitch = 1.3;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

/** Fanfare plus a spoken cheer in the season language; silently does nothing where audio isn't available. */
export const playHurray = (lang = 'en') => {
  try {
    const ac = audioContext();
    if (ac) fanfare(ac);
  } catch (err) {
    console.warn('Hurray fanfare unavailable:', err);
  }
  try {
    // Let the horn go first, then the voice
    setTimeout(() => cheer(lang), 350);
  } catch (err) {
    console.warn('Hurray cheer unavailable:', err);
  }
};
