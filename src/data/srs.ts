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

// Aktif kullanıcı kapsamı — farklı hesapların ilerlemesi karışmasın diye
// localStorage anahtarına user_id ekleniyor.
let _activeUid: string | null = null;
const EVENT = (ns: Namespace) => `elifba-srs-${ns}-updated`;
const PROGRESS_EVENT = "elifba-progress-updated";

export function setActiveSrsUser(uid: string | null) {
  _activeUid = uid || null;
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new Event(EVENT("quiz"))); } catch { /* */ }
    try { window.dispatchEvent(new Event(EVENT("games"))); } catch { /* */ }
    try { window.dispatchEvent(new Event(PROGRESS_EVENT)); } catch { /* */ }
  }
}
export function getActiveSrsUser(): string | null { return _activeUid; }

const KEY = (ns: Namespace) => `elifba-srs-${ns}-${_activeUid ?? "guest"}-v1`;

export function clearUserLocalSrs(uid: string | null) {
  if (typeof window === "undefined" || !uid) return;
  for (const ns of ["quiz", "games"] as Namespace[]) {
    try { localStorage.removeItem(`elifba-srs-${ns}-${uid}-v1`); } catch { /* */ }
  }
}

// Misafir SRS verisinde kayıt var mı?
export function hasGuestData(): boolean {
  if (typeof window === "undefined") return false;
  for (const ns of ["quiz", "games"] as Namespace[]) {
    try {
      const raw = localStorage.getItem(`elifba-srs-${ns}-guest-v1`)
        || localStorage.getItem(`elifba-srs-${ns}-v1`);
      if (!raw) continue;
      const s = JSON.parse(raw);
      for (const t of Object.values(s)) {
        if (t && Object.keys(t as object).length > 0) return true;
      }
    } catch { /* */ }
  }
  return false;
}

// Cihazdaki ilerleme verisini siler (bulut etkilenmez).
// scope: "active" = giriş yapan kullanıcı önbelleği, "guest" = misafir, "all" = ikisi de.
export function clearLocalProgress(scope: "active" | "guest" | "all") {
  if (typeof window === "undefined") return;
  const targets: string[] = [];
  if (scope === "guest" || scope === "all") targets.push("guest");
  if ((scope === "active" || scope === "all") && _activeUid) targets.push(_activeUid);
  for (const ns of ["quiz", "games"] as Namespace[]) {
    for (const t of targets) {
      try { localStorage.removeItem(`elifba-srs-${ns}-${t}-v1`); } catch { /* */ }
    }
    // Eski (kullanıcısız) anahtarı da temizle
    if (scope === "all" || scope === "guest") {
      try { localStorage.removeItem(`elifba-srs-${ns}-v1`); } catch { /* */ }
    }
    try { window.dispatchEvent(new Event(EVENT(ns))); } catch { /* */ }
  }
  try { window.dispatchEvent(new Event(PROGRESS_EVENT)); } catch { /* */ }
}

function load(ns: Namespace): SrsState {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY(ns)) || "{}"); } catch { return {}; }
}

function save(ns: Namespace, s: SrsState) {
  localStorage.setItem(KEY(ns), JSON.stringify(s));
  window.dispatchEvent(new Event(EVENT(ns)));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export async function hydrateSrsFromCloud(uid: string) {
  if (!uid || typeof window === "undefined") return;
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.from("letter_stats").select("*").eq("user_id", uid);
  if (!data) return;
  const state: SrsState = {};
  for (const r of data as Array<{ topic_id: string; letter_id: string; shown_count: number; correct_count: number; wrong_count: number; level: number; total_response_ms: number | null; learned_at: string | null; time_to_learn_ms: number | null; knew_before: boolean | null; last_seen_at: string | null }>) {
    if (!state[r.topic_id]) state[r.topic_id] = {};
    state[r.topic_id][r.letter_id] = {
      level: Math.max(1, Math.min(4, r.level)) as Level,
      correct: r.correct_count,
      total: r.shown_count,
      seen: r.shown_count,
      lastSeen: r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0,
      totalMs: r.total_response_ms ?? 0,
      msToLearn: r.time_to_learn_ms ?? undefined,
      knewBefore: r.knew_before ?? undefined,
      learnedAt: r.learned_at ? new Date(r.learned_at).getTime() : undefined,
    };
  }
  for (const ns of ["quiz", "games"] as Namespace[]) {
    try { localStorage.setItem(`elifba-srs-${ns}-${uid}-v1`, JSON.stringify(state)); } catch { /* */ }
  }
  try { window.dispatchEvent(new Event(PROGRESS_EVENT)); } catch { /* */ }
  try { window.dispatchEvent(new Event(EVENT("quiz"))); } catch { /* */ }
  try { window.dispatchEvent(new Event(EVENT("games"))); } catch { /* */ }
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

// Bulut'tan profil-bazlı aggregate. Oturum açık değilse null döner — yerel kullan.
export async function getNamespaceStatsFromCloud(uid: string | null) {
  if (!uid) return null;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("letter_stats")
      .select("shown_count, correct_count, level")
      .eq("user_id", uid);
    if (error || !data) return null;
    let total = 0, correct = 0;
    const levelCount: Record<Level, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const r of data) {
      total += r.shown_count || 0;
      correct += r.correct_count || 0;
      const lv = Math.max(1, Math.min(4, r.level || 1)) as Level;
      levelCount[lv] += 1;
    }
    return { total, correct, percent: total === 0 ? 0 : Math.round((correct / total) * 100), levelCount };
  } catch { return null; }
}

// Bulut'tan tam SRS state (konu+harf bazlı). Oturum yoksa null.
export async function getCloudSrsState(uid: string | null): Promise<SrsState | null> {
  if (!uid) return null;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("letter_stats")
      .select("topic_id, letter_id, level, correct_count, shown_count, last_seen_at, total_response_ms, time_to_learn_ms, knew_before, learned_at")
      .eq("user_id", uid);
    if (error || !data) return null;
    const state: SrsState = {};
    for (const r of data as Array<{ topic_id: string; letter_id: string; level: number; correct_count: number; shown_count: number; last_seen_at: string | null; total_response_ms: number | null; time_to_learn_ms: number | null; knew_before: boolean | null; learned_at: string | null }>) {
      if (!state[r.topic_id]) state[r.topic_id] = {};
      state[r.topic_id][r.letter_id] = {
        level: Math.max(1, Math.min(4, r.level || 1)) as Level,
        correct: r.correct_count || 0,
        total: r.shown_count || 0,
        seen: r.shown_count || 0,
        lastSeen: r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0,
        totalMs: r.total_response_ms ?? 0,
        msToLearn: r.time_to_learn_ms ?? undefined,
        knewBefore: r.knew_before ?? undefined,
        learnedAt: r.learned_at ? new Date(r.learned_at).getTime() : undefined,
      };
    }
    return state;
  } catch { return null; }
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
