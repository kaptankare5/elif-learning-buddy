// Elifba — Ortak içerik tipleri
// Sesler build-time ElevenLabs ile üretildi → public/audio/<sha1>.mp3
// Audio anahtarı: item.speech (Arapça metin) → SHA-1 → /audio/<hash>.mp3

export type Lang = "tr"; // Tek dil — Arapça metinler `speech` alanında

export interface ContentItem {
  id: string;
  // Görsel etiket (ekranda büyük gösterilen Arapça veya isim)
  label: string;
  // İkincil etiket (Türkçe okunuş, örn. "be", "ne", "bââ")
  subLabel?: string;
  // TTS için kullanılacak Arapça metin (manifest anahtarı ile aynı)
  speech: string;
  // Sabit "tr" — eski API uyumu için
  lang: Lang;
  // Opsiyonel emoji (oyun kartlarında küçük görsel için)
  emoji?: string;
  image?: string;
  value?: number;
  colorKey?: string;
}

export interface ContentTopic {
  id: string;
  parent: SubjectId;
  title: string;
  description: string;
  emoji: string;
  items: ContentItem[];
  practiceMode?: "visual" | "audio" | "math";
}

export type SubjectId = "harfler" | "harekeler" | "baglantilar";

export interface Subject {
  id: SubjectId;
  title: string;
  emoji: string;
  description: string;
  bgVar: string;
  topics: ContentTopic[];
}
