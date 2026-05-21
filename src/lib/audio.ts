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

export async function playSpeech(text: string, lang: Lang) {
  stopCurrent();
  const map = (manifest as Record<Lang, Record<string, string>>)[lang] || {};
  const key = map[text];
  if (!key) {
    console.warn(`[audio] no mp3 for ${lang}::${text}`);
    return;
  }
  const url = `/audio/${lang}/${key}.mp3`;
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
