// 4 seviyeli tekrar (SRS) sistemi + "Öğrenme Gücü" (learning power) metriği.
// Mantık, kullanıcının verdiği Unity/Firebase scriptindekiyle uyumludur:
// - İlk 2 karşılaşma 2 doğru ile geçtiyse harf "biliyordu" sayılır.
// - 3+ karşılaşmada yanlış cevap ve seviye < 3 ise "biliyordu = false" olur.
// - Seviye 3'e ilk kez ulaştığında ve biliyordu değilse "öğrenildi" anı kaydedilir.
// - Sadece "biliyordu = false" olan harflerin soru süresi öğrenme gücüne katkı verir.

import { useEffect, useState } from "react";

export type Level = 1 | 2 | 3 | 4;
export type Namespace = "quiz" | "games";

export interface LetterSrsEntry {
  level: Level;
  correct: number;
  total: number;
  seen: number; // bu seviyedeki gösterim sayısı (çeşitlilik için)
  lastSeen: number;

  // Öğrenme gücü için ek alanlar
  totalMs?: number;        // Tüm karşılaşmaların toplam cevap süresi (ms)
  msToLearn?: number;      // Seviye 3'e ulaştığı andaki toplam süre (ms)
  knewBefore?: boolean;    // Daha önce biliyordu mu?
  learnedAt?: number;      // Seviye 3'e ilk ulaştığı epoch ms
}

export type TopicSrs = Record<string, LetterSrsEntry>;
export type SrsState = Record<string, TopicSrs>;

const KEY = (ns: Namespace) => `elifba-srs-${ns}-v1`;
const EVENT = (ns: Namespace) => `elifba-srs-${ns}-updated`;
const PROGRESS_EVENT = "elifba-progress-updated";

function load(ns: Namespace): SrsState {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY(ns)) || "{}"); } catch { return {}; }
}

function save(ns: Namespace, s: SrsState) {
  localStorage.setItem(KEY(ns), JSON.stringify(s));
  window.dispatchEvent(new Event(EVENT(ns)));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

function ensureEntry(s: SrsState, topicId: string, letterId: string): LetterSrsEntry {
  if (!s[topicId]) s[topicId] = {};
  if (!s[topicId][letterId]) {
    s[topicId][letterId] = { level: 1, correct: 0, total: 0, seen: 0, lastSeen: 0, totalMs: 0 };
  }
  return s[topicId][letterId];
}

export function ensureLetters(ns: Namespace, topicId: string, letterIds: string[]) {
  const s = load(ns);
  let changed = false;
  for (const id of letterIds) {
    if (!s[topicId]?.[id]) { ensureEntry(s, topicId, id); changed = true; }
  }
  if (changed) save(ns, s);
}

function waterfallWeights(filledLevels: Level[]): Record<Level, number> {
  const w: Record<Level, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const sorted = [...filledLevels].sort((a, b) => a - b);
  if (sorted.length === 4) { w[1] = 60; w[2] = 15; w[3] = 10; w[4] = 15; }
  else if (sorted.length === 3) { w[sorted[0]] = 70; w[sorted[1]] = 20; w[sorted[2]] = 10; }
  else if (sorted.length === 2) { w[sorted[0]] = 70; w[sorted[1]] = 30; }
  else if (sorted.length === 1) { w[sorted[0]] = 100; }
  return w;
}

export function pickNextLetter(ns: Namespace, topicId: string, letterIds: string[]): string {
  ensureLetters(ns, topicId, letterIds);
  const s = load(ns);
  const topic = s[topicId] || {};
  const byLevel: Record<Level, string[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const id of letterIds) {
    const e = topic[id]; if (!e) continue;
    byLevel[e.level].push(id);
  }
  const filled: Level[] = ([1, 2, 3, 4] as Level[]).filter((l) => byLevel[l].length > 0);
  if (filled.length === 0) return letterIds[Math.floor(Math.random() * letterIds.length)];
  const w = waterfallWeights(filled);
  const total = filled.reduce((acc, l) => acc + w[l], 0);
  let r = Math.random() * total;
  let chosenLevel: Level = filled[0];
  for (const l of filled) { r -= w[l]; if (r <= 0) { chosenLevel = l; break; } }
  const candidates = byLevel[chosenLevel];
  candidates.sort((a, b) => {
    const ea = topic[a]; const eb = topic[b];
    if (ea.seen !== eb.seen) return ea.seen - eb.seen;
    return ea.lastSeen - eb.lastSeen;
  });
  const top = Math.max(1, Math.ceil(candidates.length * 0.3));
  return candidates[Math.floor(Math.random() * top)];
}

export interface AnswerMeta {
  responseMs?: number;
  gameId?: string;
}

// Cevap kaydet → seviye + biliyordu/öğrenildi durumunu güncelle
export function recordSrsAnswer(
  ns: Namespace,
  topicId: string,
  letterId: string,
  correct: boolean,
  meta?: AnswerMeta,
) {
  const s = load(ns);
  const e = ensureEntry(s, topicId, letterId);
  const prevLevel = e.level;
  e.total += 1;
  e.seen += 1;
  e.lastSeen = Date.now();
  if (typeof meta?.responseMs === "number" && meta.responseMs > 0) {
    e.totalMs = (e.totalMs || 0) + Math.min(meta.responseMs, 60_000); // 60sn üst sınır (idle koruma)
  }
  if (correct) {
    e.correct += 1;
    if (e.level < 4) e.level = ((e.level + 1) as Level);
  } else {
    if (e.level > 1) e.level = ((e.level - 1) as Level);
  }

  // "Biliyordu" tespiti (Firebase mantığıyla)
  if (e.total <= 2) {
    // İlk iki karşılaşma 2 doğru ise → zaten biliyordu
    if (e.total === 2) e.knewBefore = (e.correct === 2);
  } else if (!correct && e.level < 3) {
    e.knewBefore = false;
  }

  // "Öğrenildi" anı: seviye 3+ a ilk ulaşıldığında ve biliyor değilse
  if (e.level >= 3 && !e.learnedAt && e.knewBefore !== true) {
    e.learnedAt = Date.now();
    e.msToLearn = e.totalMs || 0;
  }

  save(ns, s);

  // Bulut: cevap olayı + agg istatistik (sessizce)
  import("@/data/cloudSync").then((m) => {
    m.logAnswer({
      topicId,
      letterId,
      correct,
      gameId: meta?.gameId,
      responseMs: meta?.responseMs,
      knewBefore: e.knewBefore,
      learnedAtMs: e.learnedAt,
      timeToLearnMs: e.msToLearn,
      totalResponseMs: e.totalMs,
      level: e.level,
    }).catch(() => {});
  }).catch(() => {});

  // Milestone: seviye yükselişinde
  if (correct && e.level > prevLevel) {
    import("@/lib/analytics").then((m) => m.trackMilestone(topicId, letterId, e.level)).catch(() => {});
  }
}

export function getNamespaceStats(ns: Namespace) {
  const s = load(ns);
  let total = 0, correct = 0;
  const levelCount: Record<Level, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  Object.values(s).forEach((topic) => {
    Object.values(topic).forEach((e) => {
      total += e.total; correct += e.correct; levelCount[e.level] += 1;
    });
  });
  return { total, correct, percent: total === 0 ? 0 : Math.round((correct / total) * 100), levelCount };
}

// Cihazdaki öğrenme gücü: yeni öğrenilen harflerin ortalama süresi (saniye)
export function getLearningPower(ns: Namespace): {
  learnedCount: number; knewCount: number; avgSeconds: number | null;
} {
  const s = load(ns);
  let totalMs = 0, learnedCount = 0, knewCount = 0;
  Object.values(s).forEach((topic) => {
    Object.values(topic).forEach((e) => {
      if (e.knewBefore === true) knewCount += 1;
      if (e.learnedAt && e.knewBefore !== true && (e.msToLearn || 0) > 0) {
        totalMs += e.msToLearn || 0; learnedCount += 1;
      }
    });
  });
  return {
    learnedCount, knewCount,
    avgSeconds: learnedCount > 0 ? Math.round((totalMs / learnedCount) / 100) / 10 : null,
  };
}

export function getTopicSrs(ns: Namespace, topicId: string): TopicSrs { return load(ns)[topicId] || {}; }

export function getLetterLevel(ns: Namespace, topicId: string, letterId: string): Level {
  const t = load(ns)[topicId]; return (t?.[letterId]?.level ?? 1) as Level;
}

export function resetTopicSrs(ns: Namespace, topicId: string) {
  const s = load(ns); delete s[topicId]; save(ns, s);
}
export function resetNamespace(ns: Namespace) { save(ns, {}); }

export function useSrsTick(ns: Namespace) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener(EVENT(ns), h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener(EVENT(ns), h); window.removeEventListener("storage", h); };
  }, [ns]);
  return tick;
}

export function recordLetterMastery(_letterId: string, _correct: boolean) { /* no-op */ }
