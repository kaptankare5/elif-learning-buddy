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

export async function playFeedback(positive: boolean) {
  const phrases = positive
    ? ["Aferin!", "Harika!", "Süpersin!", "Doğru!", "Bravo!", "Çok güzel!"]
    : ["Bir daha dene"];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  await playSpeech(phrase, "tr");
}
