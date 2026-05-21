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

function ttsFallback(text: string, lang?: Lang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "en" ? "en-US" : "tr-TR";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

export async function playSpeech(text: string, lang?: Lang) {
  stopCurrent();
  const found = lookupKey(text, lang);
  if (!found) {
    console.warn(`[audio] no mp3 for ${lang ?? "auto"}::${text} → TTS fallback`);
    ttsFallback(text, lang);
    return;
  }
  const url = `/audio/${found.lang}/${found.key}.mp3`;
  try {
    const audio = new Audio(url);
    audio.preload = "auto";
    currentAudio = audio;
    await audio.play();
  } catch (e) {
    // AbortError = interrupted by next play; sessiz geç
    const err = e as { name?: string };
    if (err?.name !== "AbortError") {
      console.warn("audio play failed", text, e);
    }
  }
}

export async function playItem(item: ContentItem) {
  await playSpeech(item.speech, item.lang);
}

export async function playFeedback(positive: boolean) {
  const phrases = positive
    ? ["Aferin!", "Harika!", "Süpersin!", "Doğru!", "Bravo!", "Çok güzel!"]
    : ["Bir daha dene"];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  await playSpeech(phrase, "tr");
}
