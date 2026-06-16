// Hesapsız (guest) modda lokal'de tutulan SRS verisini hesaba taşır.
// Çocuk hesap açtığında "seviye 1"e düşmesin diye letter_stats'a upsert eder.
import { supabase } from "@/integrations/supabase/client";

type LetterEntry = {
  level: number;
  correct: number;
  total: number;
  seen: number;
  lastSeen: number;
  totalMs?: number;
  msToLearn?: number;
  knewBefore?: boolean;
  learnedAt?: number;
};
type SrsState = Record<string, Record<string, LetterEntry>>;

const NS = ["quiz", "games"] as const;
const MIGRATED_FLAG = (userId: string) => `miniakil:migrated:${userId}`;

function loadNs(ns: typeof NS[number]): SrsState {
  // Hem yeni misafir anahtarı hem eski anahtar okunur, birleştirilir.
  const merge = (a: SrsState, b: SrsState): SrsState => {
    const out: SrsState = JSON.parse(JSON.stringify(a));
    for (const [tid, topic] of Object.entries(b)) {
      out[tid] = out[tid] || {};
      for (const [lid, e] of Object.entries(topic)) {
        const prev = out[tid][lid];
        out[tid][lid] = prev ? { ...prev, ...e, level: Math.max(prev.level, e.level), correct: prev.correct + e.correct, total: prev.total + e.total, seen: prev.seen + e.seen } : e;
      }
    }
    return out;
  };
  try {
    const a = JSON.parse(localStorage.getItem(`elifba-srs-${ns}-guest-v1`) || "{}");
    const b = JSON.parse(localStorage.getItem(`elifba-srs-${ns}-v1`) || "{}");
    return merge(a, b);
  } catch { return {}; }
}


export async function migrateGuestDataToAccount(userId: string): Promise<{ migrated: number; errors: number }> {
  if (!userId) return { migrated: 0, errors: 0 };
  try {
    if (localStorage.getItem(MIGRATED_FLAG(userId)) === "1") return { migrated: 0, errors: 0 };
  } catch { /* ignore */ }

  let migrated = 0;
  let errors = 0;

  // Tüm namespace'ları birleştir; aynı (topic,letter) için maks değerleri al.
  const merged = new Map<string, { topicId: string; letterId: string; e: LetterEntry }>();
  for (const ns of NS) {
    const s = loadNs(ns);
    for (const [topicId, topic] of Object.entries(s)) {
      for (const [letterId, e] of Object.entries(topic)) {
        const key = `${topicId}::${letterId}`;
        const prev = merged.get(key);
        if (!prev) { merged.set(key, { topicId, letterId, e: { ...e } }); continue; }
        const a = prev.e;
        prev.e = {
          level: Math.max(a.level, e.level),
          correct: a.correct + e.correct,
          total: a.total + e.total,
          seen: a.seen + e.seen,
          lastSeen: Math.max(a.lastSeen, e.lastSeen),
          totalMs: (a.totalMs ?? 0) + (e.totalMs ?? 0),
          msToLearn: a.msToLearn ?? e.msToLearn,
          knewBefore: a.knewBefore ?? e.knewBefore,
          learnedAt: a.learnedAt && e.learnedAt ? Math.min(a.learnedAt, e.learnedAt) : (a.learnedAt ?? e.learnedAt),
        };
      }
    }
  }

  for (const { topicId, letterId, e } of merged.values()) {
    const row = {
      user_id: userId,
      topic_id: topicId,
      letter_id: letterId,
      shown_count: e.total,
      correct_count: e.correct,
      wrong_count: Math.max(0, e.total - e.correct),
      level: Math.max(1, Math.min(4, e.level)),
      knew_before: e.knewBefore ?? null,
      learned_at: e.learnedAt ? new Date(e.learnedAt).toISOString() : null,
      time_to_learn_ms: e.msToLearn ?? null,
      total_response_ms: e.totalMs ?? 0,
      last_seen_at: e.lastSeen ? new Date(e.lastSeen).toISOString() : new Date().toISOString(),
    };

    // 1) Var mı kontrol et — varsa sadece "daha iyi" olan değerleri uygula.
    const { data: existing } = await supabase
      .from("letter_stats")
      .select("id, shown_count, correct_count, wrong_count, level, total_response_ms, learned_at, knew_before")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .eq("letter_id", letterId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("letter_stats").update({
        shown_count: existing.shown_count + row.shown_count,
        correct_count: existing.correct_count + row.correct_count,
        wrong_count: existing.wrong_count + row.wrong_count,
        level: Math.max(existing.level, row.level),
        total_response_ms: (existing.total_response_ms ?? 0) + row.total_response_ms,
        learned_at: existing.learned_at ?? row.learned_at,
        knew_before: existing.knew_before ?? row.knew_before,
        last_seen_at: row.last_seen_at,
      }).eq("id", existing.id);
      if (error) errors += 1; else migrated += 1;
    } else {
      const { error } = await supabase.from("letter_stats").insert(row);
      if (error) errors += 1; else migrated += 1;
    }
  }

  try { localStorage.setItem(MIGRATED_FLAG(userId), "1"); } catch { /* ignore */ }
  return { migrated, errors };
}
