// Mini Akıl - Statik MP3 ses çalar
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
  } catch { /* ignore */ }
}

function lookupKey(text: string, lang?: Lang): { lang: Lang; key: string } | null {
  const m = manifest as Record<string, Record<string, string>>;
  if (lang) {
    const k = m[lang]?.[text];
    if (k) return { lang, key: k };
  }
  // Auto-detect by searching all langs
  for (const l of ["tr", "en"] as Lang[]) {
    const k = m[l]?.[text];
    if (k) return { lang: l, key: k };
  }
  return null;
}

export async function playSpeech(text: string, lang?: Lang) {
  stopCurrent();
  const found = lookupKey(text, lang);
  if (!found) {
    console.warn(`[audio] no mp3 for ${lang ?? "auto"}::${text}`);
    return;
  }
  const url = `/audio/${found.lang}/${found.key}.mp3`;
  try {
    const audio = new Audio(url);
    audio.preload = "auto";
    currentAudio = audio;
    await audio.play();
  } catch (e) {
    console.warn("audio play failed", text, e);
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
