// Elifba — statik MP3 ses çalar
// Tüm sesler build-time ElevenLabs ile üretildi → public/audio/<sha1>.mp3
// Anahtar: SHA-1(text) ilk 16 hex karakteri (gen_audio.mjs ile birebir aynı)

import type { ContentItem } from "@/data/types";

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

async function hashKey(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export async function playSpeech(text: string, _lang?: string) {
  if (!text) return;
  stopCurrent();
  const key = await hashKey(text);
  const url = `/audio/${key}.mp3`;
  try {
    const audio = new Audio(url);
    audio.preload = "auto";
    currentAudio = audio;
    await audio.play();
  } catch (e) {
    console.warn("[audio] play failed for", text, e);
  }
}

export async function playItem(item: ContentItem) {
  await playSpeech(item.speech);
}

// Kısa "doğru/yanlış" ses efekti — WebAudio ile üretilir (tts değil)
import { getSettings } from "./settings";

let _ctx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    try { _ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); }
    catch { return null; }
  }
  return _ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", startAt = 0, volume = 0.18) {
  const ac = ctx();
  if (!ac) return;
  const t0 = ac.currentTime + startAt;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export async function playFeedback(positive: boolean) {
  const s = getSettings();
  if (positive) {
    if (s.sound) {
      // kısa neşeli iki notalık "ding"
      tone(880, 0.09, "triangle", 0);
      tone(1320, 0.12, "triangle", 0.08);
    }
  } else {
    if (s.sound) {
      // kısa düşük "buzz"
      tone(220, 0.18, "sawtooth", 0, 0.15);
      tone(160, 0.18, "sawtooth", 0.05, 0.12);
    }
    if (s.vibrate && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate([60, 40, 80]); } catch { /* ignore */ }
    }
  }
}

// Geriye dönük uyumluluk: eski IndexedDB cache'i temizle
export async function clearAudioCache() {
  try { indexedDB.deleteDatabase("elifba-audio"); } catch { /* ignore */ }
}
