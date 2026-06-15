// 4 seviyeli tekrar (SRS) sistemi
// - L1 yeni başlayan, L4 ezbere
// - Doğru cevapta harf bir üst seviyeye, yanlışta bir alt seviyeye iner
// - Soru seçiminde dolu olan seviyelere şelale ağırlıkları uygulanır
// - Aynı seviyede en az görülmüş harfler önce çıkar
// - Her namespace ("quiz" / "games") ayrı saklanır

import { useEffect, useState } from "react";

export type Level = 1 | 2 | 3 | 4;
export type Namespace = "quiz" | "games";

export interface LetterSrsEntry {
  level: Level;
  correct: number;
  total: number;
  seen: number; // bu seviyedeki gösterim sayısı (çeşitlilik için)
  lastSeen: number;
}

// topicId/gameId -> letterId -> entry
export type TopicSrs = Record<string, LetterSrsEntry>;
export type SrsState = Record<string, TopicSrs>;

const KEY = (ns: Namespace) => `elifba-srs-${ns}-v1`;
const EVENT = (ns: Namespace) => `elifba-srs-${ns}-updated`;
const PROGRESS_EVENT = "elifba-progress-updated"; // global progress yenileme

function load(ns: Namespace): SrsState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY(ns)) || "{}");
  } catch {
    return {};
  }
}

function save(ns: Namespace, s: SrsState) {
  localStorage.setItem(KEY(ns), JSON.stringify(s));
  window.dispatchEvent(new Event(EVENT(ns)));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

function ensureEntry(s: SrsState, topicId: string, letterId: string): LetterSrsEntry {
  if (!s[topicId]) s[topicId] = {};
  if (!s[topicId][letterId]) {
    s[topicId][letterId] = { level: 1, correct: 0, total: 0, seen: 0, lastSeen: 0 };
  }
  return s[topicId][letterId];
}

// Tüm harfler kayıtlı değilse ilk kez görüldüğünde L1'e koy
export function ensureLetters(ns: Namespace, topicId: string, letterIds: string[]) {
  const s = load(ns);
  let changed = false;
  for (const id of letterIds) {
    if (!s[topicId]?.[id]) {
      ensureEntry(s, topicId, id);
      changed = true;
    }
  }
  if (changed) save(ns, s);
}

// Şelale ağırlıkları — dolu seviyelere göre
// 4 dolu: 60/15/10/15
// 3 dolu (en düşükten yukarı): 70/20/10
// 2 dolu: 70/30
// 1 dolu: 100
function waterfallWeights(filledLevels: Level[]): Record<Level, number> {
  const w: Record<Level, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const sorted = [...filledLevels].sort((a, b) => a - b);
  if (sorted.length === 4) {
    w[1] = 60; w[2] = 15; w[3] = 10; w[4] = 15;
  } else if (sorted.length === 3) {
    w[sorted[0]] = 70; w[sorted[1]] = 20; w[sorted[2]] = 10;
  } else if (sorted.length === 2) {
    w[sorted[0]] = 70; w[sorted[1]] = 30;
  } else if (sorted.length === 1) {
    w[sorted[0]] = 100;
  }
  return w;
}

// Bir sonraki harfi seç
export function pickNextLetter(ns: Namespace, topicId: string, letterIds: string[]): string {
  ensureLetters(ns, topicId, letterIds);
  const s = load(ns);
  const topic = s[topicId] || {};

  // Seviyelere göre grupla
  const byLevel: Record<Level, string[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const id of letterIds) {
    const e = topic[id];
    if (!e) continue;
    byLevel[e.level].push(id);
  }
  const filled: Level[] = ([1, 2, 3, 4] as Level[]).filter((l) => byLevel[l].length > 0);
  if (filled.length === 0) {
    // Hiçbir harf yoksa rastgele
    return letterIds[Math.floor(Math.random() * letterIds.length)];
  }

  // Seviye seç (ağırlıklı)
  const w = waterfallWeights(filled);
  const total = filled.reduce((acc, l) => acc + w[l], 0);
  let r = Math.random() * total;
  let chosenLevel: Level = filled[0];
  for (const l of filled) {
    r -= w[l];
    if (r <= 0) { chosenLevel = l; break; }
  }

  // Seviye içinde: en az görülen + en eski lastSeen tercih
  const candidates = byLevel[chosenLevel];
  candidates.sort((a, b) => {
    const ea = topic[a]; const eb = topic[b];
    if (ea.seen !== eb.seen) return ea.seen - eb.seen;
    return ea.lastSeen - eb.lastSeen;
  });
  // İlk %30 arasından rastgele (sıkışmasın)
  const top = Math.max(1, Math.ceil(candidates.length * 0.3));
  return candidates[Math.floor(Math.random() * top)];
}

// Cevap kaydet → seviye güncelle
export function recordSrsAnswer(ns: Namespace, topicId: string, letterId: string, correct: boolean) {
  const s = load(ns);
  const e = ensureEntry(s, topicId, letterId);
  const prevLevel = e.level;
  e.total += 1;
  e.seen += 1;
  e.lastSeen = Date.now();
  if (correct) {
    e.correct += 1;
    if (e.level < 4) e.level = ((e.level + 1) as Level);
  } else {
    if (e.level > 1) e.level = ((e.level - 1) as Level);
  }
  save(ns, s);

  // Analitik: seviye yükselmesi durumunda milestone gönder (ilk kez ulaştığında)
  if (correct && e.level > prevLevel) {
    import("@/lib/analytics").then((m) => m.trackMilestone(topicId, letterId, e.level)).catch(() => {});
  }
}

// İstatistikler — Progress sayfası için
export function getNamespaceStats(ns: Namespace) {
  const s = load(ns);
  let total = 0, correct = 0;
  const levelCount: Record<Level, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  Object.values(s).forEach((topic) => {
    Object.values(topic).forEach((e) => {
      total += e.total;
      correct += e.correct;
      levelCount[e.level] += 1;
    });
  });
  return {
    total,
    correct,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100),
    levelCount,
  };
}

export function getTopicSrs(ns: Namespace, topicId: string): TopicSrs {
  return load(ns)[topicId] || {};
}

// Belirli bir harfin/itemin mevcut SRS seviyesi (1-4). Kayıt yoksa 1.
export function getLetterLevel(ns: Namespace, topicId: string, letterId: string): Level {
  const t = load(ns)[topicId];
  return (t?.[letterId]?.level ?? 1) as Level;
}

export function resetTopicSrs(ns: Namespace, topicId: string) {
  const s = load(ns);
  delete s[topicId];
  save(ns, s);
}

export function resetNamespace(ns: Namespace) {
  save(ns, {});
}

export function useSrsTick(ns: Namespace) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener(EVENT(ns), h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVENT(ns), h);
      window.removeEventListener("storage", h);
    };
  }, [ns]);
  return tick;
}

// Backward-compat shim — eski oyunlardan çağrılır
export function recordLetterMastery(_letterId: string, _correct: boolean) {
  // No-op: yeni müfredatta letter-bazlı mastery yok; SRS recordSrsAnswer kullanılıyor
}
