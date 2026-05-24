// Mini Akıl - Statik MP3 ses çalar (+ tarayıcı TTS fallback)
// Sesler build-time ElevenLabs ile üretildi → public/audio/{tr,en}/<sha1>.mp3
import manifest from "../../public/audio/manifest.json";
import type { ContentItem, Lang } from "@/data/types";

let currentAudio: HTMLAudioElement | null = null;

function stopCurrent() {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch { /* ignore */ }
}

// Case-insensitive lookup cache
const lowerCache: Partial<Record<Lang, Record<string, string>>> = {};
function getLowerMap(lang: Lang): Record<string, string> {
  if (!lowerCache[lang]) {
    const m = (manifest as Record<string, Record<string, string>>)[lang] || {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(m)) out[k.toLowerCase()] = v;
    lowerCache[lang] = out;
  }
  return lowerCache[lang]!;
}

function lookupKey(text: string, lang?: Lang): { lang: Lang; key: string } | null {
  const m = manifest as Record<string, Record<string, string>>;
  const langs: Lang[] = lang ? [lang] : (["tr", "en"] as Lang[]);
  for (const l of langs) {
    if (m[l]?.[text]) return { lang: l, key: m[l][text] };
    const lower = getLowerMap(l)[text.toLowerCase()];
    if (lower) return { lang: l, key: lower };
  }
  return null;
}


// Resolve only when the played audio actually ends (or fails).
export function playSpeech(text: string, lang?: Lang): Promise<void> {
  stopCurrent();
  const found = lookupKey(text, lang);
  if (!found) {
    console.warn(`[audio] no mp3 for ${lang ?? "auto"}::${text} → TTS fallback`);
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) { resolve(); return; }
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === "en" ? "en-US" : "tr-TR";
        u.rate = 0.95;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      } catch { resolve(); }
    });
  }
  const url = `/audio/${found.lang}/${found.key}.mp3`;
  return new Promise<void>((resolve) => {
    try {
      const audio = new Audio(url);
      audio.preload = "auto";
      currentAudio = audio;
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      audio.addEventListener("ended", finish);
      audio.addEventListener("error", finish);
      audio.play().catch((e: { name?: string }) => {
        if (e?.name !== "AbortError") console.warn("audio play failed", text, e);
        finish();
      });
      // Safety: max 8s
      setTimeout(finish, 8000);
    } catch {
      resolve();
    }
  });
}

export function playItem(item: ContentItem): Promise<void> {
  return playSpeech(item.speech, item.lang);
}

// Kısa "ding" (doğru) / "buzz" (yanlış) sesi — WebAudio ile sentezlenir.
let _audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!_audioCtx) _audioCtx = new Ctor();
    if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
    return _audioCtx;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType, startOffset = 0, gain = 0.18) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export async function playFeedback(positive: boolean) {
  if (positive) {
    tone(880, 0.12, "triangle", 0, 0.2);
    tone(1318, 0.16, "triangle", 0.09, 0.2);
  } else {
    tone(220, 0.18, "square", 0, 0.14);
    tone(160, 0.22, "square", 0.08, 0.12);
  }
}
